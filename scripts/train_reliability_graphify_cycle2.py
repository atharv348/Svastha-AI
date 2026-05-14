from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
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


def make_calibrated_model(estimator: RandomForestClassifier, method: str = "sigmoid") -> CalibratedClassifierCV:
    try:
        return CalibratedClassifierCV(estimator=estimator, method=method, cv=3)
    except TypeError:
        return CalibratedClassifierCV(base_estimator=estimator, method=method, cv=3)


def _float_delta(new_val: float | None, old_val: float | None) -> float | None:
    if new_val is None or old_val is None:
        return None
    return float(new_val - old_val)


def plot_cycle2_comparison(cycle1: dict[str, Any], cycle2: dict[str, Any], out_path: Path) -> None:
    if plt is None:
        return

    datasets = [name for name in cycle2.keys() if isinstance(cycle2[name], dict) and "strict_cycle2" in cycle2[name]]
    if not datasets:
        return

    cycle1_brier: list[float] = []
    cycle2_brier: list[float] = []
    cycle1_auc: list[float] = []
    cycle2_auc: list[float] = []

    for name in datasets:
        c1 = cycle1.get(name, {}).get("enhanced", {})
        c2 = cycle2.get(name, {}).get("strict_cycle2", {})

        cycle1_brier.append(float(c1.get("brier", np.nan)))
        cycle2_brier.append(float(c2.get("brier", np.nan)))
        cycle1_auc.append(float(c1.get("roc_auc", np.nan)))
        cycle2_auc.append(float(c2.get("roc_auc", np.nan)))

    x = np.arange(len(datasets))
    width = 0.36

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    axes[0].bar(x - width / 2, cycle1_brier, width, label="Cycle 1 Enhanced", color="#9aa5b1")
    axes[0].bar(x + width / 2, cycle2_brier, width, label="Cycle 2 Strict+Calibrated", color="#1f6f8b")
    axes[0].set_title("Brier Score (Lower is Better)")
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(datasets)
    axes[0].grid(axis="y", alpha=0.25)
    axes[0].legend()

    axes[1].bar(x - width / 2, cycle1_auc, width, label="Cycle 1 Enhanced", color="#b9a44c")
    axes[1].bar(x + width / 2, cycle2_auc, width, label="Cycle 2 Strict+Calibrated", color="#3b8f44")
    axes[1].set_title("ROC-AUC (Higher is Better)")
    axes[1].set_xticks(x)
    axes[1].set_xticklabels(datasets)
    axes[1].set_ylim(0, 1.05)
    axes[1].grid(axis="y", alpha=0.25)
    axes[1].legend()

    fig.suptitle("Graphify Cycle-2 Reliability Comparison")
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

    cycle1_path = reports_dir / "reliability_graphify_report.json"
    cycle1_report: dict[str, Any] = {}
    if cycle1_path.exists():
        cycle1_report = json.loads(cycle1_path.read_text(encoding="utf-8"))

    datasets = {
        "diabetes": data_dir / "diabetes.csv",
        "hypertension": data_dir / "hypertension.csv",
        "anemia": data_dir / "anemia.csv",
    }

    cycle2_report: dict[str, Any] = {}

    for name, csv_path in datasets.items():
        if not csv_path.exists():
            cycle2_report[name] = {"error": f"Missing dataset: {csv_path}"}
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

        strict_base = RandomForestClassifier(random_state=42)
        strict_param_grid = {
            "n_estimators": [200, 350],
            "max_depth": [None, 14],
            "min_samples_leaf": [1, 2, 4],
            "min_samples_split": [2, 4, 8],
            "class_weight": [None, "balanced_subsample"],
            "max_features": ["sqrt", "log2"],
        }
        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        search = GridSearchCV(
            estimator=strict_base,
            param_grid=strict_param_grid,
            scoring="neg_brier_score",
            cv=cv,
            n_jobs=-1,
        )
        search.fit(x_train, y_train)

        tuned_model = search.best_estimator_
        strict_model = make_calibrated_model(tuned_model, method="sigmoid")
        strict_model.fit(x_train, y_train)

        strict_metrics = compute_metrics(strict_model, x_test, y_test)
        cycle1_enhanced = cycle1_report.get(name, {}).get("enhanced", {})

        delta_vs_cycle1 = {
            metric: _float_delta(strict_metrics.get(metric), cycle1_enhanced.get(metric))
            for metric in ["accuracy", "precision", "recall", "f1", "roc_auc", "brier"]
        }

        model_path = models_dir / f"{name}_strict_calibrated_model.pkl"
        joblib.dump(strict_model, model_path)

        cycle2_report[name] = {
            "target_column": target_col,
            "rows": int(len(df)),
            "features": int(x.shape[1]),
            "cycle1_enhanced": cycle1_enhanced,
            "strict_cycle2": strict_metrics,
            "delta_vs_cycle1_enhanced": delta_vs_cycle1,
            "strict_best_params": search.best_params_,
            "calibration_method": "sigmoid",
            "strict_model_path": str(model_path),
        }

    out_json = reports_dir / "reliability_graphify_cycle2_report.json"
    out_png = reports_dir / "reliability_graphify_cycle2_comparison.png"

    out_json.write_text(json.dumps(cycle2_report, indent=2), encoding="utf-8")
    plot_cycle2_comparison(cycle1=cycle1_report, cycle2=cycle2_report, out_path=out_png)

    print(f"Cycle-2 reliability JSON report: {out_json}")
    if plt is None:
        print("matplotlib not available, PNG graph was not generated.")
    else:
        print(f"Cycle-2 comparison graph: {out_png}")


if __name__ == "__main__":
    main()
