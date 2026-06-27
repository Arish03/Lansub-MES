#!/bin/bash
# ============================================================
#  Lansub MES — Start All Services (No Docker Required)
#  Usage: bash start_all.sh
# ============================================================

ROOT="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/usr/bin/python3"
NODE_PATH="$HOME/.nvm/versions/node/v20.20.0/bin"
PATH="$NODE_PATH:$HOME/Library/Python/3.9/bin:$PATH"
export PYTHONPATH="$HOME/Library/Python/3.9/lib/python/site-packages:$PYTHONPATH"

# Load environment
set -a
source "$ROOT/.env" 2>/dev/null
set +a

# Override for local dev (no Docker)
export MONGO_URL="mongomock://localhost/lansub_mes"
export MQTT_HOST="127.0.0.1"
export MQTT_PORT="1883"
export PUBLISH_INTERVAL="1"

PIDS=()

cleanup() {
  echo ""
  echo "🛑 Shutting down all services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
  # Also kill any stragglers
  pkill -f "_mqtt_broker.py" 2>/dev/null
  pkill -f "uvicorn main:app" 2>/dev/null
  pkill -f "simulator/main.py" 2>/dev/null
  pkill -f "vite.*3000" 2>/dev/null
  echo "✅ All services stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "╔══════════════════════════════════════════════════╗"
echo "║          LANSUB MES — Local Dev Server           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. MQTT Broker ───────────────────────────────────────
echo "▶ Starting MQTT Broker..."
pkill -f "_mqtt_broker.py" 2>/dev/null; sleep 0.5
$PYTHON "$ROOT/_mqtt_broker.py" > /tmp/lansub_mqtt.log 2>&1 &
PIDS+=($!)
sleep 2
if python3 -c "import socket; s=socket.socket(); s.settimeout(1); s.connect(('127.0.0.1',1883)); s.close()" 2>/dev/null; then
  echo "  ✅ MQTT Broker running on 127.0.0.1:1883"
else
  echo "  ❌ MQTT Broker failed to start (check /tmp/lansub_mqtt.log)"
fi

# ── 2. FastAPI Backend ───────────────────────────────────
echo "▶ Starting FastAPI Backend..."
pkill -f "uvicorn main:app" 2>/dev/null; sleep 0.5
cd "$ROOT/backend"
$PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/lansub_backend.log 2>&1 &
PIDS+=($!)
sleep 5
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
  echo "  ✅ FastAPI Backend running on http://localhost:8000"
else
  echo "  ❌ Backend failed (check /tmp/lansub_backend.log)"
fi

# ── 3. Simulator ─────────────────────────────────────────
echo "▶ Starting Equipment Simulator..."
pkill -f "simulator/main.py" 2>/dev/null; sleep 0.5
cd "$ROOT/simulator"
$PYTHON main.py > /tmp/lansub_simulator.log 2>&1 &
PIDS+=($!)
sleep 3
if pgrep -f "simulator/main.py" > /dev/null; then
  echo "  ✅ Simulator running (Motor, Gearbox, Compressor)"
else
  echo "  ❌ Simulator failed (check /tmp/lansub_simulator.log)"
fi

# ── 4. React Frontend ─────────────────────────────────────
echo "▶ Starting React Frontend..."
pkill -f "vite.*3000" 2>/dev/null; sleep 0.5
cd "$ROOT/frontend"
VITE_API_URL=http://localhost:8000 VITE_WS_URL=ws://localhost:8000 \
  npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/lansub_frontend.log 2>&1 &
PIDS+=($!)
sleep 5
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
  echo "  ✅ Frontend running on http://localhost:3000"
else
  echo "  ❌ Frontend failed (check /tmp/lansub_frontend.log)"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  🚀 LANSUB MES IS RUNNING                       ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Dashboard  → http://localhost:3000              ║"
echo "║  API Docs   → http://localhost:8000/docs         ║"
echo "║                                                  ║"
echo "║  Login: admin / lansub@2024                      ║"
echo "║                                                  ║"
echo "║  Press Ctrl+C to stop all services               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Open browser
open http://localhost:3000 2>/dev/null

# Keep running
wait
