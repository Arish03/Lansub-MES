"""Database seeder — full OEM datasheet data + maintenance history"""
import asyncio
from datetime import datetime, timedelta
import random
from database import connect_db, get_db
from routers.auth import hash_password as get_password_hash

# Alias for backward compatibility
async def init_db():
    await connect_db()


USERS = [
    {"username": "admin",    "password": "lansub@2024",   "role": "admin",    "full_name": "System Admin"},
    {"username": "engineer", "password": "engineer@2024", "role": "engineer", "full_name": "Reliability Engineer"},
    {"username": "viewer",   "password": "viewer@2024",   "role": "viewer",   "full_name": "Operations Viewer"},
]

ASSETS = [
    {
        "asset_id":           "MOTOR_01",
        "asset_type":         "MOTOR",
        "name":               "Gas Compressor Drive Motor",
        "manufacturer":       "ABB",
        "model":              "M3BP315SMC",
        "location":           "Train A — Compressor House",
        "installation_date":  "2019-03-15",
        "status":             "running",

        # OEM Datasheet
        "rated_power_kw":     250,
        "rated_voltage":      6600,
        "rated_current":      28,
        "rated_rpm":          1485,
        "rated_frequency":    50,
        "efficiency_pct":     96.5,
        "power_factor":       0.87,
        "insulation_class":   "F",
        "enclosure":          "IP55",
        "cooling":            "IC411",

        # Bearing details
        "bearing_de":         "6318-C3",
        "bearing_nde":        "6314-C3",
        "bearing_lube":       "Mobilgrease XHP 222",
        "lube_interval_hrs":  2000,

        # Design life
        "design_life_hours":  200000,
        "bearing_life_hours": 40000,
        "stator_life_hours":  200000,

        # Operating data
        "running_hours":      62000,
        "daily_op_hours":     20,
        "recent_alarm_count": 2,

        # OEE parameters
        "oee_data": {
            "planned_hours":   8760,
            "operating_hours": 8100,
            "actual_output":   94,
            "ideal_output":    100,
            "good_output":     92,
            "total_output":    94,
        },

        "sensor_points": ["M1", "M2"],
        "health_score":  88.0,
        "tags": ["drive", "critical", "tra-a"],
        "notes": "Primary drive motor for Gas Compressor Train A. Last overhaul 2022-08.",
    },
    {
        "asset_id":           "GEARBOX_01",
        "asset_type":         "GEARBOX",
        "name":               "Speed Increaser Gearbox",
        "manufacturer":       "Flender",
        "model":              "H3SH10",
        "location":           "Train A — Compressor House",
        "installation_date":  "2019-03-15",
        "status":             "running",

        # OEM Datasheet
        "gear_ratio":         3.2,
        "rated_torque_nm":    12000,
        "rated_rpm_input":    1485,
        "rated_rpm_output":   4752,
        "rated_power_kw":     250,
        "service_factor":     1.5,
        "gear_type":          "Helical",
        "lubrication_type":   "Splash / Forced Oil",
        "oil_type":           "Mobilgear 600 XP 220",
        "oil_capacity_l":     45,
        "oil_change_hrs":     4000,

        # Bearing details
        "bearing_input":      "23048-K-MB",
        "bearing_output":     "23148-K-MB",

        # Design life
        "design_life_hours":  150000,
        "bearing_life_hours": 50000,
        "gear_life_hours":    150000,

        # Operating data
        "running_hours":      62000,
        "daily_op_hours":     20,
        "recent_alarm_count": 0,

        "oee_data": {
            "planned_hours":   8760,
            "operating_hours": 8100,
            "actual_output":   96,
            "ideal_output":    100,
            "good_output":     95,
            "total_output":    96,
        },

        "sensor_points": ["G1", "G2"],
        "health_score":  91.0,
        "tags": ["gearbox", "critical", "tra-a"],
        "notes": "Speed increaser — 1485 to 4752 RPM for compressor. Oil last changed 2024-01.",
    },
    {
        "asset_id":           "COMPRESSOR_01",
        "asset_type":         "COMPRESSOR",
        "name":               "Centrifugal Gas Compressor",
        "manufacturer":       "Siemens Energy",
        "model":              "STC-SV 4",
        "location":           "Train A — Compressor House",
        "installation_date":  "2019-03-15",
        "status":             "running",

        # OEM Datasheet
        "compressor_type":    "Centrifugal",
        "rated_flow_m3h":     10000,
        "rated_pressure_bar": 35,
        "suction_pressure_bar": 2.1,
        "rated_speed":        4752,
        "rated_power_kw":     245,
        "gas_type":           "Natural Gas (CH4)",
        "number_of_stages":   4,
        "impeller_material":  "17-4PH Stainless Steel",
        "seal_type":          "Dry Gas Seal",

        # Bearing details
        "bearing_journal":    "Tilt-Pad Journal Bearing",
        "bearing_thrust":     "Tilt-Pad Thrust Bearing",
        "lube_oil_type":      "Mobilfluid 424",
        "lube_oil_pressure_bar": 2.8,

        # Design life
        "design_life_hours":  250000,
        "bearing_life_hours": 60000,
        "impeller_life_hours":150000,
        "rotor_life_hours":   250000,

        # Operating data
        "running_hours":      62000,
        "daily_op_hours":     20,
        "recent_alarm_count": 3,

        "oee_data": {
            "planned_hours":   8760,
            "operating_hours": 7980,
            "actual_output":   92,
            "ideal_output":    100,
            "good_output":     90,
            "total_output":    92,
        },

        "sensor_points": ["CP1", "CP2", "C1", "C2"],
        "health_score":  84.0,
        "tags": ["compressor", "critical", "tra-a", "gas"],
        "notes": "4-stage centrifugal compressor. Dry gas seals replaced 2023-06.",
    },
]

MAINTENANCE_HISTORY = [
    # MOTOR_01
    {"asset_id":"MOTOR_01","type":"preventive","title":"Routine PM — Lubrication","description":"DE/NDE bearing lubrication per OEM schedule. Vibration baseline taken.","technician":"Arjun Kumar","date":"2024-11-10","duration_hours":4,"cost_usd":250,"parts_replaced":["Mobilgrease XHP 222 — 200g"],"findings":"All parameters within spec. M1 vib 2.3 mm/s, M2 vib 2.7 mm/s.","next_due_date":"2025-05-10","work_order":"WO-2024-1102"},
    {"asset_id":"MOTOR_01","type":"corrective","title":"NDE Bearing Replacement","description":"High vibration alarm on M1 (11.8 mm/s). NDE bearing replaced.","technician":"Rajan Patel","date":"2024-07-22","duration_hours":16,"cost_usd":4200,"parts_replaced":["6318-C3 NDE Bearing","Bearing Lock Nut","Grease Seal"],"findings":"Bearing cage fatigue and raceway spalling found. Likely due to overlubrication. New bearing installed and lubrication procedure revised.","next_due_date":"2025-01-22","work_order":"WO-2024-0744"},
    {"asset_id":"MOTOR_01","type":"preventive","title":"Annual Electrical Inspection","description":"Motor winding IR test, insulation resistance check, terminal box inspection.","technician":"Senthil Raja","date":"2024-01-15","duration_hours":8,"cost_usd":1200,"parts_replaced":[],"findings":"Winding IR 850 MΩ (acceptable >100 MΩ). Phase balance within 2%. Terminal connections torqued to spec.","next_due_date":"2025-01-15","work_order":"WO-2024-0012"},
    {"asset_id":"MOTOR_01","type":"predictive","title":"Online Vibration Analysis","description":"Scheduled online vibration data collection — FFT spectrum analysis.","technician":"Arjun Kumar","date":"2025-03-01","duration_hours":2,"cost_usd":400,"parts_replaced":[],"findings":"1X and 2X peaks within normal. No bearing defect frequencies detected. Health trending stable.","next_due_date":"2025-06-01","work_order":"WO-2025-0211"},
    {"asset_id":"MOTOR_01","type":"inspection","title":"Motor Cooling System Check","description":"Cooling fan, air filter and ventilation duct inspection.","technician":"Vijay Mohan","date":"2025-01-20","duration_hours":2,"cost_usd":150,"parts_replaced":["Air Filter Element"],"findings":"Filter clogged — replaced. Cooling fan blades OK. Temperature delta reduced by 4°C post-cleaning.","next_due_date":"2025-07-20","work_order":"WO-2025-0098"},

    # GEARBOX_01
    {"asset_id":"GEARBOX_01","type":"preventive","title":"Oil Analysis & Change","description":"Oil sampling, analysis and full drain/refill per OEM 4000-hour schedule.","technician":"Rajan Patel","date":"2025-01-08","duration_hours":6,"cost_usd":800,"parts_replaced":["Mobilgear 600 XP 220 — 45L","Oil Filter","Breather"],"findings":"Oil sample showed Fe: 18 ppm (normal <50). No signs of wear. Viscosity OK at 220 cSt.","next_due_date":"2025-09-08","work_order":"WO-2025-0041"},
    {"asset_id":"GEARBOX_01","type":"preventive","title":"Gearbox External Inspection","description":"Visual inspection, oil leak check, mounting bolt torque check.","technician":"Vijay Mohan","date":"2024-09-12","duration_hours":3,"cost_usd":200,"parts_replaced":["Gasket — inspection cover"],"findings":"Minor seepage at inspection cover — gasket replaced. No abnormal noise. G1 2.8 mm/s, G2 3.1 mm/s.","next_due_date":"2025-03-12","work_order":"WO-2024-0891"},
    {"asset_id":"GEARBOX_01","type":"inspection","title":"Online Acoustic Emission Test","description":"AE sensor applied to gearbox housing for gear mesh defect detection.","technician":"Arjun Kumar","date":"2025-02-14","duration_hours":4,"cost_usd":600,"parts_replaced":[],"findings":"Gear mesh frequency 1X and 2X within normal envelope. No sidebands indicating gear damage. Continue monitoring.","next_due_date":"2025-08-14","work_order":"WO-2025-0162"},

    # COMPRESSOR_01
    {"asset_id":"COMPRESSOR_01","type":"corrective","title":"Dry Gas Seal Replacement","description":"Stage 1 dry gas seal replaced due to seal gas flow deviation.","technician":"OEM Service Engineer","date":"2023-06-15","duration_hours":72,"cost_usd":45000,"parts_replaced":["DGS Stage 1 Primary Ring","DGS Stage 1 Mating Ring","O-Ring Kit","Separation Seal"],"findings":"Carbon face wear on primary ring. Contamination from gas stream likely cause. New seals installed. Seal gas filter also replaced.","next_due_date":"2026-06-15","work_order":"WO-2023-0621"},
    {"asset_id":"COMPRESSOR_01","type":"preventive","title":"Minor Shutdown Inspection","description":"Lube oil system check, coupling inspection, instrument calibration.","technician":"Senthil Raja","date":"2024-12-01","duration_hours":24,"cost_usd":8500,"parts_replaced":["Lube Oil Filter","Coupling Bolts","Coupling Disc Packs"],"findings":"Disc pack alignment within 0.05mm. Lube oil pressure 2.85 bar (spec 2.8). All instruments calibrated.","next_due_date":"2025-12-01","work_order":"WO-2024-1145"},
    {"asset_id":"COMPRESSOR_01","type":"predictive","title":"Vibration & Performance Analysis","description":"Compressor performance curve mapping and vibration vector plot.","technician":"Arjun Kumar","date":"2025-02-20","duration_hours":8,"cost_usd":1800,"parts_replaced":[],"findings":"C1 bearing showing 0.8 mm/s increase in 3 months — trending upward. Flow 9850 m³/h vs rated 10000 — 1.5% shortfall possibly due to fouling. Recommend borescope at next opportunity.","next_due_date":"2025-05-20","work_order":"WO-2025-0198"},
    {"asset_id":"COMPRESSOR_01","type":"inspection","title":"Inter-stage Cooler Inspection","description":"Cooler performance test and fouling check.","technician":"Vijay Mohan","date":"2025-01-05","duration_hours":6,"cost_usd":1200,"parts_replaced":[],"findings":"Stage 2 cooler showing 15% fouling. Cleaning not done (no access during running). Schedule for next shutdown.","next_due_date":"2025-06-05","work_order":"WO-2025-0028"},
]


async def seed():
    await init_db()
    db = get_db()

    # Users
    for u in USERS:
        existing = await db.users.find_one({"username": u["username"]})
        if not existing:
            await db.users.insert_one({
                **u,
                "password_hash": get_password_hash(u["password"]),
                "created_at": datetime.utcnow().isoformat(),
            })
    print(f"✅ Seeded {len(USERS)} users")

    # Assets
    for asset in ASSETS:
        existing = await db.assets.find_one({"asset_id": asset["asset_id"]})
        if existing:
            await db.assets.update_one({"asset_id": asset["asset_id"]}, {"$set": asset})
        else:
            await db.assets.insert_one(asset)
    print(f"✅ Seeded {len(ASSETS)} assets")

    # Maintenance history
    await db.maintenance_history.delete_many({})
    await db.maintenance_history.insert_many(MAINTENANCE_HISTORY)
    print(f"✅ Seeded {len(MAINTENANCE_HISTORY)} maintenance records")

    print("🚀 Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())

# Alias for backward compatibility
seed_database = seed
