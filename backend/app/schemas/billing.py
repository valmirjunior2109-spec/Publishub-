from pydantic import BaseModel, Field


class BillingConfirm(BaseModel):
    """O session_id que o Stripe coloca na URL de /obrigado (cs_live_… ou cs_test_…)."""

    session_id: str = Field(min_length=8, max_length=200, pattern=r"^cs_(live|test)_[A-Za-z0-9]+$")


class ReferralClaim(BaseModel):
    """O código do link /?ref=CODE que ficou no cookie de quem chegou por indicação."""

    code: str = Field(min_length=1, max_length=32)


class ReferralVisit(BaseModel):
    """O código do link que acabou de ser aberto (/?ref=CODE), para contar o clique."""

    code: str = Field(min_length=1, max_length=32)


class PartnerUpdate(BaseModel):
    """O que o administrador pode mudar num Partner."""

    status: str | None = Field(default=None, pattern=r"^(pending|active|paused)$")
    commission_rate: float | None = Field(default=None, ge=0, le=1)
