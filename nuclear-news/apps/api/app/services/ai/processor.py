"""
AI Article Processor - transforms raw articles into publishable content
"""
import json
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from app.config import settings
from app.services.ai.prompts import ARTICLE_PROCESSING_PROMPT


class ArticleProcessor:
    """Process raw articles using LLM"""
    
    def __init__(self):
        self.model = settings.AI_MODEL
        
        if "gpt" in self.model or "o1" in self.model:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.provider = "openai"
        else:
            self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.provider = "anthropic"
    
    async def process(self, raw_article) -> dict:
        """
        Process raw article and return structured content
        
        Returns:
            dict with keys: title, excerpt, content, category, tags, significance_score
        """
        prompt = ARTICLE_PROCESSING_PROMPT.format(
            title=raw_article.title_original,
            source=raw_article.source.name if raw_article.source else "Unknown",
            content=raw_article.content_original or raw_article.title_original,
        )
        
        if self.provider == "openai":
            return await self._process_openai(prompt)
        else:
            return await self._process_anthropic(prompt)
    
    async def _process_openai(self, prompt: str) -> dict:
        """Process using OpenAI API"""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        
        result = json.loads(response.choices[0].message.content)
        result["_usage"] = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "model": self.model,
        }
        result["_cost_usd"] = self._calculate_cost_openai(response.usage)
        
        return result
    
    async def _process_anthropic(self, prompt: str) -> dict:
        """Process using Anthropic API"""
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        
        # Extract JSON from response
        content = response.content[0].text
        # Handle potential markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        result = json.loads(content.strip())
        result["_usage"] = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "model": self.model,
        }
        result["_cost_usd"] = self._calculate_cost_anthropic(response.usage)
        
        return result
    
    def _calculate_cost_openai(self, usage) -> float:
        """Calculate cost for OpenAI API call"""
        # Pricing as of Dec 2024 (per 1M tokens)
        pricing = {
            "gpt-4o": {"input": 2.50, "output": 10.00},
            "gpt-4o-mini": {"input": 0.15, "output": 0.60},
            "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        }
        
        rates = pricing.get(self.model, pricing["gpt-4o"])
        input_cost = (usage.prompt_tokens / 1_000_000) * rates["input"]
        output_cost = (usage.completion_tokens / 1_000_000) * rates["output"]
        
        return input_cost + output_cost
    
    def _calculate_cost_anthropic(self, usage) -> float:
        """Calculate cost for Anthropic API call"""
        # Pricing as of Dec 2024 (per 1M tokens)
        pricing = {
            "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
            "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
        }
        
        rates = pricing.get(self.model, pricing["claude-3-5-sonnet-20241022"])
        input_cost = (usage.input_tokens / 1_000_000) * rates["input"]
        output_cost = (usage.output_tokens / 1_000_000) * rates["output"]
        
        return input_cost + output_cost
