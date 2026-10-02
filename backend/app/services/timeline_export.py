"""A análise como timeline para o editor que o criador já usa.

O Publishub não substitui o editor: ele entrega o plano. Este módulo transforma o
plano numa sequência que o Premiere Pro e o DaVinci Resolve abrem (XML no formato
do Final Cut Pro 7, o "xmeml", que os dois importam), com uma faixa para cada coisa:

  V1          o vídeo, já com os cortes que o criador aplicou (ou inteiro, se ainda
              não aplicou nenhum)
  V2          a fala como legenda, um bloco por frase da transcrição
  V3…         uma faixa por frente do plano (gancho, cortes, ritmo, b-roll, texto na
              tela, estrutura, CTA) e, sem cortes aplicados, os cortes sugeridos.
              Itens da mesma frente que se sobrepõem vão para uma faixa a mais, em
              vez de um cobrir o outro.
  A1, A2      o áudio do vídeo

As faixas de instrução entram desligadas: são anotações no lugar certo da linha do
tempo, não algo para renderizar. Cada item também vira um marcador na régua, com a
instrução inteira no comentário, que é o que todo editor importa sem perder nada.

O arquivo de vídeo não vai junto: o XML aponta para o nome do arquivo original e o
editor pede para localizar a mídia ao abrir. Nada aqui baixa o vídeo nem chama IA:
sai tudo do resultado já guardado da análise, em milissegundos, para vídeos de 10
minutos com centenas de frases.
"""

import re
import unicodedata
from urllib.parse import quote
from xml.sax.saxutils import escape

from app.services import video_editing

# Um item sem fim (uma instrução num instante) ocupa este tanto na faixa, para dar
# para ver e clicar.
POINT_SECONDS = 2.0
# Menos que isto não aparece na timeline de nenhum editor.
_MIN_FRAMES = 1

# a ordem das faixas de instrução, de baixo para cima
KIND_ORDER = ["hook", "cut", "pacing", "broll", "caption", "structure", "cta"]

LABELS = {
    "pt": {
        "hook": "Gancho", "cut": "Corte", "pacing": "Ritmo", "broll": "B-roll", "caption": "Texto na tela",
        "structure": "Estrutura", "cta": "CTA", "suggested_cut": "Corte sugerido", "speech": "Fala",
        "sequence": "Publishub", "dead_start": "Início parado ({seconds}s): comece direto na fala",
        "dead_end": "Fim parado ({seconds}s): corte o final", "long_pause": "Pausa de {seconds}s: encurte",
        "static_shot": "Mesmo plano por {seconds}s: troque o plano ou entre um b-roll",
        "repetition": "Frase repetida: fique com uma", "hesitation": "Hesitação: dá para tirar",
    },
    "en": {
        "hook": "Hook", "cut": "Cut", "pacing": "Pacing", "broll": "B-roll", "caption": "On-screen text",
        "structure": "Structure", "cta": "CTA", "suggested_cut": "Suggested cut", "speech": "Speech",
        "sequence": "Publishub", "dead_start": "Dead start ({seconds}s): open on the first word",
        "dead_end": "Dead ending ({seconds}s): trim the end", "long_pause": "{seconds}s pause: tighten it",
        "static_shot": "Same shot for {seconds}s: change the framing or add b-roll",
        "repetition": "Repeated line: keep one take", "hesitation": "Hesitation: safe to remove",
    },
    "es": {
        "hook": "Gancho", "cut": "Corte", "pacing": "Ritmo", "broll": "B-roll", "caption": "Texto en pantalla",
        "structure": "Estructura", "cta": "CTA", "suggested_cut": "Corte sugerido", "speech": "Habla",
        "sequence": "Publishub", "dead_start": "Inicio parado ({seconds}s): empieza directo en el habla",
        "dead_end": "Final parado ({seconds}s): corta el final", "long_pause": "Pausa de {seconds}s: acórtala",
        "static_shot": "Mismo plano por {seconds}s: cambia el plano o mete b-roll",
        "repetition": "Frase repetida: quédate con una", "hesitation": "Duda: se puede quitar",
    },
}


def _labels(locale: str | None) -> dict:
    return LABELS.get(str(locale or "pt").split("-")[0].lower(), LABELS["pt"])


class _Rate:
    """A base de tempo do vídeo: 29,97 vira 30 com NTSC, como os editores esperam."""

    def __init__(self, fps: float | None):
        fps = float(fps) if fps and 1 <= float(fps) <= 240 else 30.0
        self.timebase = max(1, round(fps))
        self.ntsc = abs(fps - self.timebase) > 0.01
        self.real = self.timebase * 1000 / 1001 if self.ntsc else float(self.timebase)

    def frames(self, seconds: float) -> int:
        return max(0, round(seconds * self.real))

    def xml(self) -> str:
        return f"<rate><timebase>{self.timebase}</timebase><ntsc>{'TRUE' if self.ntsc else 'FALSE'}</ntsc></rate>"


class _Remap:
    """Leva um segundo do vídeo original para o segundo da timeline já cortada."""

    def __init__(self, kept: list[tuple[float, float]]):
        self.kept = kept

    def __call__(self, second: float) -> float:
        offset = 0.0
        for start, end in self.kept:
            if second < start:
                return offset  # dentro de um trecho cortado: vai para a emenda
            if second <= end:
                return offset + (second - start)
            offset += end - start
        return offset


def _text(value) -> str:
    return escape(str(value or "").strip(), {'"': "&quot;"})


def _lanes(items: list[dict]) -> list[list[dict]]:
    """Distribui blocos em faixas sem sobreposição: o primeiro que cabe, cabe."""
    lanes: list[list[dict]] = []
    for item in sorted(items, key=lambda i: (i["start"], i["end"])):
        for lane in lanes:
            if lane[-1]["end"] <= item["start"]:
                lane.append(item)
                break
        else:
            lanes.append([item])
    return lanes


def _recommendation_text(item: dict, labels: dict) -> tuple[str, str]:
    """O título e a instrução de um item do plano. Os medidos (sem IA) só têm código e números."""
    title = (item.get("title") or "").strip()
    if not title and item.get("code"):
        template = labels.get(item["code"])
        params = item.get("params") or {}
        title = template.format(**params) if template else item["code"]
    action = " ".join(part for part in [(item.get("action") or "").strip(), (item.get("why") or "").strip()] if part)
    return title or labels.get(item.get("kind"), ""), action


def build(analysis: dict, edit: dict | None, suggestions: list[dict], locale: str | None = None) -> tuple[str, dict]:
    """O XML da timeline e um resumo (quantas faixas, blocos e marcadores) para o evento.

    `edit` é a edição desta análise (os cortes que o criador aplicou), ou None.
    `suggestions` são os cortes sugeridos (`edit_service.suggestion_items`): só entram
    numa faixa própria quando nenhum corte foi aplicado.
    """
    labels = _labels(locale)
    result = analysis.get("result") or {}
    video = analysis.get("videos") or {}
    signals = result.get("signals") or {}
    duration = float(video.get("duration_seconds") or signals.get("duration_seconds") or 0)
    if duration <= 0:
        raise ValueError("analysis without duration")

    rate = _Rate(signals.get("fps"))
    width = int(signals.get("width") or 1080)
    height = int(signals.get("height") or 1920)
    has_audio = signals.get("has_audio", True) is not False
    channels = 1 if signals.get("audio_channels") == 1 else 2
    filename = video.get("filename") or "video.mp4"

    applied = [(float(c["start_seconds"]), float(c["end_seconds"])) for c in (edit or {}).get("cuts") or []]
    kept = [(0.0, duration)]
    if applied:
        try:
            kept = video_editing.keep_segments(video_editing.normalise([{"start_seconds": s, "end_seconds": e} for s, e in applied], duration), duration)
        except video_editing.CutError:
            applied, kept = [], [(0.0, duration)]
    remap = _Remap(kept)
    total = sum(end - start for start, end in kept)
    total_frames = rate.frames(total)
    file_frames = rate.frames(duration)

    def block(start: float, end: float | None, name: str, text: str) -> dict | None:
        """Um bloco da timeline em quadros, já no tempo cortado. None se sumiu no corte."""
        end = start + POINT_SECONDS if end is None or end <= start else end
        a, b = rate.frames(remap(max(0.0, start))), rate.frames(remap(min(duration, end)))
        b = min(b, total_frames)
        if b - a < _MIN_FRAMES:
            return None
        return {"start": a, "end": b, "name": name, "text": text}

    # ---- as faixas de cima: a fala e o plano
    speech = []
    for segment in result.get("transcript") or []:
        text = (segment.get("text") or "").strip()
        item = block(float(segment["start_seconds"]), float(segment["end_seconds"]), text[:80], text) if text else None
        if item:
            speech.append(item)

    plan = ((result.get("copilot") or {}).get("recommendations")) or []
    by_kind: dict[str, list[dict]] = {}
    markers: list[dict] = []
    for item in plan:
        kind = item.get("kind") if item.get("kind") in KIND_ORDER else "structure"
        title, action = _recommendation_text(item, labels)
        name = f"[{labels[kind]}] {title}"
        placed = block(float(item.get("at_seconds") or 0), item.get("end_seconds"), name, f"{title}\n{action}".strip())
        if not placed:
            continue
        by_kind.setdefault(kind, []).append(placed)
        markers.append({"frame": placed["start"], "end": placed["end"], "name": name, "comment": action or title})

    if not applied:
        for item in suggestions:
            title = labels.get(item.get("reason"), labels["suggested_cut"])
            placed = block(float(item["start_seconds"]), float(item["end_seconds"]), f"[{labels['suggested_cut']}] {title}", title)
            if placed:
                by_kind.setdefault("suggested_cut", []).append(placed)

    note_tracks: list[list[dict]] = []
    for kind in [*KIND_ORDER, "suggested_cut"]:
        note_tracks.extend(_lanes(by_kind.get(kind, [])))
    speech_tracks = _lanes(speech)

    # ---- o XML
    file_xml = (
        f'<file id="file-1"><name>{_text(filename)}</name><pathurl>file://localhost/{quote(filename)}</pathurl>'
        f"{rate.xml()}<duration>{file_frames}</duration>"
        f"<timecode>{rate.xml()}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>"
        f"<media><video><samplecharacteristics>{rate.xml()}<width>{width}</width><height>{height}</height>"
        f"<pixelaspectratio>square</pixelaspectratio></samplecharacteristics></video>"
        + (
            f"<audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>{channels}</channelcount></audio>"
            if has_audio
            else ""
        )
        + "</media></file>"
    )

    audio_tracks = channels if has_audio else 0
    video_clips: list[str] = []
    audio_clips: list[list[str]] = [[] for _ in range(audio_tracks)]
    cursor = 0
    for index, (start, end) in enumerate(kept):
        src_in, src_out = rate.frames(start), rate.frames(end)
        length = src_out - src_in
        tl_start, tl_end = cursor, cursor + length
        cursor = tl_end
        ids = [f"clip-v-{index}"] + [f"clip-a{ch + 1}-{index}" for ch in range(audio_tracks)]
        links = "".join(
            f"<link><linkclipref>{ref}</linkclipref><mediatype>{'video' if n == 0 else 'audio'}</mediatype>"
            f"<trackindex>{1 if n == 0 else n}</trackindex><clipindex>{index + 1}</clipindex></link>"
            for n, ref in enumerate(ids)
        )
        common = (
            f"<name>{_text(filename)}</name><enabled>TRUE</enabled><duration>{file_frames}</duration>{rate.xml()}"
            f"<start>{tl_start}</start><end>{tl_end}</end><in>{src_in}</in><out>{src_out}</out>"
        )
        file_ref = file_xml if index == 0 else '<file id="file-1"/>'
        video_clips.append(f'<clipitem id="{ids[0]}">{common}{file_ref}{links}</clipitem>')
        for ch in range(audio_tracks):
            audio_clips[ch].append(
                f'<clipitem id="{ids[ch + 1]}">{common}<file id="file-1"/>'
                f"<sourcetrack><mediatype>audio</mediatype><trackindex>{ch + 1}</trackindex></sourcetrack>{links}</clipitem>"
            )

    generator_count = 0

    def generator_track(items: list[dict], enabled: bool) -> str:
        nonlocal generator_count
        clips = []
        for item in items:
            generator_count += 1
            length = item["end"] - item["start"]
            clips.append(
                f'<generatoritem id="text-{generator_count}"><name>{_text(item["name"][:120])}</name><enabled>TRUE</enabled>'
                f"<duration>{length}</duration>{rate.xml()}<start>{item['start']}</start><end>{item['end']}</end>"
                f"<in>0</in><out>{length}</out>"
                "<effect><name>Text</name><effectid>Text</effectid><effectcategory>Text</effectcategory>"
                "<effecttype>generator</effecttype><mediatype>video</mediatype>"
                f"<parameter><parameterid>str</parameterid><name>Text</name><value>{_text(item['text'])}</value></parameter>"
                "</effect></generatoritem>"
            )
        return f"<track><enabled>{'TRUE' if enabled else 'FALSE'}</enabled><locked>FALSE</locked>{''.join(clips)}</track>"

    video_tracks = [f"<track><enabled>TRUE</enabled><locked>FALSE</locked>{''.join(video_clips)}</track>"]
    video_tracks += [generator_track(lane, enabled=True) for lane in speech_tracks]
    video_tracks += [generator_track(lane, enabled=False) for lane in note_tracks]
    audio_xml = "".join(f"<track><enabled>TRUE</enabled><locked>FALSE</locked>{''.join(clips)}</track>" for clips in audio_clips)

    marker_xml = "".join(
        f"<marker><name>{_text(m['name'][:120])}</name><comment>{_text(m['comment'])}</comment>"
        f"<in>{m['frame']}</in><out>{m['end']}</out></marker>"
        for m in sorted(markers, key=lambda m: m["frame"])
    )

    base = re.sub(r"\.[A-Za-z0-9]{2,4}$", "", filename)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="5">'
        f'<sequence id="sequence-1"><name>{_text(labels["sequence"])} · {_text(base)}</name>'
        f"<duration>{total_frames}</duration>{rate.xml()}"
        f"<timecode>{rate.xml()}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>"
        f"<media><video><format><samplecharacteristics>{rate.xml()}<width>{width}</width><height>{height}</height>"
        f"<pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>{''.join(video_tracks)}</video>"
        f"<audio><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>{audio_xml}</audio>"
        f"</media>{marker_xml}</sequence></xmeml>\n"
    )
    summary = {
        "video_tracks": len(video_tracks),
        "audio_tracks": audio_tracks,
        "tracks": len(video_tracks) + audio_tracks,
        "blocks": generator_count,
        "markers": len(markers),
        "cuts_applied": len(applied),
        "seconds": round(total, 1),
        "fps": round(rate.real, 3),
    }
    return xml, summary


def filename_for(analysis: dict) -> str:
    base = re.sub(r"\.[A-Za-z0-9]{2,4}$", "", (analysis.get("videos") or {}).get("filename") or "video")
    # vai num header HTTP: só ASCII ("vídeo" vira "video")
    ascii_base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode("ascii")
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", ascii_base).strip("-")[:80] or "video"
    return f"{safe}-publishub.xml"

