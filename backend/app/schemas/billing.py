from pydantic import BaseModel, Field


class BillingConfirm(BaseModel):
    """O session_id que o Stripe coloca na URL de /obrigado (cs_live_… ou cs_test_…)."""

    session_id: str = Field(min_length=8, max_length=200, pattern=r"^cs_(live|test)_[A-Za-z0-9]+$")
