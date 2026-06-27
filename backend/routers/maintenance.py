"""Maintenance History router"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


class MaintenanceRecord(BaseModel):
    asset_id: str
    type: str            # "preventive" | "corrective" | "predictive" | "inspection"
    title: str
    description: str
    technician: str
    date: str            # ISO date string
    duration_hours: float
    cost_usd: Optional[float] = 0.0
    parts_replaced: Optional[list] = []
    findings: Optional[str] = ""
    next_due_date: Optional[str] = None
    work_order: Optional[str] = ""


def _sanitize(obj):
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items() if k != "_id"}
    elif isinstance(obj, list):
        return [_sanitize(i) for i in obj]
    elif hasattr(obj, "isoformat"):
        return obj.isoformat()
    return obj


@router.get("/{asset_id}")
async def get_maintenance(asset_id: str, limit: int = 50, current_user=Depends(get_current_user)):
    db = get_db()
    records = await db.maintenance_history.find(
        {"asset_id": asset_id}
    ).sort("date", -1).limit(limit).to_list(limit)
    return _sanitize(records)


@router.get("/")
async def list_all_maintenance(limit: int = 100, current_user=Depends(get_current_user)):
    db = get_db()
    records = await db.maintenance_history.find({}).sort("date", -1).limit(limit).to_list(limit)
    return _sanitize(records)


@router.post("/")
async def add_maintenance(record: MaintenanceRecord, current_user=Depends(get_current_user)):
    db = get_db()
    doc = record.dict()
    doc["created_by"] = current_user["username"]
    doc["created_at"] = datetime.utcnow().isoformat()
    await db.maintenance_history.insert_one(doc)
    return {"status": "ok", "message": "Maintenance record saved"}


@router.get("/summary/stats")
async def maintenance_stats(current_user=Depends(get_current_user)):
    db = get_db()
    total = await db.maintenance_history.count_documents({})
    preventive = await db.maintenance_history.count_documents({"type": "preventive"})
    corrective = await db.maintenance_history.count_documents({"type": "corrective"})
    predictive = await db.maintenance_history.count_documents({"type": "predictive"})
    records = await db.maintenance_history.find({}).to_list(500)
    total_cost = sum(r.get("cost_usd", 0) for r in records)
    total_hours = sum(r.get("duration_hours", 0) for r in records)
    return {
        "total_records": total,
        "preventive": preventive,
        "corrective": corrective,
        "predictive": predictive,
        "total_cost_usd": round(total_cost, 2),
        "total_maintenance_hours": round(total_hours, 2),
    }
