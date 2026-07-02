"""
Lansub MES - Equipment Simulation Engine
Simulates a Gas Compressor Train: Motor → Coupling → Gearbox → Compressor
Sensor points: M1, M2 (Motor NDE/DE), CP1, CP2 (Coupling), G1, G2 (Gearbox), C1, C2 (Compressor)
Publishes realistic physics-based telemetry to MQTT
"""

import json
import math
import os
import random
import time
import threading
import logging

import numpy as np
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SIM] %(message)s")
log = logging.getLogger(__name__)

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_USER = os.getenv("MQTT_USER", "")
MQTT_PASS = os.getenv("MQTT_PASS", "")
PUBLISH_INTERVAL = float(os.getenv("PUBLISH_INTERVAL", 1.0))


# ─────────────────────────── Fault Injection ────────────────────────────────

class FaultInjector:
    """Randomly injects faults to simulate realistic machine degradation."""

    FAULTS = ["none", "bearing_wear", "imbalance", "misalignment", "cavitation", "gear_wear"]

    def __init__(self):
        self.current_fault = "none"
        self.fault_severity = 0.0         # 0.0 → 1.0
        self.fault_start_time = None
        self.next_fault_time = time.time() + random.uniform(60, 180)

    def update(self):
        now = time.time()
        if now >= self.next_fault_time:
            if self.current_fault == "none":
                self.current_fault = random.choice(self.FAULTS[1:])
                self.fault_severity = 0.0
                self.fault_start_time = now
                log.info(f"FAULT INJECTED: {self.current_fault}")
            else:
                # Clear fault after 90–180s
                self.current_fault = "none"
                self.fault_severity = 0.0
                log.info("FAULT CLEARED — Machine returned to normal")
            self.next_fault_time = now + random.uniform(90, 240)

        # Ramp severity up over 30 seconds
        if self.current_fault != "none" and self.fault_start_time:
            elapsed = now - self.fault_start_time
            self.fault_severity = min(1.0, elapsed / 30.0)


# ─────────────────────────── Base Equipment ─────────────────────────────────

class Equipment:
    def __init__(self, asset_id: str, asset_type: str, nominal_rpm: float):
        self.asset_id = asset_id
        self.asset_type = asset_type
        self.nominal_rpm = nominal_rpm
        self.fault = FaultInjector()
        self._t = 0.0   # internal time counter

    def _noise(self, scale=1.0):
        return np.random.normal(0, scale)

    def _sine(self, freq=1.0, amp=1.0):
        return amp * math.sin(2 * math.pi * freq * self._t)

    def tick(self):
        """Advance internal time."""
        self._t += PUBLISH_INTERVAL
        self.fault.update()

    def health_score(self) -> float:
        """Return health 0-100 based on fault severity."""
        return round(max(0.0, 100.0 - self.fault.fault_severity * 80.0), 1)


# ─────────────────────────── Motor ──────────────────────────────────────────

class Motor(Equipment):
    """Simulates a 3-phase induction motor with M1 (NDE) and M2 (DE) sensors."""

    def __init__(self):
        super().__init__("MOTOR_01", "MOTOR", nominal_rpm=1480.0)

    def read(self) -> dict:
        self.tick()
        f = self.fault

        # RPM: nominal ±2% with slight oscillation
        rpm_dev = 0.0
        if f.current_fault == "imbalance":
            rpm_dev = -30 * f.fault_severity
        elif f.current_fault == "bearing_wear":
            rpm_dev = -10 * f.fault_severity

        rpm = self.nominal_rpm + rpm_dev + self._sine(0.05, 5) + self._noise(3)
        rpm = max(0, rpm)

        # Current (A) - nominal 85A
        current = 85.0 + self._noise(1.5)
        if f.current_fault in ("bearing_wear", "misalignment"):
            current += 15 * f.fault_severity

        # M1 - NDE Bearing
        m1_vib = 2.5 + self._noise(0.3) + self._sine(0.1, 0.2)   # mm/s RMS
        m1_temp = 45.0 + self._noise(0.5) + self._sine(0.01, 2)   # °C

        # M2 - DE Bearing
        m2_vib = 2.8 + self._noise(0.3) + self._sine(0.12, 0.2)
        m2_temp = 47.0 + self._noise(0.5) + self._sine(0.01, 1.5)

        # Fault effects
        if f.current_fault == "bearing_wear":
            m1_vib += 12 * f.fault_severity
            m1_temp += 25 * f.fault_severity
            m2_vib += 8 * f.fault_severity
            m2_temp += 18 * f.fault_severity
        elif f.current_fault == "imbalance":
            m1_vib += 10 * f.fault_severity
            m2_vib += 10 * f.fault_severity
        elif f.current_fault == "misalignment":
            m1_vib += 6 * f.fault_severity
            m2_vib += 14 * f.fault_severity
            m1_temp += 10 * f.fault_severity

        return {
            "asset_id": self.asset_id,
            "asset_type": self.asset_type,
            "timestamp": time.time(),
            "health_score": self.health_score(),
            "fault_type": f.current_fault,
            "sensors": {
                "rpm": round(rpm, 1),
                "current_a": round(current, 2),
                "power_kw": round(current * 0.4, 2),
                "M1": {
                    "label": "Motor NDE Bearing",
                    "vibration_rms": round(max(0, m1_vib), 3),
                    "temperature_c": round(max(20, m1_temp), 1),
                    "vibration_x": round(m1_vib * 0.6 + self._noise(0.1), 3),
                    "vibration_y": round(m1_vib * 0.5 + self._noise(0.1), 3),
                    "vibration_z": round(m1_vib * 0.8 + self._noise(0.1), 3),
                },
                "M2": {
                    "label": "Motor DE Bearing",
                    "vibration_rms": round(max(0, m2_vib), 3),
                    "temperature_c": round(max(20, m2_temp), 1),
                    "vibration_x": round(m2_vib * 0.7 + self._noise(0.1), 3),
                    "vibration_y": round(m2_vib * 0.55 + self._noise(0.1), 3),
                    "vibration_z": round(m2_vib * 0.85 + self._noise(0.1), 3),
                },
            }
        }


# ─────────────────────────── Gearbox ────────────────────────────────────────

class Gearbox(Equipment):
    """Simulates a gearbox with G1 (input) and G2 (output) bearing sensors."""

    def __init__(self):
        super().__init__("GEARBOX_01", "GEARBOX", nominal_rpm=1480.0)
        self.gear_ratio = 3.2

    def read(self) -> dict:
        self.tick()
        f = self.fault

        input_rpm = self.nominal_rpm + self._sine(0.05, 4) + self._noise(2)
        output_rpm = input_rpm / self.gear_ratio

        oil_temp = 65.0 + self._noise(0.8) + self._sine(0.008, 3)
        oil_pressure = 4.2 + self._noise(0.1) + self._sine(0.02, 0.1)

        g1_vib = 3.1 + self._noise(0.4)
        g1_temp = 52.0 + self._noise(0.6)
        g2_vib = 3.4 + self._noise(0.4)
        g2_temp = 55.0 + self._noise(0.6)

        if f.current_fault == "gear_wear":
            g1_vib += 14 * f.fault_severity
            g2_vib += 16 * f.fault_severity
            g1_temp += 20 * f.fault_severity
            g2_temp += 22 * f.fault_severity
            oil_temp += 15 * f.fault_severity
        elif f.current_fault == "bearing_wear":
            g1_vib += 9 * f.fault_severity
            g1_temp += 18 * f.fault_severity
        elif f.current_fault == "misalignment":
            g1_vib += 7 * f.fault_severity
            g2_vib += 11 * f.fault_severity

        return {
            "asset_id": self.asset_id,
            "asset_type": self.asset_type,
            "timestamp": time.time(),
            "health_score": self.health_score(),
            "fault_type": f.current_fault,
            "sensors": {
                "input_rpm": round(max(0, input_rpm), 1),
                "output_rpm": round(max(0, output_rpm), 1),
                "gear_ratio": self.gear_ratio,
                "oil_temperature_c": round(max(30, oil_temp), 1),
                "oil_pressure_bar": round(max(0, oil_pressure), 2),
                "G1": {
                    "label": "Gearbox Input Bearing",
                    "vibration_rms": round(max(0, g1_vib), 3),
                    "temperature_c": round(max(20, g1_temp), 1),
                    "vibration_x": round(g1_vib * 0.65 + self._noise(0.15), 3),
                    "vibration_y": round(g1_vib * 0.5 + self._noise(0.15), 3),
                    "vibration_z": round(g1_vib * 0.9 + self._noise(0.15), 3),
                },
                "G2": {
                    "label": "Gearbox Output Bearing",
                    "vibration_rms": round(max(0, g2_vib), 3),
                    "temperature_c": round(max(20, g2_temp), 1),
                    "vibration_x": round(g2_vib * 0.7 + self._noise(0.15), 3),
                    "vibration_y": round(g2_vib * 0.55 + self._noise(0.15), 3),
                    "vibration_z": round(g2_vib * 0.85 + self._noise(0.15), 3),
                },
            }
        }


# ─────────────────────────── Compressor ─────────────────────────────────────

class Compressor(Equipment):
    """Simulates a centrifugal compressor with C1 (DE) and C2 (NDE) sensors."""

    def __init__(self):
        super().__init__("COMPRESSOR_01", "COMPRESSOR", nominal_rpm=462.5)  # after gear ratio

    def read(self) -> dict:
        self.tick()
        f = self.fault

        rpm = self.nominal_rpm + self._sine(0.05, 3) + self._noise(2)
        suction_pressure = 2.1 + self._noise(0.05) + self._sine(0.02, 0.08)
        discharge_pressure = 12.5 + self._noise(0.2) + self._sine(0.015, 0.3)
        flow_rate = 850.0 + self._noise(10) + self._sine(0.03, 20)
        gas_temp = 38.0 + self._noise(0.5) + self._sine(0.01, 2)

        c1_vib = 3.8 + self._noise(0.5)
        c1_temp = 58.0 + self._noise(0.7)
        c2_vib = 3.5 + self._noise(0.5)
        c2_temp = 55.0 + self._noise(0.7)

        cp1_vib = 2.9 + self._noise(0.4)
        cp1_temp = 50.0 + self._noise(0.6)
        cp2_vib = 3.1 + self._noise(0.4)
        cp2_temp = 52.0 + self._noise(0.6)

        if f.current_fault == "cavitation":
            c1_vib += 18 * f.fault_severity
            c2_vib += 15 * f.fault_severity
            c1_temp += 12 * f.fault_severity
            discharge_pressure -= 2.0 * f.fault_severity
            flow_rate -= 150 * f.fault_severity
        elif f.current_fault == "bearing_wear":
            c1_vib += 11 * f.fault_severity
            c1_temp += 20 * f.fault_severity
            cp1_vib += 8 * f.fault_severity
        elif f.current_fault == "imbalance":
            c1_vib += 12 * f.fault_severity
            c2_vib += 12 * f.fault_severity
            cp1_vib += 9 * f.fault_severity
            cp2_vib += 9 * f.fault_severity
        elif f.current_fault == "misalignment":
            cp1_vib += 10 * f.fault_severity
            cp2_vib += 13 * f.fault_severity
            c1_temp += 15 * f.fault_severity

        return {
            "asset_id": self.asset_id,
            "asset_type": self.asset_type,
            "timestamp": time.time(),
            "health_score": self.health_score(),
            "fault_type": f.current_fault,
            "sensors": {
                "rpm": round(max(0, rpm), 1),
                "suction_pressure_bar": round(max(0, suction_pressure), 3),
                "discharge_pressure_bar": round(max(0, discharge_pressure), 2),
                "flow_rate_m3h": round(max(0, flow_rate), 1),
                "gas_temperature_c": round(max(10, gas_temp), 1),
                "CP1": {
                    "label": "Coupling Sensor (Motor Side)",
                    "vibration_rms": round(max(0, cp1_vib), 3),
                    "temperature_c": round(max(20, cp1_temp), 1),
                },
                "CP2": {
                    "label": "Drive-End Sensor",
                    "vibration_rms": round(max(0, cp2_vib), 3),
                    "temperature_c": round(max(20, cp2_temp), 1),
                },
                "C1": {
                    "label": "Compressor DE Bearing",
                    "vibration_rms": round(max(0, c1_vib), 3),
                    "temperature_c": round(max(20, c1_temp), 1),
                    "vibration_x": round(c1_vib * 0.7 + self._noise(0.2), 3),
                    "vibration_y": round(c1_vib * 0.6 + self._noise(0.2), 3),
                    "vibration_z": round(c1_vib * 0.95 + self._noise(0.2), 3),
                },
                "C2": {
                    "label": "Compressor NDE Bearing",
                    "vibration_rms": round(max(0, c2_vib), 3),
                    "temperature_c": round(max(20, c2_temp), 1),
                    "vibration_x": round(c2_vib * 0.65 + self._noise(0.2), 3),
                    "vibration_y": round(c2_vib * 0.55 + self._noise(0.2), 3),
                    "vibration_z": round(c2_vib * 0.9 + self._noise(0.2), 3),
                },
            }
        }


# ─────────────────────────── Publisher ──────────────────────────────────────

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        log.info(f"Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
    else:
        log.error(f"MQTT connection failed with code {rc}")


def main():
    log.info("Lansub Equipment Simulator starting...")

    client = mqtt.Client(client_id="lansub_simulator")
    client.on_connect = on_connect

    # Set MQTT credentials if provided
    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASS)

    # Retry connection until broker is ready
    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            break
        except Exception as e:
            log.warning(f"Cannot connect to MQTT ({e}), retrying in 3s...")
            time.sleep(3)

    client.loop_start()

    motor = Motor()
    gearbox = Gearbox()
    compressor = Compressor()

    log.info("Simulation running. Publishing every 1s to MQTT topics:")
    log.info("  lansub/motor/01")
    log.info("  lansub/gearbox/01")
    log.info("  lansub/compressor/01")

    while True:
        try:
            t_start = time.time()

            for equipment, topic in [
                (motor, "lansub/motor/01"),
                (gearbox, "lansub/gearbox/01"),
                (compressor, "lansub/compressor/01"),
            ]:
                payload = equipment.read()
                client.publish(topic, json.dumps(payload), qos=1)

            # Small status log every 30 seconds
            if int(t_start) % 30 == 0:
                log.info(
                    f"Motor={motor.health_score()}% | "
                    f"Gearbox={gearbox.health_score()}% | "
                    f"Compressor={compressor.health_score()}%"
                )

            elapsed = time.time() - t_start
            sleep_time = max(0, PUBLISH_INTERVAL - elapsed)
            time.sleep(sleep_time)

        except Exception as e:
            log.error(f"Simulation error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
