# 🚀 Lansub MES — Production Deployment Guide (VM)

> **Condition Monitoring & Predictive Maintenance Platform**
> Full-stack Docker deployment for Linux VM (Ubuntu 20.04 / 22.04 LTS recommended)

---

## 📋 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Port Reference](#-port-reference)
3. [Dockerfiles Summary](#-dockerfiles-summary)
4. [VM Prerequisites](#-vm-prerequisites)
5. [Production Configuration](#-production-configuration)
6. [Deployment Steps](#-deployment-steps)
7. [Post-Deployment Checks](#-post-deployment-checks)
8. [Default Credentials](#-default-credentials)
9. [Firewall Rules](#-firewall-rules)
10. [Logs & Monitoring](#-logs--monitoring)
11. [Stop / Restart / Update](#-stop--restart--update)
12. [Troubleshooting](#-troubleshooting)

---

## 🏗️ Architecture Overview

```
Internet / Browser
        │
        ▼
  [VM Public IP]
        │
  Port 3000 ──► [Frontend Container]  (nginx:alpine serving React SPA)
                        │ /api/*  → proxy
                        │ /ws     → proxy
                        ▼
  Port 8000 ──► [Backend Container]   (FastAPI / Uvicorn, Python 3.11)
                   │             │
                   ▼             ▼
  Port 27017 ──► [MongoDB]   [MQTT Client]
                                 │
  Port 1883 ──► [Mosquitto]  ◄───┘
  Port 9001       (MQTT Broker)
                      ▲
              [Simulator Container]  (publishes fake sensor data)
```

All containers share the internal Docker bridge network `lansub_net`.
External traffic only reaches ports **3000** and **8000** (and optionally **1883**).

---

## 🔌 Port Reference

| Port | Protocol | Container | Direction | Purpose |
|------|----------|-----------|-----------|---------|
| **3000** | HTTP | `lansub_frontend` | **Public** ✅ | React Dashboard (served by Nginx) |
| **8000** | HTTP / WS | `lansub_backend` | **Public** ✅ | FastAPI REST API + WebSocket `/ws` |
| **1883** | TCP (MQTT) | `lansub_mosquitto` | Internal only 🔒 | MQTT broker (sensor data) |
| **9001** | WS | `lansub_mosquitto` | Internal only 🔒 | MQTT over WebSocket |
| **27017** | TCP | `lansub_mongodb` | Internal only 🔒 | MongoDB database |

> ⚠️ **Security Note:** Do NOT expose ports **27017** or **1883/9001** to the public internet in production.
> Only open **3000** and **8000** (or use a reverse proxy on **80/443**).

---

## 🐳 Dockerfiles Summary

### `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```
- **Base**: Python 3.11 slim
- **Runs**: FastAPI via Uvicorn on port **8000**
- **⚠️ Production fix needed**: Remove `--reload` flag in production (see [Production Configuration](#-production-configuration))

---

### `frontend/Dockerfile` (Multi-stage Build)
```dockerfile
# Stage 1: Build React app with Vite
FROM node:20-alpine AS builder
ARG VITE_API_URL=http://localhost:8000
ARG VITE_WS_URL=ws://localhost:8000
# ... npm install && npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```
- **Stage 1**: Node 20 Alpine — builds the React/Vite SPA
- **Stage 2**: Nginx Alpine — serves static files on port **80** (mapped to host **3000**)
- **Build ARGs** `VITE_API_URL` and `VITE_WS_URL` are **baked into the JS bundle** at build time
- The Nginx config proxies `/api/*` and `/ws` to the backend container

---

### `simulator/Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```
- Publishes simulated sensor data (Motor, Gearbox, Compressor) over MQTT every 1 second
- No external ports exposed — internal network only

---

### Mosquitto (Uses Official Image)
- **Image**: `eclipse-mosquitto:2.0`
- **Config**: `./mosquitto/mosquitto.conf` (mounted as volume)
- **Ports**: 1883 (MQTT), 9001 (MQTT over WebSocket)
- **Persistence**: Data stored in Docker volume `mosquitto_data`

---

## 🖥️ VM Prerequisites

### Minimum Specs (Recommended)
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 30 GB | 50 GB SSD |
| OS | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |

> ⚠️ The backend installs `torch` (PyTorch) and `transformers` — these are large packages (~2–4 GB).
> Ensure you have enough disk space and RAM.

### Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group (no sudo required)
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker
docker --version
docker compose version
```

---

## ⚙️ Production Configuration

### 1. Clone / Transfer Project to VM

```bash
# Option A: Git clone (if hosted on GitHub/GitLab)
git clone <your-repo-url> /opt/lansub-mes
cd /opt/lansub-mes

# Option B: SCP from local machine (Windows PowerShell)
scp -r "C:\Users\arish\Downloads\lansub MES\lansub MES" user@<VM_IP>:/opt/lansub-mes
```

### 2. Set Your VM's Public IP

The frontend bundle has the API URL **baked in at build time** via `VITE_API_URL`.
You **must** update `docker-compose.yml` with your VM's actual public IP before building.

```bash
# Find your VM's public IP
curl ifconfig.me
# Example output: 203.0.113.45
```

Edit `docker-compose.yml` and replace `localhost` with your VM IP:

```yaml
# docker-compose.yml — frontend service args
args:
  VITE_API_URL: http://203.0.113.45:8000   # ← Replace with your VM IP
  VITE_WS_URL: ws://203.0.113.45:8000      # ← Replace with your VM IP
```

### 3. Secure the `.env` File

> ⚠️ **CRITICAL**: The `.env` file contains secrets. Update all values before deploying!

```bash
# Edit the .env file
nano .env
```

Change the following values:

```env
# .env — PRODUCTION VALUES
MONGO_USER=lansub                         # Keep or change
MONGO_PASS=CHANGE_ME_STRONG_PASSWORD      # ⚠️ Change this!
MONGO_DB=lansub_mes

JWT_SECRET=CHANGE_ME_TO_64_CHAR_RANDOM   # ⚠️ Change this!

# Optional: AI-powered reports (leave blank to use template engine)
OPENAI_API_KEY=sk-...                     # Your OpenAI key (optional)
```

Generate a strong JWT secret:
```bash
openssl rand -hex 32
```

### 4. Fix the Backend Dockerfile for Production

Remove `--reload` from the backend CMD (it's a dev-only flag):

```bash
# Edit backend/Dockerfile
nano backend/Dockerfile
```

Change line 6:
```dockerfile
# BEFORE (development):
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# AFTER (production):
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

---

## 🚀 Deployment Steps

### Step 1 — Navigate to the project directory
```bash
cd /opt/lansub-mes
```

### Step 2 — Build and start all containers
```bash
docker compose up --build -d
```
- `--build` — rebuilds images from Dockerfiles
- `-d` — runs in detached (background) mode
- **First build takes 10–20 minutes** (downloads Python, Node, installs torch/transformers)

### Step 3 — Verify all 5 containers are running
```bash
docker compose ps
```

Expected output:
```
NAME                 IMAGE                    STATUS         PORTS
lansub_mosquitto     eclipse-mosquitto:2.0    Up             0.0.0.0:1883->1883/tcp, 0.0.0.0:9001->9001/tcp
lansub_mongodb       mongo:7.0                Up             0.0.0.0:27017->27017/tcp
lansub_simulator     lansub-mes-simulator     Up
lansub_backend       lansub-mes-backend       Up             0.0.0.0:8000->8000/tcp
lansub_frontend      lansub-mes-frontend      Up             0.0.0.0:3000->80/tcp
```

---

## ✅ Post-Deployment Checks

```bash
# 1. Check backend health endpoint
curl http://localhost:8000/health
# Expected: {"status":"healthy"}

# 2. Check frontend is serving
curl -I http://localhost:3000
# Expected: HTTP/1.1 200 OK

# 3. Check API root
curl http://localhost:8000/
# Expected: {"message":"Lansub MES API v1.0","status":"running"}

# 4. Check all container logs for errors
docker compose logs --tail=50

# 5. Check backend logs specifically
docker compose logs backend --tail=50

# 6. Check frontend logs
docker compose logs frontend --tail=20
```

From your **browser** (replace with your VM IP):
- **Dashboard**: `http://<VM_IP>:3000`
- **API Docs (Swagger)**: `http://<VM_IP>:8000/docs`
- **API ReDoc**: `http://<VM_IP>:8000/redoc`

---

## 🔐 Default Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `lansub@2024` | Full access |
| `engineer` | `engineer@2024` | View + reports |
| `viewer` | `viewer@2024` | View only |

> ⚠️ Change these passwords after first login through the admin panel.

---

## 🔥 Firewall Rules

### Ubuntu UFW (Uncomplicated Firewall)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (CRITICAL — do this first or you'll be locked out!)
sudo ufw allow 22/tcp

# Allow Frontend Dashboard
sudo ufw allow 3000/tcp

# Allow Backend API
sudo ufw allow 8000/tcp

# Block MongoDB and MQTT from public access
sudo ufw deny 27017
sudo ufw deny 1883
sudo ufw deny 9001

# Check rules
sudo ufw status verbose
```

### Cloud Provider Security Groups (AWS/GCP/Azure)

If using a cloud VM, also add **inbound rules** in your security group:

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | Your IP only |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 |
| Custom TCP | TCP | 8000 | 0.0.0.0/0 |
| ❌ Block | TCP | 27017 | — |
| ❌ Block | TCP | 1883 | — |

---

## 📊 Logs & Monitoring

```bash
# Stream live logs from all containers
docker compose logs -f

# Stream logs from specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mosquitto
docker compose logs -f mongodb
docker compose logs -f simulator

# Check resource usage
docker stats
```

### Enable Docker Auto-restart on VM Reboot

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# All containers have `restart: unless-stopped` in docker-compose.yml
# To also start them on VM reboot, create a systemd service:

sudo nano /etc/systemd/system/lansub-mes.service
```

Paste this into the file:

```ini
[Unit]
Description=Lansub MES Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/lansub-mes
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable lansub-mes
sudo systemctl start lansub-mes
```

---

## 🔄 Stop / Restart / Update

```bash
# Stop all containers (keeps data volumes)
docker compose down

# Stop AND remove all data volumes (⚠️ deletes MongoDB data!)
docker compose down -v

# Restart a single service
docker compose restart backend

# Pull latest images and rebuild
git pull
docker compose up --build -d

# Force rebuild without cache
docker compose build --no-cache
docker compose up -d
```

---

## 🛠️ Troubleshooting

### ❌ Backend fails to start
```bash
docker compose logs backend
```
Common causes:
- **MongoDB not ready yet** — backend depends on MongoDB. Wait 10–15 seconds and retry.
- **torch install failed** — large package, may need more disk space or RAM.
- **Port 8000 already in use** — `sudo lsof -i :8000` to find and kill the process.

### ❌ Frontend shows blank page or can't connect to API
- The `VITE_API_URL` is **baked into the JS bundle** at build time.
- If you changed the VM IP after building, you **must rebuild**:
  ```bash
  # Update docker-compose.yml VITE_API_URL first, then:
  docker compose up --build -d frontend
  ```

### ❌ MQTT/Simulator not sending data
```bash
docker compose logs simulator
docker compose logs mosquitto
```
- Check that mosquitto started before the simulator (it depends on it).
- Try restarting the simulator: `docker compose restart simulator`

### ❌ MongoDB authentication error
- Ensure `MONGO_USER`, `MONGO_PASS`, `MONGO_DB` in `.env` match what's in `docker-compose.yml`.
- If you changed credentials after a volume was created, delete and recreate the volume:
  ```bash
  docker compose down -v
  docker compose up --build -d
  ```

### ❌ Port already in use
```bash
# Check what's using a port
sudo lsof -i :3000
sudo lsof -i :8000
sudo lsof -i :1883
sudo lsof -i :27017
```

### ❌ Out of disk space (torch is large!)
```bash
df -h
# Clean unused Docker images/layers
docker system prune -a
```

---

## 📁 Project File Structure

```
lansub MES/
├── .env                    ← Environment variables (secrets)
├── docker-compose.yml      ← Orchestrates all 5 containers
├── start_all.sh            ← Local dev startup (no Docker)
├── ngrok_cloud.sh          ← Expose local dev via ngrok tunnel
├── _mqtt_broker.py         ← Lightweight MQTT broker for local dev
├── run_local.py            ← Local runner (no Docker)
├── README.md               ← Quick start guide
├── DEPLOY.md               ← This file — production VM guide
│
├── backend/                ← FastAPI Python backend
│   ├── Dockerfile
│   ├── main.py             ← App entrypoint, FastAPI app
│   ├── config.py           ← Reads env vars
│   ├── database.py         ← MongoDB (Motor async driver)
│   ├── mqtt_client.py      ← MQTT subscriber
│   ├── websocket_manager.py← WebSocket broadcast hub
│   ├── seed.py             ← Seeds initial DB data & users
│   ├── requirements.txt
│   ├── routers/            ← API route handlers
│   └── services/           ← Business logic
│
├── frontend/               ← React + Vite SPA
│   ├── Dockerfile          ← Multi-stage: build + nginx serve
│   ├── nginx.conf          ← Nginx config (proxy /api, /ws)
│   ├── package.json
│   ├── vite.config.js
│   └── src/                ← React source code
│
├── simulator/              ← MQTT sensor data simulator
│   ├── Dockerfile
│   ├── main.py             ← Publishes Motor/Gearbox/Compressor data
│   └── requirements.txt
│
└── mosquitto/              ← MQTT broker config
    └── mosquitto.conf      ← Listeners on 1883 & 9001
```

---

## ⚡ Quick Reference Commands

```bash
# Deploy (first time or after changes)
docker compose up --build -d

# Check status
docker compose ps

# Health check
curl http://localhost:8000/health

# View logs (live)
docker compose logs -f

# Stop everything
docker compose down

# Full reset (deletes data!)
docker compose down -v && docker compose up --build -d
```

---

*Lansub MES v1.0 — Condition Monitoring & Predictive Maintenance Platform*
