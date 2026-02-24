"""
Articles API endpoints
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.models.base import get_db
from app.models.article import Article
from app.schemas.article import ArticleResponse, ArticleUpdate, ArticleList

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("/", response_model=ArticleList)
async def list_articles(
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List articles with optional filters"""
    query = select(Article).order_by(Article.created_at.desc())
    
    if status:
        query = query.where(Article.status == status)
    if category:
        query = query.where(Article.category == category)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Paginate
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    articles = result.scalars().all()
    
    return ArticleList(items=articles, total=total, skip=skip, limit=limit)


@router.get("/drafts", response_model=ArticleList)
async def get_drafts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get draft articles for moderation"""
    return await list_articles(status="draft", skip=skip, limit=limit, db=db)


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get single article by ID"""
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return article


@router.put("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: UUID,
    data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update article (edit before publishing)"""
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(article, field, value)
    
    await db.commit()
    await db.refresh(article)
    
    return article


@router.post("/{article_id}/publish", response_model=ArticleResponse)
async def publish_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    # user: User = Depends(get_current_user),  # TODO: Add auth
):
    """Publish article - triggers Astro rebuild"""
    from datetime import datetime
    
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    if article.status == "published":
        raise HTTPException(status_code=400, detail="Article already published")
    
    article.status = "published"
    article.published_at = datetime.utcnow()
    # article.published_by = user.id  # TODO: Add auth
    
    await db.commit()
    await db.refresh(article)
    
    # TODO: Trigger Astro rebuild webhook
    # await trigger_astro_rebuild(article.slug)
    
    return article


@router.post("/{article_id}/archive")
async def archive_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Archive (unpublish) article"""
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    article.status = "archived"
    await db.commit()
    
    return {"status": "archived"}
