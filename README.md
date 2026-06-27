# Lansub MES — Condition Monitoring & Predictive Maintenance Platform

A full-stack, Docker-based industrial condition monitoring system for a **Gas Compressor Train** (Motor → Gearbox → Compressor), inspired by the Lansub LANWi wireless sensor network.

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone / Open the project
```bash
cd "lansub MES"
```

### 2. Launch all services
```bash
docker compose up --build
```

First build takes ~5–10 minutes (downloads images, installs dependencies).

### 3. Access the platform
| Service | URL |
|---------|-----|
| 🖥️ React Dashboard | http://localhost:3000 |
| 🔌 FastAPI Docs | http://localhost:8000/docs |
| 🗄️ MongoDB | localhost:27017 |
| 📡 MQTT Broker | localhost:1883 |

---

## 🔐 Login Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `lansub@2024` | Full access |
| `engineer` | `engineer@2024` | View + reports |
| `viewer` | `viewer@2024` | View only |

---

## 📦 Architecture

```
[Simulator] ──MQTT──► [Mosquitto] ──► [FastAPI Backend]
                                            │
                                       [MongoDB]
                                            │
                                    [WebSocket Hub]
                                            │
                                   [React Dashboard]
                                    ┌──────┴───────┐
                                3D SCADA       Bhogar AI
                               (Three.js)     Reports + Alarms
```

## 🏭 Simulated Equipment
- **Motor** (MOTOR_01) — 250kW, 1480 RPM, sensors M1/M2
- **Gearbox** (GEARBOX_01) — Ratio 3.2:1, sensors G1/G2
- **Compressor** (COMPRESSOR_01) — 850 m³/h, 12.5 bar, sensors C1/C2/CP1/CP2

## ⚡ Features
- **3D SCADA Viewer** — Interactive Three.js equipment model with live health coloring
- **Real-time Telemetry** — WebSocket push every 1 second
- **Bhogar AI** — Fault detection: Bearing Wear, Cavitation, Imbalance, Misalignment, Gear Wear
- **Alarm Management** — Severity-based with acknowledge workflow
- **AI Reports** — Template engine (or OpenAI if key provided)
- **JWT Auth** — Secure login with role-based access

## 🛑 Stop Services
```bash
docker compose down
# To also remove data volumes:
docker compose down -v
```

## 🔧 Configuration
Edit `.env` to change credentials, JWT secret, or add OpenAI API key for AI reports.

## ☁️ Azure Deployment (Future)
This project is structured for easy migration to Azure:
- MongoDB → Azure Cosmos DB
- MQTT → Azure IoT Hub
- FastAPI → Azure App Service
- React → Azure Static Web Apps
- Reports → Azure OpenAI
