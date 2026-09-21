"""Aplicar cortes num vídeo, com ffmpeg.

O `video_processing` só lê o arquivo; este módulo é o único que escreve um vídeo
novo — e mesmo assim nunca por cima: o original continua onde está, e o que sai
daqui é outro arquivo.

A conta é sempre a mesma: o criador aprova trechos para tirar, e o que sobra é
concatenado na ordem. Nada é removido sem aprovação explícita.
"""

import logging
from pathlib import Path

from app.services.video_processing import InvalidVideoError, _ffmpeg, probe

logger = logging.getLogger("publishub")

# Quantos cortes cabem numa edição. O plano tem no máximo 8 recomendações, então
# isto é folga, não limite de produto.
MAX_CUTS = 20
# Abaixo disso não sobra vídeo: recusar é melhor do que devolver um arquivo inútil.
MIN_REMAINING_SECONDS = 1.0
# Um trecho menor que isto não vale um corte (e vira glitch na concatenação).
MIN_SEGMENT_SECONDS = 0.15


class CutError(Exception):
    """O pedido de corte não faz sentido para este vídeo."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.message = message
        self.code = code


def normalise(cuts: list[dict], duration: float) -> list[tuple[float, float]]:
    """Os cortes pedidos, limpos: dentro do vídeo, ordenados e sem sobreposição.

    Dois cortes que se encostam viram um só — senão a concatenação faria um
    pedaço de zero segundo no meio.
    """
    if not cuts:
        raise CutError("Escolha pelo menos um corte para aplicar.", "no_cuts")
    if len(cuts) > MAX_CUTS:
        raise CutError("Cortes demais numa edição só.", "too_many_cuts")

    limpos: list[tuple[float, float]] = []
    for cut in cuts:
        start = max(0.0, round(float(cut["start_seconds"]), 2))
        end = min(duration, round(float(cut["end_seconds"]), 2))
        if end - start < MIN_SEGMENT_SECONDS:
            continue
        limpos.append((start, end))

    if not limpos:
        raise CutError("Os cortes escolhidos são curtos demais para valer a pena.", "cuts_too_short")

    limpos.sort()
    unidos = [limpos[0]]
    for start, end in limpos[1:]:
        anterior_start, anterior_end = unidos[-1]
        if start <= anterior_end + 0.05:
            unidos[-1] = (anterior_start, max(anterior_end, end))
        else:
            unidos.append((start, end))
    return unidos


def keep_segments(cuts: list[tuple[float, float]], duration: float) -> list[tuple[float, float]]:
    """O avesso dos cortes: os trechos que ficam, na ordem do vídeo."""
    mantidos: list[tuple[float, float]] = []
    cursor = 0.0
    for start, end in cuts:
        if start - cursor >= MIN_SEGMENT_SECONDS:
            mantidos.append((cursor, start))
        cursor = max(cursor, end)
    if duration - cursor >= MIN_SEGMENT_SECONDS:
        mantidos.append((cursor, duration))

    sobra = sum(end - start for start, end in mantidos)
    if sobra < MIN_REMAINING_SECONDS:
        raise CutError("Esses cortes tirariam o vídeo inteiro. Desmarque algum.", "nothing_left")
    return mantidos


def _filter_graph(segments: list[tuple[float, float]], with_audio: bool) -> str:
    """O filtro do ffmpeg: recorta cada trecho e emenda todos em sequência."""
    partes = []
    rotulos = []
    for index, (start, end) in enumerate(segments):
        partes.append(f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{index}]")
        rotulos.append(f"[v{index}]")
        if with_audio:
            partes.append(f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{index}]")
            rotulos.append(f"[a{index}]")
    saidas = "[outv][outa]" if with_audio else "[outv]"
    partes.append(f"{''.join(rotulos)}concat=n={len(segments)}:v=1:a={1 if with_audio else 0}{saidas}")
    return ";".join(partes)


def render(source: Path, destination: Path, cuts: list[dict], duration: float, has_audio: bool = True, timeout: int = 900) -> dict:
    """Escreve em `destination` o vídeo sem os trechos cortados.

    Devolve o que a tela precisa dizer depois: quanto tempo saiu, quanto sobrou e
    quais trechos ficaram.
    """
    normalizados = normalise(cuts, duration)
    mantidos = keep_segments(normalizados, duration)

    args = [
        "-y",
        "-i", str(source),
        "-filter_complex", _filter_graph(mantidos, has_audio),
        "-map", "[outv]",
    ]
    if has_audio:
        args += ["-map", "[outa]", "-c:a", "aac", "-b:a", "128k"]
    args += [
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        # o player do site começa a tocar sem baixar o arquivo inteiro
        "-movflags", "+faststart",
        str(destination),
    ]

    logger.info("cutting %s segments out of %s (%.1fs source)", len(normalizados), source.name, duration)
    saida = _ffmpeg(args, timeout=timeout)
    if not destination.exists() or destination.stat().st_size == 0:
        logger.error("ffmpeg produced no output: %s", saida[-500:])
        raise InvalidVideoError("ffmpeg não conseguiu gerar o vídeo cortado")

    nova_duracao = probe(destination).duration_seconds or sum(end - start for start, end in mantidos)
    return {
        "cuts": [{"start_seconds": start, "end_seconds": end} for start, end in normalizados],
        "kept": [{"start_seconds": start, "end_seconds": end} for start, end in mantidos],
        "removed_seconds": round(sum(end - start for start, end in normalizados), 2),
        "duration_seconds": round(nova_duracao, 2),
        "size_bytes": destination.stat().st_size,
    }
