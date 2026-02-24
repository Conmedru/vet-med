"""
Pydantic schemas for Article API
"""
from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field


class ArticleBase(BaseModel):
    title: str = Field(..., max_length=500)
    excerpt: str
    content: str
    category: str = Field(..., max_length=100)
    tags: list[str] = []
    significance_score: Optional[int] = Field(None, ge=1, le=10)
    cover_image_url: Optional[str] = None


class ArticleCreate(ArticleBase):
    source_ids: list[UUID]
    original_urls: list[str]
    ai_model: Optional[str] = None


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[list[str]] = None
    cover_image_url: Optional[str] = None


class ArticleResponse(ArticleBase):
    id: UUID
    slug: str
    source_ids: list[UUID]
    original_urls: list[str]
    status: str
    published_at: Optional[datetime] = None
    ai_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ArticleList(BaseModel):
    items: list[ArticleResponse]
    total: int
    skip: int
    limit: int
