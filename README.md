# 🏭 Lansub MES — Condition Monitoring & Predictive Maintenance Platform

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/MQTT-Mosquitto-660066?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
</p>

A full-stack, Docker-based **Industrial MES (Manufacturing Execution System)** for real-time condition monitoring and predictive maintenance of a **Gas Compressor Train** (Motor → Gearbox → Compressor). Inspired by the Lansub LANWi wireless sensor network.

---

## 📑 Table of Contents

1. [Features](#-features)
2. [System Architecture](#-system-architecture)
3. [Tech Stack](#-tech-stack)
4. [Ports & Services](#-ports--services)
5. [Prerequisites](#-prerequisites)
6. [Quick Start (Docker)](#-quick-start-docker)
7. [Local Development (No Docker)](#-local-development-no-docker)
8. [Environment Variables](#-environment-variables)
9. [Login Credentials](#-login-credentials)
10. [Simulated Equipment](#-simulated-equipment)
11. [API Reference](#-api-reference)
12. [Project Structure](#-project-structure)
13. [Configuration Guide](#-configuration-guide)
14. [Stopping Services](#-stopping-services)
15. [VM / Production Deployment](#-vm--production-deployment)
16. [Azure Cloud Migration (Future)](#-azure-cloud-migration-future)
17. [Troubleshooting](#-troubleshooting)

---

## ⚡ Features

| Feature | Description |
|---|---|
| **3D SCADA Viewer** | Interactive Three.js equipment model with live health coloring |
| **Real-time Telemetry** | WebSocket push every 1 second from MQTT → Backend → Browser |
| **Bhogar AI Engine** | Fault detection: Bearing Wear, Cavitation, Imbalance, Misalignment, Gear Wear |
| **Alarm Management** | Severity-based alarms (Critical / Warning / Info) with acknowledge workflow |
| **AI Reports** | Template engine reports, or OpenAI-powered reports if API key provided |
| **JWT Authentication** | Secure login with role-based access control (Admin / Engineer / Viewer) |
| **Reliability Analytics** | MTBF, MTTR, OEE, availability metrics per asset |
| **Maintenance Tracker** | Work order management — create, assign, and track maintenance jobs |
| **Asset Registry** | Full lifecycle tracking of industrial assets |

---

## 📦 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        LANSUB MES                            │
│                                                              │
│  ┌─────────────┐    MQTT     ┌──────────────┐               │
│  │  Simulator  │────────────►│   Mosquitto  │               │
│  │ (Motor,     │             │  MQTT Broker │               │
│  │  Gearbox,   │             └──────┬───────┘               │
│  │  Compressor)│                    │ MQTT                  │
│  └─────────────┘                    ▼                        │
│                           ┌──────────────────┐              │
│                           │  FastAPI Backend │              │
│                           │   (Python 3.11)  │              │
│                           └───┬──────────┬───┘              │
│                               │          │                   │
│                         ┌─────▼─┐   ┌───▼──────────┐       │
│                         │MongoDB│   │ WebSocket Hub │       │
│                         │  7.0  │   └───────┬───────┘       │
│                         └───────┘           │ WS             │
│                                             ▼               │
│                                  ┌──────────────────┐       │
│                                  │  React Dashboard  │       │
│                                  │   (Vite + Nginx)  │       │
│                                  └────────┬──────────┘       │
│                                           │                  │
│                              ┌────────────┴────────────┐     │
│                         3D SCADA                  Bhogar AI  │
│                        (Three.js)            Reports + Alarms │
└──────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
Simulator → MQTT Publish → Mosquitto → Backend subscribes →
MongoDB (store) + WebSocket broadcast → React Dashboard (live update)
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Three.js, Chart.js |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Database** | MongoDB 7.0 (Motor async driver) |
| **Messaging** | Mosquitto MQTT Broker |
| **Auth** | JWT (HS256, 24hr expiry) |
| **Container** | Docker + Docker Compose |
| **Web Server** | Nginx (serving React build) |
| **AI/ML** | Rule-based Bhogar engine + optional OpenAI GPT |

---

## 🔌 Ports & Services

| Service | Container Port | Host Port | URL |
|---|---|---|---|
| **React Dashboard** | 80 | **3002** | http://localhost:3002 |
| **FastAPI Backend** | 8000 | **8002** | http://localhost:8002 |
| **FastAPI API Docs** | 8000 | **8002** | http://localhost:8002/docs |
| **MongoDB** | 27017 | **5435** | localhost:5435 |
| **MQTT Broker** | 1883 | internal | (no host port — internal only) |

> ⚠️ **On a VM**, replace `localhost` with your `VM_PUBLIC_IP` in all URLs above.

---

## ✅ Prerequisites

### For Docker (Recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — Windows/Mac
- [Docker Engine + Compose](https://docs.docker.com/engine/install/) — Linux/VM

### For Local Development (No Docker)
- Python 3.9+ with pip
- Node.js 18+ with npm
- MongoDB running locally (or use mongomock — auto-configured)

---

## 🚀 Quick Start (Docker)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/lansub-mes.git
cd lansub-mes
```

### 2. Set up environment variables
```bash
# Copy the template
cp .env.example .env

# Edit .env with your actual values
nano .env    # Linux/Mac
notepad .env # Windows
```

### 3. Build and start all services
```bash
docker compose up --build
```
> First build takes **5–10 minutes** (downloads images, installs all dependencies).

### 4. Seed the database (first run only)
The database is **auto-seeded** on first startup — no manual step needed.

### 5. Access the platform
| Service | URL |
|---|---|
| 🖥️ Dashboard | http://localhost:3002 |
| 📖 API Docs | http://localhost:8002/docs |
| 🗄️ MongoDB | localhost:5435 |

---

## 💻 Local Development (No Docker)

Use this when you want to develop without rebuilding Docker images.

### 1. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Install Node dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Start all services with one command
```bash
# Linux / Mac / Git Bash (Windows)
bash start_all.sh
```

This script automatically starts:
1. MQTT Broker (Python in-process, port 1883)
2. FastAPI Backend (port 8000)
3. Equipment Simulator (Motor, Gearbox, Compressor)
4. React Frontend (Vite dev server, port 3000)

> ✅ Uses **mongomock** in-memory database — no MongoDB installation needed for local dev.

**Access:**
| Service | URL |
|---|---|
| 🖥️ Dashboard | http://localhost:3000 |
| 📖 API Docs | http://localhost:8000/docs |

### Stop local services
```bash
# Press Ctrl+C in the terminal running start_all.sh
# All 4 processes will be cleanly shut down
```

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `VM_PUBLIC_IP` | ✅ Yes | Your server's public IP (run `curl ifconfig.me`) |
| `MONGO_USER` | ✅ Yes | MongoDB admin username (default: `lansub`) |
| `MONGO_PASS` | ✅ Yes | MongoDB password — **must be strong** |
| `MONGO_DB` | ✅ Yes | Database name (default: `lansub_mes`) |
| `JWT_SECRET` | ✅ Yes | 64-char random secret for signing tokens |
| `MQTT_USER` | ✅ Yes | MQTT broker username |
| `MQTT_PASS` | ✅ Yes | MQTT broker password — **must be strong** |
| `OPENAI_API_KEY` | ⬜ Optional | OpenAI key for AI-generated reports (leave blank to use templates) |

**Generate a secure JWT secret:**
```bash
# Linux/Mac/Git Bash
openssl rand -hex 32

# PowerShell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

> ⚠️ Never commit your `.env` file to Git. It is listed in `.gitignore`.

---

## 🔐 Login Credentials

| Username | Password | Role | Access Level |
|---|---|---|---|
| `admin` | `lansub@2024` | Administrator | Full access — all features |
| `engineer` | `engineer@2024` | Engineer | View telemetry + generate reports |
| `viewer` | `viewer@2024` | Viewer | Read-only dashboard access |

> 💡 Credentials are seeded automatically on first startup via `backend/seed.py`.

---

## 🏭 Simulated Equipment

The **Simulator** service publishes live sensor data every second via MQTT.

| Asset | ID | Specs | Sensors |
|---|---|---|---|
| **Motor** | `MOTOR_01` | 250 kW, 1480 RPM | M1 (Vibration X), M2 (Vibration Y) |
| **Gearbox** | `GEARBOX_01` | Ratio 3.2:1 | G1 (Input vibration), G2 (Output vibration) |
| **Compressor** | `COMPRESSOR_01` | 850 m³/h, 12.5 bar | C1 (Suction press), C2 (Discharge press), CP1 (Vibration), CP2 (Temperature) |

**Fault Modes Simulated by Bhogar AI Engine:**

| Fault | Asset | Symptoms |
|---|---|---|
| Bearing Wear | Motor, Compressor | High RMS vibration, elevated temperature |
| Cavitation | Compressor | Pressure fluctuation, broadband noise |
| Imbalance | Motor | 1× frequency vibration, asymmetric readings |
| Misalignment | Gearbox | 2× frequency vibration, axial vibration |
| Gear Wear | Gearbox | Gear mesh frequency sidebands |

---

## 📡 API Reference

Full interactive docs available at: **http://localhost:8002/docs**

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login — returns JWT token |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Get current user profile |

### Assets
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/assets/` | List all assets |
| `GET` | `/assets/{id}` | Get asset details |
| `POST` | `/assets/` | Create new asset |
| `PUT` | `/assets/{id}` | Update asset |

### Telemetry
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/telemetry/latest` | Latest sensor readings for all assets |
| `GET` | `/telemetry/{asset_id}` | Historical data for an asset |
| `WS` | `/ws` | WebSocket — live telemetry stream |

### Alarms
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/alarms/` | List all alarms (filterable by severity/status) |
| `POST` | `/alarms/{id}/acknowledge` | Acknowledge an alarm |
| `GET` | `/alarms/active` | Get all active (unacknowledged) alarms |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/reports/generate` | Generate condition report for an asset |
| `GET` | `/reports/` | List generated reports |
| `GET` | `/reports/{id}` | Get a specific report |

### Reliability
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reliability/{asset_id}` | MTBF, MTTR, OEE, availability metrics |

### Maintenance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/maintenance/` | List work orders |
| `POST` | `/maintenance/` | Create new work order |
| `PUT` | `/maintenance/{id}` | Update work order status |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/` | API root info |

---

## 📁 Project Structure

```
lansub MES/
├── .env                    # ← Your secrets (NOT in Git)
├── .env.example            # ← Template (safe to commit)
├── .gitignore              # ← Protects secrets & artifacts
├── docker-compose.yml      # ← Orchestrates all services
├── start_all.sh            # ← Local dev launcher (no Docker)
├── _mqtt_broker.py         # ← Standalone MQTT broker (local dev)
│
├── backend/                # ── FastAPI Python Backend
│   ├── main.py             #    App entry point, lifespan, WebSocket
│   ├── config.py           #    Environment variable loading
│   ├── database.py         #    MongoDB Motor async connection
│   ├── mqtt_client.py      #    MQTT subscriber → DB + WS broadcast
│   ├── websocket_manager.py #   WebSocket connection manager
│   ├── seed.py             #    Database seeding (users, assets)
│   ├── requirements.txt    #    Python dependencies
│   ├── Dockerfile          #    Backend container build
│   ├── routers/            #    API route handlers
│   │   ├── auth.py         #    JWT login / logout / me
│   │   ├── assets.py       #    Asset CRUD
│   │   ├── telemetry.py    #    Sensor data queries
│   │   ├── alarms.py       #    Alarm CRUD + acknowledge
│   │   ├── reports.py      #    Report generation
│   │   ├── reliability.py  #    MTBF / OEE metrics
│   │   └── maintenance.py  #    Work order management
│   └── services/           #    Business logic / AI engine
│
├── frontend/               # ── React + Vite Frontend
│   ├── src/                #    React source code
│   ├── public/             #    Static assets
│   ├── index.html          #    HTML entry point
│   ├── vite.config.js      #    Vite configuration
│   ├── package.json        #    Node dependencies
│   ├── nginx.conf          #    Nginx config (production)
│   └── Dockerfile          #    Frontend container build
│
├── simulator/              # ── Equipment Simulator
│   └── main.py             #    Publishes MQTT telemetry every 1s
│
└── mosquitto/              # ── MQTT Broker Config
    ├── mosquitto.conf      #    Broker configuration
    └── Dockerfile          #    Builds broker with auth
```

---

## ⚙️ Configuration Guide

### Changing MongoDB Password
1. Edit `MONGO_PASS` in `.env`
2. Run `docker compose down -v` (clears old volume)
3. Run `docker compose up --build`

### Changing MQTT Credentials
1. Edit `MQTT_USER` and `MQTT_PASS` in `.env`
2. Run `docker compose up --build` (rebuilds Mosquitto with new auth)

### Enabling AI Reports (OpenAI)
1. Get an API key from https://platform.openai.com/api-keys
2. Add to `.env`: `OPENAI_API_KEY=sk-proj-...`
3. Restart: `docker compose up --build`

### Adjusting Telemetry Rate
Edit in `docker-compose.yml`:
```yaml
simulator:
  environment:
    PUBLISH_INTERVAL: 1   # seconds between sensor publishes
```

---

## 🛑 Stopping Services

```bash
# Stop all containers (keeps data)
docker compose down

# Stop and delete all data volumes (fresh start)
docker compose down -v

# Stop a single service
docker compose stop backend

# View running containers
docker compose ps

# View logs for a service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f simulator
```

---

## 🖥️ VM / Production Deployment

See the full [DEPLOY.md](./DEPLOY.md) guide for complete production deployment instructions.

**Quick summary:**

```bash
# 1. SSH into your VM
ssh user@YOUR_VM_IP

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# 3. Clone and configure
git clone https://github.com/YOUR_USERNAME/lansub-mes.git
cd lansub-mes
cp .env.example .env
nano .env   # Fill in VM_PUBLIC_IP and all passwords

# 4. Launch
docker compose up --build -d

# 5. Access
# Dashboard: http://YOUR_VM_IP:3002
# API Docs:  http://YOUR_VM_IP:8002/docs
```

**Required firewall ports to open on your VM:**

| Port | Service |
|---|---|
| 22 | SSH |
| 3002 | React Dashboard |
| 8002 | FastAPI Backend |
| 5435 | MongoDB (optional, for external tools) |

---

## ☁️ Azure Cloud Migration (Future)

This project is architected for easy migration to Azure managed services:

| Current | Azure Equivalent |
|---|---|
| MongoDB 7.0 (Docker) | Azure Cosmos DB for MongoDB |
| Mosquitto MQTT | Azure IoT Hub / Event Grid |
| FastAPI (Docker) | Azure App Service / Container Apps |
| React + Nginx | Azure Static Web Apps |
| OpenAI API | Azure OpenAI Service |
| Docker Compose | Azure Container Apps |

---

## 🐛 Troubleshooting

### Frontend shows "Cannot connect to backend"
- Check `VM_PUBLIC_IP` in `.env` — must match your server's actual public IP
- Verify port 8002 is open on your firewall/VM security group

### Docker build fails
```bash
# Clear Docker cache and rebuild from scratch
docker compose down -v
docker system prune -f
docker compose up --build
```

### MongoDB auth error
```bash
# Delete old volume and recreate with new credentials
docker compose down -v
docker compose up --build
```

### MQTT simulator not sending data
```bash
# Check simulator logs
docker compose logs -f simulator

# Check MQTT broker logs
docker compose logs -f mosquitto
```

### Port already in use
```bash
# Find what's using the port (e.g., 8002)
sudo lsof -i :8002       # Linux/Mac
netstat -ano | findstr 8002  # Windows
```

### Check service health
```bash
# All containers status
docker compose ps

# Backend health endpoint
curl http://localhost:8002/health
```

---

## 📄 License

This project is proprietary software developed for Lansub industrial monitoring solutions.

---

<p align="center">
  Built with ❤️ for industrial IoT — Lansub MES v1.0
</p>
