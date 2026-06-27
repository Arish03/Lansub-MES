#!/bin/bash
# ============================================================
#  Lansub MES — Cloud Deployment via ngrok
#  Exposes your local PC as a cloud server
#  Usage: bash ngrok_cloud.sh
# ============================================================

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
NGROK="$HOME/bin/ngrok"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   LANSUB MES — Cloud Deployment via ngrok           ║${NC}"
echo -e "${CYAN}║   Your PC is now a cloud server 🌐                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check ngrok ──────────────────────────────────────────────
if ! command -v $NGROK &>/dev/null; then
  echo -e "${RED}❌ ngrok not found. Install it first.${NC}"
  exit 1
fi

# ── Check if services are running ────────────────────────────
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
  echo -e "${RED}❌ Backend not running on port 8000. Start services first (bash start_all.sh)${NC}"
  exit 1
fi

if ! curl -s http://localhost:3000/ > /dev/null 2>&1; then
  echo -e "${RED}❌ Frontend not running on port 3000. Start services first (bash start_all.sh)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Local services detected (Backend:8000, Frontend:3000)${NC}"
echo ""

# ── Kill any existing ngrok processes ────────────────────────
pkill -f "ngrok" 2>/dev/null || true
sleep 1

# ── Start ngrok tunnel for Backend API (port 8000) ──────────
echo -e "${YELLOW}▶ Starting ngrok tunnel for Backend API (port 8000)...${NC}"
$NGROK http 8000 --log=stdout --log-level=info > /tmp/ngrok_backend.log 2>&1 &
NGROK_BACKEND_PID=$!
sleep 5

# Get the backend tunnel URL
BACKEND_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    for t in tunnels:
        if t.get('proto') == 'https':
            print(t['public_url'])
            break
    else:
        if tunnels:
            print(tunnels[0]['public_url'])
except:
    pass
" 2>/dev/null)

if [ -z "$BACKEND_URL" ]; then
  echo -e "${RED}❌ Failed to get backend tunnel URL.${NC}"
  echo -e "${YELLOW}   This usually means ngrok requires authentication.${NC}"
  echo -e "${YELLOW}   Run: ngrok config add-authtoken YOUR_TOKEN${NC}"
  echo -e "${YELLOW}   Get your free token at: https://dashboard.ngrok.com/get-started/your-authtoken${NC}"
  kill $NGROK_BACKEND_PID 2>/dev/null
  exit 1
fi

# Derive WebSocket URL (replace https:// with wss://)
WS_URL=$(echo "$BACKEND_URL" | sed 's/https:/wss:/')

echo -e "${GREEN}  ✅ Backend API tunnel: ${BACKEND_URL}${NC}"
echo -e "${GREEN}  ✅ WebSocket tunnel:   ${WS_URL}/ws${NC}"
echo ""

# ── Restart Frontend with ngrok backend URL ──────────────────
echo -e "${YELLOW}▶ Restarting frontend with cloud backend URL...${NC}"
pkill -f "vite.*3000" 2>/dev/null || true
sleep 2

cd "$ROOT/frontend"
VITE_API_URL="$BACKEND_URL" VITE_WS_URL="$WS_URL" npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/lansub_frontend_cloud.log 2>&1 &
FRONTEND_PID=$!
sleep 5

# ── Start ngrok tunnel for Frontend (port 3000) ──────────────
# Need to use a different ngrok API port since one is already running
echo -e "${YELLOW}▶ Starting ngrok tunnel for Frontend (port 3000)...${NC}"
$NGROK http 3000 --log=stdout --log-level=info > /tmp/ngrok_frontend.log 2>&1 &
NGROK_FRONTEND_PID=$!
sleep 5

# Get the frontend tunnel URL (check second ngrok instance)
# ngrok free tier only supports 1 tunnel at a time, so we use the same API
FRONTEND_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    urls = []
    for t in tunnels:
        if t.get('proto') == 'https':
            urls.append(t['public_url'])
    # The latest tunnel (frontend) should be the second one
    if len(urls) >= 2:
        print(urls[1])
    elif urls:
        print(urls[0])
except:
    pass
" 2>/dev/null)

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🌐 LANSUB MES — CLOUD DEPLOYMENT ACTIVE                   ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                             ║${NC}"
echo -e "${CYAN}║  📡 Backend API:  ${NC}${GREEN}${BACKEND_URL}${NC}"
echo -e "${CYAN}║  🔌 WebSocket:    ${NC}${GREEN}${WS_URL}/ws${NC}"
if [ -n "$FRONTEND_URL" ]; then
echo -e "${CYAN}║  🖥️  Dashboard:   ${NC}${GREEN}${FRONTEND_URL}${NC}"
fi
echo -e "${CYAN}║                                                             ║${NC}"
echo -e "${CYAN}║  🔐 Login:  admin / lansub@2024                             ║${NC}"
echo -e "${CYAN}║                                                             ║${NC}"
echo -e "${CYAN}║  Share the Dashboard URL with anyone to access remotely!    ║${NC}"
echo -e "${CYAN}║  Press Ctrl+C to stop cloud deployment                      ║${NC}"
echo -e "${CYAN}║                                                             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Cleanup on exit ──────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Shutting down cloud tunnels...${NC}"
  kill $NGROK_BACKEND_PID 2>/dev/null
  kill $NGROK_FRONTEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  pkill -f "ngrok" 2>/dev/null
  echo -e "${GREEN}✅ Cloud deployment stopped. Local services still running.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Keep running
wait
