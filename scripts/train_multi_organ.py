from __future__ import annotations

import argparse
from pathlib import Path
import sys

from sklearn.model_selection import train_test_split

# Make backend modules importable when script runs from project root.
ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from ai_models.multi_organ_cnn import (
    MultiOrganDiagnosticModel,
    TrainingConfig,
    create_data_loader,
)


def collect_image_paths(data_dir: Path) -> tuple[list[Path], list[int], list[str]]:
    class_dirs = sorted([p for p in data_dir.iterdir() if p.is_dir()])
    class_names = [p.name for p in class_dirs]

    image_paths: list[Path] = []
    labels: list[int] = []

    for idx, class_dir in enumerate(class_dirs):
        for file_path in class_dir.rglob("*"):
            if file_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
                image_paths.append(file_path)
                labels.append(idx)

    return image_paths, labels, class_names


def main() -> None:
    parser = argparse.ArgumentParser(description="Train multi-organ CNN model")
    parser.add_argument("--organ", required=True, help="Organ type: skin, eye, oral, lung, bone, xray")
    parser.add_argument("--data-dir", required=True, help="Directory with class subfolders")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--checkpoint-dir", default="models")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")

    image_paths, labels, class_names = collect_image_paths(data_dir)
    if not image_paths:
        raise ValueError("No images found under data directory")

    train_paths, val_paths, train_labels, val_labels = train_test_split(
        image_paths,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    train_loader = create_data_loader(
        image_paths=train_paths,
        labels=train_labels,
        organ_type=args.organ,
        mode="train",
        batch_size=args.batch_size,
        use_weighted_sampler=True,
    )
    val_loader = create_data_loader(
        image_paths=val_paths,
        labels=val_labels,
        organ_type=args.organ,
        mode="eval",
        batch_size=args.batch_size,
    )

    model = MultiOrganDiagnosticModel(
        organ_type=args.organ,
        num_classes=len(class_names),
        class_names=class_names,
    )

    config = TrainingConfig(
        epochs=args.epochs,
        learning_rate=args.lr,
        checkpoint_dir=args.checkpoint_dir,
    )

    best_val_acc = model.train_model(train_loader=train_loader, val_loader=val_loader, config=config)
    print(f"Best validation accuracy: {best_val_acc:.2f}%")


if __name__ == "__main__":
    main()
