from fastapi import APIRouter, BackgroundTasks, Depends

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.schemas.video import OutcomeCreate, VideoCreate
from app.services import analysis_service, supabase_service as db

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
    }


@router.get("/accuracy")
def accuracy(user: dict = Depends(get_current_user)):
    """How often the predictions held up, across all of the user's videos."""
    return analysis_service.accuracy(user)


@router.get("/videos")
def list_videos(user: dict = Depends(get_current_user)):
    return {"videos": analysis_service.list_user_videos(user)}


@router.post("/videos", status_code=201)
def create_video(payload: VideoCreate, background: BackgroundTasks, user: dict = Depends(get_current_user)):
    created = analysis_service.register_video(user, payload.storage_path, payload.filename, payload.insights_path, payload.hypothesis)
    background.add_task(analysis_service.run_analysis, created["analysis"]["id"])
    return created


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    return analysis_service.get_user_analysis(user, analysis_id)


@router.post("/analyses/{analysis_id}/outcome")
def record_outcome(analysis_id: str, payload: OutcomeCreate, user: dict = Depends(get_current_user)):
    return analysis_service.record_outcome(user, analysis_id, payload.actual_retention)


@router.post("/analyses/{analysis_id}/retry", status_code=202)
def retry_analysis(analysis_id: str, background: BackgroundTasks, user: dict = Depends(get_current_user)):
    result = analysis_service.retry_analysis(user, analysis_id)
    background.add_task(analysis_service.run_analysis, analysis_id)
    return result
