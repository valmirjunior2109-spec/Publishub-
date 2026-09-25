"""O que é grátis e o que é pago.

As primeiras análises da conta saem completas: ninguém compra o que nunca viu.
Passado o limite, a análise continua acontecendo, mas as reescritas e o plano
ficam atrás do paywall — e não saem do servidor, então não é CSS que esconde.

Quem compra o Lifetime destrava também o que já tinha nascido parcial.
"""

import pytest

from app.core.config import get_settings
from tests.conftest import ALICE, auth, register, upload, upload_image


@pytest.fixture
def stripe_on(env):
    """Stripe configurado e uma análise completa de cortesia, para o teste ser curto."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_FULL_ANALYSES", "1")
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


def test_the_first_free_analysis_comes_complete(client, fake_db, fake_ai, sample_video, stripe_on):
    """Valor inteiro antes de qualquer cobrança: a primeira sai com plano e tudo."""
    analysis_id = analyse(client, fake_db, sample_video)
    body = client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()

    assert body["status"] == "completed", body["error_message"]
    assert body["locked"] is None
    assert len(body["result"]["rewrites"]) == 3
    assert body["result"]["copilot"]["recommendations"]


def test_after_the_free_limit_the_analysis_comes_partial(client, fake_db, fake_ai, sample_video, stripe_on):
    analyse(client, fake_db, sample_video)  # a de cortesia
    analysis_id = analyse(client, fake_db, sample_video)
    resposta = client.get(f"/api/analyses/{analysis_id}", headers=auth())
    body = resposta.json()

    result = body["result"]
    # o que a conta grátis continua recebendo: a queda e as 2 primeiras recomendações
    assert result["drop"]["at_seconds"] == 4.0
    assert result["phrase"]["text"].startswith("Então, antes de tudo")
    assert result["diagnosis"] and len(result["transcript"]) == 3
    assert [r["title"] for r in result["copilot"]["recommendations"]] == ["Abra com o resultado, não com o contexto", "Encurte a pausa dos 3,5s"]
    # o que fica atrás do paywall: fora da resposta, não escondido na tela
    assert result["rewrites"] == []
    assert set(result["copilot"]) == {"source", "recommendations"}  # sem resumo, notas de gancho e ritmo
    assert body["locked"] == {"analysis": False, "rewrites": 3, "copilot": True, "recommendations": 1}
    # nem um pedaço do conteúdo pago viaja até o navegador
    for pago in ("Ponha o número na tela", "30 dias sem café", "Encurte a pausa do 3,5s e coloque", "Trinta dias sem café: dormi melhor", "Entre 2,6s e 6,4s você fala devagar"):
        assert pago not in resposta.text


def test_lifetime_unlocks_the_rewrites_and_the_copilot(client, fake_db, fake_ai, sample_video, stripe_on):
    """Inclusive a análise que nasceu parcial: quem pagou vê tudo que já enviou."""
    analyse(client, fake_db, sample_video)  # a de cortesia
    analysis_id = analyse(client, fake_db, sample_video)
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["locked"] is not None

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
