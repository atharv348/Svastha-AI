from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split

try:
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover
    plt = None


TARGET_CANDIDATES = ["Outcome", "target", "Result", "label", "y"]


def infer_target_column(df: pd.DataFrame) -> str:
    for col in TARGET_CANDIDATES:
        if col in df.columns:
            return col
    return df.columns[-1]


def to_numeric_features(df: pd.DataFrame, target_col: str) -> tuple[pd.DataFrame, pd.Series]:
    y = df[target_col]
    x = df.drop(columns=[target_col])
    x = pd.get_dummies(x, drop_first=True)
    return x, y


def compute_metrics(model: Any, x_test: pd.DataFrame, y_test: pd.Series) -> dict[str, float | None]:
    y_pred = model.predict(x_test)

    metrics: dict[str, float | None] = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": None,
        "brier": None,
    }

    if hasattr(model, "predict_proba") and y_test.nunique() == 2:
        y_prob = model.predict_proba(x_test)[:, 1]
        metrics["roc_auc"] = float(roc_auc_score(y_test, y_prob))
        metrics["brier"] = float(brier_score_loss(y_test, y_prob))

    return metrics


def plot_graphified_report(results: dict[str, Any], out_path: Path) -> None:
    if plt is None:
        return

    datasets = list(results.keys())
    baseline_acc = [results[k]["baseline"]["accuracy"] for k in datasets]
    enhanced_acc = [results[k]["enhanced"]["accuracy"] for k in datasets]
    baseline_f1 = [results[k]["baseline"]["f1"] for k in datasets]
    enhanced_f1 = [results[k]["enhanced"]["f1"] for k in datasets]

    x = np.arange(len(datasets))
    width = 0.36

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    axes[0].bar(x - width / 2, baseline_acc, width, label="Baseline", color="#7aa6c2")
    axes[0].bar(x + width / 2, enhanced_acc, width, label="Enhanced", color="#1f5c7a")
    axes[0].set_title("Accuracy Comparison")
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(datasets)
    axes[0].set_ylim(0, 1.05)
    axes[0].grid(axis="y", alpha=0.25)
    axes[0].legend()

    axes[1].bar(x - width / 2, baseline_f1, width, label="Baseline", color="#f0a35a")
    axes[1].bar(x + width / 2, enhanced_f1, width, label="Enhanced", color="#c96a16")
    axes[1].set_title("F1 Score Comparison")
    axes[1].set_xticks(x)
    axes[1].set_xticklabels(datasets)
    axes[1].set_ylim(0, 1.05)
    axes[1].grid(axis="y", alpha=0.25)
    axes[1].legend()

    fig.suptitle("Graphify Reliability Report: Baseline vs Enhanced")
    fig.tight_layout()
    fig.savefig(out_path, dpi=180)
    plt.close(fig)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    data_dir = root / "data"
    models_dir = root / "models"
    reports_dir = root / "reports"

    models_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    datasets = {
        "diabetes": data_dir / "diabetes.csv",
        "hypertension": data_dir / "hypertension.csv",
        "anemia": data_dir / "anemia.csv",
    }

    report: dict[str, Any] = {}

    for name, csv_path in datasets.items():
        if not csv_path.exists():
            report[name] = {"error": f"Missing dataset: {csv_path}"}
            continue

        df = pd.read_csv(csv_path)
        target_col = infer_target_column(df)
        x, y = to_numeric_features(df, target_col)

        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )

        baseline = RandomForestClassifier(n_estimators=100, random_state=42)
        baseline.fit(x_train, y_train)
        baseline_metrics = compute_metrics(baseline, x_test, y_test)

        enhanced = RandomForestClassifier(random_state=42)
        param_grid = {
            "n_estimators": [150, 300],
            "max_depth": [None, 10, 16],
            "min_samples_leaf": [1, 2],
            "min_samples_split": [2, 4],
            "class_weight": [None, "balanced_subsample"],
        }
        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        search = GridSearchCV(
            estimator=enhanced,
            param_grid=param_grid,
            scoring="f1",
            cv=cv,
            n_jobs=-1,
        )
        search.fit(x_train, y_train)

        best_model = search.best_estimator_
        enhanced_metrics = compute_metrics(best_model, x_test, y_test)

        model_path = models_dir / f"{name}_enhanced_model.pkl"
        joblib.dump(best_model, model_path)

        improvements: dict[str, float | None] = {}
        for metric_name, base_val in baseline_metrics.items():
            new_val = enhanced_metrics.get(metric_name)
            if base_val is None or new_val is None:
                improvements[metric_name] = None
            else:
                improvements[metric_name] = float(new_val - base_val)

        report[name] = {
            "target_column": target_col,
            "rows": int(len(df)),
            "features": int(x.shape[1]),
            "baseline": baseline_metrics,
            "enhanced": enhanced_metrics,
            "improvement": improvements,
            "best_params": search.best_params_,
            "enhanced_model_path": str(model_path),
        }

    json_path = reports_dir / "reliability_graphify_report.json"
    png_path = reports_dir / "reliability_graphify_report.png"
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    valid_results = {
        k: v for k, v in report.items() if isinstance(v, dict) and "baseline" in v and "enhanced" in v
    }
    if valid_results:
        plot_graphified_report(valid_results, png_path)

    print(f"Reliability JSON report: {json_path}")
    if plt is None:
        print("matplotlib not available, PNG graph was not generated.")
    else:
        print(f"Reliability graph report: {png_path}")


if __name__ == "__main__":
    main()
