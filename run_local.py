#!/usr/bin/env python3
"""
Lansub MES — Local Dev Launcher (No Docker Required)
Starts: embedded MQTT broker + FastAPI backend + simulator
Usage: python3 run_local.py
"""

import asyncio
import subprocess
import sys
import os
import time
import signal
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [LAUNCHER] %(message)s")
log = logging.getLogger(__name__)

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
SIMULATOR_DIR = os.path.join(ROOT, "simulator")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

# Use local user Python packages
USER_SITE = subprocess.check_output([sys.executable, "-m", "site", "--user-site"]).decode().strip()
os.environ["PYTHONPATH"] = f"{USER_SITE}:{os.environ.get('PYTHONPATH', '')}"

# ── ENV for local dev ─────────────────────────────────────────────────────
env = os.environ.copy()
env.update({
    "MONGO_URL": "mongomock://localhost/lansub_mes",
    "MONGO_DB": "lansub_mes",
    "MQTT_HOST": "127.0.0.1",
    "MQTT_PORT": "1883",
    "JWT_SECRET": "local_dev_secret_change_in_prod",
    "JWT_EXPIRE_MINUTES": "1440",
    "PUBLISH_INTERVAL": "1",
})

# Load .env file
env_file = os.path.join(ROOT, ".env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    log.info(f"Loaded .env: OPENAI_API_KEY={'set' if env.get('OPENAI_API_KEY') else 'not set'}")

processes = []

def cleanup(*args):
    log.info("Shutting down all services...")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def start_mqtt_broker():
    """Start embedded MQTT broker on port 1883"""
    broker_script = os.path.join(ROOT, "_mqtt_broker.py")
    p = subprocess.Popen(
        [sys.executable, broker_script],
        env=env,
    )
    processes.append(p)
    log.info("MQTT broker starting...")
    time.sleep(3)
    return p


def start_backend():
    p = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app",
         "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR,
        env=env,
    )
    processes.append(p)
    log.info("FastAPI backend starting on http://localhost:8000")
    return p


def start_simulator():
    time.sleep(4)  # wait for broker + backend
    p = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=SIMULATOR_DIR,
        env=env,
    )
    processes.append(p)
    log.info("Simulator starting...")
    return p


def start_frontend():
    # Install npm deps if needed
    node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(node_modules):
        log.info("Installing frontend npm packages (first time)...")
        subprocess.run(["npm", "install"], cwd=FRONTEND_DIR, check=True)

    p = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"],
        cwd=FRONTEND_DIR,
        env={**env, "VITE_API_URL": "http://localhost:8000", "VITE_WS_URL": "ws://localhost:8000"},
    )
    processes.append(p)
    log.info("Frontend starting on http://localhost:3000")
    return p


if __name__ == "__main__":
    log.info("=" * 60)
    log.info("  LANSUB MES — Local Development Server")
    log.info("=" * 60)

    import threading

    t_mqtt = threading.Thread(target=start_mqtt_broker, daemon=False)
    t_backend = threading.Thread(target=start_backend, daemon=False)
    t_sim = threading.Thread(target=start_simulator, daemon=False)
    t_frontend = threading.Thread(target=start_frontend, daemon=False)

    t_mqtt.start()
    t_backend.start()
    t_sim.start()
    t_frontend.start()

    log.info("")
    log.info("  Dashboard  → http://localhost:3000")
    log.info("  API Docs   → http://localhost:8000/docs")
    log.info("  Login      → admin / lansub@2024")
    log.info("")
    log.info("  Press Ctrl+C to stop all services")
    log.info("")

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()
