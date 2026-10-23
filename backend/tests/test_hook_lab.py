"""Hook Lab: a abertura de um vídeo (da transcrição de uma análise, ou colada) → pontos fracos e cinco aberturas."""

import pytest

from app.core.config import get_settings
from app.schemas.analysis import HookAlternative, HookLab
from app.services import billing_service, tools_service
from tests.conftest import auth
from tests.test_guest import analyse_as_guest, blind_ai  # noqa: F401 (fixture)

CATEGORIES = ["curiosity", "direct", "educational", "story", "contrarian"]


def alt(category: str, text: str | None = None) -> dict:
    return {
        "category": category,
        "text": text or f"Abertura {category} sobre trinta dias sem café — direto",
        "why": f"Porque {category} segura quem rola o feed.",
        "on_screen_text": "30 dias sem café",
        "delivery": "Mostre a xícara vazia no primeiro quadro.",
    }


def sample_lab(**overrides) -> HookLab:
    data = {
        "original_summary": "Começa pelo resultado, mas depois volta para o contexto.",
        "weaknesses": ["O contexto depois do resultado pode fazer a pessoa sair.", "", "Não diz o que mudou.", "Quarta que sobra.", "Quinta."],
        # fora de ordem, com uma categoria repetida: o serviço põe na ordem e fica com a primeira de cada
        "alternatives": [alt("story"), alt("curiosity"), alt("curiosity", "repetida"), alt("direct"), alt("contrarian"), alt("educational")],
    }
    data.update(overrides)
    return HookLab.model_validate(data)


@pytest.fixture(autouse=True)
def fresh_limits(env):
    env.setenv("TOOLS_PER_IP_PER_DAY", "3")
    env.setenv("TOOLS_DAILY_CAP", "5")
    env.setenv("HOOK_LAB_PER_IP_PER_DAY", "2")
    env.setenv("HOOK_LAB_DAILY_CAP", "10")
    get_settings.cache_clear()
    tools_service.reset()
    yield
    tools_service.reset()


def lab(client, opening="Eu fiquei trinta dias sem café. Então, deixa eu te dar um contexto", context="E o meu sono mudou muito.", ip="2.2.2.2", headers=None, **extra):
    body = {"opening": opening, "context": context, "locale": "pt-BR", **extra}
    return client.post("/api/tools/hook-lab", json=body, headers={"x-forwarded-for": ip, **(headers or {})})


def prompt_of(fake) -> str:
    call = fake.calls[-1]
    return " ".join(getattr(p, "text", "") or "" for p in call["contents"])


def test_five_alternatives_one_per_category_grounded_in_the_opening(client, fake_db, fake_ai):
    fake_ai.responses = [sample_lab()]
    r = lab(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "transcript"
    assert [a["category"] for a in body["alternatives"]] == CATEGORIES
    assert body["alternatives"][1]["text"] != "repetida"  # a primeira de cada categoria
    assert all(set(a) == {"category", "text", "why", "on_screen_text", "delivery"} for a in body["alternatives"])
    assert "—" not in str(body)  # o travessão some
    assert body["weaknesses"] == ["O contexto depois do resultado pode fazer a pessoa sair.", "Não diz o que mudou.", "Quarta que sobra."]
    assert body["opening"] == {"text": "Eu fiquei trinta dias sem café. Então, deixa eu te dar um contexto", "start_seconds": None, "end_seconds": None}
    assert body["context"] == "E o meu sono mudou muito."
    # a IA recebeu a abertura e o assunto
    prompt = prompt_of(fake_ai)
    assert "Eu fiquei trinta dias sem café" in prompt and "E o meu sono mudou muito" in prompt
    assert [e["props"] for e in fake_db.events if e["name"] == "tool_used"] == [{"tool": "hook_lab", "source": "transcript", "regenerated": False}]


def test_generating_again_tells_the_ai_what_not_to_repeat(client, fake_db, fake_ai):
    fake_ai.responses = [sample_lab()]
    lab(client, avoid=["Abertura antiga um", "Abertura antiga dois"])
    assert "JÁ SUGERIDAS" in prompt_of(fake_ai) and "Abertura antiga dois" in prompt_of(fake_ai)


def test_an_incomplete_answer_fails_and_does_not_spend_the_limit(client, fake_db, fake_ai):
    fake_ai.responses = [sample_lab(alternatives=[alt("story"), alt("direct"), alt("curiosity")])]
    r = lab(client)
    assert r.status_code == 502 and r.json()["error"]["code"] == "AI_ERROR"
    fake_ai.responses = [sample_lab()]
    assert lab(client).status_code == 200
    assert lab(client).status_code == 200  # o uso que falhou não contou


def test_bad_input_is_refused_before_the_ai(client, fake_db, fake_ai):
    assert lab(client, opening="oi").json()["error"]["code"] == "INVALID_HOOK"
    assert lab(client, opening="   ").json()["error"]["code"] == "INVALID_HOOK"
    assert lab(client, opening="x" * 500).json()["error"]["code"] == "INVALID_HOOK"
    assert lab(client, avoid=["a"] * 11).status_code == 422
    assert fake_ai.calls == []


def test_the_hook_lab_has_its_own_daily_limit(client, fake_db, fake_ai):
    fake_ai.responses = [sample_lab()]
    assert lab(client).status_code == 200
    assert lab(client).status_code == 200
    r = lab(client)
    assert r.status_code == 429 and r.json()["error"]["code"] == "TOOLS_LIMIT"
    # outro IP continua podendo; e o limite das outras ferramentas é outro
    assert lab(client, ip="3.3.3.3").status_code == 200


def test_paying_accounts_have_no_limit(client, fake_db, fake_ai, monkeypatch):
    monkeypatch.setattr(billing_service, "has_full_access", lambda user: True)
    fake_ai.responses = [sample_lab()]
    for _ in range(4):
        assert lab(client, headers=auth()).status_code == 200


def test_without_ai_configured_it_says_so(client, fake_db, env):
    env.delenv("GEMINI_API_KEY", raising=False)
    get_settings.cache_clear()
    r = lab(client)
    assert r.status_code == 503 and r.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_from_an_analysis_the_opening_comes_from_the_transcript(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    blind_ai.responses.append(sample_lab())
    r = client.post(f"/api/tools/hook-lab/analyses/{analysis_id}", json={"locale": "pt-BR"}, headers={**headers, "x-forwarded-for": "4.4.4.4"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "analysis" and body["language"] == "pt"
    # os segmentos que começam nos primeiros 6 s, com os segundos reais
    assert body["opening"] == {"text": "Eu fiquei trinta dias sem café. Então, antes de tudo, deixa eu te dar um contexto rápido.", "start_seconds": 0.0, "end_seconds": 6.4}
    assert "Eu sempre fui daquelas pessoas" in body["context"]
    assert body["audit_hook"] == {"score": 6, "note": "Começa direto, mas sem prometer o resultado."}
    assert "0.0s-6.4s" in prompt_of(blind_ai)


def test_an_analysis_of_someone_else_is_not_found(client, fake_db, blind_ai, sample_video):
    _, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    r = client.post(f"/api/tools/hook-lab/analyses/{analysis_id}", json={}, headers=auth())
    assert r.status_code == 404
    assert client.post(f"/api/tools/hook-lab/analyses/{analysis_id}", json={}).status_code == 401


def test_an_analysis_without_speech_asks_for_the_transcript(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    fake_db.analyses[analysis_id]["result"]["transcript"] = []
    r = client.post(f"/api/tools/hook-lab/analyses/{analysis_id}", json={}, headers=headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "NO_TRANSCRIPT"


def test_refining_keeps_the_category_and_uses_the_request(client, fake_db, fake_ai):
    fake_ai.responses = [HookAlternative.model_validate(alt("story", "Uma versão mais curta"))]
    r = client.post("/api/tools/hook-lab/refine", json={
        "opening": "Eu fiquei trinta dias sem café", "context": "O sono mudou.",
        "hook": {"category": "curiosity", "text": "O que trinta dias sem café fizeram comigo?"},
        "instruction": "mais curta", "locale": "pt-BR",
    }, headers={"x-forwarded-for": "5.5.5.5"})
    assert r.status_code == 200, r.text
    assert r.json()["alternative"]["category"] == "curiosity"  # a categoria pedida, não a que a IA mandou
    assert r.json()["alternative"]["text"] == "Uma versão mais curta"
    assert "mais curta" in prompt_of(fake_ai)


def test_refining_refuses_an_unknown_category_or_empty_request(client, fake_db, fake_ai):
    base = {"opening": "Eu fiquei trinta dias sem café", "hook": {"category": "viral", "text": "x"}, "instruction": "mais curta"}
    assert client.post("/api/tools/hook-lab/refine", json=base).json()["error"]["code"] == "INVALID_REFINE"
    base["hook"]["category"] = "direct"
    base["instruction"] = " "
    assert client.post("/api/tools/hook-lab/refine", json=base).json()["error"]["code"] == "INVALID_REFINE"
    assert fake_ai.calls == []
