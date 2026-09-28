"""O que o criador decide sobre cada corte sugerido. A IA sugere, o criador decide.

Cada sugestão de corte de uma análise (a lista de `edit_service.suggestion_items`)
pode ser aceita, rejeitada ou aceita com o trecho ajustado. As decisões ficam
guardadas, uma por sugestão e por pessoa, e são duas coisas:

  - o estado da revisão: quem volta à página encontra as escolhas onde deixou;
  - a base das preferências: quanto cada pessoa aceita, rejeita e ajusta de cada
    tipo de corte, para as próximas sugestões se parecerem com o que ela escolhe.

Guardar a decisão é bom, mas não é o que a pessoa veio fazer: se a tabela ainda
não existir (a migração 20260928000000 não rodou) ou o banco falhar, a revisão
continua funcionando na tela e a decisão só não fica guardada.
"""

import logging
from datetime import datetime, timezone

from app.core.errors import ApiError
from app.services import edit_service, supabase_service as db

logger = logging.getLogger("publishub")

# Um corte mais curto que isto não muda o vídeo (é o mesmo limite do corte em si).
MIN_CUT_SECONDS = 0.2
# Dois instantes a menos que isto de distância são o mesmo: não é ajuste.
_SAME_SECONDS = 0.05


def _duration(analysis: dict) -> float:
    return float((analysis.get("videos") or {}).get("duration_seconds") or 0)


def save(user: dict, analysis: dict, items: list[dict]) -> dict:
    """Grava as decisões (uma ou várias). "pending" apaga a decisão: é o desfazer."""
    catalog = edit_service.suggestion_items(analysis)
    duration = _duration(analysis)
    now = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []
    pending: list[int] = []

    for item in items:
        index = item["index"]
        if index >= len(catalog):
            raise ApiError(422, "UNKNOWN_SUGGESTION", "Essa sugestão não existe nesta análise.")
        if item["decision"] == "pending":
            pending.append(index)
            continue

        suggestion = catalog[index]
        adjusted_start = adjusted_end = None
        if item["decision"] == "accepted" and (item.get("start_seconds") is not None or item.get("end_seconds") is not None):
            start = item.get("start_seconds") if item.get("start_seconds") is not None else suggestion["start_seconds"]
            end = item.get("end_seconds") if item.get("end_seconds") is not None else suggestion["end_seconds"]
            if duration > 0 and end > duration + _SAME_SECONDS:
                raise ApiError(422, "INVALID_RANGE", "O trecho passa do fim do vídeo.")
            if end - start < MIN_CUT_SECONDS:
                raise ApiError(422, "INVALID_RANGE", "O trecho ficou curto demais para cortar.")
            # só é ajuste se mudou de verdade; senão é a sugestão como veio
            if abs(start - suggestion["start_seconds"]) >= _SAME_SECONDS or abs(end - suggestion["end_seconds"]) >= _SAME_SECONDS:
                adjusted_start, adjusted_end = round(start, 2), round(min(end, duration) if duration > 0 else end, 2)

        rows.append(
            {
                "analysis_id": analysis["id"],
                "user_id": user["id"],
                "suggestion_index": index,
                "kind": suggestion["kind"],
                "start_seconds": suggestion["start_seconds"],
                "end_seconds": suggestion["end_seconds"],
                "decision": item["decision"],
                "adjusted_start": adjusted_start,
                "adjusted_end": adjusted_end,
                "updated_at": now,
            }
        )

    try:
        if rows:
            db.upsert_suggestion_decisions(rows)
        if pending:
            db.delete_suggestion_decisions(analysis["id"], user["id"], pending)
    except db.SupabaseError:
        logger.warning("could not store suggestion decisions for analysis %s (migration 20260928000000 pending?)", analysis["id"])
        return {"saved": False}
    return {"saved": True}


def for_analysis(analysis_id: str, user_id: str) -> list[dict]:
    """As decisões já tomadas nesta análise, para a revisão voltar como estava."""
    try:
        rows = db.list_suggestion_decisions(analysis_id, user_id)
    except db.SupabaseError:
        return []
    out = []
    for row in rows:
        adjusted = row.get("adjusted_start") is not None and row.get("adjusted_end") is not None
        out.append(
            {
                "index": int(row["suggestion_index"]),
                "decision": row["decision"],
                "adjusted": adjusted,
                # o trecho que vale: o ajustado, se houver
                "start_seconds": float(row["adjusted_start"] if adjusted else row["start_seconds"]),
                "end_seconds": float(row["adjusted_end"] if adjusted else row["end_seconds"]),
            }
        )
    return out


def preferences(user: dict) -> dict:
    """O resumo simples do que a pessoa costuma decidir, por tipo de corte."""
    try:
        rows = db.list_user_suggestion_decisions(user["id"])
    except db.SupabaseError:
        return {"available": False, "total": 0, "by_kind": {}}

    by_kind: dict[str, dict] = {}
    for row in rows:
        kind = row.get("kind") or "cut"
        counts = by_kind.setdefault(kind, {"accepted": 0, "rejected": 0, "adjusted": 0})
        counts[row["decision"]] += 1
        if row["decision"] == "accepted" and row.get("adjusted_start") is not None:
            counts["adjusted"] += 1
    for counts in by_kind.values():
        decided = counts["accepted"] + counts["rejected"]
        counts["acceptance_rate"] = round(counts["accepted"] / decided, 2) if decided else None
    return {"available": True, "total": len(rows), "by_kind": by_kind}
