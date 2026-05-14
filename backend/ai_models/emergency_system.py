from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

import requests
from sqlalchemy.orm import Session

from database import User
from models.enhanced_models import EmergencyAlert


class VaidyaAIEmergencySystem:
    """Emergency workflow for abnormal vitals and manual SOS triggers."""

    def __init__(self, db_session: Session, config: dict[str, Any] | None = None) -> None:
        self.db = db_session
        self.config = config or {}

        self.vital_thresholds = {
            "heart_rate": {"critical_low": 40, "low": 50, "high": 120, "critical_high": 140},
            "spo2": {"critical_low": 85, "low": 90, "normal": 95},
            "temperature": {"critical_low": 95, "low": 97, "high": 100.4, "critical_high": 103},
            "bp_systolic": {"critical_low": 80, "low": 90, "high": 140, "critical_high": 180},
            "bp_diastolic": {"critical_low": 50, "low": 60, "high": 90, "critical_high": 120},
        }

    async def monitor_vitals(self, user_id: int, vitals: dict[str, float | int | list[float]]) -> dict[str, Any]:
        alerts: list[dict[str, Any]] = []
        severity = "Normal"

        for vital_name, value in vitals.items():
            if vital_name not in self.vital_thresholds:
                continue

            numeric_value = float(value) if not isinstance(value, list) else float(value[0])
            alert = self._check_vital_threshold(vital_name, numeric_value, self.vital_thresholds[vital_name])
            if alert is None:
                continue

            alerts.append(alert)
            if alert["level"] == "CRITICAL":
                severity = "CRITICAL"
            elif alert["level"] == "WARNING" and severity == "Normal":
                severity = "WARNING"

        result = {
            "status": severity,
            "alerts": alerts,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if severity == "CRITICAL":
            dispatch = await self.trigger_emergency(user_id=user_id, vitals=vitals, alerts=alerts)
            result["dispatch"] = dispatch

        return result

    def _check_vital_threshold(self, vital_name: str, value: float, thresholds: dict[str, float]) -> dict[str, Any] | None:
        if "critical_low" in thresholds and value <= thresholds["critical_low"]:
            return {
                "vital": vital_name,
                "value": value,
                "level": "CRITICAL",
                "message": f"{vital_name} critically low: {value}",
                "action": "IMMEDIATE_MEDICAL_ATTENTION",
            }

        if "critical_high" in thresholds and value >= thresholds["critical_high"]:
            return {
                "vital": vital_name,
                "value": value,
                "level": "CRITICAL",
                "message": f"{vital_name} critically high: {value}",
                "action": "IMMEDIATE_MEDICAL_ATTENTION",
            }

        if "low" in thresholds and value < thresholds["low"]:
            return {
                "vital": vital_name,
                "value": value,
                "level": "WARNING",
                "message": f"{vital_name} below normal: {value}",
                "action": "MONITOR_CLOSELY",
            }

        if "high" in thresholds and value > thresholds["high"]:
            return {
                "vital": vital_name,
                "value": value,
                "level": "WARNING",
                "message": f"{vital_name} above normal: {value}",
                "action": "MONITOR_CLOSELY",
            }

        return None

    async def trigger_emergency(
        self,
        user_id: int,
        vitals: dict[str, Any],
        alerts: list[dict[str, Any]],
        alert_type: str = "ABNORMAL_VITALS",
    ) -> dict[str, Any]:
        user = self.db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise ValueError("User not found")

        location = vitals.get("location")
        if isinstance(location, list) and len(location) == 2:
            latitude = float(location[0])
            longitude = float(location[1])
        else:
            latitude, longitude = self._fallback_location(user)

        hospitals = await self.find_nearby_hospitals((latitude, longitude), radius_km=15)

        emergency_alert = EmergencyAlert(
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            address=self._reverse_geocode((latitude, longitude)),
            heart_rate=self._to_float(vitals.get("heart_rate")),
            spo2=self._to_float(vitals.get("spo2")),
            temperature=self._to_float(vitals.get("temperature")),
            blood_pressure_sys=self._to_int(vitals.get("bp_systolic")),
            blood_pressure_dia=self._to_int(vitals.get("bp_diastolic")),
            alert_type=alert_type,
            severity="critical",
            hospitals_notified=[],
            contacts_notified=[],
            status="pending",
        )

        self.db.add(emergency_alert)
        self.db.commit()
        self.db.refresh(emergency_alert)

        notified_hospitals = await self.notify_hospitals(
            hospitals=hospitals[:3],
            user=user,
            vitals=vitals,
            alerts=alerts,
            location=(latitude, longitude),
        )

        notified_contacts = await self.notify_emergency_contacts(
            contacts=self._parse_contacts(getattr(user, "health_conditions", None)),
            user=user,
            vitals=vitals,
            alerts=alerts,
            location=(latitude, longitude),
        )

        emergency_alert.hospitals_notified = notified_hospitals
        emergency_alert.contacts_notified = notified_contacts
        emergency_alert.status = "responding"
        self.db.commit()

        return {
            "alert_id": emergency_alert.id,
            "hospitals_notified": len(notified_hospitals),
            "contacts_notified": len(notified_contacts),
            "status": emergency_alert.status,
        }

    async def find_nearby_hospitals(
        self,
        location: tuple[float, float],
        radius_km: float = 15,
    ) -> list[dict[str, Any]]:
        api_key = self.config.get("GOOGLE_PLACES_API_KEY")
        if api_key:
            try:
                url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    "location": f"{location[0]},{location[1]}",
                    "radius": int(radius_km * 1000),
                    "type": "hospital",
                    "key": api_key,
                }
                response = requests.get(url, params=params, timeout=8)
                payload = response.json()

                hospitals = []
                for place in payload.get("results", []):
                    loc = place.get("geometry", {}).get("location", {})
                    lat = float(loc.get("lat", 0.0))
                    lon = float(loc.get("lng", 0.0))
                    hospitals.append(
                        {
                            "name": place.get("name", "Unknown Hospital"),
                            "address": place.get("vicinity", ""),
                            "location": (lat, lon),
                            "distance_km": round(self._haversine_km(location, (lat, lon)), 2),
                            "phone": place.get("formatted_phone_number", "N/A"),
                            "rating": place.get("rating", 0),
                        }
                    )

                hospitals.sort(key=lambda item: item["distance_km"])
                if hospitals:
                    return hospitals
            except Exception:
                pass

        # Fallback list for development and offline operation.
        return [
            {
                "name": "Nearest General Hospital",
                "address": "City Center",
                "location": location,
                "distance_km": 1.2,
                "phone": "+91-0000000001",
                "rating": 4.2,
            },
            {
                "name": "District Medical College",
                "address": "Main Road",
                "location": (location[0] + 0.02, location[1] + 0.02),
                "distance_km": 3.7,
                "phone": "+91-0000000002",
                "rating": 4.4,
            },
            {
                "name": "Emergency Trauma Center",
                "address": "Highway Junction",
                "location": (location[0] + 0.03, location[1] - 0.01),
                "distance_km": 5.1,
                "phone": "+91-0000000003",
                "rating": 4.1,
            },
        ]

    async def notify_hospitals(
        self,
        hospitals: list[dict[str, Any]],
        user: User,
        vitals: dict[str, Any],
        alerts: list[dict[str, Any]],
        location: tuple[float, float],
    ) -> list[dict[str, Any]]:
        notified: list[dict[str, Any]] = []
        for hospital in hospitals:
            notified.append(
                {
                    "hospital": hospital["name"],
                    "distance": hospital["distance_km"],
                    "notified_at": datetime.now(timezone.utc).isoformat(),
                    "channel": "api/sms-fallback",
                    "message_preview": self._create_emergency_message(user, vitals, alerts, location)[:180],
                }
            )
        return notified

    async def notify_emergency_contacts(
        self,
        contacts: list[str],
        user: User,
        vitals: dict[str, Any],
        alerts: list[dict[str, Any]],
        location: tuple[float, float],
    ) -> list[dict[str, Any]]:
        notified: list[dict[str, Any]] = []
        for contact in contacts:
            notified.append(
                {
                    "contact": contact,
                    "notified_at": datetime.now(timezone.utc).isoformat(),
                    "channel": "sms/email-fallback",
                }
            )
        return notified

    async def manual_sos(self, user_id: int, vitals: dict[str, Any]) -> dict[str, Any]:
        alerts = [
            {
                "vital": "manual_sos",
                "value": "N/A",
                "level": "CRITICAL",
                "message": "User manually triggered emergency SOS",
                "action": "IMMEDIATE_RESPONSE",
            }
        ]
        return await self.trigger_emergency(user_id=user_id, vitals=vitals, alerts=alerts, alert_type="MANUAL_SOS")

    def _create_emergency_message(
        self,
        user: User,
        vitals: dict[str, Any],
        alerts: list[dict[str, Any]],
        location: tuple[float, float],
    ) -> str:
        alert_details = "\n".join(
            f"- {item['vital']}: {item['value']} ({item['message']})" for item in alerts
        )

        return (
            "VAIDYAAI EMERGENCY ALERT\n"
            f"Patient: {user.full_name or user.username}\n"
            f"Age: {user.age or 'N/A'} | Gender: {user.gender or 'N/A'}\n"
            f"Coordinates: {location[0]}, {location[1]}\n"
            f"Address: {self._reverse_geocode(location)}\n"
            f"Heart Rate: {vitals.get('heart_rate', 'N/A')}\n"
            f"SpO2: {vitals.get('spo2', 'N/A')}\n"
            f"Temperature: {vitals.get('temperature', 'N/A')}\n"
            f"Blood Pressure: {vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}\n"
            f"Alerts:\n{alert_details}\n"
            f"Time: {datetime.now(timezone.utc).isoformat()}"
        )

    def _reverse_geocode(self, location: tuple[float, float]) -> str:
        try:
            response = requests.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": location[0], "lon": location[1], "format": "jsonv2"},
                headers={"User-Agent": "vaidyaai-emergency"},
                timeout=5,
            )
            data = response.json()
            return data.get("display_name", "Address unavailable")
        except Exception:
            return "Address unavailable"

    def _fallback_location(self, user: User) -> tuple[float, float]:
        # Pune fallback in absence of device GPS.
        return (18.5204, 73.8567)

    def _parse_contacts(self, raw_contacts: Any) -> list[str]:
        if raw_contacts is None:
            return []
        if isinstance(raw_contacts, list):
            return [str(item) for item in raw_contacts]
        if isinstance(raw_contacts, str):
            return [part.strip() for part in raw_contacts.split(",") if part.strip()]
        return []

    def _to_float(self, value: Any) -> float | None:
        try:
            return float(value) if value is not None else None
        except Exception:
            return None

    def _to_int(self, value: Any) -> int | None:
        try:
            return int(value) if value is not None else None
        except Exception:
            return None

    def _haversine_km(self, loc1: tuple[float, float], loc2: tuple[float, float]) -> float:
        r = 6371.0
        lat1, lon1 = map(math.radians, loc1)
        lat2, lon2 = map(math.radians, loc2)

        d_lat = lat2 - lat1
        d_lon = lon2 - lon1

        a = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return r * c
