from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler


try:
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
except Exception:  # pragma: no cover - optional dependency at runtime
    A = None
    ToTensorV2 = None


try:
    import cv2
except Exception:  # pragma: no cover - optional dependency at runtime
    cv2 = None


try:
    import timm
except Exception:  # pragma: no cover - optional dependency at runtime
    timm = None


@dataclass
class TrainingConfig:
    epochs: int = 40
    learning_rate: float = 1e-4
    weight_decay: float = 1e-4
    patience: int = 8
    checkpoint_dir: str = "models"


class MedicalImageDataset(Dataset):
    """Medical image dataset with organ-aware augmentation."""

    def __init__(
        self,
        image_paths: Sequence[str | Path],
        labels: Sequence[int],
        organ_type: str = "general",
        mode: str = "train",
    ) -> None:
        if len(image_paths) != len(labels):
            raise ValueError("image_paths and labels must have the same length")

        self.image_paths = [Path(p) for p in image_paths]
        self.labels = list(labels)
        self.organ_type = organ_type.lower()
        self.mode = mode.lower()
        self.transforms = self._build_transforms()

    def _build_transforms(self):
        if A is None or ToTensorV2 is None:
            return None

        if self.mode == "train":
            if self.organ_type in {"xray", "lung", "bone"}:
                return A.Compose(
                    [
                        A.Resize(224, 224),
                        A.RandomRotate90(p=0.25),
                        A.CLAHE(p=0.35),
                        A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2, p=0.35),
                        A.GaussNoise(p=0.15),
                        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                        ToTensorV2(),
                    ]
                )

            if self.organ_type in {"skin", "oral"}:
                return A.Compose(
                    [
                        A.Resize(224, 224),
                        A.HorizontalFlip(p=0.5),
                        A.RandomRotate90(p=0.35),
                        A.HueSaturationValue(p=0.25),
                        A.RandomBrightnessContrast(p=0.3),
                        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                        ToTensorV2(),
                    ]
                )

            if self.organ_type == "eye":
                return A.Compose(
                    [
                        A.Resize(224, 224),
                        A.HorizontalFlip(p=0.5),
                        A.ColorJitter(p=0.25),
                        A.RandomBrightnessContrast(p=0.2),
                        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                        ToTensorV2(),
                    ]
                )

        return A.Compose(
            [
                A.Resize(224, 224),
                A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                ToTensorV2(),
            ]
        )

    def __len__(self) -> int:
        return len(self.image_paths)

    def _load_rgb_image(self, image_path: Path) -> np.ndarray:
        if cv2 is not None:
            image = cv2.imread(str(image_path))
            if image is None:
                raise FileNotFoundError(f"Unable to read image: {image_path}")
            return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        with Image.open(image_path) as pil_image:
            return np.array(pil_image.convert("RGB"))

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        image = self._load_rgb_image(self.image_paths[idx])

        if self.transforms is not None:
            transformed = self.transforms(image=image)
            image_tensor = transformed["image"]
        else:
            image_tensor = torch.from_numpy(image).permute(2, 0, 1).float() / 255.0

        return image_tensor, int(self.labels[idx])


class MultiOrganDiagnosticModel:
    """Unified CNN wrapper for multiple organ systems."""

    def __init__(
        self,
        organ_type: str,
        num_classes: int,
        device: str | None = None,
        class_names: Sequence[str] | None = None,
    ) -> None:
        self.organ_type = organ_type.lower()
        self.num_classes = num_classes
        self.class_names = list(class_names) if class_names is not None else []

        chosen_device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.device = torch.device(chosen_device)
        self.model = self._create_model().to(self.device)

    def _create_model(self) -> nn.Module:
        if timm is None:
            # Fallback path if timm is unavailable.
            from torchvision.models import resnet18

            model = resnet18(weights="DEFAULT")
            model.fc = nn.Linear(model.fc.in_features, self.num_classes)
            return model

        if self.organ_type in {"xray", "lung", "bone"}:
            return timm.create_model("densenet121", pretrained=True, num_classes=self.num_classes)
        if self.organ_type in {"skin", "oral"}:
            return timm.create_model("efficientnet_b3", pretrained=True, num_classes=self.num_classes)
        if self.organ_type == "eye":
            return timm.create_model("resnet50", pretrained=True, num_classes=self.num_classes)
        return timm.create_model("efficientnet_b0", pretrained=True, num_classes=self.num_classes)

    def _criterion(self, class_weights: torch.Tensor | None = None) -> nn.Module:
        if class_weights is not None:
            return nn.CrossEntropyLoss(weight=class_weights.to(self.device))
        return nn.CrossEntropyLoss()

    def train_model(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        config: TrainingConfig | None = None,
        class_weights: torch.Tensor | None = None,
    ) -> float:
        cfg = config or TrainingConfig()
        criterion = self._criterion(class_weights)

        optimizer = torch.optim.AdamW(
            [{"params": self.model.parameters(), "lr": cfg.learning_rate}],
            weight_decay=cfg.weight_decay,
        )
        scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2)

        use_amp = self.device.type == "cuda"
        scaler = torch.cuda.amp.GradScaler(enabled=use_amp)

        best_val_acc = 0.0
        patience_counter = 0

        checkpoint_dir = Path(cfg.checkpoint_dir)
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path = checkpoint_dir / f"{self.organ_type}_best_model.pth"

        for epoch in range(cfg.epochs):
            self.model.train()
            train_loss = 0.0
            train_correct = 0
            train_total = 0

            for images, labels in train_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)

                optimizer.zero_grad(set_to_none=True)

                with torch.cuda.amp.autocast(enabled=use_amp):
                    outputs = self.model(images)
                    loss = criterion(outputs, labels)

                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()

                train_loss += float(loss.item())
                predictions = torch.argmax(outputs, dim=1)
                train_total += labels.size(0)
                train_correct += int((predictions == labels).sum().item())

            val_acc, val_loss = self.evaluate(val_loader, criterion)

            print(
                f"Epoch {epoch + 1}/{cfg.epochs} | "
                f"Train Loss: {train_loss / max(len(train_loader), 1):.4f} | "
                f"Train Acc: {100 * train_correct / max(train_total, 1):.2f}% | "
                f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%"
            )

            if val_acc > best_val_acc:
                best_val_acc = val_acc
                torch.save(
                    {
                        "epoch": epoch,
                        "model_state_dict": self.model.state_dict(),
                        "optimizer_state_dict": optimizer.state_dict(),
                        "val_acc": val_acc,
                        "organ_type": self.organ_type,
                        "num_classes": self.num_classes,
                    },
                    checkpoint_path,
                )
                patience_counter = 0
                print(f"Saved improved checkpoint: {checkpoint_path}")
            else:
                patience_counter += 1

            if patience_counter >= cfg.patience:
                print(f"Early stopping triggered at epoch {epoch + 1}")
                break

            scheduler.step()

        print(f"Training complete. Best validation accuracy: {best_val_acc:.2f}%")
        return best_val_acc

    def evaluate(self, val_loader: DataLoader, criterion: nn.Module | None = None) -> tuple[float, float]:
        self.model.eval()
        criterion = criterion or nn.CrossEntropyLoss()

        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)

                outputs = self.model(images)
                loss = criterion(outputs, labels)

                val_loss += float(loss.item())
                predictions = torch.argmax(outputs, dim=1)
                val_total += labels.size(0)
                val_correct += int((predictions == labels).sum().item())

        val_acc = 100 * val_correct / max(val_total, 1)
        avg_loss = val_loss / max(len(val_loader), 1)
        return val_acc, avg_loss

    def _prepare_input(self, image_path: str | Path) -> torch.Tensor:
        dataset = MedicalImageDataset([image_path], [0], organ_type=self.organ_type, mode="eval")
        image_tensor, _ = dataset[0]
        return image_tensor.unsqueeze(0).to(self.device)

    def predict(self, image_path: str | Path, top_k: int = 3) -> list[dict[str, Any]]:
        input_tensor = self._prepare_input(image_path)
        self.model.eval()

        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            top_probs, top_indices = torch.topk(probabilities, k=min(top_k, self.num_classes), dim=1)

        results: list[dict[str, Any]] = []
        for prob, idx in zip(top_probs[0].cpu().tolist(), top_indices[0].cpu().tolist()):
            disease_name = self.class_names[idx] if idx < len(self.class_names) else f"class_{idx}"
            results.append(
                {
                    "class_index": int(idx),
                    "disease": disease_name,
                    "confidence": float(prob),
                    "percentage": f"{float(prob) * 100:.2f}%",
                }
            )
        return results

    def _last_conv_layer(self) -> nn.Module:
        for module in reversed(list(self.model.modules())):
            if isinstance(module, nn.Conv2d):
                return module
        raise RuntimeError("Unable to locate a convolution layer for Grad-CAM")

    def predict_with_gradcam(self, image_path: str | Path, top_k: int = 3) -> dict[str, Any]:
        try:
            from pytorch_grad_cam import GradCAM
            from pytorch_grad_cam.utils.image import show_cam_on_image
        except Exception as exc:  # pragma: no cover - optional dependency at runtime
            raise RuntimeError("Grad-CAM dependencies are not installed") from exc

        input_tensor = self._prepare_input(image_path)
        self.model.eval()

        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            top_probs, top_indices = torch.topk(probabilities, k=min(top_k, self.num_classes), dim=1)

        target_layer = [self._last_conv_layer()]
        cam = GradCAM(model=self.model, target_layers=target_layer)
        grayscale_cam = cam(input_tensor=input_tensor, targets=None)

        image_np = np.array(Image.open(image_path).convert("RGB").resize((224, 224))).astype(np.float32) / 255.0
        visualization = show_cam_on_image(image_np, grayscale_cam[0, :], use_rgb=True)

        predictions = []
        for prob, idx in zip(top_probs[0].cpu().tolist(), top_indices[0].cpu().tolist()):
            disease_name = self.class_names[idx] if idx < len(self.class_names) else f"class_{idx}"
            predictions.append(
                {
                    "class_index": int(idx),
                    "disease": disease_name,
                    "confidence": float(prob),
                    "percentage": f"{float(prob) * 100:.2f}%",
                }
            )

        return {
            "predictions": predictions,
            "visualization": visualization,
            "gradcam": grayscale_cam[0, :],
        }


def build_weighted_sampler(labels: Sequence[int]) -> WeightedRandomSampler:
    """Create a weighted sampler for imbalanced medical datasets."""

    labels_np = np.array(labels)
    class_counts = np.bincount(labels_np)
    weights = np.zeros_like(class_counts, dtype=np.float32)
    non_zero = class_counts > 0
    weights[non_zero] = 1.0 / class_counts[non_zero]

    sample_weights = weights[labels_np]
    return WeightedRandomSampler(weights=sample_weights, num_samples=len(sample_weights), replacement=True)


def create_data_loader(
    image_paths: Sequence[str | Path],
    labels: Sequence[int],
    organ_type: str,
    mode: str,
    batch_size: int = 16,
    num_workers: int = 0,
    use_weighted_sampler: bool = False,
) -> DataLoader:
    dataset = MedicalImageDataset(image_paths=image_paths, labels=labels, organ_type=organ_type, mode=mode)

    if use_weighted_sampler and mode == "train":
        sampler = build_weighted_sampler(labels)
        return DataLoader(dataset, batch_size=batch_size, sampler=sampler, num_workers=num_workers)

    return DataLoader(dataset, batch_size=batch_size, shuffle=(mode == "train"), num_workers=num_workers)
