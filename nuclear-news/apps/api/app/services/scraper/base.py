"""
Base adapter interface for news scrapers
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ScrapedArticle:
    """Raw article scraped from a source"""
    external_id: str
    external_url: str
    title: str
    content: Optional[str] = None
    published_at: Optional[datetime] = None
    metadata: dict = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class BaseAdapter(ABC):
    """
    Base class for all source adapters
    
    Each news source needs its own adapter implementation
    that knows how to scrape articles from that specific source.
    """
    
    def __init__(self, source_config: dict):
        """
        Initialize adapter with source-specific configuration
        
        Args:
            source_config: Dict with adapter-specific settings like
                          feed_url, selectors, auth tokens, etc.
        """
        self.config = source_config
    
    @abstractmethod
    async def scrape(self) -> list[ScrapedArticle]:
        """
        Scrape new articles from the source
        
        Returns:
            List of ScrapedArticle objects
        """
        pass
    
    @abstractmethod
    async def fetch_full_content(self, url: str) -> str:
        """
        Fetch full article content from URL
        
        Some sources only provide excerpts in feeds,
        this method fetches the complete article text.
        
        Args:
            url: Article URL
            
        Returns:
            Full article text content
        """
        pass
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime, handling various formats"""
        if not date_str:
            return None
        
        from dateutil import parser
        try:
            return parser.parse(date_str)
        except (ValueError, TypeError):
            return None
