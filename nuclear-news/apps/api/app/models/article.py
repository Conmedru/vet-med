"""
Article models - Raw and Processed
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Boolean, ARRAY, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.models.base import Base


class Source(Base):
    """News source configuration"""
    __tablename__ = "sources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    url = Column(String(500), nullable=False)
    adapter_type = Column(String(50), nullable=False)  # rss | playwright | pdf
    adapter_config = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    scrape_interval_minutes = Column(Integer, default=60)
    last_scraped_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    raw_articles = relationship("RawArticle", back_populates="source")


class RawArticle(Base):
    """Raw scraped article before AI processing"""
    __tablename__ = "raw_articles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=False)
    external_id = Column(String(500))
    external_url = Column(String(1000), nullable=False)
    title_original = Column(Text, nullable=False)
    content_original = Column(Text)
    published_at = Column(DateTime)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String(50), default="pending")
    # pending | processing | processed | failed | duplicate
    embedding = Column(Vector(1536))  # text-embedding-3-small dimension
    metadata = Column(JSONB, default={})
    
    source = relationship("Source", back_populates="raw_articles")
    
    __table_args__ = (
        # Unique constraint on source + external_id
        {"schema": None},
    )


class Article(Base):
    """Processed article ready for publication"""
    __tablename__ = "articles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    slug = Column(String(500), unique=True, nullable=False)
    
    # Content
    title = Column(String(500), nullable=False)
    excerpt = Column(Text, nullable=False)
    content = Column(Text, nullable=False)  # Markdown
    
    # Metadata
    category = Column(String(100), nullable=False)
    tags = Column(ARRAY(Text), default=[])
    significance_score = Column(Integer)  # 1-10
    
    # Media
    cover_image_url = Column(String(1000))
    
    # Sources (array of raw_article IDs)
    source_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    original_urls = Column(ARRAY(Text), nullable=False)
    
    # Publication status
    status = Column(String(50), default="draft")  # draft | review | published | archived
    published_at = Column(DateTime)
    
    # AI metadata
    ai_model = Column(String(100))
    ai_prompt_version = Column(String(50))
    processing_cost_usd = Column(Numeric(10, 6))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True))
    published_by = Column(UUID(as_uuid=True))
