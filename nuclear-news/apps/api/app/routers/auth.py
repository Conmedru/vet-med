"""
Authentication endpoints (placeholder)
"""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login():
    """Login endpoint - TODO: implement"""
    return {"message": "Not implemented yet"}


@router.post("/logout")
async def logout():
    """Logout endpoint - TODO: implement"""
    return {"message": "Not implemented yet"}
