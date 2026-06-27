"""
Lansub AI — Predictive Maintenance Engine
Analyzes telemetry to detect faults, calculate health scores, and estimate RUL.
"""

from datetime import datetime
from typing import Optional


# ─── Alarm Thresholds ────────────────────────────────────────────────────────

THRESHOLDS = {
    "vibration_rms": {"warning": 7.1, "critical": 11.2},   # mm/s ISO 10816
    "temperature_c": {"warning": 80.0, "critical": 95.0},   # °C
    "oil_temperature_c": {"warning": 85.0, "critical": 100.0},
    "discharge_pressure_bar": {"warning": 15.0, "critical": 18.0},
    "suction_pressure_bar": {"warning": 0.5, "critical": 0.3},
}

FAULT_DESCRIPTIONS = {
    "bearing_wear": {
        "title": "Bearing Wear Detected",
        "detail": "Elevated vibration and temperature at bearing points indicate progressive wear.",
        "action": "Schedule bearing inspection within 72 hours. Check lubrication levels.",
        "rul_days": 14,
    },
    "imbalance": {
        "title": "Rotor Imbalance Detected",
        "detail": "Synchronous vibration at 1× RPM frequency indicates mass imbalance.",
        "action": "Schedule dynamic balancing during next planned shutdown.",
        "rul_days": 30,
    },
    "misalignment": {
        "title": "Shaft Misalignment Detected",
        "detail": "2× RPM frequency component elevated. Axial vibration exceeds threshold.",
        "action": "Perform laser alignment check. Inspect coupling and foundation bolts.",
        "rul_days": 21,
    },
    "cavitation": {
        "title": "Cavitation Detected",
        "detail": "Random high-frequency vibration spikes. Discharge pressure drop observed.",
        "action": "Check suction line for restrictions. Inspect impeller for erosion damage.",
        "rul_days": 7,
    },
    "gear_wear": {
        "title": "Gear Tooth Wear Detected",
        "detail": "Gear mesh frequency and sidebands elevated. Oil contamination possible.",
        "action": "Oil sample analysis recommended. Inspect gear teeth for pitting/spalling.",
        "rul_days": 21,
    },
    "none": {
        "title": "Normal Operation",
        "detail": "All parameters within acceptable limits.",
        "action": "Continue scheduled maintenance plan.",
        "rul_days": 365,
    },
}


def analyze_telemetry(payload: dict) -> dict:
    """
    Analyze a telemetry payload and return Lansub AI analysis.
    Returns: { alarms, fault_analysis, health_score, rul_days }
    """
    asset_id = payload.get("asset_id", "UNKNOWN")
    asset_type = payload.get("asset_type", "UNKNOWN")
    sensors = payload.get("sensors", {})
    fault_type = payload.get("fault_type", "none")
    health_score = payload.get("health_score", 100.0)

    alarms = []

    # ─── Check all sensor points ───────────────────────────────────────────
    for sensor_key, sensor_data in sensors.items():
        if not isinstance(sensor_data, dict):
            continue

        label = sensor_data.get("label", sensor_key)

        for param, value in sensor_data.items():
            if param in THRESHOLDS and isinstance(value, (int, float)):
                thresh = THRESHOLDS[param]
                severity = None
                if value >= thresh["critical"]:
                    severity = "CRITICAL"
                elif value >= thresh["warning"]:
                    severity = "WARNING"

                if severity:
                    alarms.append({
                        "asset_id": asset_id,
                        "sensor_point": sensor_key,
                        "sensor_label": label,
                        "parameter": param,
                        "value": value,
                        "threshold": thresh[severity.lower()],
                        "severity": severity,
                        "message": f"{label}: {param.replace('_', ' ').title()} = {value:.2f} (Threshold: {thresh[severity.lower()]})",
                        "timestamp": datetime.utcnow().isoformat(),
                        "acknowledged": False,
                    })

    # ─── Also check top-level numeric sensors ────────────────────────────
    for key, value in sensors.items():
        if isinstance(value, (int, float)) and key in THRESHOLDS:
            thresh = THRESHOLDS[key]
            severity = None
            if value >= thresh.get("critical", float("inf")):
                severity = "CRITICAL"
            elif value >= thresh.get("warning", float("inf")):
                severity = "WARNING"
            # Check lower bounds (suction pressure)
            if "suction_pressure" in key:
                if value <= thresh.get("critical", 0):
                    severity = "CRITICAL"
                elif value <= thresh.get("warning", 0):
                    severity = "WARNING"
            if severity:
                alarms.append({
                    "asset_id": asset_id,
                    "sensor_point": "SYSTEM",
                    "sensor_label": key.replace("_", " ").title(),
                    "parameter": key,
                    "value": value,
                    "severity": severity,
                    "message": f"{asset_id}: {key.replace('_', ' ').title()} = {value:.2f}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "acknowledged": False,
                })

    fault_info = FAULT_DESCRIPTIONS.get(fault_type, FAULT_DESCRIPTIONS["none"])

    return {
        "asset_id": asset_id,
        "fault_type": fault_type,
        "health_score": health_score,
        "rul_days": fault_info["rul_days"],
        "fault_analysis": fault_info,
        "alarms": alarms,
        "analyzed_at": datetime.utcnow().isoformat(),
    }
