from pydantic import BaseModel, Field


class VideoCreate(BaseModel):
    """Sent by the frontend after it uploads the file to Supabase Storage."""

    storage_path: str = Field(min_length=10, max_length=300)
    filename: str = Field(min_length=1, max_length=255)
