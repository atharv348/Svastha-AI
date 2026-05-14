from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any

import requests


def percentile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return float(sorted_values[0])

    pos = (len(sorted_values) - 1) * q
    low = int(pos)
    high = min(low + 1, len(sorted_values) - 1)
    frac = pos - low
    return float(sorted_values[low] * (1 - frac) + sorted_values[high] * frac)


def wait_for_health(base_url: str, timeout_sec: int) -> bool:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            if response.ok:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def start_server(
    python_exe: str,
    backend_dir: Path,
    host: str,
    port: int,
    enable_enhanced_rag: bool,
    knowledge_path: str,
) -> subprocess.Popen[Any]:
    env = os.environ.copy()
    env["ENABLE_ENHANCED_RAG"] = "true" if enable_enhanced_rag else "false"
    env["MEDICAL_KNOWLEDGE_PATH"] = knowledge_path

    cmd = [python_exe, "-m", "uvicorn", "main:app", "--host", host, "--port", str(port)]
    return subprocess.Popen(
        cmd,
        cwd=str(backend_dir),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def stop_server(proc: subprocess.Popen[Any]) -> None:
    if proc.poll() is not None:
        return

    proc.terminate()
    try:
        proc.wait(timeout=20)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=10)


def run_live_test(
    python_exe: str,
    root: Path,
    base_url: str,
    username: str,
    password: str,
    timeout_sec: int,
    out_path: Path,
) -> dict[str, Any]:
    script_path = root / "scripts" / "run_enhanced_rag_live_test.py"
    cmd = [
        python_exe,
        str(script_path),
        "--base-url",
        base_url,
        "--username",
        username,
        "--password",
        password,
        "--timeout-sec",
        str(timeout_sec),
        "--out",
        str(out_path.relative_to(root).as_posix()),
    ]

    run = subprocess.run(cmd, cwd=str(root), capture_output=True, text=True)

    report: dict[str, Any] = {}
    if out_path.exists():
        report = json.loads(out_path.read_text(encoding="utf-8"))

    step_latencies: dict[str, float] = {}
    total_elapsed_ms = 0.0
    for step_name, step_data in report.get("steps", {}).items():
        elapsed = step_data.get("elapsed_ms")
        if isinstance(elapsed, (int, float)):
            elapsed_value = float(elapsed)
            step_latencies[step_name] = elapsed_value
            total_elapsed_ms += elapsed_value

    return {
        "exit_code": run.returncode,
        "stdout": run.stdout[-4000:],
        "stderr": run.stderr[-4000:],
        "report": report,
        "step_latencies": step_latencies,
        "total_elapsed_ms": round(total_elapsed_ms, 2),
    }


def summarize_mode(
    mode_name: str,
    enable_enhanced_rag: bool,
    expected_fallback_detected: bool,
    runs: list[dict[str, Any]],
) -> dict[str, Any]:
    passed_runs = 0
    totals: list[float] = []
    step_map: dict[str, list[float]] = {}

    summarized_runs: list[dict[str, Any]] = []

    for idx, run in enumerate(runs, start=1):
        report = run.get("report", {})
        overall = report.get("overall", {})
        failed_count = overall.get("failed_count")
        fallback_detected = overall.get("fallback_detected")

        mode_pass = (
            failed_count == 0
            and isinstance(fallback_detected, bool)
            and fallback_detected == expected_fallback_detected
        )

        if mode_pass:
            passed_runs += 1

        total_elapsed_ms = float(run.get("total_elapsed_ms", 0.0))
        totals.append(total_elapsed_ms)

        for step_name, step_value in run.get("step_latencies", {}).items():
            step_map.setdefault(step_name, []).append(float(step_value))

        summarized_runs.append(
            {
                "iteration": idx,
                "pass": mode_pass,
                "exit_code": run.get("exit_code"),
                "failed_count": failed_count,
                "fallback_detected": fallback_detected,
                "total_elapsed_ms": total_elapsed_ms,
                "report_path": report.get("_benchmark_report_path"),
            }
        )

    step_summary: dict[str, dict[str, float | None]] = {}
    for step_name, values in step_map.items():
        step_summary[step_name] = {
            "avg_ms": round(mean(values), 2),
            "p50_ms": round(percentile(values, 0.50) or 0.0, 2),
            "p95_ms": round(percentile(values, 0.95) or 0.0, 2),
        }

    iterations = len(runs)
    return {
        "mode": mode_name,
        "enable_enhanced_rag": enable_enhanced_rag,
        "expected_fallback_detected": expected_fallback_detected,
        "iterations": iterations,
        "passed_runs": passed_runs,
        "success_rate": round((passed_runs / iterations) if iterations else 0.0, 4),
        "avg_total_elapsed_ms": round(mean(totals), 2) if totals else None,
        "p50_total_elapsed_ms": round(percentile(totals, 0.50) or 0.0, 2) if totals else None,
        "p95_total_elapsed_ms": round(percentile(totals, 0.95) or 0.0, 2) if totals else None,
        "step_latency_summary_ms": step_summary,
        "runs": summarized_runs,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark fallback mode vs full RAG mode")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8002)
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="admin123")
    parser.add_argument("--iterations", type=int, default=2)
    parser.add_argument("--timeout-sec", type=int, default=240)
    parser.add_argument("--startup-timeout-sec", type=int, default=180)
    parser.add_argument("--python-exe", default=sys.executable)
    parser.add_argument("--knowledge-path", default="backend/data/medical_knowledge")
    parser.add_argument("--out", default="reports/rag_mode_benchmark_report.json")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    backend_dir = root / "backend"
    out_path = (root / args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    tmp_reports_dir = root / "reports" / "tmp_rag_benchmark"
    tmp_reports_dir.mkdir(parents=True, exist_ok=True)

    base_url = f"http://{args.host}:{args.port}"
    knowledge_path = str((root / args.knowledge_path).resolve())

    modes = [
        {
            "name": "fallback",
            "enable": False,
            "expected_fallback_detected": True,
        },
        {
            "name": "full_rag",
            "enable": True,
            "expected_fallback_detected": False,
        },
    ]

    mode_results: dict[str, Any] = {}

    for mode in modes:
        proc = start_server(
            python_exe=args.python_exe,
            backend_dir=backend_dir,
            host=args.host,
            port=args.port,
            enable_enhanced_rag=mode["enable"],
            knowledge_path=knowledge_path,
        )

        try:
            if not wait_for_health(base_url=base_url, timeout_sec=args.startup_timeout_sec):
                mode_results[mode["name"]] = {
                    "mode": mode["name"],
                    "error": "Server did not become healthy within startup timeout",
                }
                continue

            runs: list[dict[str, Any]] = []
            for idx in range(1, args.iterations + 1):
                iter_report_path = tmp_reports_dir / f"{mode['name']}_iter_{idx}.json"
                run = run_live_test(
                    python_exe=args.python_exe,
                    root=root,
                    base_url=base_url,
                    username=args.username,
                    password=args.password,
                    timeout_sec=args.timeout_sec,
                    out_path=iter_report_path,
                )
                if isinstance(run.get("report"), dict):
                    run["report"]["_benchmark_report_path"] = str(iter_report_path)
                runs.append(run)

            mode_results[mode["name"]] = summarize_mode(
                mode_name=mode["name"],
                enable_enhanced_rag=mode["enable"],
                expected_fallback_detected=mode["expected_fallback_detected"],
                runs=runs,
            )
        finally:
            stop_server(proc)

    benchmark_report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "host": args.host,
        "port": args.port,
        "iterations_per_mode": args.iterations,
        "knowledge_path": knowledge_path,
        "modes": mode_results,
    }
    out_path.write_text(json.dumps(benchmark_report, indent=2), encoding="utf-8")

    print(f"RAG benchmark report: {out_path}")
    fallback_success = mode_results.get("fallback", {}).get("success_rate")
    full_rag_success = mode_results.get("full_rag", {}).get("success_rate")
    print(f"Fallback success_rate: {fallback_success}")
    print(f"Full RAG success_rate: {full_rag_success}")


if __name__ == "__main__":
    main()