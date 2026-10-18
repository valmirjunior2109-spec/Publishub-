"""A comissão do Partner também sobre as mensalidades: uma por fatura paga, estornada no reembolso."""

import pytest

from app.services import billing_service, partners_service
from tests.conftest import BOB, auth
from tests.test_billing import webhook
from tests.test_partners_program import claim, join
from tests.test_subscriptions import PRO_PRICE, PRO_PRODUCT, checkout, stripe_state, subscription  # noqa: F401 (fixture)


@pytest.fixture
def partners(stripe_state, env, monkeypatch):  # noqa: F811
    """O Stripe em memória das assinaturas, com faturas, e o programa de comissão ligado."""
    env.setenv("ADMIN_EMAILS", "alice@example.com")
    monkeypatch.setattr(partners_service, "_unavailable", False)
    monkeypatch.setattr(partners_service, "_program_unavailable", False)
    stripe_state["invoices"] = {}
    monkeypatch.setattr(billing_service, "_retrieve_invoice", lambda invoice_id: stripe_state["invoices"][invoice_id])
    return stripe_state


def invoice(invoice_id, sub_id="sub_bob", amount=2400, intent=None, new_api=False):
    """Uma fatura paga. `new_api`: a forma das versões novas da API (assinatura em parent, pagamento em payments)."""
    row = {"id": invoice_id, "object": "invoice", "status": "paid", "amount_paid": amount, "currency": "usd"}
    intent = intent or f"pi_{invoice_id}"
    if new_api:
        row["parent"] = {"subscription_details": {"subscription": sub_id}}
        row["payments"] = {"data": [{"payment": {"payment_intent": intent}}]}
    else:
        row["subscription"] = sub_id
        row["payment_intent"] = intent
    return row


def bob_subscribes(client, state, first_invoice="in_1", sub_id="sub_bob"):
    """Bob assina o Pro: o checkout chega pelo webhook com a primeira fatura."""
    state["subscriptions"][sub_id] = subscription(sub_id, price=PRO_PRICE, product=PRO_PRODUCT, email=BOB["email"])
    state["invoices"][first_invoice] = invoice(first_invoice, sub_id)
    session = checkout(f"cs_test_{sub_id.replace('_', '')}", sub_id, reference=BOB["id"], email=BOB["email"])
    session["invoice"] = first_invoice
    state["sessions"][session["id"]] = session
    assert webhook(client, "checkout.session.completed", session).status_code == 200


def dashboard(client):
    return client.get("/api/partners/program", headers=auth()).json()


def test_every_paid_month_pays_the_partner_once(client, fake_db, partners):
    claim(client, "bob-token", join(client)["code"])
    bob_subscribes(client, partners)
    assert dashboard(client)["earnings_cents"] == 720  # 30% de US$ 24,00
    assert dashboard(client)["paid_customers"] == 1

    # o invoice.paid da mesma primeira fatura chega depois: não paga de novo
    assert webhook(client, "invoice.paid", partners["invoices"]["in_1"]).status_code == 200
    assert dashboard(client)["earnings_cents"] == 720

    # a renovação do mês seguinte paga de novo, e repetir o evento não duplica
    webhook(client, "invoice.paid", invoice("in_2"))
    webhook(client, "invoice.paid", invoice("in_2"))
    data = dashboard(client)
    assert data["earnings_cents"] == 1440
    assert data["paid_customers"] == 1  # o mesmo cliente, dois meses


def test_an_invoice_before_the_account_is_linked_is_paid_when_checkout_links_it(client, fake_db, partners):
    claim(client, "bob-token", join(client)["code"])
    partners["subscriptions"]["sub_bob"] = subscription("sub_bob", price=PRO_PRICE, product=PRO_PRODUCT, email=BOB["email"])
    # a fatura chega antes do checkout: a assinatura ainda não tem conta
    assert webhook(client, "invoice.paid", invoice("in_1")).status_code == 200
    assert dashboard(client)["earnings_cents"] == 0

    bob_subscribes(client, partners)
    assert dashboard(client)["earnings_cents"] == 720


def test_refunding_a_month_reverses_only_that_commission(client, fake_db, partners):
    claim(client, "bob-token", join(client)["code"])
    bob_subscribes(client, partners)
    webhook(client, "invoice.paid", invoice("in_2", intent="pi_month2"))
    assert dashboard(client)["earnings_cents"] == 1440

    webhook(client, "charge.refunded", {"payment_intent": "pi_month2"})
    assert dashboard(client)["earnings_cents"] == 720


def test_the_new_api_shape_of_the_invoice_works_the_same(client, fake_db, partners):
    claim(client, "bob-token", join(client)["code"])
    bob_subscribes(client, partners)
    webhook(client, "invoice.paid", invoice("in_2", intent="pi_new", new_api=True))
    assert dashboard(client)["earnings_cents"] == 1440

    webhook(client, "charge.refunded", {"payment_intent": "pi_new"})
    assert dashboard(client)["earnings_cents"] == 720


def test_a_subscriber_without_a_referral_pays_nobody(client, fake_db, partners):
    join(client)
    # Bob assina sem ter vindo pelo link de ninguém
    bob_subscribes(client, partners)
    webhook(client, "invoice.paid", invoice("in_2"))
    assert dashboard(client)["earnings_cents"] == 0
    assert fake_db.commissions == {}


def test_a_zero_or_unpaid_invoice_pays_nothing(client, fake_db, partners):
    claim(client, "bob-token", join(client)["code"])
    bob_subscribes(client, partners)
    webhook(client, "invoice.paid", invoice("in_free", amount=0))
    unpaid = invoice("in_open")
    unpaid["status"] = "open"
    webhook(client, "invoice.paid", unpaid)
    assert dashboard(client)["earnings_cents"] == 720
