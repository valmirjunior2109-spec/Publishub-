from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.core.errors import ApiError

from app.api.deps import Actor, get_actor, get_current_admin, get_current_user
from app.core.config import get_settings
from app.schemas.billing import BillingConfirm, PartnerUpdate, ReferralClaim, ReferralVisit
from app.schemas.video import AnalysisRetry, BlindResponseCreate, EventCreate, GuestClaim, GuestUploadRequest, OutcomeCreate, VideoCreate
from app.services import analysis_service, billing_service, events_service, guest_service, partners_service, supabase_service as db

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
        "entitlement": billing_service.entitlement(user),
    }


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


@router.post("/analyses/{analysis_id}/retry", status_code=202)
def retry_analysis(analysis_id: str, background: BackgroundTasks, payload: AnalysisRetry | None = None, user: dict = Depends(get_current_user)):
    result = analysis_service.retry_analysis(user, analysis_id)
    background.add_task(analysis_service.run_analysis, analysis_id, payload.ui_locale if payload else None)
    return result
