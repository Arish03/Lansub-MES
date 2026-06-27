import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

# ── Thresholds ────────────────────────────────────────────────────────────────

VIB_WARNING  = 7.1   # mm/s ISO 10816 Zone B
VIB_CRITICAL = 11.2  # mm/s ISO 10816 Zone C/D

TEMP_WARNING  = 80.0  # °C
TEMP_CRITICAL = 95.0  # °C


# ── Asset Aging & RUL ─────────────────────────────────────────────────────────

def calc_aging(running_hours: float, design_life_hours: float) -> float:
    """Asset Ageing (%) = Running Hours / Design Life Hours × 100"""
    if design_life_hours <= 0:
        return 0.0
    return round(min(100.0, (running_hours / design_life_hours) * 100), 2)


def calc_rul_hours(running_hours: float, design_life_hours: float) -> float:
    """Remaining Useful Life (hrs) = Design Life - Running Hours"""
    return max(0.0, round(design_life_hours - running_hours, 0))


def calc_rul_days(rul_hours: float, daily_hours: float = 24.0) -> float:
    """Convert RUL hours → calendar days"""
    return round(rul_hours / max(daily_hours, 1), 0)


def calc_rul_years(rul_hours: float, daily_hours: float = 24.0) -> float:
    return round(rul_hours / (max(daily_hours, 1) * 365), 2)


def predicted_failure_date(running_hours: float, design_life_hours: float,
                            daily_op_hours: float = 20.0  # type: str or None
) -> str:
    rul = calc_rul_hours(running_hours, design_life_hours)
    if rul <= 0:
        return datetime.utcnow().isoformat()
    days = rul / max(daily_op_hours, 1)
    return (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")


# ── Health Index (Weighted) ───────────────────────────────────────────────────

def _vib_score(vib_rms: Optional[float]) -> float:
    """Vibration score 0-100 based on ISO 10816"""
    if vib_rms is None:
        return 80.0  # default if no data
    if vib_rms <= 2.3:   return 100.0
    if vib_rms <= 4.5:   return 90.0
    if vib_rms <= 7.1:   return 75.0
    if vib_rms <= 11.2:  return 40.0
    return max(0.0, 20.0 - (vib_rms - 11.2) * 2)


def _temp_score(temp_c: Optional[float]) -> float:
    """Temperature score 0-100"""
    if temp_c is None:
        return 80.0
    if temp_c <= 60:   return 100.0
    if temp_c <= 70:   return 90.0
    if temp_c <= 80:   return 70.0
    if temp_c <= 90:   return 40.0
    if temp_c <= 100:  return 20.0
    return 0.0


def _power_score(actual_kw: Optional[float], rated_kw: Optional[float]) -> float:
    """Power consumption score — deviation from rated"""
    if actual_kw is None or rated_kw is None or rated_kw <= 0:
        return 80.0
    ratio = actual_kw / rated_kw
    if ratio <= 0.80:   return 85.0   # under-loaded
    if ratio <= 1.05:   return 100.0  # nominal
    if ratio <= 1.15:   return 70.0   # overloaded
    if ratio <= 1.30:   return 40.0
    return 10.0


def _aging_score(aging_pct: float) -> float:
    """Aging contribution (inverted — more aging = lower score)"""
    return max(0.0, 100.0 - aging_pct)


def _bearing_score(vib_rms: Optional[float], temp_c: Optional[float]) -> float:
    """Bearing condition estimate from vibration + temperature"""
    vs = _vib_score(vib_rms)
    ts = _temp_score(temp_c)
    return round((vs * 0.6 + ts * 0.4), 1)


def calc_health_index(
    vib_rms: Optional[float],
    temp_c: Optional[float],
    actual_kw: Optional[float],
    rated_kw: Optional[float],
    aging_pct: float,
    lubrication_score: float = 85.0,
) -> dict:
    """
    Weighted Health Index
    Vibration     30%
    Temperature   20%
    Power         15%
    Bearing       15%
    Lubrication   10%
    Ageing        10%
    Output: 0-100
    """
    vib  = _vib_score(vib_rms)
    temp = _temp_score(temp_c)
    pwr  = _power_score(actual_kw, rated_kw)
    brg  = _bearing_score(vib_rms, temp_c)
    lub  = lubrication_score
    age  = _aging_score(aging_pct)

    hi = round(
        vib  * 0.30 +
        temp * 0.20 +
        pwr  * 0.15 +
        brg  * 0.15 +
        lub  * 0.10 +
        age  * 0.10,
        1
    )

    if hi >= 80:   status = "Excellent"
    elif hi >= 60: status = "Good"
    elif hi >= 40: status = "Poor"
    else:          status = "Critical"

    return {
        "health_index": hi,
        "status": status,
        "components": {
            "vibration_score":    round(vib, 1),
            "temperature_score":  round(temp, 1),
            "power_score":        round(pwr, 1),
            "bearing_score":      round(brg, 1),
            "lubrication_score":  round(lub, 1),
            "aging_score":        round(age, 1),
        }
    }


# ── OEE Calculation ───────────────────────────────────────────────────────────

def calc_oee(
    operating_hours: float,
    planned_hours:   float,
    actual_output:   float,
    ideal_output:    float,
    good_output:     float,
    total_output:    float,
) -> dict:
    """
    OEE = Availability × Performance × Quality
    World-class OEE = 85%
    """
    availability = round(min(1.0, operating_hours / max(planned_hours, 0.001)), 4) if planned_hours > 0 else 0
    performance  = round(min(1.0, actual_output  / max(ideal_output,  0.001)), 4) if ideal_output  > 0 else 0
    quality      = round(min(1.0, good_output    / max(total_output,  0.001)), 4) if total_output  > 0 else 0
    oee          = round(availability * performance * quality * 100, 2)

    return {
        "oee_pct":          oee,
        "availability_pct": round(availability * 100, 2),
        "performance_pct":  round(performance  * 100, 2),
        "quality_pct":      round(quality      * 100, 2),
        "world_class":      oee >= 85.0,
        "gap_to_world_class": round(max(0, 85.0 - oee), 2),
    }


# ── Energy / Power Calculation ────────────────────────────────────────────────

def calc_electrical_power(
    voltage_v:    float,
    current_a:    float,
    power_factor: float = 0.85,
    phases:       int   = 3,
) -> dict:
    """Power (kW) = √3 × V × I × PF / 1000"""
    if phases == 3:
        power_kw = (math.sqrt(3) * voltage_v * current_a * power_factor) / 1000.0
    else:
        power_kw = (voltage_v * current_a * power_factor) / 1000.0

    apparent_kva = (math.sqrt(3) * voltage_v * current_a) / 1000.0 if phases == 3 else (voltage_v * current_a) / 1000.0
    reactive_kvar = round(math.sqrt(max(0, apparent_kva**2 - power_kw**2)), 3)

    return {
        "power_kw":       round(power_kw, 3),
        "apparent_kva":   round(apparent_kva, 3),
        "reactive_kvar":  reactive_kvar,
        "power_factor":   power_factor,
    }


def calc_energy_consumption(power_kw: float, running_hours: float) -> dict:
    """kWh = kW × Running Hours"""
    kwh = round(power_kw * running_hours, 2)
    cost_usd = round(kwh * 0.12, 2)  # ~$0.12/kWh industrial rate
    return {
        "energy_kwh":    kwh,
        "cost_usd":      cost_usd,
        "avg_power_kw":  power_kw,
    }


def calc_efficiency(actual_output_kw: float, input_kw: float) -> float:
    """Mechanical efficiency %"""
    if input_kw <= 0:
        return 0.0
    return round(min(100.0, (actual_output_kw / input_kw) * 100), 2)


# ── Reliability Metrics ───────────────────────────────────────────────────────

def calc_mtbf(total_operating_hours: float, num_failures: int) -> float:
    """MTBF (hrs) = Total Operating Time / Number of Failures"""
    if num_failures <= 0:
        return total_operating_hours  # no failures = MTBF = total time
    return round(total_operating_hours / num_failures, 1)


def calc_mttr(total_repair_hours: float, num_failures: int) -> float:
    """MTTR (hrs) = Total Repair Time / Number of Failures"""
    if num_failures <= 0:
        return 0.0
    return round(total_repair_hours / num_failures, 1)


def calc_availability_reliability(mtbf: float, mttr: float) -> float:
    """Availability = MTBF / (MTBF + MTTR)"""
    if mtbf + mttr <= 0:
        return 100.0
    return round((mtbf / (mtbf + mttr)) * 100, 2)


# ── Failure Probability ───────────────────────────────────────────────────────

def calc_failure_probability(
    aging_pct: float,
    vib_rms: Optional[float],
    health_index: float,
    num_recent_alarms: int = 0,
) -> dict:
    """
    Weibull-inspired failure probability
    Returns probability 0-100% and risk level
    """
    # Base probability from aging (Weibull β=2.5 for rotating equipment)
    beta = 2.5
    eta = 100.0  # characteristic life at 63.2% failure
    base_prob = (1 - math.exp(-(aging_pct / eta) ** beta)) * 100

    # Condition modifier
    condition_factor = (100 - health_index) / 100.0  # 0 if perfect, 1 if critical
    vib_factor = 0
    if vib_rms is not None:
        if vib_rms > VIB_CRITICAL:  vib_factor = 0.30
        elif vib_rms > VIB_WARNING: vib_factor = 0.15
        else:                        vib_factor = 0.02

    alarm_factor = min(0.20, num_recent_alarms * 0.04)

    prob = min(99.9, base_prob + condition_factor * 30 + vib_factor * 40 + alarm_factor * 100)
    prob = round(prob, 2)

    if prob < 20:   risk = "Low"
    elif prob < 45: risk = "Medium"
    elif prob < 70: risk = "High"
    else:           risk = "Critical"

    return {
        "failure_probability_pct": prob,
        "risk_level": risk,
        "base_aging_probability": round(base_prob, 2),
    }


# ── Master Reliability Report ─────────────────────────────────────────────────

def generate_reliability_report(asset: dict, telemetry: dict, maintenance_history: list) -> dict:
    """
    Full reliability report for one asset.
    asset: full asset document from DB (with OEM datasheet fields)
    telemetry: latest telemetry dict
    maintenance_history: list of past maintenance events
    """
    # Timestamps
    running_hours    = float(asset.get("running_hours", 0))
    design_life      = float(asset.get("design_life_hours", 200000))
    daily_op_hours   = float(asset.get("daily_op_hours", 20))

    # Get representative sensor values
    sensors     = telemetry.get("sensors", {})
    fault_type  = telemetry.get("fault_type", "none")

    # Pick the most critical vibration reading
    vib_vals = [
        s.get("vibration_rms") for s in sensors.values()
        if isinstance(s, dict) and s.get("vibration_rms") is not None
    ]
    vib_rms = max(vib_vals) if vib_vals else None

    temp_vals = [
        s.get("temperature_c") for s in sensors.values()
        if isinstance(s, dict) and s.get("temperature_c") is not None
    ]
    temp_c = max(temp_vals) if temp_vals else None

    rated_kw   = asset.get("rated_power_kw")
    actual_kw  = sensors.get("power_kw") or (
        (sensors.get("current_a", 0) * 0.4) if sensors.get("current_a") else None
    )

    # ── Core calculations ──
    aging_pct = calc_aging(running_hours, design_life)
    rul_hours = calc_rul_hours(running_hours, design_life)
    rul_days  = calc_rul_days(rul_hours, daily_op_hours)
    rul_years = calc_rul_years(rul_hours, daily_op_hours)

    health = calc_health_index(
        vib_rms=vib_rms, temp_c=temp_c,
        actual_kw=actual_kw, rated_kw=rated_kw,
        aging_pct=aging_pct,
    )

    # OEE (using stored values or defaults)
    oee_data = asset.get("oee_data", {})
    oee = calc_oee(
        operating_hours=oee_data.get("operating_hours", running_hours % 8760),
        planned_hours=oee_data.get("planned_hours", 8760),
        actual_output=oee_data.get("actual_output", 95),
        ideal_output=oee_data.get("ideal_output", 100),
        good_output=oee_data.get("good_output", 93),
        total_output=oee_data.get("total_output", 95),
    )

    # Energy
    voltage   = asset.get("rated_voltage", 6600) / 1000  # convert to kV for display
    current_a = sensors.get("current_a", asset.get("rated_current", 28))
    pwr_calc  = calc_electrical_power(voltage * 1000, current_a, 0.87)
    energy    = calc_energy_consumption(pwr_calc["power_kw"], running_hours)

    # Reliability
    num_failures    = len([m for m in maintenance_history if m.get("type") == "corrective"])
    repair_hours    = sum(m.get("duration_hours", 4) for m in maintenance_history if m.get("type") == "corrective")
    total_op_hours  = running_hours
    mtbf = calc_mtbf(total_op_hours, num_failures)
    mttr = calc_mttr(repair_hours, num_failures)
    avail = calc_availability_reliability(mtbf, mttr)

    # Failure probability
    recent_alarms = int(asset.get("recent_alarm_count", 0))
    fail_prob = calc_failure_probability(aging_pct, vib_rms, health["health_index"], recent_alarms)

    # Maintenance recommendation
    recommendations = _recommend(aging_pct, health["health_index"], fault_type, fail_prob["risk_level"], vib_rms)

    return {
        "asset_id": asset.get("asset_id"),
        "asset_type": asset.get("asset_type"),
        "calculated_at": datetime.utcnow().isoformat(),

        "aging": {
            "running_hours":     running_hours,
            "design_life_hours": design_life,
            "aging_pct":         aging_pct,
            "rul_hours":         rul_hours,
            "rul_days":          rul_days,
            "rul_years":         rul_years,
            "predicted_failure": predicted_failure_date(running_hours, design_life, daily_op_hours),
        },
        "health": health,
        "oee": oee,
        "energy": {
            **energy,
            "calculated_power_kw": pwr_calc["power_kw"],
            "apparent_kva":        pwr_calc["apparent_kva"],
            "power_factor":        pwr_calc["power_factor"],
        },
        "reliability": {
            "mtbf_hours":         mtbf,
            "mttr_hours":         mttr,
            "availability_pct":   avail,
            "num_failures":       num_failures,
            "total_repair_hours": repair_hours,
        },
        "failure_prediction": fail_prob,
        "recommendations": recommendations,
    }


def _recommend(aging_pct, health_index, fault_type, risk_level, vib_rms) -> list:
    recs = []

    if aging_pct >= 80:
        recs.append({
            "priority": "HIGH",
            "action": "Plan asset replacement",
            "reason": f"Asset has consumed {aging_pct:.0f}% of design life",
            "timeframe": "Within 3 months",
        })
    elif aging_pct >= 60:
        recs.append({
            "priority": "MEDIUM",
            "action": "Schedule major overhaul",
            "reason": f"Asset approaching end of design life ({aging_pct:.0f}%)",
            "timeframe": "Next planned shutdown",
        })

    if vib_rms and vib_rms > VIB_CRITICAL:
        recs.append({
            "priority": "CRITICAL",
            "action": "Immediate vibration inspection",
            "reason": f"Vibration {vib_rms:.1f} mm/s exceeds ISO 10816 Zone D limit",
            "timeframe": "Within 24 hours",
        })
    elif vib_rms and vib_rms > VIB_WARNING:
        recs.append({
            "priority": "HIGH",
            "action": "Vibration analysis & balancing",
            "reason": f"Vibration {vib_rms:.1f} mm/s in ISO 10816 Zone C",
            "timeframe": "Within 1 week",
        })

    fault_actions = {
        "bearing_wear":   ("HIGH",     "Replace bearings",              "Within 2 weeks"),
        "misalignment":   ("HIGH",     "Laser alignment check",         "Within 1 week"),
        "imbalance":      ("HIGH",     "Dynamic balancing",             "Within 2 weeks"),
        "cavitation":     ("CRITICAL", "Inspect impeller & suction",    "Within 48 hours"),
        "gear_wear":      ("HIGH",     "Gearbox oil analysis & inspect","Within 2 weeks"),
    }
    if fault_type and fault_type != "none" and fault_type in fault_actions:
        pri, act, tf = fault_actions[fault_type]
        recs.append({"priority": pri, "action": act,
                     "reason": f"Fault detected: {fault_type.replace('_',' ').title()}", "timeframe": tf})

    if health_index < 60:
        recs.append({
            "priority": "HIGH",
            "action": "Comprehensive condition assessment",
            "reason": f"Health Index {health_index:.0f}% classified as Poor/Critical",
            "timeframe": "Within 1 week",
        })

    if not recs:
        recs.append({
            "priority": "LOW",
            "action": "Continue routine PM schedule",
            "reason": "All parameters within normal operating range",
            "timeframe": "Per PM schedule",
        })

    return recs
