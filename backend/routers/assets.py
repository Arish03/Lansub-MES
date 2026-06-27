"""Assets router — CRUD for equipment registry."""

from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("/")
async def list_assets(current_user=Depends(get_current_user)):
    db = get_db()
    assets = await db.assets.find({}).to_list(100)
    for a in assets:
        a["_id"] = str(a["_id"])
    return assets


@router.get("/{asset_id}")
async def get_asset(asset_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    asset = await db.assets.find_one({"asset_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset["_id"] = str(asset["_id"])
    return asset


@router.get("/{asset_id}/health-history")
async def get_health_history(
    asset_id: str,
    limit: int = 100,
    current_user=Depends(get_current_user)
):
    db = get_db()
    history = await db.health_scores.find(
        {"asset_id": asset_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return list(reversed(history))
