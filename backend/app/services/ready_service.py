"""O e-mail de "sua análise ficou pronta".

A análise leva uns 3 minutos e muita gente fecha a aba nesse meio-tempo: sem
um aviso, ela não volta. Sai para a conta (convidado não tem e-mail conhecido),
no idioma em que o site estava, e só nos momentos que contam:

  - as 3 primeiras análises da conta (é quando a pessoa decide se o produto serve);
  - a última análise completa grátis, avisando que as próximas saem parciais;
  - as 2 primeiras análises parciais, dizendo o que o plano completo tem
    (quantas mudanças e quantos cortes), sem o conteúdo, que só sai pago.

Depois disso, silêncio: quem manda 20 vídeos por dia não recebe 20 e-mails.
Nunca levanta: um e-mail que não sai não pode derrubar a análise.
"""

import html
import logging

from app.core.config import get_settings
from app.services import billing_service, edit_service, email_service, events_service, partners_service, supabase_service as db

logger = logging.getLogger("publishub")

FIRST_ANALYSES = 3
LOCKED_EMAILS = 2
FREE_RECOMMENDATIONS = 2  # o mesmo número de analysis_service: o que a análise parcial mostra

TEMPLATES = {
    "en": {
        "subject": "Your analysis is ready: {filename}",
        "intro": "publishub finished analyzing {filename}.",
        "drop": "Viewers start leaving at {time}. The analysis shows the line you were saying and what to change.",
        "cta": "Open the analysis",
        "last": "This was your last complete free analysis. From the next video on you'll see the drop and the first {free} changes; the full plan, the rewrites and the cuts come with a paid plan.",
        "locked": "The full plan for this video has {count} more changes.",
        "locked_cuts": "The full plan for this video has {count} more changes and {cuts} cuts ready to review (−{seconds}s), with the edited video.",
        "plans": "See plans",
        "footer": "You got this email because you sent a video to publishub.",
    },
    "pt-BR": {
        "subject": "Sua análise ficou pronta: {filename}",
        "intro": "O publishub terminou de analisar {filename}.",
        "drop": "As pessoas começam a sair aos {time}. A análise mostra a frase que você dizia e o que mudar.",
        "cta": "Abrir a análise",
        "last": "Esta foi a sua última análise completa grátis. A partir do próximo vídeo você vê a queda e as {free} primeiras mudanças; o plano completo, as reescritas e os cortes vêm com um plano pago.",
        "locked": "O plano completo deste vídeo tem mais {count} mudanças.",
        "locked_cuts": "O plano completo deste vídeo tem mais {count} mudanças e {cuts} cortes prontos para revisar (−{seconds}s), com o vídeo editado.",
        "plans": "Ver planos",
        "footer": "Você recebeu este e-mail porque enviou um vídeo para o publishub.",
    },
    "es": {
        "subject": "Tu análisis está listo: {filename}",
        "intro": "publishub terminó de analizar {filename}.",
        "drop": "La gente empieza a irse en el {time}. El análisis muestra la frase que decías y qué cambiar.",
        "cta": "Abrir el análisis",
        "last": "Este fue tu último análisis completo gratis. Desde el próximo video verás la caída y los primeros {free} cambios; el plan completo, las reescrituras y los cortes vienen con un plan de pago.",
        "locked": "El plan completo de este video tiene {count} cambios más.",
        "locked_cuts": "El plan completo de este video tiene {count} cambios más y {cuts} cortes listos para revisar (−{seconds}s), con el video editado.",
        "plans": "Ver planes",
        "footer": "Recibiste este correo porque enviaste un video a publishub.",
    },
    "fr": {
        "subject": "Votre analyse est prête : {filename}",
        "intro": "publishub a fini d'analyser {filename}.",
        "drop": "Les gens commencent à partir à {time}. L'analyse montre la phrase que vous disiez et quoi changer.",
        "cta": "Ouvrir l'analyse",
        "last": "C'était votre dernière analyse complète gratuite. À partir de la prochaine vidéo, vous verrez la chute et les {free} premiers changements ; le plan complet, les réécritures et les coupes viennent avec un plan payant.",
        "locked": "Le plan complet de cette vidéo contient {count} changements de plus.",
        "locked_cuts": "Le plan complet de cette vidéo contient {count} changements de plus et {cuts} coupes prêtes à revoir (−{seconds} s), avec la vidéo montée.",
        "plans": "Voir les plans",
        "footer": "Vous recevez cet e-mail parce que vous avez envoyé une vidéo à publishub.",
    },
    "de": {
        "subject": "Deine Analyse ist fertig: {filename}",
        "intro": "publishub hat {filename} fertig analysiert.",
        "drop": "Bei {time} fangen die Leute an abzuspringen. Die Analyse zeigt den Satz, den du gerade gesagt hast, und was du ändern kannst.",
        "cta": "Analyse öffnen",
        "last": "Das war deine letzte kostenlose vollständige Analyse. Ab dem nächsten Video siehst du den Absprung und die ersten {free} Änderungen; der vollständige Plan, die Umformulierungen und die Schnitte gibt es mit einem bezahlten Plan.",
        "locked": "Der vollständige Plan für dieses Video hat {count} weitere Änderungen.",
        "locked_cuts": "Der vollständige Plan für dieses Video hat {count} weitere Änderungen und {cuts} Schnitte zum Prüfen (−{seconds} s), mit dem geschnittenen Video.",
        "plans": "Pläne ansehen",
        "footer": "Du bekommst diese E-Mail, weil du ein Video an publishub geschickt hast.",
    },
    "it": {
        "subject": "La tua analisi è pronta: {filename}",
        "intro": "publishub ha finito di analizzare {filename}.",
        "drop": "Le persone iniziano ad andarsene a {time}. L'analisi mostra la frase che stavi dicendo e cosa cambiare.",
        "cta": "Apri l'analisi",
        "last": "Questa era la tua ultima analisi completa gratuita. Dal prossimo video vedrai il calo e le prime {free} modifiche; il piano completo, le riscritture e i tagli arrivano con un piano a pagamento.",
        "locked": "Il piano completo di questo video ha altre {count} modifiche.",
        "locked_cuts": "Il piano completo di questo video ha altre {count} modifiche e {cuts} tagli pronti da rivedere (−{seconds}s), con il video montato.",
        "plans": "Vedi i piani",
        "footer": "Ricevi questa email perché hai inviato un video a publishub.",
    },
    "hi": {
        "subject": "आपका विश्लेषण तैयार है: {filename}",
        "intro": "publishub ने {filename} का विश्लेषण पूरा कर लिया है।",
        "drop": "{time} पर दर्शक जाने लगते हैं। विश्लेषण बताता है कि आप उस वक्त कौन-सी लाइन बोल रहे थे और क्या बदलना है।",
        "cta": "विश्लेषण खोलें",
        "last": "यह आपका आखिरी मुफ़्त पूरा विश्लेषण था। अगले वीडियो से आपको ड्रॉप और पहले {free} बदलाव दिखेंगे; पूरा प्लान, नए हुक और कट पेड प्लान के साथ मिलते हैं।",
        "locked": "इस वीडियो के पूरे प्लान में {count} और बदलाव हैं।",
        "locked_cuts": "इस वीडियो के पूरे प्लान में {count} और बदलाव और रिव्यू के लिए तैयार {cuts} कट हैं (−{seconds}s), एडिट किए गए वीडियो के साथ।",
        "plans": "प्लान देखें",
        "footer": "आपको यह ईमेल इसलिए मिला क्योंकि आपने publishub पर एक वीडियो भेजा।",
    },
    "id": {
        "subject": "Analisismu sudah siap: {filename}",
        "intro": "publishub selesai menganalisis {filename}.",
        "drop": "Penonton mulai pergi di {time}. Analisisnya menunjukkan kalimat yang sedang kamu ucapkan dan apa yang perlu diubah.",
        "cta": "Buka analisis",
        "last": "Ini analisis lengkap gratis terakhirmu. Mulai video berikutnya kamu akan melihat titik turun dan {free} perubahan pertama; rencana lengkap, tulisan ulang, dan potongannya ada di paket berbayar.",
        "locked": "Rencana lengkap video ini punya {count} perubahan lagi.",
        "locked_cuts": "Rencana lengkap video ini punya {count} perubahan lagi dan {cuts} potongan siap ditinjau (−{seconds} dtk), dengan video yang sudah diedit.",
        "plans": "Lihat paket",
        "footer": "Kamu menerima email ini karena mengirim video ke publishub.",
    },
    "tr": {
        "subject": "Analizin hazır: {filename}",
        "intro": "publishub {filename} analizini bitirdi.",
        "drop": "İzleyiciler {time} civarında ayrılmaya başlıyor. Analiz o anda söylediğin cümleyi ve neyi değiştireceğini gösteriyor.",
        "cta": "Analizi aç",
        "last": "Bu, son ücretsiz tam analizindi. Sonraki videodan itibaren düşüşü ve ilk {free} değişikliği göreceksin; tam plan, yeniden yazımlar ve kesimler ücretli planla gelir.",
        "locked": "Bu videonun tam planında {count} değişiklik daha var.",
        "locked_cuts": "Bu videonun tam planında {count} değişiklik daha ve incelemeye hazır {cuts} kesim var (−{seconds} sn), düzenlenmiş videoyla birlikte.",
        "plans": "Planları gör",
        "footer": "publishub'a bir video gönderdiğin için bu e-postayı aldın.",
    },
    "ja": {
        "subject": "分析が完了しました: {filename}",
        "intro": "publishub が {filename} の分析を終えました。",
        "drop": "{time} で視聴者が離れ始めています。そのとき話していた一文と、何を変えればいいかを分析で確認できます。",
        "cta": "分析を開く",
        "last": "これが無料の完全な分析の最後でした。次の動画からは、離脱ポイントと最初の {free} 件の改善点が表示されます。完全なプラン、書き直し案、カットは有料プランで利用できます。",
        "locked": "この動画の完全なプランには、さらに {count} 件の改善点があります。",
        "locked_cuts": "この動画の完全なプランには、さらに {count} 件の改善点と、確認できる {cuts} か所のカット（−{seconds} 秒）、編集済みの動画があります。",
        "plans": "プランを見る",
        "footer": "publishub に動画を送信したため、このメールが届きました。",
    },
    "ko": {
        "subject": "분석이 완료됐어요: {filename}",
        "intro": "publishub가 {filename} 분석을 마쳤어요.",
        "drop": "{time}에서 시청자가 떠나기 시작해요. 분석에서 그때 하던 말과 무엇을 바꿀지 확인할 수 있어요.",
        "cta": "분석 열기",
        "last": "이번이 마지막 무료 전체 분석이었어요. 다음 영상부터는 이탈 지점과 처음 {free}개의 개선점이 보여요. 전체 플랜, 다시 쓴 훅, 컷은 유료 플랜에서 제공돼요.",
        "locked": "이 영상의 전체 플랜에는 개선점이 {count}개 더 있어요.",
        "locked_cuts": "이 영상의 전체 플랜에는 개선점 {count}개와 검토할 컷 {cuts}개(−{seconds}초), 편집된 영상이 더 있어요.",
        "plans": "플랜 보기",
        "footer": "publishub에 영상을 보내셔서 이 이메일을 받으셨어요.",
    },
}


def _locale(hint: str | None) -> str:
    """O idioma do site (ou do vídeo, na falta dele) → um dos idiomas do e-mail."""
    value = (hint or "").strip()
    if value in TEMPLATES:
        return value
    base = value.split("-")[0].lower()
    if base == "pt":
        return "pt-BR"
    return base if base in TEMPLATES else "en"


def _timestamp(seconds: float) -> str:
    total = int(round(seconds))
    return f"{total // 60}:{total % 60:02d}"


def _kind(analysis: dict, user_id: str, number: int) -> str | None:
    """Que e-mail esta análise merece: "first", "last_free", "locked" ou nenhum."""
    settings = get_settings()
    user = {"id": user_id}
    paid = billing_service.has_full_access(user)
    full = bool(analysis.get("paid_at")) or analysis.get("full_access", True) or paid
    if not paid:
        used = db.count_videos(user_id)
        free = settings.free_full_analyses + partners_service.bonus_analyses(user_id)
        if not full:
            return "locked" if used - free <= LOCKED_EMAILS else None
        if used == free:
            return "last_free"
    return "first" if number <= FIRST_ANALYSES else None


def _message(kind: str, locale: str, analysis_id: str, filename: str, result: dict, duration: float) -> tuple[str, str, str]:
    settings = get_settings()
    text = TEMPLATES[locale]
    link = f"{settings.app_url}/results/{analysis_id}"
    plans = f"{settings.app_url}/pricing?utm_source=email&utm_medium=ready"
    name = filename or "your video"
    lines = [text["intro"].format(filename=name)]
    drop = (result or {}).get("drop") or {}
    if drop.get("at_seconds") is not None:
        lines.append(text["drop"].format(time=_timestamp(float(drop["at_seconds"]))))
    upsell = None
    if kind == "last_free":
        upsell = text["last"].format(free=FREE_RECOMMENDATIONS)
    elif kind == "locked":
        recommendations = ((result or {}).get("copilot") or {}).get("recommendations") or []
        more = max(0, len(recommendations) - FREE_RECOMMENDATIONS)
        cuts = edit_service.suggestion_items({"result": result, "videos": {"duration_seconds": duration}})
        seconds = round(sum(c["end_seconds"] - c["start_seconds"] for c in cuts), 1)
        upsell = (text["locked_cuts"] if cuts else text["locked"]).format(count=more, cuts=len(cuts), seconds=seconds)

    button = lambda href, label: f'<p style="margin:24px 0"><a href="{html.escape(href)}" style="background:#1f47a6;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">{html.escape(label)}</a></p>'
    body = "".join(f"<p>{html.escape(line)}</p>" for line in lines) + button(link, text["cta"])
    plain = [*lines, "", f"{text['cta']}: {link}"]
    if upsell:
        body += f"<p>{html.escape(upsell)}</p>" + f'<p><a href="{html.escape(plans)}" style="color:#1f47a6">{html.escape(text["plans"])}</a></p>'
        plain += ["", upsell, f"{text['plans']}: {plans}"]
    body += f'<p style="font-size:13px;color:#6b6a67">{html.escape(text["footer"])}</p>'
    plain += ["", text["footer"]]
    wrapper = '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1e1b18;max-width:520px">'
    return text["subject"].format(filename=name), wrapper + body + "</div>", "\n".join(plain)


def analysis_ready(analysis: dict, result: dict, duration: float, filename: str | None, locale_hint: str | None, number: int) -> str | None:
    """Manda o aviso, se esta análise merece um. Devolve o tipo enviado (ou None). Nunca levanta."""
    user_id = analysis.get("user_id")
    if not user_id or not get_settings().email_configured:
        return None
    try:
        kind = _kind(analysis, user_id, number)
        if not kind:
            return None
        address = (db.get_profile(user_id) or {}).get("email")
        if not address:
            return None
        subject, body, plain = _message(kind, _locale(locale_hint), analysis["id"], filename or "", result, duration)
        email_service.send(address, subject, body, plain)
        events_service.record_for_user(user_id, "ready_email_sent", analysis["id"], {"kind": kind})
        return kind
    except Exception:
        logger.exception("ready email for analysis %s did not go out", analysis.get("id"))
        return None
