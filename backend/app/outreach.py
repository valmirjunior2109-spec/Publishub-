"""O e-mail de apresentação do Publishub para o ICP (docs/icp.md).

Lê uma lista de contatos em CSV e manda, para cada um, uma mensagem curta com o
link getpublishub.com. Por padrão só mostra o que sairia (simulação); envia de
verdade com --enviar, pelo mesmo Resend dos outros e-mails.

    cd backend
    python -m app.outreach contatos.csv              # simula
    python -m app.outreach contatos.csv --enviar     # envia

O CSV tem cabeçalho e as colunas:
    email   obrigatória
    origem  obrigatória: como o contato chegou (ex.: "opt-in novidades",
            "e-mail de parcerias na bio"). Sem origem a linha não sai.
    nome    opcional, entra no "Oi, {nome}"
    idioma  opcional: pt-BR (padrão), en ou es

Cuidados que o script toma sozinho:
- quem respondeu "sair" vai para o arquivo de descadastros e nunca mais recebe;
- quem já recebeu (arquivo de enviados) não recebe de novo;
- no máximo --limite envios por rodada, com --intervalo segundos entre eles;
- todo e-mail tem o cabeçalho List-Unsubscribe e o rodapé com a saída.
"""

import argparse
import csv
import html
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from app.core.config import get_settings
from app.services import email_service
from app.services.lead_service import EMAIL_RE

SITE = "https://getpublishub.com"
# o site serve cada idioma num prefixo próprio (frontend/src/i18n/paths.ts)
LOCALE_PATH = {"pt-BR": "/pt", "en": "/", "es": "/es"}
DEFAULT_LOCALE = "pt-BR"
CAMPAIGN = "icp-criadores"

TEMPLATES = {
    "pt-BR": {
        "subject": "O segundo em que seu Reel perde as pessoas",
        "hello": "Oi, {name}!",
        "hello_anon": "Oi!",
        "body": [
            "Você edita os próprios vídeos, então já sabe cortar. O difícil é saber o que cortar: o editor mostra a timeline, não o segundo em que as pessoas desistem de assistir.",
            "O Publishub assiste ao seu Reel, TikTok ou Short e devolve um plano de ação: o segundo exato da queda, a frase que você dizia nele e de 4 a 8 mudanças (gancho, cortes, ritmo, legenda, CTA), na ordem do que mais mexe na retenção. Nada muda sem o seu ok.",
            "A primeira análise é grátis e sem cadastro: envie um vídeo e veja o plano em uns 3 minutos.",
        ],
        "cta": "Analisar meu vídeo grátis",
        "footer": "Se não quiser receber mais e-mails do Publishub, é só responder com \"sair\" que tiramos você da lista.",
    },
    "en": {
        "subject": "The second your Reel loses people",
        "hello": "Hi {name},",
        "hello_anon": "Hi,",
        "body": [
            "You edit your own videos, so you already know how to cut. The hard part is knowing what to cut: your editor shows the timeline, not the second people stop watching.",
            "Publishub watches your Reel, TikTok or Short and gives you an action plan: the exact second of the drop, what you were saying right then, and 4 to 8 changes (hook, cuts, pacing, captions, CTA), ordered by what moves retention most. Nothing changes without your ok.",
            "Your first analysis is free, no sign-up: upload a video and get the plan in about 3 minutes.",
        ],
        "cta": "Analyze my video for free",
        "footer": "If you'd rather not hear from Publishub again, just reply \"unsubscribe\" and we'll take you off the list.",
    },
    "es": {
        "subject": "El segundo en que tu Reel pierde a la gente",
        "hello": "¡Hola, {name}!",
        "hello_anon": "¡Hola!",
        "body": [
            "Editas tus propios videos, así que ya sabes cortar. Lo difícil es saber qué cortar: el editor muestra la línea de tiempo, no el segundo en que la gente deja de mirar.",
            "Publishub mira tu Reel, TikTok o Short y te devuelve un plan de acción: el segundo exacto de la caída, la frase que decías en ese momento y de 4 a 8 cambios (gancho, cortes, ritmo, subtítulos, CTA), en el orden de lo que más mueve la retención. Nada cambia sin tu ok.",
            "El primer análisis es gratis y sin registro: sube un video y recibe el plan en unos 3 minutos.",
        ],
        "cta": "Analizar mi video gratis",
        "footer": "Si no quieres recibir más correos de Publishub, responde \"baja\" y te quitamos de la lista.",
    },
}


def site_link(locale: str) -> str:
    """getpublishub.com no idioma do contato, com UTM para o funil saber de onde veio."""
    params = urlencode({"utm_source": "email", "utm_medium": "outreach", "utm_campaign": CAMPAIGN})
    path = LOCALE_PATH.get(locale, LOCALE_PATH[DEFAULT_LOCALE])
    return f"{SITE}{path}?{params}"


def message(name: str, locale: str, signature: str) -> tuple[str, str, str]:
    """Assunto, html e texto para um contato."""
    text = TEMPLATES.get(locale, TEMPLATES[DEFAULT_LOCALE])
    link = site_link(locale)
    hello = text["hello"].format(name=name) if name else text["hello_anon"]

    body = (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1e1b16;max-width:540px">'
        f"<p>{html.escape(hello)}</p>"
        + "".join(f"<p>{html.escape(p)}</p>" for p in text["body"])
        + f'<p style="margin:28px 0"><a href="{html.escape(link)}" style="background:#1f47a6;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">{html.escape(text["cta"])}</a></p>'
        f'<p>{html.escape(signature)}<br><a href="{html.escape(link)}" style="color:#1f47a6">getpublishub.com</a></p>'
        f'<p style="font-size:13px;color:#6b6459">{html.escape(text["footer"])}</p>'
        "</div>"
    )
    plain = "\n\n".join([hello, *text["body"], f"{text['cta']}: {link}", signature, text["footer"]])
    return text["subject"], body, plain


def unsubscribe_headers() -> dict[str, str]:
    """List-Unsubscribe por e-mail: o Gmail e o Outlook mostram o botão "cancelar inscrição"."""
    settings = get_settings()
    address = settings.email_reply_to or settings.email_from
    if "<" in address:
        address = address.split("<", 1)[1].rstrip(">").strip()
    return {"List-Unsubscribe": f"<mailto:{address}?subject=sair>"} if address else {}


def read_list(path: Path) -> set[str]:
    """Um e-mail por linha (descadastros) ou CSV com a coluna email (enviados)."""
    if not path.exists():
        return set()
    with path.open(newline="", encoding="utf-8") as fh:
        if path.suffix == ".csv":
            return {(row.get("email") or "").strip().lower() for row in csv.DictReader(fh)} - {""}
        return {line.strip().lower() for line in fh if line.strip() and not line.startswith("#")}


def plan(rows: list[dict], blocked: set[str], sent: set[str]) -> tuple[list[dict], list[tuple[str, str]]]:
    """Quem recebe e quem fica de fora (com o motivo)."""
    ready, skipped, seen = [], [], set()
    for row in rows:
        email = (row.get("email") or "").strip().lower()
        if len(email) > 254 or not EMAIL_RE.match(email):
            skipped.append((email or "(vazio)", "e-mail inválido"))
        elif not (row.get("origem") or "").strip():
            skipped.append((email, "sem origem: de onde veio este contato?"))
        elif email in blocked:
            skipped.append((email, "descadastrado"))
        elif email in sent:
            skipped.append((email, "já recebeu"))
        elif email in seen:
            skipped.append((email, "repetido na lista"))
        else:
            seen.add(email)
            locale = (row.get("idioma") or "").strip() or DEFAULT_LOCALE
            ready.append({
                "email": email,
                "name": (row.get("nome") or "").strip(),
                "locale": locale if locale in TEMPLATES else DEFAULT_LOCALE,
                "origin": row["origem"].strip(),
            })
    return ready, skipped


def log_sent(path: Path, contact: dict, message_id: str) -> None:
    new = not path.exists()
    with path.open("a", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        if new:
            writer.writerow(["email", "origem", "idioma", "message_id", "enviado_em"])
        writer.writerow([contact["email"], contact["origin"], contact["locale"], message_id, datetime.now(timezone.utc).isoformat()])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="E-mail de apresentação do Publishub para o ICP.")
    parser.add_argument("contatos", type=Path, help="CSV com email, origem, nome, idioma")
    parser.add_argument("--enviar", action="store_true", help="envia de verdade (sem isso, só simula)")
    parser.add_argument("--limite", type=int, default=50, help="máximo de envios nesta rodada (padrão 50)")
    parser.add_argument("--intervalo", type=float, default=2.0, help="segundos entre um envio e outro (padrão 2)")
    parser.add_argument("--assinatura", default="Equipe Publishub")
    parser.add_argument("--descadastros", type=Path, default=Path("outreach_descadastros.txt"))
    parser.add_argument("--enviados", type=Path, default=Path("outreach_enviados.csv"))
    args = parser.parse_args(argv)

    with args.contatos.open(newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    ready, skipped = plan(rows, read_list(args.descadastros), read_list(args.enviados))
    batch = ready[: max(args.limite, 0)]

    for email, reason in skipped:
        print(f"pulado  {email}: {reason}")
    print(f"\n{len(batch)} para enviar nesta rodada ({len(ready)} prontos, {len(skipped)} pulados).")

    if not args.enviar:
        if batch:
            subject, _, plain = message(batch[0]["name"], batch[0]["locale"], args.assinatura)
            print(f"\n--- prévia ({batch[0]['email']}) ---\nAssunto: {subject}\n\n{plain}\n---")
        print("\nSimulação: nada foi enviado. Rode de novo com --enviar para mandar.")
        return 0

    if not get_settings().email_configured:
        print("RESEND_API_KEY / EMAIL_FROM não configurados: nada foi enviado.", file=sys.stderr)
        return 1

    headers = unsubscribe_headers()
    failures = 0
    for i, contact in enumerate(batch):
        if i:
            time.sleep(args.intervalo)
        subject, body, plain = message(contact["name"], contact["locale"], args.assinatura)
        try:
            message_id = email_service.send(contact["email"], subject, body, plain, headers=headers)
        except email_service.EmailError as exc:
            failures += 1
            print(f"falhou  {contact['email']}: {exc}", file=sys.stderr)
            continue
        log_sent(args.enviados, contact, message_id)
        print(f"enviado {contact['email']}")

    print(f"\n{len(batch) - failures} enviados, {failures} falharam.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
