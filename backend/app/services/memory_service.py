"""A memória do criador: o que a Publishub aprendeu com cada pessoa.

Cada vídeo analisado deixa rastro: os cortes que a pessoa aceitou e recusou, o
que ela pediu para mudar no vídeo editado ("o que você mudaria?"), o que sentiu
falta na análise ("o que faltou?") e as notas do próprio vídeo (gancho, ritmo,
as frentes do plano). A memória junta esse rastro, e ele tem três usos:

  - a IA: a próxima análise recebe a memória (`for_analysis`) e ajusta o plano
    ao estilo da pessoa; a revisão do vídeo editado também (`for_revision`);
  - os cortes: a análise guarda uma foto da memória no resultado, e cada
    sugestão de corte já vem marcada do jeito que a pessoa costuma decidir
    (ver `cut_suggestions`). É uma foto, não a memória ao vivo: a lista de uma
    análise pronta não pode mudar depois que a pessoa começou a revisar;
  - a pessoa: a página Memória mostra o que foi aprendido (`view`), e ela
    acrescenta notas sobre o próprio estilo, tira aprendizados, pausa ou
    esquece tudo.

Nada de modelo próprio: contagens, regras escritas e o texto da própria pessoa,
para dar para ler, explicar e evoluir.

A memória nunca derruba nada: sem a migração 20261009000000 ou com o banco fora,
ela fica vazia e a análise segue como sempre seguiu.
"""

import logging
import uuid
from collections import Counter
from datetime import datetime, timezone
from statistics import mean

from app.core.errors import ApiError
from app.services import events_service, suggestion_service, supabase_service as db

logger = logging.getLogger("publishub")

# o que a pessoa escreve sobre o próprio estilo
MAX_NOTES = 20
NOTE_MAX_CHARS = 300
# quantos pedidos e "o que faltou" recentes entram (os mais novos dizem mais do estilo de hoje)
MAX_REQUESTS = 8
MAX_MISSING = 5
# quantas análises recentes formam a trajetória
MAX_HISTORY = 12
# trajetória só vira afirmação com pelo menos isto de análises; antes, é chute
MIN_HISTORY = 3
# uma frente do plano é "recorrente" quando aparece em pelo menos esta fração das análises
RECURRING_SHARE = 0.5
# a diferença de nota do gancho que conta como "melhorou" ou "piorou"
HOOK_TREND_POINTS = 1.0

_DEFAULT = {"enabled": True, "forgotten_at": None, "notes": [], "hidden": []}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row(user_id: str) -> tuple[dict, bool]:
    """A linha da memória (ou o padrão, sem linha) e se a tabela existe."""
    try:
        row = db.get_creator_memory(user_id)
    except db.SupabaseError:
        return dict(_DEFAULT), False
    return {**_DEFAULT, **{k: v for k, v in (row or {}).items() if v is not None or k == "forgotten_at"}}, True


def _safe(fn, default):
    try:
        return fn()
    except db.SupabaseError:
        return default


def _number(value) -> float | None:
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def _trajectory(analyses: list[dict]) -> dict:
    """Como os vídeos da pessoa vêm evoluindo: nota do gancho, frentes que se repetem, ritmo de costume."""
    chronological = list(reversed(analyses))  # do mais velho para o mais novo
    hooks = [h for h in (_number(a.get("hook_score")) for a in chronological) if h is not None]
    trend = None
    if len(hooks) >= MIN_HISTORY + 1:
        recent, before = mean(hooks[-MIN_HISTORY:]), mean(hooks[:-MIN_HISTORY])
        trend = "up" if recent - before >= HOOK_TREND_POINTS else "down" if before - recent >= HOOK_TREND_POINTS else "flat"

    fronts: Counter = Counter()
    for analysis in analyses:
        fronts.update({item.get("kind") for item in (analysis.get("recommendations") or []) if isinstance(item, dict) and item.get("kind")})
    recurring = []
    if len(analyses) >= MIN_HISTORY:
        floor = max(MIN_HISTORY, round(len(analyses) * RECURRING_SHARE))
        recurring = [kind for kind, count in fronts.most_common() if count >= floor]

    paces = Counter(a.get("pace") for a in analyses if a.get("pace"))
    usual_pace = None
    if paces:
        pace, count = paces.most_common(1)[0]
        usual_pace = pace if count >= MIN_HISTORY and count * 2 > len(analyses) else None

    return {
        "analyses": len(analyses),
        "hook_scores": [round(h, 1) for h in hooks],
        "hook_average": round(mean(hooks), 1) if hooks else None,
        "hook_trend": trend,
        "recurring_fronts": recurring,
        "usual_pace": usual_pace,
    }


def build(user_id: str) -> dict:
    """Tudo o que a Publishub sabe desta pessoa, a partir do último "esquecer"."""
    row, stored = _row(user_id)
    since = row.get("forgotten_at")
    hidden = {(h.get("source"), h.get("id")) for h in row.get("hidden") or [] if isinstance(h, dict)}

    decisions = _safe(lambda: db.list_user_suggestion_decisions(user_id, since), [])
    cuts = suggestion_service.summarize(decisions)
    decided = sum(c["accepted"] + c["rejected"] for kind, c in cuts["by_type"].items() if kind != "manual")

    requests = [
        {"id": r["id"], "text": (r.get("note") or "").strip()[:500], "at": r.get("created_at"), "analysis_id": r.get("analysis_id")}
        for r in _safe(lambda: db.list_user_edit_requests(user_id, since, MAX_REQUESTS + len(hidden)), [])
        if (r.get("note") or "").strip() and ("request", r["id"]) not in hidden
    ][:MAX_REQUESTS]
    missing = [
        {"id": r["id"], "text": (r.get("missing") or "").strip()[:500], "at": r.get("updated_at"), "analysis_id": r.get("analysis_id")}
        for r in _safe(lambda: db.list_user_analysis_missing(user_id, since, MAX_MISSING + len(hidden)), [])
        if (r.get("missing") or "").strip() and ("missing", r["id"]) not in hidden
    ][:MAX_MISSING]
    notes = [n for n in row.get("notes") or [] if isinstance(n, dict) and (n.get("text") or "").strip()]
    trajectory = _trajectory(_safe(lambda: db.list_memory_analyses(user_id, since, MAX_HISTORY), []))

    return {
        "enabled": bool(row.get("enabled", True)),
        # false: a migração ainda não rodou; a tela mostra o que dá e esconde os ajustes
        "stored": stored,
        "forgotten_at": since,
        "empty": not (cuts["leanings"] or requests or missing or notes or trajectory["analyses"]),
        "stats": {"analyses": trajectory["analyses"], "decisions": decided, "requests": len(requests), "notes": len(notes)},
        "cuts": {"leanings": cuts["leanings"], "shortens": cuts["shortens"], "by_type": cuts["by_type"]},
        "requests": requests,
        "missing": missing,
        "notes": notes,
        "trajectory": trajectory,
    }


def _ai_context(memory: dict) -> dict:
    """A memória no formato que a IA lê: só o que muda a análise, sem ids nem datas."""
    out: dict = {}
    trajectory = memory["trajectory"]
    if trajectory["analyses"]:
        out["videos_analyzed_before"] = trajectory["analyses"]
    leanings = memory["cuts"]["leanings"]
    if leanings:
        out["cut_preferences"] = {kind: ("aceita quase sempre" if leaning == "accept" else "recusa quase sempre") for kind, leaning in leanings.items()}
    if memory["cuts"]["shortens"]:
        out["shortens_accepted_cuts"] = True
    if memory["notes"]:
        out["creator_notes"] = [n["text"].strip() for n in memory["notes"]]
    if memory["requests"]:
        out["past_requests"] = [r["text"] for r in memory["requests"]]
    if memory["missing"]:
        out["missing_in_past_analyses"] = [m["text"] for m in memory["missing"]]
    if len(trajectory["hook_scores"]) >= 2:
        out["past_hook_scores"] = trajectory["hook_scores"]
    if trajectory["hook_trend"]:
        out["hook_trend"] = trajectory["hook_trend"]
    if trajectory["recurring_fronts"]:
        out["recurring_fronts"] = trajectory["recurring_fronts"]
    if trajectory["usual_pace"]:
        out["usual_pace"] = trajectory["usual_pace"]
    return out


def for_analysis(user_id: str | None) -> tuple[dict | None, dict | None]:
    """Para a análise que vai começar: (o que a IA lê, a foto que fica no resultado).

    (None, None) para convidado, memória pausada, memória vazia ou qualquer falha:
    a análise segue sem memória, nunca para por causa dela.
    """
    if not user_id:
        return None, None
    try:
        memory = build(user_id)
        if not memory["enabled"] or memory["empty"]:
            return None, None
        context = _ai_context(memory)
        if not context:
            return None, None
        snapshot = {
            "used": True,
            **memory["stats"],
            # o que marca cada sugestão de corte desta análise (ver cut_suggestions)
            "cut_leanings": memory["cuts"]["leanings"],
        }
        return context, snapshot
    except Exception:
        logger.exception("could not build the creator memory for %s; analysing without it", user_id)
        return None, None


def for_revision(user_id: str | None, current_request: str | None = None) -> dict | None:
    """Para refazer o vídeo editado: as notas e os pedidos anteriores dizem o estilo da pessoa.

    `current_request`: o pedido de agora, que já foi gravado no histórico antes de a
    IA ser chamada. Ele vai à IA como o pedido em si, não repetido como "anterior".
    """
    context, _ = for_analysis(user_id)
    if not context:
        return None
    picked = {k: context[k] for k in ("creator_notes", "past_requests", "cut_preferences", "shortens_accepted_cuts") if k in context}
    if current_request and "past_requests" in picked:
        anteriores = [r for r in picked["past_requests"] if r != current_request.strip()]
        if anteriores:
            picked["past_requests"] = anteriores
        else:
            picked.pop("past_requests")
    return picked or None


# ---------------------------------------------------------------- o controle da pessoa


def view(user: dict) -> dict:
    memory = build(user["id"])
    events_service.record_for_user(user["id"], "memory_viewed", None, {"empty": memory["empty"], "enabled": memory["enabled"]})
    return memory


def _write(user_id: str, row: dict, **changes) -> None:
    payload = {
        "user_id": user_id,
        "enabled": row.get("enabled", True),
        "forgotten_at": row.get("forgotten_at"),
        "notes": row.get("notes") or [],
        "hidden": row.get("hidden") or [],
        **changes,
    }
    try:
        db.upsert_creator_memory(payload)
    except db.SupabaseError as exc:
        raise ApiError(503, "MEMORY_UNAVAILABLE", "A memória ainda não está disponível. Tente de novo em alguns minutos.") from exc


def _editable(user_id: str) -> dict:
    row, stored = _row(user_id)
    if not stored:
        raise ApiError(503, "MEMORY_UNAVAILABLE", "A memória ainda não está disponível. Tente de novo em alguns minutos.")
    return row


def set_enabled(user: dict, enabled: bool) -> dict:
    row = _editable(user["id"])
    _write(user["id"], row, enabled=enabled)
    events_service.record_for_user(user["id"], "memory_toggled", None, {"enabled": enabled})
    return build(user["id"])


def add_note(user: dict, text: str) -> dict:
    texto = " ".join((text or "").split())
    if len(texto) < 3:
        raise ApiError(422, "MEMORY_NOTE_TOO_SHORT", "Escreva um pouco mais sobre o seu estilo.")
    if len(texto) > NOTE_MAX_CHARS:
        raise ApiError(422, "MEMORY_NOTE_TOO_LONG", f"Uma nota tem até {NOTE_MAX_CHARS} caracteres.")
    row = _editable(user["id"])
    notes = [n for n in row.get("notes") or [] if isinstance(n, dict)]
    if len(notes) >= MAX_NOTES:
        raise ApiError(422, "MEMORY_NOTES_LIMIT", f"A memória guarda até {MAX_NOTES} notas. Apague uma para escrever outra.")
    notes.append({"id": uuid.uuid4().hex[:12], "text": texto, "created_at": _now()})
    _write(user["id"], row, notes=notes)
    events_service.record_for_user(user["id"], "memory_note_added", None, {"notes": len(notes)})
    return build(user["id"])


def delete_note(user: dict, note_id: str) -> dict:
    row = _editable(user["id"])
    notes = [n for n in row.get("notes") or [] if isinstance(n, dict)]
    kept = [n for n in notes if n.get("id") != note_id]
    if len(kept) == len(notes):
        raise ApiError(404, "MEMORY_ITEM_NOT_FOUND", "Essa nota não está mais na memória.")
    _write(user["id"], row, notes=kept)
    events_service.record_for_user(user["id"], "memory_item_removed", None, {"source": "note"})
    return build(user["id"])


def hide(user: dict, source: str, item_id: str) -> dict:
    """Tira da memória um pedido ou um "o que faltou". O feedback continua no histórico; só deixa de orientar a IA."""
    row = _editable(user["id"])
    memory = build(user["id"])
    pool = memory["requests"] if source == "request" else memory["missing"]
    if not any(item["id"] == item_id for item in pool):
        raise ApiError(404, "MEMORY_ITEM_NOT_FOUND", "Esse aprendizado não está mais na memória.")
    hidden = [h for h in row.get("hidden") or [] if isinstance(h, dict)]
    hidden.append({"source": source, "id": item_id})
    _write(user["id"], row, hidden=hidden[-200:])
    events_service.record_for_user(user["id"], "memory_item_removed", None, {"source": source})
    return build(user["id"])


def forget(user: dict) -> dict:
    """Esquecer tudo: a memória recomeça agora. Análises e revisões antigas continuam como estavam."""
    row = _editable(user["id"])
    _write(user["id"], row, forgotten_at=_now(), notes=[], hidden=[])
    events_service.record_for_user(user["id"], "memory_forgotten", None, {})
    return build(user["id"])
