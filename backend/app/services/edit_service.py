"""Os cortes que o criador aprovou, aplicados num vídeo novo.

O fluxo inteiro, em três passos:
  1. a análise sugere cortes (as recomendações de kind "cut" e "pacing");
  2. o criador escolhe quais valem e aprova — nada acontece antes disso;
  3. o backend gera OUTRO arquivo, sem os trechos aprovados, e devolve para
     assistir e baixar.

O vídeo original nunca é alterado nem substituído. Se a edição falhar, o que se
perde é a edição; o material de quem enviou continua onde estava.
"""

import logging
import tempfile
import threading
import uuid
from pathlib import Path

from app.core.config import ALLOWED_VIDEO_TYPES, get_settings
from app.core.errors import ApiError
from app.services import billing_service, events_service, supabase_service as db, video_editing
from app.services.video_processing import InvalidVideoError, probe

logger = logging.getLogger("publishub")

# Cortar re-codifica o vídeo, o que é caro em CPU. Uma edição por vez no processo:
# a fila de análises já usa o resto da máquina.
_slot = threading.Semaphore(1)

EDIT_FOLDER = "edits"


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
    url = db.create_signed_url(row["storage_path"]) if (signed and row.get("storage_path")) else None
    return {
        "analysis_id": row["analysis_id"],
        "status": row["status"],
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


def request(user: dict, analysis: dict, cuts: list[dict]) -> dict:
    """Registra a aprovação e deixa a edição pronta para rodar em background."""
    video = analysis.get("videos") or {}
    if analysis.get("status") != "completed":
        raise ApiError(409, "NOT_READY", "Espere a análise terminar para aplicar os cortes.")
    if not (analysis.get("full_access", True) or billing_service.has_full_access(user)):
        raise ApiError(402, "FREE_LIMIT_REACHED", "Aplicar cortes faz parte da análise completa.")
    if not video.get("storage_path"):
        raise ApiError(409, "NO_VIDEO", "Não encontramos o vídeo original desta análise.")

    duracao = float(video.get("duration_seconds") or 0)
    if duracao <= 0:
        raise ApiError(409, "NO_VIDEO", "Não sabemos a duração deste vídeo para cortar com segurança.")

    # falha agora, com mensagem clara, em vez de falhar no background
    try:
        normalizados = video_editing.normalise(cuts, duracao)
        video_editing.keep_segments(normalizados, duracao)
    except video_editing.CutError as exc:
        raise ApiError(422, exc.code.upper(), exc.message) from exc

    linha = db.upsert_video_edit(
        {
            "analysis_id": analysis["id"],
            "user_id": user["id"],
            "status": "pending",
            "cuts": [{"start_seconds": start, "end_seconds": end} for start, end in normalizados],
            "kept": None,
            "storage_path": None,
            "duration_seconds": None,
            "original_duration_seconds": round(duracao, 2),
            "removed_seconds": None,
            "size_bytes": None,
            "error_code": None,
        }
    )
    events_service.record_for_user(user["id"], "cuts_approved", analysis["id"], {"cuts": len(normalizados), "seconds": round(sum(e - s for s, e in normalizados), 1)})
    logger.info("edit %s requested for analysis %s (%s cuts)", linha["id"], analysis["id"], len(normalizados))
    return _serialize(linha)


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
            events_service.record_for_user(
                user_id,
                "cuts_completed",
                analysis_id,
                {"removed_seconds": resultado["removed_seconds"], "duration_seconds": resultado["duration_seconds"], "cuts": len(linha["cuts"])},
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
