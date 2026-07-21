"""
Lansub MES — FastAPI Main Application
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db, disconnect_db
from mqtt_client import start_mqtt_client
from websocket_manager import ws_manager
from routers import auth, assets, telemetry, alarms, reports
from routers import reliability, maintenance
try:
    from seed import seed_database
except ImportError:
    async def seed_database(): pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    await seed_database()
    loop = asyncio.get_event_loop()
    start_mqtt_client(loop)
    yield
    # Shutdown
    await disconnect_db()


app = FastAPI(
    title="Lansub MES API",
    description="Condition Monitoring & Predictive Maintenance Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mes.lansub.com", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(telemetry.router)
app.include_router(alarms.router)
app.include_router(reports.router)
app.include_router(reliability.router)
app.include_router(maintenance.router)


@app.get("/")
async def root():
    return {"message": "Lansub MES API v1.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
