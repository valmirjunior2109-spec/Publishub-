"""A análise grátis mostra a queda e 2 recomendações; o resto só sai do servidor paga.

O que não pode quebrar:
  - o conteúdo pago não está na resposta da API (não é CSS que esconde);
  - o checkout leva o id da análise, e o webhook do Stripe marca a análise como paga;
  - reembolso fecha de novo;
  - o e-mail deixado vira lead e recebe só a parte grátis, com o link do checkout.
"""

import json
from urllib.parse import parse_qs, urlparse

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import billing_service, email_service
from tests.conftest import ALICE, auth, register, upload, upload_image
from tests.test_billing import paid_session, webhook
from tests.test_guest import analyse_as_guest, blind_ai  # noqa: F401 (fixture)

# trechos que só existem no conteúdo pago da análise de exemplo
PAGO = ("Ponha o número na tela", "30 dias sem café", "Encurte a pausa do 3,5s e coloque", "Trinta dias sem café: dormi melhor", "Entre 2,6s e 6,4s você fala devagar")


@pytest.fixture
def loja(env, monkeypatch):
    """Stripe ligado, uma análise completa de cortesia por conta, e o Stripe em memória."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    env.setenv("FREE_FULL_ANALYSES", "1")
    get_settings.cache_clear()
    sessions: dict[str, dict] = {}

    def retrieve(session_id):
        if session_id not in sessions:
            raise ApiError(404, "SESSION_NOT_FOUND", "x")
        return sessions[session_id]

    monkeypatch.setattr(billing_service, "_retrieve_session", retrieve)
    monkeypatch.setattr(billing_service, "_construct_event", lambda payload, signature: json.loads(payload))
    return sessions


@pytest.fixture
def emails(env, monkeypatch):
    """O Resend configurado, mas em memória: guarda o que teria saído."""
    env.setenv("RESEND_API_KEY", "re_test")
    env.setenv("EMAIL_FROM", "Publishub <ola@getpublishub.com>")
    get_settings.cache_clear()
    enviados = []
    monkeypatch.setattr(email_service, "send", lambda to, subject, html, text: enviados.append({"to": to, "subject": subject, "html": html, "text": text}) or "id")
    return enviados


def pagar(client, session_id: str, reference: str | None, email: str = "convidada@example.com"):
    sessao = paid_session(session_id, email=email, reference=reference, intent=f"pi_{session_id}")
    assert webhook(client, "checkout.session.completed", sessao).status_code == 200


def parcial_da_alice(client, fake_db, sample_video) -> str:
    """A segunda análise da Alice: passada a de cortesia, sai parcial."""
    register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    return criada.json()["analysis"]["id"]


# ---------------------------------------------------------------- o que sai do servidor


def test_a_guest_sees_the_drop_and_two_recommendations_and_nothing_paid(client, fake_db, blind_ai, loja, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    resposta = client.get(f"/api/analyses/{analysis_id}", headers=headers)

    assert len(resposta.json()["result"]["copilot"]["recommendations"]) == 2
    assert resposta.json()["locked"]["recommendations"] == 1
    for trecho in PAGO:
        assert trecho not in resposta.text


def test_the_suggested_cuts_do_not_leak_from_a_locked_analysis(client, fake_db, fake_ai, loja, sample_video):
    """Os cortes sugeridos são o plano com outro nome: bloqueada, a rota de cortes não os entrega."""
    analysis_id = parcial_da_alice(client, fake_db, sample_video)
    assert client.get(f"/api/analyses/{analysis_id}/edit", headers=auth()).json() == {"edit": None, "suggested": []}


# ---------------------------------------------------------------- o checkout com o id da análise


def test_paying_for_a_guest_analysis_unlocks_it(client, fake_db, blind_ai, loja, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)

    pagar(client, "cs_convidada", f"a-{analysis_id}")

    body = client.get(f"/api/analyses/{analysis_id}", headers=headers).json()
    assert body["locked"] is None
    assert len(body["result"]["copilot"]["recommendations"]) == 3 and len(body["result"]["rewrites"]) == 3
    compra = fake_db.purchases["cs_convidada"]
    assert compra["analysis_id"] == analysis_id and compra["user_id"] is None
    assert fake_db.analyses[analysis_id]["paid_at"]


def test_the_reference_carries_the_account_and_the_analysis(client, fake_db, fake_ai, loja, sample_video):
    analysis_id = parcial_da_alice(client, fake_db, sample_video)

    pagar(client, "cs_alice", f"u-{ALICE['id']}__a-{analysis_id}", email=ALICE["email"])

    compra = fake_db.purchases["cs_alice"]
    assert compra["user_id"] == ALICE["id"] and compra["analysis_id"] == analysis_id
    assert client.get(f"/api/analyses/{analysis_id}", headers=auth()).json()["locked"] is None
    assert client.get("/api/me", headers=auth()).json()["entitlement"]["plan"] == "lifetime"


def test_an_old_link_with_just_the_account_still_works(client, fake_db, loja):
    pagar(client, "cs_antigo", ALICE["id"], email=ALICE["email"])
    assert fake_db.purchases["cs_antigo"]["user_id"] == ALICE["id"]
    assert "analysis_id" not in fake_db.purchases["cs_antigo"]


def test_the_thank_you_page_also_unlocks_the_analysis(client, fake_db, fake_ai, loja, sample_video):
    """/obrigado confirma direto no Stripe, sem esperar o webhook: a análise abre do mesmo jeito."""
    analysis_id = parcial_da_alice(client, fake_db, sample_video)
    loja["cs_test_obrigado"] = paid_session("cs_test_obrigado", email=ALICE["email"], reference=f"u-{ALICE['id']}__a-{analysis_id}", intent="pi_obrigado")

    assert client.post("/api/billing/confirm", json={"session_id": "cs_test_obrigado"}, headers=auth()).status_code == 200
    assert fake_db.analyses[analysis_id]["paid_at"]


def test_a_made_up_analysis_id_does_not_lose_the_purchase(client, fake_db, loja):
    pagar(client, "cs_inventado", "a-99999999-9999-9999-9999-999999999999")
    compra = fake_db.purchases["cs_inventado"]
    assert compra["status"] == "paid" and "analysis_id" not in compra


def test_a_repeated_webhook_keeps_the_payment_date(client, fake_db, blind_ai, loja, sample_video):
    _, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    pagar(client, "cs_1", f"a-{analysis_id}")
    primeira = fake_db.analyses[analysis_id]["paid_at"]

    pagar(client, "cs_1", f"a-{analysis_id}")
    assert fake_db.analyses[analysis_id]["paid_at"] == primeira


def test_a_refund_locks_the_analysis_again(client, fake_db, blind_ai, loja, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    pagar(client, "cs_1", f"a-{analysis_id}")

    webhook(client, "charge.refunded", {"payment_intent": "pi_cs_1"})

    body = client.get(f"/api/analyses/{analysis_id}", headers=headers).json()
    assert fake_db.analyses[analysis_id]["paid_at"] is None
    assert body["locked"]["recommendations"] == 1 and len(body["result"]["copilot"]["recommendations"]) == 2


# ---------------------------------------------------------------- o e-mail


def lead(client, analysis_id, headers, email="convidada@example.com", locale="pt-BR"):
    return client.post(f"/api/analyses/{analysis_id}/lead", json={"email": email, "ui_locale": locale}, headers=headers)


def test_the_email_becomes_a_lead_and_gets_only_the_free_part(client, fake_db, blind_ai, emails, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)

    resposta = lead(client, analysis_id, headers, email="  Convidada@Example.com ")

    assert resposta.status_code == 200, resposta.text
    assert resposta.json() == {"saved": True, "emailed": True, "repeated": False}
    assert fake_db.leads[0] | {"id": None, "created_at": None} == {"id": None, "created_at": None, "email": "convidada@example.com", "analysis_id": analysis_id, "locale": "pt-BR"}

    mensagem = emails[0]
    assert mensagem["to"] == "convidada@example.com"
    assert "Abra com o resultado, não com o contexto" in mensagem["text"]  # uma das 2 grátis
    for trecho in PAGO:
        assert trecho not in mensagem["html"] and trecho not in mensagem["text"]
    # o botão leva ao checkout já com a análise e o e-mail
    link = next(linha for linha in mensagem["text"].splitlines() if "buy.stripe.com" in linha).split(": ", 1)[1]
    query = parse_qs(urlparse(link).query)
    assert query["client_reference_id"] == [f"a-{analysis_id}"] and query["prefilled_email"] == ["convidada@example.com"]
    assert any(e["name"] == "lead_captured" for e in fake_db.events)


def test_the_same_email_twice_is_not_sent_again(client, fake_db, blind_ai, emails, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    lead(client, analysis_id, headers)

    de_novo = lead(client, analysis_id, headers)
    assert de_novo.json() == {"saved": True, "emailed": False, "repeated": True}
    assert len(emails) == 1 and len(fake_db.leads) == 1


def test_an_analysis_accepts_only_a_few_addresses(client, fake_db, blind_ai, emails, sample_video):
    """O formulário manda e-mail para um endereço digitado: sem teto, vira canhão de spam."""
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    for n in range(3):
        assert lead(client, analysis_id, headers, email=f"pessoa{n}@example.com").status_code == 200

    bloqueado = lead(client, analysis_id, headers, email="mais-uma@example.com")
    assert bloqueado.status_code == 429 and bloqueado.json()["error"]["code"] == "LEAD_LIMIT"
    assert len(emails) == 3


def test_an_invalid_email_is_refused(client, fake_db, blind_ai, emails, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    for errado in ("sem-arroba", "a@b", "duas palavras@example.com"):
        resposta = lead(client, analysis_id, headers, email=errado)
        assert resposta.status_code == 422 and resposta.json()["error"]["code"] == "INVALID_EMAIL"
    assert fake_db.leads == [] and emails == []


def test_only_the_owner_can_leave_an_email_on_an_analysis(client, fake_db, blind_ai, emails, sample_video):
    _, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    assert lead(client, analysis_id, auth("bob-token")).status_code == 404
    assert fake_db.leads == []


def test_without_resend_the_lead_is_still_saved(client, fake_db, blind_ai, sample_video):
    headers, analysis_id = analyse_as_guest(client, fake_db, sample_video)
    resposta = lead(client, analysis_id, headers)
    assert resposta.json() == {"saved": True, "emailed": False, "repeated": False}
    assert len(fake_db.leads) == 1
