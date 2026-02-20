"""
Pydantic schemas for Source API
"""
from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field


class SourceBase(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    url: str = Field(..., max_length=500)
    adapter_type: str = Field(..., pattern="^(rss|playwright|pdf)$")
    adapter_config: dict = {}
    scrape_interval_minutes: int = Field(60, ge=5)


class SourceCreate(SourceBase):
    pass


class SourceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    url: Optional[str] = Field(None, max_length=500)
    adapter_config: Optional[dict] = None
    is_active: Optional[bool] = None
    scrape_interval_minutes: Optional[int] = Field(None, ge=5)


class SourceResponse(SourceBase):
    id: UUID
    is_active: bool
    last_scraped_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
