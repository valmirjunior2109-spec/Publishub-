"""As ferramentas grátis: o leitor da curva e a nota do gancho, sem conta."""

import base64

import pytest
from google.genai import errors

from app.core.config import get_settings
from app.schemas.analysis import HookScore
from app.services import tools_service
from tests.conftest import sample_curve

# um PNG de verdade (1x1): o leitor confere a assinatura, não só o rótulo
PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082")


def sample_hook(**overrides) -> HookScore:
    data = {
        "score": 3,
        "verdict": "Começa com saudação e só promete algo depois: quem rola o feed sai antes.",
        "rewrites": [
            {"text": "Fiquei 30 dias sem café e o meu sono mudou.", "why": "Entrega o resultado de cara."},
            {"text": "O que 30 dias sem café fizeram com a minha produtividade.", "why": "Cria curiosidade."},
            {"text": "Se você toma 3 cafés por dia, presta atenção.", "why": "Fala com quem tem o hábito."},
            {"text": "uma quarta que não devia vir", "why": "sobra"},
        ],
    }
    data.update(overrides)
    return HookScore.model_validate(data)


@pytest.fixture(autouse=True)
def fresh_limits(env):
    env.setenv("TOOLS_PER_IP_PER_DAY", "3")
    env.setenv("TOOLS_DAILY_CAP", "5")
    get_settings.cache_clear()
    tools_service.reset()
    yield
    tools_service.reset()


def curve(client, image=PNG, mime="image/png", ip="1.1.1.1"):
    return client.post("/api/tools/curve", json={"image_base64": base64.b64encode(image).decode(), "mime_type": mime}, headers={"x-forwarded-for": ip})


def hook(client, text="Oi gente, tudo bem? Hoje eu vou contar uma coisa", ip="1.1.1.1"):
    return client.post("/api/tools/hook", json={"hook": text, "locale": "pt-BR"}, headers={"x-forwarded-for": ip})


def test_the_curve_reader_returns_where_and_how_much_the_audience_dropped(client, fake_db, fake_ai):
    fake_ai.responses = [sample_curve()]
    r = curve(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["readable"] is True and body["drop_second"] == 4.0
    assert body["retained_before"] == 93.0 and body["retained_after"] == 61.0 and body["lost_points"] == 32.0
    assert body["points"][0] == [0.0, 100.0]
    assert [e["props"] for e in fake_db.events if e["name"] == "tool_used"] == [{"tool": "curve", "readable": True}]


def test_an_unreadable_print_says_so(client, fake_db, fake_ai):
    fake_ai.responses = [sample_curve(readable=False, drop_second=None, retained_before_drop=None, retained_after_drop=None, points=[])]
    body = curve(client).json()
    assert body["readable"] is False and body["drop_second"] is None and body["points"] == []


def test_the_curve_reader_refuses_what_is_not_an_image(client, fake_db, fake_ai):
    assert curve(client, image=b"%PDF-1.7 not an image at all").json()["error"]["code"] == "INVALID_IMAGE"
    assert curve(client, mime="application/pdf").json()["error"]["code"] == "INVALID_IMAGE"
    r = client.post("/api/tools/curve", json={"image_base64": "@@@@not-base64@@@@", "mime_type": "image/png"})
    assert r.json()["error"]["code"] == "INVALID_IMAGE"
    # nada disso chamou a IA nem gastou o limite
    assert fake_ai.calls == []
    for _ in range(3):
        fake_ai.responses = [sample_curve()]
        assert curve(client).status_code == 200


def test_the_hook_score_comes_with_why_and_three_rewrites(client, fake_db, fake_ai):
    fake_ai.responses = [sample_hook(score=14)]
    r = hook(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["score"] == 10  # a IA passou de 10: fica no teto
    assert body["verdict"] and len(body["rewrites"]) == 3
    # a frase do criador vai como texto a avaliar, com o idioma do site
    prompt = fake_ai.calls[-1]["contents"][0].parts[0].text if hasattr(fake_ai.calls[-1]["contents"][0], "parts") else str(fake_ai.calls[-1]["contents"])
    assert "Oi gente" in prompt and "português" in prompt


def test_the_hook_must_be_a_real_line(client, fake_db, fake_ai):
    assert hook(client, text="  ").status_code in (400, 422)
    assert hook(client, text="x" * 400).json()["error"]["code"] == "INVALID_HOOK"
    assert fake_ai.calls == []


def test_each_ip_has_a_daily_limit_and_the_day_has_a_cap(client, fake_db, fake_ai):
    fake_ai.responses = [sample_hook()]
    for _ in range(3):
        assert hook(client, ip="2.2.2.2").status_code == 200
    r = hook(client, ip="2.2.2.2")
    assert r.status_code == 429 and r.json()["error"]["code"] == "TOOLS_LIMIT"

    # outro IP ainda pode, até o teto do dia (5)
    assert hook(client, ip="3.3.3.3").status_code == 200
    assert hook(client, ip="4.4.4.4").status_code == 200
    r = hook(client, ip="5.5.5.5")
    assert r.status_code == 429 and r.json()["error"]["code"] == "TOOLS_BUSY"


def test_a_failure_of_the_ai_does_not_spend_the_limit(client, fake_db, fake_ai):
    fake_ai.error = errors.ServerError(503, {"error": {"code": 503, "message": "overloaded", "status": "UNAVAILABLE"}})
    for _ in range(4):
        assert hook(client, ip="6.6.6.6").status_code == 502
    fake_ai.error = None
    fake_ai.responses = [sample_hook()]
    assert hook(client, ip="6.6.6.6").status_code == 200
