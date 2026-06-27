"""Reports router — AI report generation."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
from services.report_agent import generate_report
from datetime import datetime

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _sanitize(obj):
    """Recursively convert datetimes/ObjectIds to JSON-safe types."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items() if k != "_id"}
    elif isinstance(obj, list):
        return [_sanitize(i) for i in obj]
    elif hasattr(obj, "isoformat"):   # datetime, date
        return obj.isoformat()
    elif hasattr(obj, "__str__") and type(obj).__name__ in ("ObjectId", "Decimal128"):
        return str(obj)
    return obj


class ReportRequest(BaseModel):
    report_type: str = "daily_summary"


@router.post("/generate")
async def create_report(req: ReportRequest, current_user=Depends(get_current_user)):
    db = get_db()

    # Gather and sanitize context data
    raw_assets = await db.assets.find({}, {"_id": 0}).to_list(20)
    assets = _sanitize(raw_assets)

    raw_alarms_critical = await db.alarms.find({"severity": "CRITICAL"}).limit(5).to_list(5)
    alarm_summary_doc = {
        "critical_count": await db.alarms.count_documents({"severity": "CRITICAL", "acknowledged": False}),
        "warning_count": await db.alarms.count_documents({"severity": "WARNING", "acknowledged": False}),
        "critical_alarms": _sanitize(raw_alarms_critical),
    }

    # Build telemetry summary
    telemetry_summary = {}
    for aid in ["MOTOR_01", "GEARBOX_01", "COMPRESSOR_01"]:
        cursor = db.telemetry.find(
            {"asset_id": aid}, {"_id": 0, "raw": 0}
        ).sort("timestamp", -1).limit(1)
        docs = await cursor.to_list(1)
        doc = docs[0] if docs else None
        if doc:
            telemetry_summary[aid] = _sanitize(doc)

    report = await generate_report(
        report_type=req.report_type,
        asset_data=assets,
        telemetry_summary=telemetry_summary,
        alarm_summary=alarm_summary_doc,
        db=db,
    )

    # Save report (make a copy without _id issues)
    report_to_save = _sanitize(dict(report))
    report_to_save["generated_by_user"] = current_user["username"]
    await db.reports.insert_one(report_to_save)

    return report


@router.get("/")
async def list_reports(current_user=Depends(get_current_user)):
    db = get_db()
    reports = await db.reports.find({}, {"_id": 0}).sort("generated_at", -1).limit(20).to_list(20)
    return _sanitize(reports)


