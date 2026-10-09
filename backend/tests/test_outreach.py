"""O e-mail de apresentação para o ICP: simula por padrão, nunca repete, respeita quem saiu."""

import csv

import pytest

from app import outreach
from app.core.config import get_settings
from app.services import email_service

ROWS = [
    {"email": "Ana@Exemplo.com", "nome": "Ana", "idioma": "pt-BR", "origem": "opt-in novidades"},
    {"email": "bob@example.com", "nome": "", "idioma": "en", "origem": "bio de parcerias"},
    {"email": "sem-origem@example.com", "nome": "X", "idioma": "", "origem": ""},
    {"email": "invalido", "nome": "", "idioma": "", "origem": "opt-in"},
    {"email": "saiu@example.com", "nome": "", "idioma": "es", "origem": "opt-in"},
    {"email": "ana@exemplo.com", "nome": "Ana de novo", "idioma": "", "origem": "opt-in"},
]


@pytest.fixture
def files(tmp_path):
    contacts = tmp_path / "contatos.csv"
    with contacts.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["email", "nome", "idioma", "origem"])
        writer.writeheader()
        writer.writerows(ROWS)
    blocked = tmp_path / "descadastros.txt"
    blocked.write_text("# quem respondeu sair\nsaiu@example.com\n", encoding="utf-8")
    return {"contatos": contacts, "descadastros": blocked, "enviados": tmp_path / "enviados.csv"}


@pytest.fixture
def mailbox(env, monkeypatch):
    env.setenv("RESEND_API_KEY", "re_test_x")
    env.setenv("EMAIL_FROM", "Publishub <ola@getpublishub.com>")
    env.delenv("EMAIL_REPLY_TO", raising=False)
    get_settings.cache_clear()

    sent: list[dict] = []

    def send(to, subject, html, text, headers=None):
        sent.append({"to": to, "subject": subject, "html": html, "text": text, "headers": headers})
        return f"msg_{len(sent)}"

    monkeypatch.setattr(email_service, "send", send)
    monkeypatch.setattr(outreach.time, "sleep", lambda _: None)
    return sent


def run(files, *extra):
    return outreach.main([
        str(files["contatos"]),
        "--descadastros", str(files["descadastros"]),
        "--enviados", str(files["enviados"]),
        *extra,
    ])


def test_only_contacts_with_a_valid_email_an_origin_and_no_opt_out_are_planned(files):
    ready, skipped = outreach.plan(ROWS, {"saiu@example.com"}, set())
    assert [c["email"] for c in ready] == ["ana@exemplo.com", "bob@example.com"]
    assert dict(skipped) == {
        "sem-origem@example.com": "sem origem: de onde veio este contato?",
        "invalido": "e-mail inválido",
        "saiu@example.com": "descadastrado",
        "ana@exemplo.com": "repetido na lista",
    }


def test_the_message_links_to_the_site_in_the_contacts_language():
    subject, html, text = outreach.message("Ana", "pt-BR", "Equipe Publishub")
    assert subject == "O segundo em que seu Reel perde as pessoas"
    assert text.startswith("Oi, Ana!")
    assert "https://getpublishub.com/pt?utm_source=email" in text
    assert "getpublishub.com/pt?utm_source=email" in html
    assert "sair" in text

    _, _, english = outreach.message("", "en", "Equipe Publishub")
    assert english.startswith("Hi,")
    assert "https://getpublishub.com/?utm_source=email" in english


def test_without_enviar_nothing_is_sent(files, mailbox, capsys):
    assert run(files) == 0
    assert mailbox == []
    assert not files["enviados"].exists()
    assert "Simulação: nada foi enviado" in capsys.readouterr().out


def test_enviar_sends_once_with_the_unsubscribe_header_and_never_repeats(files, mailbox):
    assert run(files, "--enviar") == 0
    assert [m["to"] for m in mailbox] == ["ana@exemplo.com", "bob@example.com"]
    assert mailbox[0]["headers"] == {"List-Unsubscribe": "<mailto:ola@getpublishub.com?subject=sair>"}
    assert mailbox[1]["subject"] == "The second your Reel loses people"

    # a segunda rodada lê o arquivo de enviados e não manda nada de novo
    assert run(files, "--enviar") == 0
    assert len(mailbox) == 2


def test_the_limit_caps_each_round(files, mailbox):
    assert run(files, "--enviar", "--limite", "1") == 0
    assert [m["to"] for m in mailbox] == ["ana@exemplo.com"]
    assert run(files, "--enviar", "--limite", "1") == 0
    assert [m["to"] for m in mailbox] == ["ana@exemplo.com", "bob@example.com"]


def test_without_an_email_provider_nothing_is_sent(files, env, monkeypatch):
    env.delenv("RESEND_API_KEY", raising=False)
    get_settings.cache_clear()
    monkeypatch.setattr(email_service, "send", lambda *a, **k: pytest.fail("não devia enviar"))
    assert run(files, "--enviar") == 1
