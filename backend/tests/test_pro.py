"""Os dois planos vitalícios: Creator e Pro.

O que separa os dois não é uma etiqueta: o Pro manda mais frames do vídeo para a
IA e pede um plano de ação maior. Aqui o que se verifica é isso — o que sai do
nosso lado muda de verdade — e que o Creator continua recebendo exatamente o que
recebia antes.
"""

import json

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import ai_service, analysis_service, billing_service
from tests.conftest import ALICE, auth, register, upload, upload_image
from tests.test_billing import paid_session, webhook


@pytest.fixture
def loja(env, monkeypatch):
    """Stripe ligado, em memória: só o suficiente para registrar compras."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    get_settings.cache_clear()
    monkeypatch.setattr(billing_service, "_construct_event", lambda payload, signature: json.loads(payload))
    monkeypatch.setattr(billing_service, "_retrieve_session", lambda session_id: (_ for _ in ()).throw(ApiError(404, "SESSION_NOT_FOUND", "x")))
    return monkeypatch


def comprar(client, cents: int, session_id: str):
    sessao = {**paid_session(session_id, email=ALICE["email"], reference=ALICE["id"], intent=f"pi_{session_id}"), "amount_total": cents}
    assert webhook(client, "checkout.session.completed", sessao).status_code == 200


def plano(client) -> dict:
    return client.get("/api/me", headers=auth()).json()["entitlement"]


# ---------------------------------------------------------------- quem comprou o quê


def test_the_amount_paid_says_which_plan_it_is(client, fake_db, loja):
    assert plano(client)["tier"] is None  # ninguém comprou nada ainda

    comprar(client, 1200, "cs_creator")
    assert plano(client)["tier"] == "creator"
    assert plano(client)["plan"] == "lifetime"


def test_twenty_nine_dollars_is_pro(client, fake_db, loja):
    comprar(client, 2900, "cs_pro")
    assert plano(client)["tier"] == "pro"


def test_buying_creator_and_then_pro_keeps_the_better_one(client, fake_db, loja):
    comprar(client, 1200, "cs_creator")
    comprar(client, 2900, "cs_pro")
    assert plano(client)["tier"] == "pro"


def test_a_refunded_pro_falls_back_to_the_creator_that_is_still_paid(client, fake_db, loja):
    comprar(client, 1200, "cs_creator")
    comprar(client, 2900, "cs_pro")
    webhook(client, "charge.refunded", {"payment_intent": "pi_cs_pro"})

    assert plano(client)["tier"] == "creator"  # a compra do Creator continua de pé
    assert plano(client)["plan"] == "lifetime"


# ---------------------------------------------------------------- a análise muda de verdade


def frames_enviados(fake_ai) -> int:
    """Quantos frames do vídeo foram para o copiloto na última chamada dele."""
    chamada = [c for c in fake_ai.calls if getattr(c.get("config"), "response_schema", None) is ai_service.Copilot][-1]
    return sum(1 for parte in chamada["contents"] if getattr(parte, "inline_data", None) is not None)


def test_a_pro_analysis_looks_at_more_of_the_video(client, fake_db, fake_ai, loja, sample_video):
    """O Creator continua com 12 frames; o Pro vê até 20. Nada foi tirado de ninguém."""
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert criada.status_code == 201
    do_creator = frames_enviados(fake_ai)
    assert do_creator <= analysis_service.COPILOT_MAX_FRAMES

    comprar(client, 2900, "cs_pro")
    fake_ai.calls.clear()
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert criada.status_code == 201
    do_pro = frames_enviados(fake_ai)

    # o vídeo de teste tem 8s, então nem todo mundo chega no teto: o que importa
    # é que o Pro nunca olha menos, e que o teto dele é maior
    assert do_pro >= do_creator
    assert analysis_service.COPILOT_MAX_FRAMES_DEEP > analysis_service.COPILOT_MAX_FRAMES


def test_a_pro_analysis_asks_for_a_longer_plan(client, fake_db, fake_ai, loja, sample_video):
    comprar(client, 2900, "cs_pro")
    register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))

    chamada = [c for c in fake_ai.calls if getattr(c.get("config"), "response_schema", None) is ai_service.Copilot][-1]
    instrucoes = chamada["config"].system_instruction
    assert f"de 6 a {ai_service.MAX_RECOMMENDATIONS_DEEP} mudanças concretas" in instrucoes
    assert ai_service.MAX_RECOMMENDATIONS_DEEP > ai_service.MAX_RECOMMENDATIONS


def test_the_creator_prompt_did_not_change(client, fake_db, fake_ai, loja, sample_video):
    register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))

    chamada = [c for c in fake_ai.calls if getattr(c.get("config"), "response_schema", None) is ai_service.Copilot][-1]
    assert "de 4 a 8 mudanças concretas" in chamada["config"].system_instruction


def test_the_plan_of_an_analysis_is_frozen_when_it_is_made(client, fake_db, fake_ai, loja, sample_video):
    """Comprar o Pro amanhã não reescreve a análise de hoje: ela continua explicável."""
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    analysis_id = criada.json()["analysis"]["id"]
    assert fake_db.analyses[analysis_id]["tier"] is None

    comprar(client, 2900, "cs_pro")
    assert fake_db.analyses[analysis_id]["tier"] is None

    nova = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert fake_db.analyses[nova.json()["analysis"]["id"]]["tier"] == "pro"
