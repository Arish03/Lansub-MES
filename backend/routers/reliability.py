"""Reliability & Digital Twin router"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from routers.auth import get_current_user
from services.reliability_engine import generate_reliability_report
from datetime import datetime

router = APIRouter(prefix="/api/reliability", tags=["reliability"])


@router.get("/{asset_id}")
async def get_reliability(asset_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    asset = await db.assets.find_one({"asset_id": asset_id})
    if not asset:
        raise HTTPException(404, "Asset not found")

    t_cursor = db.telemetry.find({"asset_id": asset_id}).sort("timestamp", -1).limit(1)
    t_docs = await t_cursor.to_list(1)
    telemetry = t_docs[0] if t_docs else {}

    maintenance = await db.maintenance_history.find(
        {"asset_id": asset_id}
    ).sort("date", -1).limit(100).to_list(100)

    report = generate_reliability_report(asset, telemetry, maintenance)
    return _sanitize(report)


@router.get("/")
async def get_all_reliability(current_user=Depends(get_current_user)):
    db = get_db()
    assets = await db.assets.find({}).to_list(50)
    result = []
    for asset in assets:
        t_cursor = db.telemetry.find({"asset_id": asset["asset_id"]}).sort("timestamp", -1).limit(1)
        t_docs = await t_cursor.to_list(1)
        telemetry = t_docs[0] if t_docs else {}
        maintenance = await db.maintenance_history.find(
            {"asset_id": asset["asset_id"]}
        ).sort("date", -1).limit(50).to_list(50)
        report = generate_reliability_report(asset, telemetry, maintenance)
        result.append(_sanitize(report))
    return result


def _sanitize(obj):
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items() if k != "_id"}
    elif isinstance(obj, list):
        return [_sanitize(i) for i in obj]
    elif hasattr(obj, "isoformat"):
        return obj.isoformat()
    return obj
