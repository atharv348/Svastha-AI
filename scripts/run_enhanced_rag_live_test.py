from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

import requests


def call(
    session: requests.Session,
    method: str,
    url: str,
    timeout_sec: int,
    **kwargs: Any,
) -> dict[str, Any]:
    start = time.perf_counter()
    try:
        response = session.request(method=method, url=url, timeout=timeout_sec, **kwargs)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        try:
            payload = response.json()
        except Exception:
            payload = {"raw": response.text[:1000]}

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


def extract_ids_from_disease_payload(payload: Any) -> list[int]:
    ids: list[int] = []
    if not isinstance(payload, dict):
        return ids

    for _, items in payload.items():
        if not isinstance(items, list):
            continue
        for row in items:
            if isinstance(row, dict) and isinstance(row.get("id"), int):
                ids.append(row["id"])

    return ids


def extract_ids_from_symptoms_payload(payload: Any) -> list[int]:
    ids: list[int] = []
    if not isinstance(payload, list):
        return ids

    for row in payload:
        if isinstance(row, dict) and isinstance(row.get("id"), int):
            ids.append(row["id"])

    return ids


def main() -> None:
    parser = argparse.ArgumentParser(description="Run full RAG (non-fallback) live test against enhanced endpoints")
    parser.add_argument("--base-url", default="http://127.0.0.1:8002")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="admin123")
    parser.add_argument("--timeout-sec", type=int, default=240)
    parser.add_argument("--out", default="reports/enhanced_rag_live_report.json")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    out_path = (root / args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    report: dict[str, Any] = {
        "base_url": args.base_url,
        "mode": "full_rag_non_fallback_requested",
        "steps": {},
    }

    report["steps"]["login"] = call(
        session,
        "POST",
        f"{args.base_url}/token",
        timeout_sec=args.timeout_sec,
        data={"username": args.username, "password": args.password},
    )

    if not report["steps"]["login"].get("ok"):
        out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Login failed. Report: {out_path}")
        sys.exit(1)

    token = report["steps"]["login"].get("payload", {}).get("access_token")
    if not token:
        out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Token missing. Report: {out_path}")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}

    report["steps"]["seed_catalog"] = call(
        session,
        "POST",
        f"{args.base_url}/enhanced/catalog/seed",
        timeout_sec=args.timeout_sec,
        headers=headers,
    )

    report["steps"]["get_diseases"] = call(
        session,
        "GET",
        f"{args.base_url}/enhanced/diseases",
        timeout_sec=args.timeout_sec,
        headers=headers,
    )
    report["steps"]["get_symptoms"] = call(
        session,
        "GET",
        f"{args.base_url}/enhanced/symptoms",
        timeout_sec=args.timeout_sec,
        headers=headers,
    )

    disease_ids = extract_ids_from_disease_payload(report["steps"]["get_diseases"].get("payload"))
    symptom_ids = extract_ids_from_symptoms_payload(report["steps"]["get_symptoms"].get("payload"))

    report["steps"]["diagnose"] = call(
        session,
        "POST",
        f"{args.base_url}/enhanced/diagnose",
        timeout_sec=args.timeout_sec,
        headers={**headers, "Content-Type": "application/json"},
        json={
            "selected_diseases": disease_ids[:2],
            "symptoms": symptom_ids[:3],
            "symptom_labels": ["fatigue", "mild dizziness"],
            "severity": "moderate",
            "patient_info": {
                "age": 34,
                "gender": "male",
                "location": "Delhi",
                "medical_history": "none",
                "allergies": ["none"],
            },
        },
    )

    report["steps"]["medicine_recommendations"] = call(
        session,
        "POST",
        f"{args.base_url}/enhanced/medicines/recommendations",
        timeout_sec=args.timeout_sec,
        headers={**headers, "Content-Type": "application/json"},
        json={
            "diagnosis": "viral fever with headache",
            "patient_age": 34,
            "is_pregnant": False,
            "allergies": ["none"],
            "disease_ids": disease_ids[:1],
        },
    )

    diagnose_text = ""
    if report["steps"]["diagnose"].get("ok"):
        diagnose_text = (
            report["steps"]["diagnose"]
            .get("payload", {})
            .get("diagnosis", {})
            .get("diagnosis", "")
        )

    meds_text = ""
    if report["steps"]["medicine_recommendations"].get("ok"):
        meds_text = report["steps"]["medicine_recommendations"].get("payload", {}).get("ai_recommendations", "")

    fallback_detected = "fallback" in diagnose_text.lower() or "fallback" in meds_text.lower()

    passed = [name for name, step in report["steps"].items() if step.get("ok")]
    failed = [name for name, step in report["steps"].items() if not step.get("ok")]

    report["overall"] = {
        "total_steps": len(report["steps"]),
        "passed_count": len(passed),
        "failed_count": len(failed),
        "passed_steps": passed,
        "failed_steps": failed,
        "fallback_detected": fallback_detected,
    }

    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"RAG live test report: {out_path}")
    if failed:
        print(f"Failed steps: {failed}")
        sys.exit(1)
    if fallback_detected:
        print("Fallback content detected in response payload.")
        sys.exit(2)

    print("Full RAG non-fallback live test passed.")


if __name__ == "__main__":
    main()
