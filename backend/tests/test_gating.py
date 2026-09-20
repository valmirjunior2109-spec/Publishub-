"""O que é grátis e o que é pago.

Grátis: o segundo da queda, a frase dita nele e o diagnóstico. Pago (Lifetime):
as três reescritas e o copiloto de edição. O que é pago não sai do servidor — a
tela mostra o lugar deles, não o conteúdo escondido com CSS.
"""

import pytest

from app.core.config import get_settings
from tests.conftest import ALICE, auth, register, upload, upload_image


@pytest.fixture
def stripe_on(env):
    """Stripe configurado: sem isso ninguém consegue pagar e nada é bloqueado."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    get_settings.cache_clear()
    return env


def analyse(client, fake_db, video: bytes) -> str:
    """Uma análise completa da Alice (com print), já processada pela IA falsa."""
    created = register(client, fake_db, "alice-token", upload(fake_db, ALICE, video), upload_image(fake_db, ALICE))
    assert created.status_code == 201, created.text
    return created.json()["analysis"]["id"]


def pay_for_lifetime(fake_db) -> None:
    fake_db.upsert_purchase(
        {
            "stripe_session_id": "cs_test_lifetime",
            "stripe_payment_intent": "pi_lifetime",
            "email": ALICE["email"],
            "user_id": ALICE["id"],
            "amount_cents": 1200,
            "currency": "usd",
            "status": "paid",
        }
    )


def test_the_free_plan_sees_the_drop_and_the_phrase_but_not_the_rewrites(client, fake_db, fake_ai, sample_video, stripe_on):
    analysis_id = analyse(client, fake_db, sample_video)
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()

    assert body["status"] == "completed", body["error_message"]
    result = body["result"]
    # o que a conta grátis recebe
    assert result["drop"]["at_seconds"] == 4.0
    assert result["phrase"]["text"].startswith("Então, antes de tudo")
    assert result["diagnosis"] and len(result["transcript"]) == 3
    # o que fica atrás do paywall: vazio na resposta, não escondido na tela
    assert result["rewrites"] == [] and result["copilot"] is None
    assert body["locked"] == {"analysis": False, "rewrites": 3, "copilot": True}


def test_lifetime_unlocks_the_rewrites_and_the_copilot(client, fake_db, fake_ai, sample_video, stripe_on):
    analysis_id = analyse(client, fake_db, sample_video)
    pay_for_lifetime(fake_db)

    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["locked"] is None
    assert len(body["result"]["rewrites"]) == 3 and body["result"]["rewrites"][0]["why"]
    assert body["result"]["copilot"]["pace"] == "lento"


def test_without_stripe_nothing_is_hidden(client, fake_db, fake_ai, sample_video):
    """Servidor sem pagamento configurado: ninguém consegue pagar, então nada se esconde."""
    analysis_id = analyse(client, fake_db, sample_video)
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()
    assert body["locked"] is None and len(body["result"]["rewrites"]) == 3
