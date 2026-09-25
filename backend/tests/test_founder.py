"""O Vitalício Fundador: um plano só, limitado aos primeiros compradores.

Três coisas que não podem quebrar:
  - toda compra paga é fundadora e recebe a análise mais profunda;
  - o contador de vagas vem das compras pagas gravadas, nunca de um número fixo;
  - o uso justo dos Termos (análises por dia) vale no backend, não só no texto.
"""

import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import ai_service, analysis_service, billing_service
from tests.conftest import ALICE, BOB, auth, register, upload, upload_image
from tests.test_billing import paid_session, webhook


@pytest.fixture
def loja(env, monkeypatch):
    """Stripe ligado, em memória: só o suficiente para registrar compras."""
    env.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    env.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    get_settings.cache_clear()
    monkeypatch.setattr(billing_service, "_construct_event", lambda payload, signature: json.loads(payload))
    monkeypatch.setattr(billing_service, "_retrieve_session", lambda session_id: (_ for _ in ()).throw(ApiError(404, "SESSION_NOT_FOUND", "x")))
    return env


def comprar(client, session_id: str, email: str = ALICE["email"], reference: str | None = ALICE["id"], cents: int = 1200):
    sessao = {**paid_session(session_id, email=email, reference=reference, intent=f"pi_{session_id}"), "amount_total": cents}
    assert webhook(client, "checkout.session.completed", sessao).status_code == 200


def plano(client) -> dict:
    return client.get("/api/me", headers=auth()).json()["entitlement"]


def vagas(client) -> dict:
    resposta = client.get("/api/billing/founder")  # público: sem login
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


# ---------------------------------------------------------------- toda compra é fundadora


def test_a_purchase_makes_the_account_a_founder(client, fake_db, loja):
    assert plano(client)["tier"] is None  # ninguém comprou nada ainda

    comprar(client, "cs_fundador")
    assert plano(client)["tier"] == "pro"
    assert plano(client)["plan"] == "lifetime"


def test_an_old_pro_purchase_is_a_founder_too(client, fake_db, loja):
    """Quem pagou US$ 29 no Pro antigo não perde nada: continua com a análise profunda."""
    comprar(client, "cs_pro_antigo", cents=2900)
    assert plano(client)["tier"] == "pro"


def test_a_refund_takes_the_founder_access_away(client, fake_db, loja):
    comprar(client, "cs_fundador")
    webhook(client, "charge.refunded", {"payment_intent": "pi_cs_fundador"})

    assert plano(client)["tier"] is None
    assert plano(client)["plan"] == "free"


# ---------------------------------------------------------------- o contador de vagas


def test_the_spots_counter_comes_from_real_purchases(client, fake_db, loja):
    assert vagas(client) == {"limit": 100, "taken": 0, "remaining": 100, "sold_out": False}

    comprar(client, "cs_1")
    # a compra zera o cache: o número muda na hora, não em 30 s
    assert vagas(client) == {"limit": 100, "taken": 1, "remaining": 99, "sold_out": False}


def test_the_same_buyer_takes_one_spot(client, fake_db, loja):
    comprar(client, "cs_1", email="ana@example.com", reference=None)
    comprar(client, "cs_2", email="ANA@example.com", reference=None)  # pagou de novo, com o mesmo e-mail
    assert vagas(client)["taken"] == 1


def test_a_refund_gives_the_spot_back(client, fake_db, loja):
    comprar(client, "cs_1")
    assert vagas(client)["taken"] == 1

    webhook(client, "charge.refunded", {"payment_intent": "pi_cs_1"})
    assert vagas(client)["taken"] == 0


def test_old_creator_and_pro_buyers_count_as_founders(client, fake_db, loja):
    comprar(client, "cs_creator", email="criadora@example.com", reference=None, cents=1200)
    comprar(client, "cs_pro", email="pro@example.com", reference=None, cents=2900)
    assert vagas(client)["taken"] == 2


def test_the_plan_sells_out_at_the_limit(client, fake_db, loja):
    loja.setenv("FOUNDER_LIMIT", "2")
    get_settings.cache_clear()

    comprar(client, "cs_1", email="um@example.com", reference=None)
    assert vagas(client) == {"limit": 2, "taken": 1, "remaining": 1, "sold_out": False}

    comprar(client, "cs_2", email="dois@example.com", reference=None)
    assert vagas(client) == {"limit": 2, "taken": 2, "remaining": 0, "sold_out": True}


def test_a_payment_that_slips_past_the_limit_never_shows_negative_spots(client, fake_db, loja):
    """Quem tinha o link salvo ainda consegue pagar no Stripe: o contador não pode ficar negativo."""
    loja.setenv("FOUNDER_LIMIT", "1")
    get_settings.cache_clear()
    comprar(client, "cs_1", email="um@example.com", reference=None)
    comprar(client, "cs_2", email="dois@example.com", reference=None)

    assert vagas(client) == {"limit": 1, "taken": 2, "remaining": 0, "sold_out": True}


def test_a_session_that_was_not_paid_takes_no_spot(client, fake_db, loja):
    webhook(client, "checkout.session.completed", {**paid_session("cs_pendente", intent="pi_x"), "payment_status": "unpaid"})
    assert vagas(client)["taken"] == 0


# ---------------------------------------------------------------- a análise do fundador é a mais profunda


def frames_enviados(fake_ai) -> int:
    """Quantos frames do vídeo foram para o copiloto na última chamada dele."""
    chamada = [c for c in fake_ai.calls if getattr(c.get("config"), "response_schema", None) is ai_service.Copilot][-1]
    return sum(1 for parte in chamada["contents"] if getattr(parte, "inline_data", None) is not None)


def test_a_founder_analysis_looks_at_more_of_the_video(client, fake_db, fake_ai, loja, sample_video):
    """A análise grátis continua com 12 frames; a do fundador vê até 20."""
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert criada.status_code == 201
    gratis = frames_enviados(fake_ai)
    assert gratis <= analysis_service.COPILOT_MAX_FRAMES

    comprar(client, "cs_fundador")
    fake_ai.calls.clear()
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert criada.status_code == 201

    # o vídeo de teste tem 8s, então nem todo mundo chega no teto: o que importa
    # é que o fundador nunca olha menos, e que o teto dele é maior
    assert frames_enviados(fake_ai) >= gratis
    assert analysis_service.COPILOT_MAX_FRAMES_DEEP > analysis_service.COPILOT_MAX_FRAMES


def test_a_founder_analysis_asks_for_a_longer_plan(client, fake_db, fake_ai, loja, sample_video):
    comprar(client, "cs_fundador")
    register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))

    chamada = [c for c in fake_ai.calls if getattr(c.get("config"), "response_schema", None) is ai_service.Copilot][-1]
    assert f"de 6 a {ai_service.MAX_RECOMMENDATIONS_DEEP} mudanças concretas" in chamada["config"].system_instruction


def test_the_free_prompt_did_not_change(client, fake_db, fake_ai, loja, sample_video):
    register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))

    chamada = [c for c in fake_ai.calls if getattr(c.get("config"), "response_schema", None) is ai_service.Copilot][-1]
    assert "de 4 a 8 mudanças concretas" in chamada["config"].system_instruction


def test_the_plan_of_an_analysis_is_frozen_when_it_is_made(client, fake_db, fake_ai, loja, sample_video):
    """Comprar amanhã não reescreve a análise de hoje: ela continua explicável."""
    criada = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    analysis_id = criada.json()["analysis"]["id"]
    assert fake_db.analyses[analysis_id]["tier"] is None

    comprar(client, "cs_fundador")
    assert fake_db.analyses[analysis_id]["tier"] is None

    nova = register(client, fake_db, "alice-token", upload(fake_db, ALICE, sample_video), upload_image(fake_db, ALICE))
    assert fake_db.analyses[nova.json()["analysis"]["id"]]["tier"] == "pro"


# ---------------------------------------------------------------- uso justo


@pytest.fixture
def dois_por_dia(env, monkeypatch):
    env.setenv("DAILY_ANALYSIS_LIMIT", "2")
    get_settings.cache_clear()
    # aqui só interessa a contagem: a análise em si não roda
    monkeypatch.setattr(analysis_service, "run_analysis", lambda analysis_id, ui_language=None: None)
    return env


def enviar(client, fake_db, sample_video, token="alice-token", user=ALICE):
    return register(client, fake_db, token, upload(fake_db, user, sample_video), upload_image(fake_db, user))


def test_the_daily_limit_blocks_the_next_analysis(client, fake_db, sample_video, dois_por_dia):
    assert enviar(client, fake_db, sample_video).status_code == 201
    assert enviar(client, fake_db, sample_video).status_code == 201

    bloqueado = enviar(client, fake_db, sample_video)
    assert bloqueado.status_code == 429 and bloqueado.json()["error"]["code"] == "DAILY_LIMIT_REACHED"
    assert len(fake_db.videos) == 2  # o terceiro nem virou vídeo


def test_the_daily_limit_applies_to_founders_too(client, fake_db, sample_video, loja, dois_por_dia):
    comprar(client, "cs_fundador")
    enviar(client, fake_db, sample_video)
    enviar(client, fake_db, sample_video)
    assert enviar(client, fake_db, sample_video).status_code == 429


def test_the_daily_limit_frees_up_after_24_hours(client, fake_db, sample_video, dois_por_dia):
    enviar(client, fake_db, sample_video)
    enviar(client, fake_db, sample_video)
    ontem = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
    for video in fake_db.videos.values():
        video["created_at"] = ontem

    assert enviar(client, fake_db, sample_video).status_code == 201


def test_the_daily_limit_is_per_account(client, fake_db, sample_video, dois_por_dia):
    enviar(client, fake_db, sample_video)
    enviar(client, fake_db, sample_video)
    assert enviar(client, fake_db, sample_video, "bob-token", BOB).status_code == 201


def test_zero_turns_the_daily_limit_off(client, fake_db, sample_video, dois_por_dia):
    dois_por_dia.setenv("DAILY_ANALYSIS_LIMIT", "0")
    get_settings.cache_clear()
    for _ in range(3):
        assert enviar(client, fake_db, sample_video).status_code == 201


# ---------------------------------------------------------------- migração


def test_an_analysis_still_happens_before_the_migration_runs(monkeypatch):
    """O código sobe antes do SQL rodar: nesse intervalo a análise acontece sem o
    plano gravado, em vez de falhar na cara de quem enviou o vídeo."""
    from app.services import supabase_service

    enviados = []

    class TabelaFalsa:
        def insert(self, linha):
            enviados.append(linha)
            self.linha = linha
            return self

        def execute(self):
            if "tier" in self.linha:
                raise Exception("Could not find the 'tier' column of 'analyses' in the schema cache")
            return SimpleNamespace(data=[{**self.linha, "id": "id-da-analise"}])

    monkeypatch.setattr(supabase_service, "_client", lambda: SimpleNamespace(table=lambda nome: TabelaFalsa()))
    criada = supabase_service.insert_analysis("video-1", "user-1", tier="pro")

    assert criada["id"] == "id-da-analise"
    assert [("tier" in linha) for linha in enviados] == [True, False]  # tentou com, seguiu sem
