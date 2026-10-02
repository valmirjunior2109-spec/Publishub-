"""A timeline exportada: o plano no Premiere/DaVinci, uma faixa para cada coisa.

O benchmark: um vídeo de 10 minutos com mais de 10 faixas. O XML precisa ser
válido, cada faixa sem blocos sobrepostos e tudo no tempo certo depois dos cortes.
"""

import time
import xml.etree.ElementTree as ET

from app.services import timeline_export
from tests.conftest import ALICE, auth, register, upload, upload_image

TEN_MINUTES = 600.0


def ten_minute_analysis() -> dict:
    """Uma frase a cada 2 s, e o plano com as sete frentes, umas sobrepostas às outras."""
    transcript = [{"start_seconds": t, "end_seconds": t + 1.8, "text": f"Frase número {i} & <coisa> \"citada\""} for i, t in enumerate(range(0, 600, 2))]
    kinds = ["hook", "cut", "pacing", "broll", "caption", "structure", "cta"]
    plan = []
    for i in range(28):
        kind = kinds[i % len(kinds)]
        start = 10.0 + i * 20
        # duas por frente se sobrepõem: o segundo item vai para uma faixa a mais
        plan.append({"kind": kind, "at_seconds": start, "end_seconds": start + 30, "title": f"{kind} {i}", "action": "Faça isto", "why": "porque sim", "impact": 5, "effort": "rapido"})
    plan.append({"kind": "pacing", "at_seconds": 300.0, "end_seconds": 301.6, "title": None, "action": None, "why": None, "code": "long_pause", "params": {"seconds": 1.6}, "impact": 4, "effort": "rapido"})
    plan.append({"kind": "cta", "at_seconds": 590.0, "end_seconds": None, "title": "Peça para salvar", "action": "Diga: salva este vídeo", "why": "", "impact": 6, "effort": "rapido"})
    return {
        "videos": {"filename": "Meu vídeo 4K.MOV", "duration_seconds": TEN_MINUTES},
        "result": {
            "transcript": transcript,
            "copilot": {"recommendations": plan},
            "signals": {"duration_seconds": TEN_MINUTES, "width": 2160, "height": 3840, "has_audio": True, "fps": 29.97, "audio_channels": 2},
        },
    }


def tracks(xml: str):
    root = ET.fromstring(xml.split("\n", 2)[2])  # sem a declaração e o DOCTYPE
    sequence = root.find("sequence")
    return sequence, sequence.findall("media/video/track"), sequence.findall("media/audio/track")


def spans(track) -> list[tuple[int, int]]:
    return [(int(item.findtext("start")), int(item.findtext("end"))) for item in track if item.tag in ("clipitem", "generatoritem")]


def test_ten_minutes_and_more_than_ten_tracks():
    analysis = ten_minute_analysis()
    suggestions = [{"start_seconds": 100.0, "end_seconds": 101.0, "reason": "long_pause"}]
    started = time.monotonic()
    xml, summary = timeline_export.build(analysis, None, suggestions, "pt-BR")
    assert time.monotonic() - started < 2  # é texto: não pode depender do tamanho do vídeo

    sequence, video, audio = tracks(xml)
    assert summary["tracks"] == len(video) + len(audio) > 10
    assert len(audio) == 2
    # 29,97 vira base 30 com NTSC, e a sequência tem os 10 minutos inteiros
    assert sequence.findtext("rate/timebase") == "30" and sequence.findtext("rate/ntsc") == "TRUE"
    assert int(sequence.findtext("duration")) == round(TEN_MINUTES * 30000 / 1001)
    # o vídeo inteiro na V1 (nenhum corte aplicado), a fala inteira na V2
    assert spans(video[0]) == [(0, round(TEN_MINUTES * 30000 / 1001))]
    assert len(spans(video[1])) == 300 and video[1].findtext("enabled") == "TRUE"
    # as faixas de instrução entram desligadas, e nenhuma faixa tem blocos sobrepostos
    assert all(track.findtext("enabled") == "FALSE" for track in video[2:])
    for track in video:
        blocks = spans(track)
        assert all(a_end <= b_start for (_, a_end), (b_start, _) in zip(blocks, blocks[1:]))
    # o texto escapado volta igual, o item medido ganha frase, e todo item vira marcador
    names = [g.findtext("name") for g in sequence.iter("generatoritem")]
    assert 'Frase número 0 & <coisa> "citada"' in names
    assert "[Ritmo] Pausa de 1.6s: encurte" in names
    assert any(n.startswith("[Corte sugerido]") for n in names)
    assert len(sequence.findall("marker")) == summary["markers"] == 30
    # a mídia aponta para o arquivo original, que o editor pede para localizar
    assert sequence.find(".//file/pathurl").text == "file://localhost/Meu%20v%C3%ADdeo%204K.MOV"


def test_applied_cuts_close_the_gaps_and_move_everything_after_them():
    analysis = ten_minute_analysis()
    edit = {"cuts": [{"start_seconds": 0.0, "end_seconds": 10.0}, {"start_seconds": 100.0, "end_seconds": 160.0}]}
    xml, summary = timeline_export.build(analysis, edit, [{"start_seconds": 1.0, "end_seconds": 2.0, "reason": "dead_start"}], "en")
    _, video, _ = tracks(xml)

    fps = 30000 / 1001
    assert summary["cuts_applied"] == 2 and summary["seconds"] == 530.0
    # dois pedaços do original, um colado no outro
    assert spans(video[0]) == [(0, round(90 * fps)), (round(90 * fps), round(530 * fps))]
    first = video[0].find("clipitem")
    assert (int(first.findtext("in")), int(first.findtext("out"))) == (round(10 * fps), round(100 * fps))
    # a frase que estava em 160 s agora está em 90 s; a que estava dentro do corte sumiu
    speech = {g.findtext("name"): int(g.findtext("start")) for g in video[1].iter("generatoritem")}
    assert speech["Frase número 80 & <coisa> \"citada\""] == round(90 * fps)
    assert "Frase número 60 & <coisa> \"citada\"" not in speech
    # com corte aplicado, as sugestões não entram de novo
    assert not any((g.findtext("name") or "").startswith("[Suggested cut]") for v in video for g in v.iter("generatoritem"))


def test_the_api_exports_only_complete_analyses_of_the_owner(client, fake_db, fake_ai, sample_video):
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    analysis_id = created.json()["analysis"]["id"]

    response = client.get(f"/api/analyses/{analysis_id}/timeline?locale=pt-BR", headers=auth())
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/xml")
    assert response.headers["content-disposition"].endswith('-publishub.xml"')
    _, video, audio = tracks(response.text)
    assert len(video) >= 3 and audio
    assert any(e["name"] == "timeline_exported" for e in fake_db.events)

    # de outra conta, 404
    assert client.get(f"/api/analyses/{analysis_id}/timeline", headers=auth("bob-token")).status_code == 404
