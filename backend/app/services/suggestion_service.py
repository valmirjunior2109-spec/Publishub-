"""O que o criador decide sobre cada corte. A IA sugere, o criador decide.

Cada sugestão de corte de uma análise (a lista de `edit_service.suggestion_items`)
pode ser aceita, rejeitada ou aceita com o trecho ajustado. O criador também pode
criar cortes à mão. As decisões ficam guardadas, uma por corte e por pessoa, e são
duas coisas:

  - o estado da revisão: quem volta à página encontra as escolhas onde deixou;
  - a base das preferências: o que a pessoa costuma aceitar, rejeitar e ajustar
    de cada tipo de corte (pausa longa, hesitação, repetição…).

Os cortes à mão usam as posições a partir de `MANUAL_BASE` na mesma tabela: as
sugestões nunca chegam perto disso (o plano tem no máximo uma dúzia de itens).

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
# Onde começam os cortes criados à mão (a tabela aceita posições até 99).
MANUAL_BASE = 60
MANUAL_LIMIT = 100
# Preferência só vale com um mínimo de decisões daquele tipo; antes disso, é chute.
MIN_DECISIONS = 3


def _duration(analysis: dict) -> float:
    return float((analysis.get("videos") or {}).get("duration_seconds") or 0)


def _range(item: dict, default: tuple[float, float], duration: float) -> tuple[float, float]:
    """O trecho pedido, conferido: dentro do vídeo e com tamanho de corte."""
    start = item.get("start_seconds") if item.get("start_seconds") is not None else default[0]
    end = item.get("end_seconds") if item.get("end_seconds") is not None else default[1]
    if duration > 0 and end > duration + _SAME_SECONDS:
        raise ApiError(422, "INVALID_RANGE", "O trecho passa do fim do vídeo.")
    if end - start < MIN_CUT_SECONDS:
        raise ApiError(422, "INVALID_RANGE", "O trecho ficou curto demais para cortar.")
    return round(start, 2), round(min(end, duration) if duration > 0 else end, 2)


def save(user: dict, analysis: dict, items: list[dict]) -> dict:
    """Grava as decisões (uma ou várias). "pending" apaga a decisão: é o desfazer."""
    catalog = edit_service.suggestion_items(analysis)
    duration = _duration(analysis)
    now = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []
    pending: list[int] = []

    for item in items:
        index = item["index"]
        manual = MANUAL_BASE <= index < MANUAL_LIMIT
        if not manual and index >= len(catalog):
            raise ApiError(422, "UNKNOWN_SUGGESTION", "Essa sugestão não existe nesta análise.")
        if item["decision"] == "pending":
            pending.append(index)
            continue

        base = {"analysis_id": analysis["id"], "user_id": user["id"], "suggestion_index": index, "decision": item["decision"], "updated_at": now}
        if manual:
            # um corte criado à mão só existe aceito (rejeitar é apagar)
            if item["decision"] != "accepted" or item.get("start_seconds") is None or item.get("end_seconds") is None:
                raise ApiError(422, "INVALID_RANGE", "Um corte feito à mão precisa de começo e fim.")
            start, end = _range(item, (0.0, 0.0), duration)
            rows.append({**base, "kind": "manual", "start_seconds": start, "end_seconds": end, "adjusted_start": None, "adjusted_end": None})
            continue

        suggestion = catalog[index]
        suggested = (suggestion["start_seconds"], suggestion["end_seconds"])
        adjusted_start = adjusted_end = None
        if item["decision"] == "accepted" and (item.get("start_seconds") is not None or item.get("end_seconds") is not None):
            start, end = _range(item, suggested, duration)
            # só é ajuste se mudou de verdade; senão é a sugestão como veio
            if abs(start - suggested[0]) >= _SAME_SECONDS or abs(end - suggested[1]) >= _SAME_SECONDS:
                adjusted_start, adjusted_end = start, end
        rows.append(
            {
                **base,
                # o motivo (pausa longa, hesitação…): é por ele que as preferências se formam
                "kind": suggestion["reason"],
                "start_seconds": suggested[0],
                "end_seconds": suggested[1],
                "adjusted_start": adjusted_start,
                "adjusted_end": adjusted_end,
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


def for_analysis(analysis: dict, user_id: str) -> list[dict]:
    """As decisões já tomadas nesta análise, para a revisão voltar como estava.

    Uma decisão só volta se a sugestão naquela posição ainda é o mesmo trecho: se
    a lista mudou (um detector novo, por exemplo), a decisão velha não pode cair
    num corte que o criador nunca viu.
    """
    try:
        rows = db.list_suggestion_decisions(analysis["id"], user_id)
    except db.SupabaseError:
        return []
    catalog = edit_service.suggestion_items(analysis)
    out = []
    for row in rows:
        index = int(row["suggestion_index"])
        start, end = float(row["start_seconds"]), float(row["end_seconds"])
        if index >= MANUAL_BASE:
            out.append({"index": index, "decision": "accepted", "adjusted": False, "manual": True, "start_seconds": start, "end_seconds": end})
            continue
        if index >= len(catalog):
            continue
        if abs(catalog[index]["start_seconds"] - start) >= _SAME_SECONDS or abs(catalog[index]["end_seconds"] - end) >= _SAME_SECONDS:
            continue
        adjusted = row.get("adjusted_start") is not None and row.get("adjusted_end") is not None
        out.append(
            {
                "index": index,
                "decision": row["decision"],
                "adjusted": adjusted,
                "manual": False,
                # o trecho que vale: o ajustado, se houver
                "start_seconds": float(row["adjusted_start"] if adjusted else start),
                "end_seconds": float(row["adjusted_end"] if adjusted else end),
            }
        )
    return sorted(out, key=lambda d: d["index"])


def _rate(counts: dict | None) -> float | None:
    if not counts:
        return None
    decided = counts["accepted"] + counts["rejected"]
    return counts["accepted"] / decided if decided >= MIN_DECISIONS else None


def _leaning(counts: dict | None) -> bool | None:
    """Sim quando aceita quase sempre, não quando rejeita quase sempre, nada no meio (ou sem dados)."""
    rate = _rate(counts)
    if rate is None:
        return None
    return True if rate >= 0.6 else False if rate <= 0.4 else None


def preferences(user: dict) -> dict:
    """O resumo simples do que a pessoa costuma decidir, por tipo de corte, e o que isso sugere.

    Nada de modelo: contagens e regras escritas, para dar para ler e evoluir. Cada
    preferência é null enquanto não houver `MIN_DECISIONS` decisões que a sustentem.
    """
    try:
        rows = db.list_user_suggestion_decisions(user["id"])
    except db.SupabaseError:
        return {"available": False, "total": 0, "by_type": {}, "preferences": {}}
    summary = summarize(rows)
    return {"available": True, "total": len(rows), "by_type": summary["by_type"], "preferences": summary["preferences"]}


def summarize(rows: list[dict]) -> dict:
    """As decisões viram contagens por tipo, as preferências e, por tipo, a inclinação.

    `leanings`: "accept" quando a pessoa aceita quase sempre aquele tipo de corte,
    "reject" quando recusa quase sempre; tipos sem decisões suficientes ou no meio
    do caminho ficam de fora. É o que a memória usa para já trazer a sugestão
    marcada do jeito que a pessoa costuma decidir. `shortens`: ela costuma
    encurtar os cortes que aceita (quer cortar menos do que a IA).
    """
    by_type: dict[str, dict] = {}
    shrunk = 0  # ajustes que deixaram o corte menor: a pessoa quer cortar menos do que a IA
    for row in rows:
        kind = row.get("kind") or "cut"
        counts = by_type.setdefault(kind, {"accepted": 0, "rejected": 0, "edited": 0})
        counts[row["decision"]] += 1
        if row["decision"] == "accepted" and row.get("adjusted_start") is not None:
            counts["edited"] += 1
            original = float(row.get("end_seconds") or 0) - float(row.get("start_seconds") or 0)
            adjusted = float(row.get("adjusted_end") or 0) - float(row["adjusted_start"])
            if adjusted < original - 0.05:
                shrunk += 1
    for counts in by_type.values():
        decided = counts["accepted"] + counts["rejected"]
        counts["acceptance_rate"] = round(counts["accepted"] / decided, 2) if decided else None

    suggestions = [c for kind, c in by_type.items() if kind != "manual"]
    overall = {"accepted": sum(c["accepted"] for c in suggestions), "rejected": sum(c["rejected"] for c in suggestions)} if suggestions else None
    pauses = by_type.get("long_pause")
    edits = sum(c["edited"] for c in suggestions)
    leaning = _leaning(overall)
    # encurtar o corte só diz algo a partir de alguns ajustes; com um só, é chute
    shortens = edits >= MIN_DECISIONS and shrunk * 2 > edits
    preferences = {
        # aceita quase todo corte e não costuma encurtar: gosta de vídeo enxuto
        "aggressive_cuts": None if leaning is None else (leaning and not shortens),
        "remove_long_pauses": _leaning(pauses),
        "remove_filler_words": _leaning(by_type.get("hesitation")),
        "remove_repetitions": _leaning(by_type.get("repetition")),
        "trim_dead_air": _leaning({"accepted": sum((by_type.get(k) or {}).get("accepted", 0) for k in ("dead_start", "dead_end")),
                                   "rejected": sum((by_type.get(k) or {}).get("rejected", 0) for k in ("dead_start", "dead_end"))}),
        # rejeita as pausas, ou aceita encurtando: quer manter o respiro natural
        "preserve_natural_pauses": (_leaning(pauses) is False or (pauses["edited"] >= MIN_DECISIONS and shortens)) if _rate(pauses) is not None else None,
    }
    leanings = {}
    for kind, counts in by_type.items():
        if kind == "manual":
            continue
        leaning = _leaning(counts)
        if leaning is not None:
            leanings[kind] = "accept" if leaning else "reject"
    return {"by_type": by_type, "preferences": preferences, "leanings": leanings, "shortens": shortens}
