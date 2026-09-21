from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.core.errors import ApiError

from app.api.deps import Actor, get_actor, get_current_admin, get_current_user
from app.core.config import get_settings
from app.schemas.billing import BillingConfirm, PartnerUpdate, ReferralClaim, ReferralVisit
from app.schemas.video import AccountDelete, AnalysisRetry, BlindResponseCreate, EditRequest, EventCreate, FollowupCreate, GuestClaim, GuestUploadRequest, NotionConnect, NotionTarget, OutcomeCreate, VideoCreate
from app.services import account_service, analysis_service, billing_service, edit_service, events_service, followup_service, guest_service, notion_service, partners_service, supabase_service as db

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    settings = get_settings()
    return {"status": "ok", "supabase_configured": settings.supabase_configured, "ai_configured": settings.ai_configured}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    profile = db.get_profile(user["id"])
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": profile.get("full_name") if profile else None,
        "created_at": profile.get("created_at") if profile else None,
        # null = nunca viu as boas-vindas; é o que decide mostrar o onboarding
        "onboarded_at": profile.get("onboarded_at") if profile else None,
        "entitlement": billing_service.entitlement(user),
    }


@router.post("/me/onboarded")
def complete_onboarding(user: dict = Depends(get_current_user)):
    """Boas-vindas vistas. Idempotente: a primeira vez é a que vale."""
    profile = db.get_profile(user["id"])
    if profile and profile.get("onboarded_at"):
        return {"onboarded_at": profile["onboarded_at"]}
    when = datetime.now(timezone.utc).isoformat()
    db.update_profile(user["id"], {"onboarded_at": when})
    events_service.record(Actor(kind="user", user=user), "onboarding_completed")
    return {"onboarded_at": when}


@router.post("/me/delete")
def delete_account(payload: AccountDelete, user: dict = Depends(get_current_user)):
    """Apaga a conta e os arquivos dela. Irreversível."""
    return account_service.delete(user, payload.confirmation)


# ---------------------------------------------------------------- pagamento


@router.post("/billing/confirm")
def confirm_purchase(payload: BillingConfirm, user: dict = Depends(get_current_user)):
    """/obrigado, logado: confirma a sessão no Stripe e libera o acesso na hora."""
    return {"entitlement": billing_service.confirm_session(user, payload.session_id)}


@router.get("/billing/session/{session_id}")
def purchase_status(session_id: str):
    """/obrigado, sem login: diz se está pago e para qual e-mail (mascarado)."""
    return billing_service.public_session(session_id)


# ---------------------------------------------------------------- Publishub Partners


@router.get("/partners")
def partners(user: dict = Depends(get_current_user)):
    """O link de indicação da conta e o progresso até o Lifetime de graça."""
    return partners_service.overview(user)


@router.get("/partners/program")
def partners_program(user: dict = Depends(get_current_user)):
    """O painel do Partner: link, cliques, indicados, clientes pagos e quanto ele já ganhou."""
    return partners_service.program(user)


@router.post("/partners/join")
def partners_join(user: dict = Depends(get_current_user)):
    """Entra no programa de parceria (idempotente: quem já está dentro recebe o mesmo painel)."""
    return partners_service.join(user)


@router.post("/partners/code")
def partners_set_code(payload: ReferralClaim, user: dict = Depends(get_current_user)):
    """Escolhe o código do link (/?ref=copilot). Só vale antes da primeira indicação."""
    return partners_service.set_code(user, payload.code)


@router.post("/referrals/visit")
def referral_visit(payload: ReferralVisit):
    """Sem login: conta uma visita ao link /?ref=CODE (só para códigos que existem)."""
    return partners_service.record_click(payload.code)


@router.post("/referrals/claim")
def claim_referral(payload: ReferralClaim, user: dict = Depends(get_current_user)):
    """Chamado uma vez pelo frontend quando uma conta nova entra com o cookie do link."""
    return partners_service.claim(user, payload.code)


# ---------------------------------------------------------------- admin


@router.get("/admin/partners")
def admin_partners(_: dict = Depends(get_current_admin)):
    """Todos os Partners com cliques, indicados, conversões, receita e comissão devida."""
    return partners_service.admin_overview()


@router.post("/admin/partners/{partner_id}")
def admin_update_partner(partner_id: str, payload: PartnerUpdate, _: dict = Depends(get_current_admin)):
    """Muda o status ou a comissão de um Partner."""
    return partners_service.admin_update(partner_id, payload.status, payload.commission_rate)


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Chamado pelo Stripe (assinatura verificada): registra pagamentos e reembolsos."""
    return billing_service.handle_webhook(await request.body(), request.headers.get("stripe-signature"))


@router.get("/accuracy")
def accuracy(user: dict = Depends(get_current_user)):
    """How often the predictions held up, across all of the user's videos."""
    return analysis_service.accuracy(user)


@router.get("/videos")
def list_videos(user: dict = Depends(get_current_user)):
    return {"videos": analysis_service.list_user_videos(user)}


@router.post("/videos", status_code=201)
def create_video(payload: VideoCreate, background: BackgroundTasks, request: Request, actor: Actor = Depends(get_actor)):
    """Registra o vídeo já enviado ao Storage e começa a análise. Aceita conta ou convidado."""
    if actor.is_guest:
        guest_service.ensure_can_register(actor.guest, guest_service.client_ip(request))
    created = analysis_service.register_video(actor, payload.storage_path, payload.filename, payload.insights_path, payload.hypothesis)
    background.add_task(analysis_service.run_analysis, created["analysis"]["id"], payload.ui_locale)
    return created


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, actor: Actor = Depends(get_actor)):
    return analysis_service.get_actor_analysis(actor, analysis_id)


@router.post("/analyses/{analysis_id}/blind")
def record_blind(analysis_id: str, payload: BlindResponseCreate, actor: Actor = Depends(get_actor)):
    """"Acertou" / "errou, foi em X": o veredito da previsão cega, com tolerância de ±1 s."""
    return analysis_service.record_blind_response(actor, analysis_id, payload.response, payload.actual_seconds)


@router.post("/events", status_code=202)
def record_event(payload: EventCreate, actor: Actor = Depends(get_actor)):
    """Os eventos do funil, gravados no próprio banco."""
    return events_service.record(actor, payload.name, payload.analysis_id, payload.props)


# ---------------------------------------------------------------- convidado (previsão cega sem cadastro)


@router.post("/guest/session", status_code=201)
def guest_session(request: Request):
    """Abre a sessão de convidado. O token volta uma vez e fica no navegador."""
    return guest_service.start_session(guest_service.client_ip(request), request.headers.get("user-agent"))


@router.post("/guest/upload-url")
def guest_upload_url(payload: GuestUploadRequest, request: Request, actor: Actor = Depends(get_actor)):
    """URL assinada para o convidado enviar o vídeo direto ao Storage."""
    if not actor.is_guest:
        raise ApiError(400, "NOT_A_GUEST", "Sua conta envia o vídeo direto, sem esta etapa.")
    guest_service.ensure_can_register(actor.guest, guest_service.client_ip(request))
    return guest_service.upload_target(actor.guest, payload.content_type)


@router.post("/guest/claim")
def guest_claim(payload: GuestClaim, user: dict = Depends(get_current_user)):
    """Acabou de criar a conta: o que o convidado já tinha feito passa a ser dela."""
    return guest_service.claim(user, payload.token)


@router.post("/analyses/{analysis_id}/outcome")
def record_outcome(analysis_id: str, payload: OutcomeCreate, user: dict = Depends(get_current_user)):
    return analysis_service.record_outcome(user, analysis_id, payload.actual_retention)


@router.get("/analyses/{analysis_id}/followup")
def read_followup(analysis_id: str, user: dict = Depends(get_current_user)):
    """O lembrete agendado para esta análise (null quando não há)."""
    return analysis_service.get_followup(user, analysis_id)


@router.post("/analyses/{analysis_id}/followup")
def create_followup(analysis_id: str, payload: FollowupCreate, user: dict = Depends(get_current_user)):
    """"Quando você vai republicar?" — agenda o e-mail que pede a retenção real."""
    return analysis_service.schedule_followup(user, analysis_id, payload.republish_on, payload.ui_locale)


@router.post("/internal/followups")
def run_followups(request: Request):
    """Chamado pelo cron (não por navegador): envia os lembretes vencidos."""
    secret = get_settings().internal_secret
    if not secret:
        raise ApiError(503, "INTERNAL_NOT_CONFIGURED", "INTERNAL_SECRET não configurado neste servidor.")
    if request.headers.get("x-internal-secret") != secret:
        raise ApiError(401, "UNAUTHENTICATED", "Chamada interna não autorizada.")
    return followup_service.send_due()


@router.get("/analyses/{analysis_id}/edit")
def read_edit(analysis_id: str, user: dict = Depends(get_current_user)):
    """Os cortes sugeridos e a edição já aplicada, se houver."""
    return analysis_service.get_edit(user, analysis_id)


@router.post("/analyses/{analysis_id}/edit", status_code=202)
def apply_cuts(analysis_id: str, payload: EditRequest, background: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Aplica os cortes aprovados num vídeo novo. O original continua intacto."""
    resultado = analysis_service.request_cuts(user, analysis_id, [c.model_dump() for c in payload.cuts])
    background.add_task(edit_service.run, db.get_video_edit(analysis_id)["id"])
    return resultado


# ---------------------------------------------------------------- Notion (a conta de quem edita)


@router.get("/notion")
def notion_status(user: dict = Depends(get_current_user)):
    """Se o Notion está conectado nesta conta e onde as análises caem."""
    return notion_service.status(user)


@router.get("/notion/authorize")
def notion_authorize(user: dict = Depends(get_current_user)):
    """O endereço do Notion para a pessoa autorizar o Publishub na conta dela."""
    return {"url": notion_service.authorize_url(user)}


@router.post("/notion/connect")
def notion_connect(payload: NotionConnect, user: dict = Depends(get_current_user)):
    """Fecha a conexão com o código que voltou do Notion."""
    return notion_service.connect(user, payload.code, payload.state)


@router.get("/notion/targets")
def notion_targets(user: dict = Depends(get_current_user)):
    """As páginas e bases que a pessoa autorizou."""
    return notion_service.targets(user)


@router.post("/notion/target")
def notion_target(payload: NotionTarget, user: dict = Depends(get_current_user)):
    return notion_service.choose_target(user, payload.target_type, payload.target_id, payload.target_title)


@router.post("/notion/disconnect")
def notion_disconnect(user: dict = Depends(get_current_user)):
    return notion_service.disconnect(user)


@router.get("/analyses/{analysis_id}/notion")
def read_notion_export(analysis_id: str, user: dict = Depends(get_current_user)):
    return analysis_service.get_notion(user, analysis_id)


@router.post("/analyses/{analysis_id}/notion", status_code=201)
def create_notion_export(analysis_id: str, user: dict = Depends(get_current_user)):
    """Cria a página desta análise no Notion de quem pediu."""
    return analysis_service.export_to_notion(user, analysis_id)


@router.post("/analyses/{analysis_id}/retry", status_code=202)
def retry_analysis(analysis_id: str, background: BackgroundTasks, payload: AnalysisRetry | None = None, user: dict = Depends(get_current_user)):
    result = analysis_service.retry_analysis(user, analysis_id)
    background.add_task(analysis_service.run_analysis, analysis_id, payload.ui_locale if payload else None)
    return result
