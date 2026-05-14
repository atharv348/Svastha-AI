from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

import requests


def call_endpoint(
    session: requests.Session,
    method: str,
    url: str,
    **kwargs: Any,
) -> dict[str, Any]:
    start = time.perf_counter()
    try:
        response = session.request(method=method, url=url, timeout=30, **kwargs)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        try:
            payload = response.json()
        except Exception:
            payload = {"raw": response.text[:800]}

        return {
            "ok": response.ok,
            "status_code": response.status_code,
            "elapsed_ms": elapsed_ms,
            "payload": payload,
        }
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "ok": False,
            "status_code": None,
            "elapsed_ms": elapsed_ms,
            "error": str(exc),
        }


def extract_ids_from_diseases(payload: Any) -> list[int]:
    ids: list[int] = []
    if not isinstance(payload, dict):
        return ids

    for _, diseases in payload.items():
        if not isinstance(diseases, list):
            continue
        for row in diseases:
            if isinstance(row, dict) and isinstance(row.get("id"), int):
                ids.append(row["id"])

    return ids


def extract_ids_from_symptoms(payload: Any) -> list[int]:
    ids: list[int] = []
    if not isinstance(payload, list):
        return ids

    for row in payload:
        if isinstance(row, dict) and isinstance(row.get("id"), int):
            ids.append(row["id"])

    return ids


def main() -> None:
    parser = argparse.ArgumentParser(description="Run authenticated smoke tests for enhanced SvasthaAI routes")
    parser.add_argument("--base-url", default="http://127.0.0.1:8002", help="Base API URL")
    parser.add_argument("--username", default="admin", help="Login username")
    parser.add_argument("--password", default="admin123", help="Login password")
    parser.add_argument(
        "--out",
        default="reports/enhanced_smoke_report.json",
        help="Path (relative to project root) for JSON report",
    )
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parents[1]
    report_path = (root_dir / args.out).resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    summary: dict[str, Any] = {
        "base_url": args.base_url,
        "username": args.username,
        "steps": {},
    }

    login_result = call_endpoint(
        session,
        "POST",
        f"{args.base_url}/token",
        data={"username": args.username, "password": args.password},
    )
    summary["steps"]["login"] = login_result

    if not login_result["ok"]:
        report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print("Login failed. Smoke test aborted.")
        print(f"Report: {report_path}")
        sys.exit(1)

    token = login_result.get("payload", {}).get("access_token")
    if not token:
        report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print("No access token returned. Smoke test aborted.")
        print(f"Report: {report_path}")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}

    summary["steps"]["seed_catalog"] = call_endpoint(
        session,
        "POST",
        f"{args.base_url}/enhanced/catalog/seed",
        headers=headers,
    )

    diseases_result = call_endpoint(session, "GET", f"{args.base_url}/enhanced/diseases", headers=headers)
    symptoms_result = call_endpoint(session, "GET", f"{args.base_url}/enhanced/symptoms", headers=headers)
    summary["steps"]["get_diseases"] = diseases_result
    summary["steps"]["get_symptoms"] = symptoms_result

    disease_ids = extract_ids_from_diseases(diseases_result.get("payload"))
    symptom_ids = extract_ids_from_symptoms(symptoms_result.get("payload"))

    diagnose_payload = {
        "selected_diseases": disease_ids[:2],
        "symptoms": symptom_ids[:3],
        "symptom_labels": ["fatigue"],
        "severity": "moderate",
        "patient_info": {"age": 28, "gender": "female", "notes": "smoke-test"},
    }
    summary["steps"]["diagnose"] = call_endpoint(
        session,
        "POST",
        f"{args.base_url}/enhanced/diagnose",
        headers={**headers, "Content-Type": "application/json"},
        json=diagnose_payload,
    )

    summary["steps"]["medicine_recommendations"] = call_endpoint(
        session,
        "POST",
        f"{args.base_url}/enhanced/medicines/recommendations",
        headers={**headers, "Content-Type": "application/json"},
        json={
            "diagnosis": "Viral fever with headache",
            "patient_age": 28,
            "is_pregnant": False,
            "allergies": ["penicillin"],
            "disease_ids": disease_ids[:1],
        },
    )

    summary["steps"]["emergency_alert"] = call_endpoint(
        session,
        "POST",
        f"{args.base_url}/enhanced/emergency/alert",
        headers={**headers, "Content-Type": "application/json"},
        json={
            "trigger_type": "ABNORMAL_VITALS",
            "vitals": {
                "heart_rate": 132,
                "spo2": 88,
                "systolic_bp": 172,
                "diastolic_bp": 106,
                "latitude": 28.6139,
                "longitude": 77.209,
            },
        },
    )

    summary["steps"]["diagnostic_history"] = call_endpoint(
        session,
        "GET",
        f"{args.base_url}/enhanced/diagnostic/history",
        headers=headers,
    )
    summary["steps"]["emergency_history"] = call_endpoint(
        session,
        "GET",
        f"{args.base_url}/enhanced/emergency/history",
        headers=headers,
    )

    statuses = {
        name: result.get("status_code")
        for name, result in summary["steps"].items()
    }
    passed = [name for name, result in summary["steps"].items() if result.get("ok")]
    failed = [name for name, result in summary["steps"].items() if not result.get("ok")]

    summary["overall"] = {
        "total_steps": len(summary["steps"]),
        "passed_count": len(passed),
        "failed_count": len(failed),
        "passed_steps": passed,
        "failed_steps": failed,
        "status_codes": statuses,
    }

    report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("Enhanced API smoke test completed")
    print(f"Passed: {len(passed)} / {len(summary['steps'])}")
    print(f"Failed: {len(failed)}")
    print(f"Report: {report_path}")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
