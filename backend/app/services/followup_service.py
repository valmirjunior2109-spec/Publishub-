"""O lembrete que fecha o loop.

Depois da análise o criador diz quando vai republicar. 72 h depois (ou 48 h
depois da data informada) sai um e-mail pedindo a retenção real — sem ele a
previsão nunca é conferida e o placar de precisão não sai do lugar.

Quem dispara é o cron, batendo em POST /api/internal/followups. O envio é
idempotente pelo status: só sai o que está "scheduled", e o que falha volta para
a fila com o erro registrado.
"""

import logging
from datetime import date, datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import email_service, supabase_service as db

logger = logging.getLogger("publishub")

# Quantas vezes um lembrete tenta sair antes de desistir (e-mail inválido, caixa cheia…).
MAX_ATTEMPTS = 3
DEFAULT_BATCH = 50
LOCALES = ("en", "pt-BR", "es", "fr", "de", "it", "hi", "id", "tr", "ja", "ko")

# O e-mail é curto de propósito: uma pergunta e um link. Quem chegou até aqui já
# sabe o que é o Publishub — o assunto é a retenção real, não o produto.
TEMPLATES = {
    "en": {
        "subject": "Did the retention go up?",
        "greeting": "You analyzed {filename} on Publishub and were going to re-record it.",
        "ask": "Open Instagram Insights, look at the retention at the second we predicted, and paste the real number. We compare it with the prediction and update your accuracy score.",
        "cta": "Paste the real retention",
        "footer": "If you haven't republished yet, just ignore this — the analysis stays in your dashboard.",
    },
    "pt-BR": {
        "subject": "A retenção subiu?",
        "greeting": "Você analisou {filename} no Publishub e ia regravar esse trecho.",
        "ask": "Abra o Instagram Insights, veja a retenção no segundo que a gente previu e cole o número real. A gente compara com a previsão e atualiza seu placar de precisão.",
        "cta": "Colar a retenção real",
        "footer": "Se você ainda não republicou, pode ignorar este e-mail — a análise continua no seu painel.",
    },
    "es": {
        "subject": "¿Subió la retención?",
        "greeting": "Analizaste {filename} en Publishub e ibas a regrabar esa parte.",
        "ask": "Abre Instagram Insights, mira la retención en el segundo que predijimos y pega el número real. Lo comparamos con la predicción y actualizamos tu marcador de precisión.",
        "cta": "Pegar la retención real",
        "footer": "Si todavía no republicaste, ignora este correo — el análisis sigue en tu panel.",
    },
    "fr": {
        "subject": "La rétention a-t-elle augmenté ?",
        "greeting": "Vous avez analysé {filename} sur Publishub et vous alliez réenregistrer ce passage.",
        "ask": "Ouvrez Instagram Insights, regardez la rétention à la seconde que nous avions prévue et collez le chiffre réel. Nous le comparons à la prévision et mettons à jour votre score de précision.",
        "cta": "Coller la rétention réelle",
        "footer": "Si vous n’avez pas encore republié, ignorez cet e-mail — l’analyse reste dans votre tableau de bord.",
    },
    "de": {
        "subject": "Ist die Retention gestiegen?",
        "greeting": "Du hast {filename} mit Publishub analysiert und wolltest diese Stelle neu aufnehmen.",
        "ask": "Öffne Instagram Insights, schau dir die Retention an der vorhergesagten Sekunde an und füge die echte Zahl ein. Wir vergleichen sie mit der Prognose und aktualisieren deine Trefferquote.",
        "cta": "Echte Retention einfügen",
        "footer": "Wenn du noch nicht neu veröffentlicht hast, ignoriere diese E-Mail einfach — die Analyse bleibt in deinem Dashboard.",
    },
    "it": {
        "subject": "La retention è salita?",
        "greeting": "Hai analizzato {filename} su Publishub e volevi registrare di nuovo quel pezzo.",
        "ask": "Apri Instagram Insights, guarda la retention al secondo che avevamo previsto e incolla il numero reale. Lo confrontiamo con la previsione e aggiorniamo il tuo punteggio di precisione.",
        "cta": "Incolla la retention reale",
        "footer": "Se non hai ancora ripubblicato, ignora questa email — l’analisi resta nella tua dashboard.",
    },
    "hi": {
        "subject": "क्या रिटेंशन बढ़ा?",
        "greeting": "आपने Publishub पर {filename} का विश्लेषण किया था और उस हिस्से को दोबारा रिकॉर्ड करने वाले थे।",
        "ask": "Instagram Insights खोलिए, जिस सेकंड का हमने अनुमान लगाया था वहाँ का रिटेंशन देखिए और असली आँकड़ा यहाँ डालिए। हम उसे अनुमान से मिलाकर आपका सटीकता स्कोर अपडेट करेंगे।",
        "cta": "असली रिटेंशन डालें",
        "footer": "अगर आपने अभी तक दोबारा पोस्ट नहीं किया है, तो इस ईमेल को छोड़ दीजिए — विश्लेषण आपके डैशबोर्ड में रहेगा।",
    },
    "id": {
        "subject": "Apakah retensinya naik?",
        "greeting": "Kamu menganalisis {filename} di Publishub dan berencana merekam ulang bagian itu.",
        "ask": "Buka Instagram Insights, lihat retensi di detik yang kami prediksi, lalu tempel angka sebenarnya. Kami bandingkan dengan prediksi dan memperbarui skor akurasimu.",
        "cta": "Tempel retensi sebenarnya",
        "footer": "Kalau kamu belum mengunggah ulang, abaikan saja email ini — analisisnya tetap ada di dasbor kamu.",
    },
    "tr": {
        "subject": "İzlenme oranı arttı mı?",
        "greeting": "Publishub’da {filename} videosunu analiz ettin ve o kısmı yeniden çekecektin.",
        "ask": "Instagram Insights’ı aç, tahmin ettiğimiz saniyedeki izlenme oranına bak ve gerçek sayıyı yapıştır. Tahminle karşılaştırıp doğruluk puanını güncelleyelim.",
        "cta": "Gerçek izlenme oranını yapıştır",
        "footer": "Henüz yeniden yayınlamadıysan bu e-postayı görmezden gel — analiz panelinde duruyor.",
    },
    "ja": {
        "subject": "視聴維持率は上がりましたか？",
        "greeting": "Publishubで{filename}を分析し、その部分を撮り直す予定でしたね。",
        "ask": "Instagramのインサイトを開き、予測した秒数の視聴維持率を確認して、実際の数値を貼り付けてください。予測と比べて、あなたの的中スコアを更新します。",
        "cta": "実際の視聴維持率を貼り付ける",
        "footer": "まだ再投稿していない場合は、このメールは無視してください。分析はダッシュボードに残っています。",
    },
    "ko": {
        "subject": "시청 지속률이 올랐나요?",
        "greeting": "Publishub에서 {filename}을(를) 분석하고 그 부분을 다시 촬영하려고 하셨죠.",
        "ask": "Instagram 인사이트를 열어 저희가 예측한 초의 시청 지속률을 확인하고 실제 수치를 붙여넣어 주세요. 예측과 비교해 정확도 점수를 업데이트해 드립니다.",
        "cta": "실제 시청 지속률 붙여넣기",
        "footer": "아직 다시 게시하지 않았다면 이 메일은 무시하셔도 됩니다. 분석은 대시보드에 그대로 있어요.",
    },
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _send_after(republish_on: date | None) -> datetime:
    settings = get_settings()
    if republish_on is None:
        return _now() + timedelta(hours=settings.followup_hours)
    # a data vem sem hora: conta a partir do fim daquele dia, em UTC
    published = datetime.combine(republish_on, datetime.min.time(), tzinfo=timezone.utc)
    return published + timedelta(hours=settings.followup_after_republish_hours)


def schedule(user: dict, analysis: dict, republish_on: date | None, locale: str | None) -> dict:
    """Agenda (ou reagenda) o lembrete de uma análise que já terminou."""
    if analysis["status"] != "completed":
        raise ApiError(409, "NOT_READY", "O lembrete só faz sentido depois que a análise termina.")
    if (analysis.get("outcome") or "pending") != "pending":
        raise ApiError(409, "LOOP_CLOSED", "Você já registrou o resultado real desta análise.")
    # sem previsão de retenção não há número para pedir no e-mail (análise sem print)
    if not (analysis.get("result") or {}).get("prediction"):
        raise ApiError(409, "NO_PREDICTION", "Esta análise foi feita sem o print da retenção, então não tem previsão para conferir.")

    send_after = _send_after(republish_on)
    row = {
        "analysis_id": analysis["id"],
        "user_id": user["id"],
        "republish_on": republish_on.isoformat() if republish_on else None,
        "send_after": send_after.isoformat(),
        "locale": locale if locale in LOCALES else "en",
        "status": "scheduled",
        "attempts": 0,
        "last_error": None,
        "sent_at": None,
    }
    stored = db.upsert_followup(row)
    return _serialize(stored)


def cancel(analysis_id: str) -> int:
    """O número real chegou: o lembrete perdeu o motivo de existir."""
    return db.cancel_followup(analysis_id)


def for_analysis(analysis_id: str) -> dict | None:
    row = db.get_followup(analysis_id)
    return _serialize(row) if row else None


def _serialize(row: dict) -> dict:
    return {
        "analysis_id": row["analysis_id"],
        "republish_on": row.get("republish_on"),
        "send_after": row.get("send_after"),
        "status": row.get("status"),
        "sent_at": row.get("sent_at"),
    }


def _message(followup: dict, filename: str) -> tuple[str, str, str]:
    """Assunto, html e texto do lembrete, no idioma em que o site estava."""
    settings = get_settings()
    text = TEMPLATES.get(followup.get("locale") or "en", TEMPLATES["en"])
    link = f"{settings.app_url}/results/{followup['analysis_id']}"
    greeting = text["greeting"].format(filename=filename)

    html = (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1e1b18;max-width:520px">'
        f"<p>{greeting}</p>"
        f"<p>{text['ask']}</p>"
        f'<p style="margin:28px 0"><a href="{link}" style="background:#1f47a6;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">{text["cta"]}</a></p>'
        f'<p style="font-size:13px;color:#6b6a67">{text["footer"]}</p>'
        "</div>"
    )
    plain = f"{greeting}\n\n{text['ask']}\n\n{text['cta']}: {link}\n\n{text['footer']}"
    return text["subject"], html, plain


def send_due(limit: int = DEFAULT_BATCH) -> dict:
    """Envia os lembretes vencidos. Chamado pelo cron; nunca levanta por causa de um e-mail."""
    settings = get_settings()
    if not settings.email_configured:
        logger.warning("followups: RESEND_API_KEY/EMAIL_FROM ausentes, nada foi enviado")
        return {"due": 0, "sent": 0, "failed": 0, "skipped": "email_not_configured"}

    due = db.list_due_followups(_now().isoformat(), limit)
    sent = failed = 0
    for followup in due:
        analysis = followup.get("analyses") or {}
        # o criador pode ter colado o número antes de o e-mail sair
        if (analysis.get("outcome") or "pending") != "pending":
            db.update_followup(followup["id"], {"status": "cancelled"})
            continue

        profile = db.get_profile(followup["user_id"])
        address = (profile or {}).get("email")
        if not address:
            db.update_followup(followup["id"], {"status": "failed", "last_error": "conta sem e-mail"})
            failed += 1
            continue

        filename = ((analysis.get("videos") or {}).get("filename")) or "seu Reel"
        subject, html, plain = _message(followup, filename)
        try:
            email_service.send(address, subject, html, plain)
        except email_service.EmailError as exc:
            attempts = (followup.get("attempts") or 0) + 1
            # tenta de novo nas próximas rodadas do cron; depois de MAX_ATTEMPTS, desiste
            db.update_followup(
                followup["id"],
                {"status": "failed" if attempts >= MAX_ATTEMPTS else "scheduled", "attempts": attempts, "last_error": str(exc)[:300]},
            )
            logger.warning("followup %s não saiu (tentativa %s): %s", followup["id"], attempts, exc)
            failed += 1
            continue

        db.update_followup(followup["id"], {"status": "sent", "sent_at": _now().isoformat(), "attempts": (followup.get("attempts") or 0) + 1})
        sent += 1

    logger.info("followups: %s vencidos, %s enviados, %s com erro", len(due), sent, failed)
    return {"due": len(due), "sent": sent, "failed": failed}
