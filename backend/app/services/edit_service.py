"""O vídeo editado: a análise diz o que cortar, e o Publishub entrega o vídeo cortado.

O fluxo inteiro:
  1. a análise termina e sugere cortes (as recomendações de kind "cut" e "pacing");
  2. o backend já gera, sozinho, um vídeo NOVO sem esses trechos (`deliver`);
  3. o criador assiste e diz se gostou. Se não gostou, escreve o que mudaria, a
     IA traduz isso em cortes e sai uma versão nova (`feedback`);
  4. quem preferir escolhe os cortes à mão (`request`), como antes.

O vídeo original nunca é alterado nem substituído. Se a edição falhar, o que se
perde é a edição; o material de quem enviou continua onde estava.
"""

import logging
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import ALLOWED_VIDEO_TYPES, get_settings
from app.core.errors import ApiError
from app.services import ai_service, billing_service, events_service, supabase_service as db, video_editing
from app.services.video_processing import InvalidVideoError, probe

logger = logging.getLogger("publishub")

# Cortar re-codifica o vídeo, o que é caro em CPU. Uma edição por vez no processo:
# a fila de análises já usa o resto da máquina.
_slot = threading.Semaphore(1)

EDIT_FOLDER = "edits"
# Cada versão nova custa uma chamada de IA e uma re-codificação. Dez tentativas
# numa análise só já dizem que cortar não é o que falta.
MAX_REVISIONS = 10
# Dois cortes a menos que isto de distância são o mesmo corte.
_SAME_CUT_SECONDS = 0.05


def suggested(analysis: dict) -> list[dict]:
    """As recomendações que descrevem um trecho para tirar do vídeo.

    Instante sem fim (um "insira um texto aqui") não vira corte: só entra o que
    tem começo e fim.
    """
    copilot = ((analysis.get("result") or {}).get("copilot")) or {}
    sugeridos = []
    for item in copilot.get("recommendations") or []:
        if item.get("kind") not in ("cut", "pacing"):
            continue
        if item.get("end_seconds") is None:
            continue  # sugestão de instante, não de trecho: não dá para cortar
        sugeridos.append({"start_seconds": float(item["at_seconds"]), "end_seconds": float(item["end_seconds"])})
    return sugeridos


def _serialize(row: dict, signed: bool = True) -> dict:
    # enquanto a versão nova não fica pronta, o arquivo guardado ainda é o da anterior
    url = db.create_signed_url(row["storage_path"]) if (signed and row.get("storage_path") and row["status"] == "completed") else None
    return {
        "analysis_id": row["analysis_id"],
        "status": row["status"],
        "source": row.get("source") or "manual",
        "revision": int(row.get("revision") or 1),
        "instruction": row.get("instruction"),
        "reply": row.get("reply"),
        "feedback": row.get("feedback"),
        "feedback_note": row.get("feedback_note"),
        "feedback_at": row.get("feedback_at"),
        "cuts": row.get("cuts") or [],
        "kept": row.get("kept"),
        "removed_seconds": float(row["removed_seconds"]) if row.get("removed_seconds") is not None else None,
        "duration_seconds": float(row["duration_seconds"]) if row.get("duration_seconds") is not None else None,
        "original_duration_seconds": float(row["original_duration_seconds"]) if row.get("original_duration_seconds") is not None else None,
        "size_bytes": row.get("size_bytes"),
        "error_code": row.get("error_code"),
        "download_url": url,
        "created_at": row.get("created_at"),
    }


def for_analysis(analysis_id: str) -> dict | None:
    row = db.get_video_edit(analysis_id)
    return _serialize(row) if row else None


def _prepare(analysis: dict, cuts: list[dict]) -> tuple[list[tuple[float, float]], float]:
    """Os cortes limpos e a duração do original. Falha agora, com mensagem clara, em vez de falhar no background."""
    video = analysis.get("videos") or {}
    if not video.get("storage_path"):
        raise ApiError(409, "NO_VIDEO", "Não encontramos o vídeo original desta análise.")

    duracao = float(video.get("duration_seconds") or 0)
    if duracao <= 0:
        raise ApiError(409, "NO_VIDEO", "Não sabemos a duração deste vídeo para cortar com segurança.")

    try:
        normalizados = video_editing.normalise(cuts, duracao)
        video_editing.keep_segments(normalizados, duracao)
    except video_editing.CutError as exc:
        raise ApiError(422, exc.code.upper(), exc.message) from exc
    return normalizados, duracao


def _save(analysis: dict, user_id: str, cuts: list[tuple[float, float]], duration: float, *, source: str, instruction: str | None = None, reply: str | None = None) -> dict:
    """Uma versão nova, esperando o background. Substitui a anterior na mesma linha.

    `storage_path` fica de fora de propósito: o arquivo da versão anterior continua
    lá até o novo ficar pronto, e só então é apagado (em `run`).
    """
    anterior = db.get_video_edit(analysis["id"])
    return db.upsert_video_edit(
        {
            "analysis_id": analysis["id"],
            "user_id": user_id,
            "status": "pending",
            "source": source,
            "revision": int((anterior or {}).get("revision") or 0) + 1,
            "instruction": instruction,
            "reply": reply,
            # o veredito é sobre uma versão: a nova começa sem nenhum
            "feedback": None,
            "feedback_note": None,
            "feedback_at": None,
            "cuts": [{"start_seconds": start, "end_seconds": end} for start, end in cuts],
            "kept": None,
            "duration_seconds": None,
            "original_duration_seconds": round(duration, 2),
            "removed_seconds": None,
            "size_bytes": None,
            "error_code": None,
        }
    )


def request(user: dict, analysis: dict, cuts: list[dict]) -> dict:
    """O criador escolheu os cortes à mão: registra e deixa a edição pronta para rodar em background."""
    if analysis.get("status") != "completed":
        raise ApiError(409, "NOT_READY", "Espere a análise terminar para aplicar os cortes.")
    if not (analysis.get("full_access", True) or billing_service.has_full_access(user)):
        raise ApiError(402, "FREE_LIMIT_REACHED", "Aplicar cortes faz parte da análise completa.")

    normalizados, duracao = _prepare(analysis, cuts)
    linha = _save(analysis, user["id"], normalizados, duracao, source="manual")
    events_service.record_for_user(user["id"], "cuts_approved", analysis["id"], {"cuts": len(normalizados), "seconds": round(sum(e - s for s, e in normalizados), 1)})
    logger.info("edit %s requested for analysis %s (%s cuts)", linha["id"], analysis["id"], len(normalizados))
    return _serialize(linha)


def queue_delivery(analysis: dict) -> dict | None:
    """Deixa o vídeo editado da análise esperando o background, com os cortes que ela sugeriu.

    O pipeline chama isto ANTES de marcar a análise como pronta: quem vê
    "completed" já encontra a edição a caminho, sem uma janela em que ela não existe.
    Só para a análise completa (a parcial não mostra os cortes) e só se ainda não
    houver edição: quem já escolheu cortes à mão não perde a escolha. Nunca levanta.
    """
    try:
        if not analysis.get("user_id") or not analysis.get("full_access", True):
            return None
        if db.get_video_edit(analysis["id"]):
            return None
        cortes = suggested(analysis)
        if not cortes:
            logger.info("analysis %s suggests no cuts: no edited video to deliver", analysis["id"])
            return None
        normalizados, duracao = _prepare(analysis, cortes)
        linha = _save(analysis, analysis["user_id"], normalizados, duracao, source="auto")
    except ApiError as exc:
        logger.info("no automatic edit for analysis %s: %s", analysis.get("id"), exc.code)
        return None
    except Exception:
        logger.exception("could not queue the automatic edit for analysis %s", analysis.get("id"))
        return None
    logger.info("edit %s queued automatically for analysis %s (%s cuts)", linha["id"], analysis["id"], len(normalizados))
    return linha


def deliver(analysis_id: str) -> None:
    """Background, logo depois da análise: gera o vídeo editado que o pipeline deixou na fila. Nunca levanta."""
    try:
        linha = db.get_video_edit(analysis_id)
        if linha is None:
            # a fila falhou no pipeline (ou a análise é de antes disto): tenta agora
            analysis = db.get_analysis(analysis_id)
            if not analysis or analysis.get("status") != "completed":
                return
            linha = queue_delivery(analysis)
        if not linha or linha.get("status") != "pending":
            return
    except Exception:
        logger.exception("could not start the automatic edit for analysis %s", analysis_id)
        return
    run(linha["id"])


def _same_cuts(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> bool:
    return len(a) == len(b) and all(abs(x[0] - y[0]) < _SAME_CUT_SECONDS and abs(x[1] - y[1]) < _SAME_CUT_SECONDS for x, y in zip(a, b))


def feedback(user: dict, analysis: dict, rating: str, note: str | None, ui_language: str | None = None) -> dict:
    """"Gostou do vídeo editado?": grava a resposta e, se não gostou, tenta a versão nova.

    Devolve a edição e o que aconteceu com o pedido (`revision`):
      - None: gostou, nada a refazer;
      - "started": a IA traduziu o pedido em cortes e a versão nova está sendo gerada;
      - "not_applicable": o pedido não se resolve cortando (a resposta diz o que fazer);
      - "keep_original": o pedido é não cortar nada, e o original já está na conta;
      - "unavailable": a IA não respondeu agora; o pedido ficou guardado;
      - "limit": versões demais nesta análise.
    """
    linha = db.get_video_edit(analysis["id"])
    if not linha or linha["status"] != "completed":
        raise ApiError(409, "EDIT_NOT_READY", "Espere o vídeo editado ficar pronto para dizer o que achou.")
    nota = (note or "").strip() or None
    if rating == "disliked" and (not nota or len(nota) < 3):
        raise ApiError(422, "FEEDBACK_NOTE_REQUIRED", "Conte o que você mudaria no vídeo.")

    revisao = int(linha.get("revision") or 1)
    agora = datetime.now(timezone.utc).isoformat()
    # o histórico primeiro: é o que não pode se perder se o resto falhar
    db.insert_edit_feedback(
        {"analysis_id": analysis["id"], "user_id": user["id"], "revision": revisao, "rating": rating, "note": nota, "cuts": linha.get("cuts") or []}
    )
    campos = {"feedback": rating, "feedback_note": nota, "feedback_at": agora, "reply": None}
    db.update_video_edit(linha["id"], campos)
    linha = {**linha, **campos}
    events_service.record_for_user(user["id"], "edit_feedback", analysis["id"], {"rating": rating, "revision": revisao, "source": linha.get("source") or "manual"})

    if rating == "liked":
        return {"edit": _serialize(linha), "revision": None}
    if revisao >= MAX_REVISIONS:
        return {"edit": _serialize(linha), "revision": {"status": "limit", "reply": None}}
    return _revise(user, analysis, linha, nota, ui_language)


def _revise(user: dict, analysis: dict, linha: dict, pedido: str, ui_language: str | None) -> dict:
    """O pedido do criador vira a lista de cortes da versão nova."""
    result = analysis.get("result") or {}
    video = analysis.get("videos") or {}
    duracao = float(video.get("duration_seconds") or linha.get("original_duration_seconds") or 0)
    plano = ((result.get("copilot") or {}).get("recommendations")) or []
    contexto = {
        "language": result.get("language"),
        "ui_language": ui_language or result.get("explanations_language") or result.get("language"),
        "duration_seconds": round(duracao, 1),
        "transcript": result.get("transcript") or [],
        "silences": (result.get("signals") or {}).get("silences") or [],
        "current_cuts": linha.get("cuts") or [],
        "current_kept": linha.get("kept") or [],
        "edit_plan": [
            {"kind": item.get("kind"), "at_seconds": item.get("at_seconds"), "end_seconds": item.get("end_seconds"), "title": item.get("title")}
            for item in plano
        ],
        "creator_request": pedido,
    }
    try:
        resposta = ai_service.revise_edit(contexto)
    except (ai_service.AINotConfiguredError, ai_service.AIServiceError) as exc:
        logger.warning("could not revise the edit of analysis %s: %s", analysis["id"], getattr(exc, "code", "ai_not_configured"))
        return {"edit": _serialize(linha), "revision": {"status": "unavailable", "reply": None}}

    reply = resposta.reply.strip()[:1000] or None
    atuais = [(float(c["start_seconds"]), float(c["end_seconds"])) for c in linha.get("cuts") or []]
    novos: list[tuple[float, float]] = []
    status = "not_applicable"
    if resposta.can_apply and duracao > 0:
        if not resposta.cuts:
            status = "keep_original"
        else:
            try:
                novos = video_editing.normalise([c.model_dump() for c in resposta.cuts], duracao)
                video_editing.keep_segments(novos, duracao)
                if not _same_cuts(novos, atuais):
                    status = "started"
            except video_editing.CutError as exc:
                logger.warning("the revision of analysis %s produced unusable cuts: %s", analysis["id"], exc.code)

    if status != "started":
        db.update_video_edit(linha["id"], {"reply": reply})
        return {"edit": _serialize({**linha, "reply": reply}), "revision": {"status": status, "reply": reply}}

    nova = _save(analysis, user["id"], novos, duracao, source="revision", instruction=pedido, reply=reply)
    events_service.record_for_user(user["id"], "edit_revised", analysis["id"], {"revision": int(nova.get("revision") or 1), "cuts": len(novos)})
    logger.info("edit %s revised for analysis %s (revision %s, %s cuts)", nova["id"], analysis["id"], nova.get("revision"), len(novos))
    return {"edit": _serialize(nova), "revision": {"status": "started", "reply": reply}}


def _fail(edit_id: str, code: str, user_id: str | None = None, analysis_id: str | None = None) -> None:
    logger.warning("edit %s failed: %s", edit_id, code)
    try:
        db.update_video_edit(edit_id, {"status": "failed", "error_code": code})
    except Exception:
        logger.exception("could not mark edit %s as failed", edit_id)
    events_service.record_for_user(user_id, "cuts_failed", analysis_id, {"error_code": code})


def run(edit_id: str) -> None:
    """Background: baixa o original, corta, guarda o resultado. Nunca levanta."""
    with _slot:
        try:
            linha = db.get_video_edit_by_id(edit_id)
        except Exception:
            logger.exception("could not load edit %s", edit_id)
            return
        if not linha or linha["status"] != "pending":
            return

        analise = linha.get("analyses") or {}
        video = analise.get("videos") or {}
        user_id, analysis_id = linha["user_id"], linha["analysis_id"]
        # o arquivo da versão anterior, se houver: sai quando o novo estiver guardado
        anterior = linha.get("storage_path")
        if not video.get("storage_path"):
            _fail(edit_id, "no_video", user_id, analysis_id)
            return

        settings = get_settings()
        try:
            db.update_video_edit(edit_id, {"status": "processing"})
            with tempfile.TemporaryDirectory(prefix="publishub-edit-") as tmp:
                work = Path(tmp)
                extensao = ALLOWED_VIDEO_TYPES.get(video.get("mime_type") or "", "mp4")
                origem = work / f"original.{extensao}"
                origem.write_bytes(db.download_object(video["storage_path"]))

                sinais = probe(origem)
                destino = work / "editado.mp4"
                resultado = video_editing.render(
                    origem,
                    destino,
                    linha["cuts"],
                    sinais.duration_seconds,
                    has_audio=sinais.has_audio,
                )

                # o editado fica na pasta do próprio dono, ao lado do original
                caminho = f"{user_id}/{EDIT_FOLDER}/{uuid.uuid4()}.mp4"
                if len(destino.read_bytes()) > settings.max_upload_bytes:
                    _fail(edit_id, "too_large", user_id, analysis_id)
                    return
                db.upload_object(caminho, destino.read_bytes(), "video/mp4")

            db.update_video_edit(
                edit_id,
                {
                    "status": "completed",
                    "storage_path": caminho,
                    "kept": resultado["kept"],
                    "duration_seconds": resultado["duration_seconds"],
                    "removed_seconds": resultado["removed_seconds"],
                    "size_bytes": resultado["size_bytes"],
                    "error_code": None,
                },
            )
            if anterior and anterior != caminho:
                try:
                    db.delete_object(anterior)
                except db.SupabaseError:
                    logger.warning("could not delete the previous edited video of analysis %s", analysis_id)
            events_service.record_for_user(
                user_id,
                "cuts_completed",
                analysis_id,
                {
                    "removed_seconds": resultado["removed_seconds"],
                    "duration_seconds": resultado["duration_seconds"],
                    "cuts": len(linha["cuts"]),
                    "source": linha.get("source") or "manual",
                    "revision": int(linha.get("revision") or 1),
                },
            )
            logger.info("edit %s ready: %ss removed", edit_id, resultado["removed_seconds"])
        except video_editing.CutError as exc:
            _fail(edit_id, exc.code, user_id, analysis_id)
        except InvalidVideoError:
            _fail(edit_id, "invalid_video", user_id, analysis_id)
        except db.SupabaseError:
            _fail(edit_id, "storage", user_id, analysis_id)
        except Exception:
            logger.exception("edit %s failed", edit_id)
            _fail(edit_id, "generic", user_id, analysis_id)


def recover_interrupted() -> None:
    """No boot: edição que ficou pela metade não volta sozinha."""
    quantas = db.fail_unfinished_edits()
    if quantas:
        logger.warning("marked %s interrupted edit(s) as failed", quantas)
