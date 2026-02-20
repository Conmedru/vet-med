"""
нуклеар.ру API
FastAPI backend for nuclear medicine news aggregation platform
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import articles, sources, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} API v{settings.VERSION}")
    yield
    # Shutdown
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API для автоматизированного сбора и публикации новостей ядерной медицины",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(sources.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}
