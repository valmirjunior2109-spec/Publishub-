"""Os cortes sugeridos de uma análise: o que a IA apontou somado ao que foi medido.

A IA sugere, o criador decide. Este módulo só monta a lista de sugestões — nada
aqui corta o vídeo. Tudo sai do resultado já guardado da análise (a transcrição
com tempos, as pausas medidas pelo ffmpeg e o plano da IA), então funciona também
para análises antigas, sem rodar nada de novo.

As fontes:
  - a IA: as recomendações de "cut" e "pacing" que cobrem um trecho;
  - as pausas medidas: silêncio longo no meio, início parado, fim parado;
  - a transcrição: a mesma frase dita duas vezes seguidas (o recomeço) e o
    segmento que é só hesitação ("é…", "hum", "tipo").

A confiança é qualitativa e vem de sinais medidos, nunca de uma porcentagem
inventada: quanto do trecho é silêncio medido, quão parecidas são as duas frases,
se a IA foi confirmada por uma medida. O número que aparece na tela é a medida em
si ("92% do trecho é silêncio"), não uma "certeza" da IA.

Sobreposição: duas sugestões que tocam o mesmo trecho viram uma só. Fica a mais
relevante (a da IA, que tem texto, ou a de maior peso), e as outras entram em
`merged` — o criador vê um card, com a nota do que mais apontou aquele trecho.
Assim a linha do tempo nunca tem cortes contraditórios.

Memória: se a análise foi feita com a memória do criador, o resultado guarda a
inclinação dele por tipo de corte (`result.memory.cut_leanings`), e cada sugestão
leva `memory`: "accept" (ele costuma aceitar esse tipo), "reject" (costuma
recusar) ou None. A lista em si não muda: a memória só diz como a sugestão já
vem marcada, e a posição continua sendo a identidade dela.
"""

import re
import unicodedata
from difflib import SequenceMatcher

# pausa no meio da fala que vale sugerir cortar
LONG_PAUSE_SECONDS = 0.8
# quanto de respiro fica em cada lado de uma pausa cortada (a emenda não fica seca)
BREATH_SECONDS = 0.15
# silêncio que começa até aqui é "início parado"; que termina até aqui do fim, "fim parado"
EDGE_SECONDS = 0.2
# duas frases seguidas tão parecidas assim são a mesma frase dita de novo
REPEAT_SIMILARITY = 0.75
HIGH_REPEAT_SIMILARITY = 0.9
# um segmento só de hesitação, curto: dá para tirar inteiro
HESITATION_MAX_SECONDS = 3.0
# menor corte que faz sentido sugerir
MIN_CUT_SECONDS = 0.3

# as palavras de hesitação mais comuns nos três idiomas do site
FILLERS = {
    "e", "é", "ee", "éé", "eh", "ehh", "ah", "ahn", "ã", "hã", "han", "hum", "hmm", "hm", "mm", "mmm", "uh", "uhm", "um", "umm", "er", "erm",
    "tipo", "né", "ne", "então", "entao", "assim", "bom", "bem", "sabe",
    "like", "so", "well", "okay", "ok", "you", "know",
    "este", "pues", "bueno", "o", "sea", "vale",
}

# o peso de cada motivo quando dois apontam o mesmo trecho (a IA usa o impacto dela, 0–10)
WEIGHT = {"dead_start": 9, "repetition": 7, "long_pause": 6, "hesitation": 6, "dead_end": 5}


def _words(text: str) -> list[str]:
    plain = unicodedata.normalize("NFC", text.lower())
    return re.findall(r"[\wáàâãéêíóôõúç]+", plain)


def _overlap(a: tuple[float, float], spans: list[tuple[float, float]]) -> float:
    """Quantos segundos de `a` caem dentro de `spans`."""
    total = 0.0
    for start, end in spans:
        total += max(0.0, min(a[1], end) - max(a[0], start))
    return total


def _suggestion(start: float, end: float, reason: str, source: str, **extra) -> dict:
    return {"start_seconds": round(start, 2), "end_seconds": round(end, 2), "reason": reason, "source": source, "params": {}, "merged": [], **extra}


def _from_ai(result: dict) -> list[dict]:
    copilot = result.get("copilot") or {}
    out = []
    for position, item in enumerate(copilot.get("recommendations") or []):
        if item.get("kind") not in ("cut", "pacing") or item.get("end_seconds") is None:
            continue
        start, end = float(item["at_seconds"]), float(item["end_seconds"])
        if end - start < MIN_CUT_SECONDS:
            continue
        # plano medido (a IA não respondeu): o item já tem código e números, não texto
        code = item.get("code")
        reason = code if code in WEIGHT else ("pacing" if item["kind"] == "pacing" else "low_information")
        out.append(
            _suggestion(
                start,
                end,
                reason,
                "ai" if item.get("title") else "measured",
                kind=item["kind"],
                title=item.get("title"),
                why=item.get("why") or item.get("action"),
                impact=int(item.get("impact") or 0),
                params=dict(item.get("params") or {}),
                recommendation_index=position,
            )
        )
    return out


def _from_silences(silences: list[tuple[float, float]], duration: float) -> list[dict]:
    out = []
    for start, end in silences:
        length = end - start
        if length < LONG_PAUSE_SECONDS:
            continue
        if start <= EDGE_SECONDS:
            cut = (0.0, max(0.0, end - 0.1))
            reason = "dead_start"
        elif duration and end >= duration - EDGE_SECONDS:
            cut = (start + 0.1, duration)
            reason = "dead_end"
        else:
            cut = (start + BREATH_SECONDS, end - BREATH_SECONDS)
            reason = "long_pause"
        if cut[1] - cut[0] >= MIN_CUT_SECONDS:
            out.append(_suggestion(cut[0], cut[1], reason, "measured", kind="cut" if reason != "long_pause" else "pacing", params={"seconds": round(length, 1)}))
    return out


def _from_transcript(segments: list[dict]) -> list[dict]:
    out = []
    for index, segment in enumerate(segments):
        start, end = float(segment["start_seconds"]), float(segment["end_seconds"])
        words = _words(segment.get("text") or "")

        # hesitação: um segmento curto que é só "é…", "hum", "tipo"
        if words and end - start <= HESITATION_MAX_SECONDS and all(word in FILLERS for word in words):
            out.append(_suggestion(start, end, "hesitation", "measured", kind="cut", params={"text": (segment.get("text") or "").strip()[:60]}))
            continue

        # recomeço: a frase seguinte repete esta (ou começa igual e vai além)
        if index + 1 < len(segments) and len(words) >= 3:
            following = _words(segments[index + 1].get("text") or "")
            if len(following) < 3:
                continue
            similarity = SequenceMatcher(None, " ".join(words), " ".join(following)).ratio()
            restart = following[: len(words)] == words
            if similarity >= REPEAT_SIMILARITY or restart:
                next_start = float(segments[index + 1]["start_seconds"])
                cut_end = max(end, min(next_start, end + 0.5))
                out.append(
                    _suggestion(start, cut_end, "repetition", "measured", kind="cut", params={"similarity": 100 if restart else round(similarity * 100)})
                )
    return out


def _conflicts(a: dict, b: dict) -> bool:
    return min(a["end_seconds"], b["end_seconds"]) - max(a["start_seconds"], b["start_seconds"]) > 0.05


def _weight(item: dict) -> float:
    # a IA tem o texto que o criador lê: com o mesmo peso, ela fica na frente
    base = item.get("impact", 0) if item["source"] == "ai" else WEIGHT.get(item["reason"], 4)
    return base + (0.5 if item["source"] == "ai" else 0)


def _confidence(item: dict, silence_pct: int) -> str:
    reasons = {item["reason"], *item["merged"]}
    if reasons & {"long_pause", "dead_start", "dead_end"} and silence_pct >= 70:
        return "high"
    if "repetition" in reasons:
        similarity = item["params"].get("similarity") or max((m.get("similarity", 0) for m in item.get("_merged_params", [])), default=0)
        return "high" if similarity >= HIGH_REPEAT_SIMILARITY * 100 else "medium"
    if silence_pct >= 70:
        return "high"
    if "hesitation" in reasons or silence_pct >= 30 or len(reasons) > 1:
        return "medium"
    # só a IA, removendo fala, sem medida que confirme: vale pelo peso que ela deu
    return "medium" if item.get("impact", 0) >= 7 else "low"


def build(result: dict | None, duration: float) -> list[dict]:
    """A lista de cortes sugeridos, na ordem do vídeo, sem sobreposição, com a confiança de cada um."""
    result = result or {}
    duration = float(duration or (result.get("signals") or {}).get("duration_seconds") or 0)
    silences = [(float(s["start"]), float(s["end"])) for s in ((result.get("signals") or {}).get("silences") or [])]
    segments = [s for s in (result.get("transcript") or []) if s.get("end_seconds") is not None]
    speech = [(float(s["start_seconds"]), float(s["end_seconds"])) for s in segments]

    candidates = _from_ai(result) + _from_silences(silences, duration) + _from_transcript(segments)
    if duration > 0:
        for item in candidates:
            item["end_seconds"] = round(min(item["end_seconds"], duration), 2)
    candidates = [c for c in candidates if c["end_seconds"] - c["start_seconds"] >= MIN_CUT_SECONDS]

    # sobreposição: a mais relevante fica; as outras viram "também apontado como"
    kept: list[dict] = []
    for item in sorted(candidates, key=lambda c: (-_weight(c), c["start_seconds"])):
        owner = next((k for k in kept if _conflicts(k, item)), None)
        if owner is None:
            kept.append(item)
            continue
        if item["reason"] != owner["reason"] and item["reason"] not in owner["merged"]:
            owner["merged"].append(item["reason"])
        owner.setdefault("_merged_params", []).append(item["params"])

    # a foto da memória tirada quando a análise rodou (nunca a memória de agora)
    leanings = (result.get("memory") or {}).get("cut_leanings") or {}

    out = []
    for item in sorted(kept, key=lambda c: c["start_seconds"]):
        span = (item["start_seconds"], item["end_seconds"])
        length = span[1] - span[0]
        silence_pct = round(100 * _overlap(span, silences) / length) if length else 0
        speech_pct = round(100 * _overlap(span, speech) / length) if length else 0
        item["confidence"] = _confidence(item, silence_pct)
        item["evidence"] = {"silence_pct": min(100, silence_pct), "speech_pct": min(100, speech_pct)}
        item.pop("_merged_params", None)
        item.setdefault("kind", "cut")
        item.setdefault("title", None)
        item.setdefault("why", None)
        item.setdefault("impact", None)
        item.setdefault("recommendation_index", None)
        item["memory"] = leanings.get(item["reason"]) if leanings.get(item["reason"]) in ("accept", "reject") else None
        out.append(item)
    return out
