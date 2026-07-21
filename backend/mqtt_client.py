"""
MQTT Client — subscribes to all lansub/# topics,
runs Lansub AI analysis, stores to MongoDB, broadcasts via WebSocket.
"""

import asyncio
import json
import logging
import os
import threading
from datetime import datetime

import paho.mqtt.client as mqtt

from config import MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS
from database import get_db
from services.bhogar_ai import analyze_telemetry
from websocket_manager import ws_manager

log = logging.getLogger(__name__)

_loop: asyncio.AbstractEventLoop = None


def set_event_loop(loop: asyncio.AbstractEventLoop):
    global _loop
    _loop = loop


def _on_connect(client, userdata, flags, rc):
    if rc == 0:
        client.subscribe("lansub/#", qos=1)
        log.info("MQTT: Connected and subscribed to lansub/#")
    else:
        log.error(f"MQTT: Connection failed rc={rc}")


def _on_message(client, userdata, msg):
    global _loop
    try:
        payload = json.loads(msg.payload.decode())
        if _loop:
            asyncio.run_coroutine_threadsafe(_handle_message(payload), _loop)
    except Exception as e:
        log.error(f"MQTT message error: {e}")


async def _handle_message(payload: dict):
    db = get_db()
    if db is None:
        return

    # Run Lansub AI analysis
    analysis = analyze_telemetry(payload)

    # Store telemetry (flatten for storage)
    telemetry_doc = {
        "asset_id": payload.get("asset_id"),
        "asset_type": payload.get("asset_type"),
        "timestamp": datetime.utcfromtimestamp(payload.get("timestamp", 0)),
        "health_score": payload.get("health_score"),
        "fault_type": payload.get("fault_type", "none"),
        "sensors": payload.get("sensors", {}),
        "raw": payload,
    }
    await db.telemetry.insert_one(telemetry_doc)

    # Store health score history
    await db.health_scores.insert_one({
        "asset_id": payload.get("asset_id"),
        "health_score": payload.get("health_score"),
        "timestamp": datetime.utcnow(),
    })

    # Store alarms
    for alarm in analysis.get("alarms", []):
        # Only store new alarms (deduplicate within 60s)
        existing = await db.alarms.find_one({
            "asset_id": alarm["asset_id"],
            "parameter": alarm["parameter"],
            "sensor_point": alarm["sensor_point"],
            "acknowledged": False,
        })
        if not existing:
            await db.alarms.insert_one(alarm)

    # Update asset state
    await db.assets.update_one(
        {"asset_id": payload.get("asset_id")},
        {
            "$set": {
                "health_score": payload.get("health_score"),
                "fault_type": payload.get("fault_type", "none"),
                "last_seen": datetime.utcnow(),
                "status": "running",
                "latest_sensors": payload.get("sensors", {}),
                "rul_days": analysis.get("rul_days"),
            }
        },
        upsert=False,
    )

    # Broadcast via WebSocket
    await ws_manager.broadcast({
        "type": "telemetry",
        "payload": payload,
        "analysis": analysis,
    })


def start_mqtt_client(loop: asyncio.AbstractEventLoop):
    set_event_loop(loop)
    client = mqtt.Client(client_id=f"lansub_backend_{os.getpid()}")
    client.on_connect = _on_connect
    client.on_message = _on_message

    # Set MQTT credentials if provided
    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASS)

    def run():
        while True:
            try:
                client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
                client.loop_forever()
            except Exception as e:
                log.error(f"MQTT reconnecting: {e}")
                import time; time.sleep(3)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    log.info("MQTT client thread started")
