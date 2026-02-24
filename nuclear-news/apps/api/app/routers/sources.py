"""
Sources API endpoints - manage news sources
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.base import get_db
from app.models.article import Source
from app.schemas.source import SourceCreate, SourceResponse, SourceUpdate

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("/", response_model=list[SourceResponse])
async def list_sources(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """List all news sources"""
    query = select(Source).order_by(Source.name)
    if active_only:
        query = query.where(Source.is_active == True)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=SourceResponse)
async def create_source(
    data: SourceCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add new news source"""
    source = Source(**data.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.put("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: UUID,
    data: SourceUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update source configuration"""
    result = await db.execute(
        select(Source).where(Source.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(source, field, value)
    
    await db.commit()
    await db.refresh(source)
    return source


@router.post("/{source_id}/scrape")
async def trigger_scrape(
    source_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger scraping for a source"""
    result = await db.execute(
        select(Source).where(Source.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # TODO: Trigger Celery task
    # from app.workers.tasks import scrape_source
    # scrape_source.delay(str(source_id))
    
    return {"status": "scraping_started", "source": source.name}
