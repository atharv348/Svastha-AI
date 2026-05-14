from __future__ import annotations

import json
import subprocess
from pathlib import Path


class SvasthaAIDatasetManager:
    """Download and prepare datasets for multi-organ model training."""

    def __init__(self, base_path: str = "./datasets") -> None:
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _run_kaggle_download(self, dataset_name: str, output_path: Path) -> None:
        output_path.mkdir(parents=True, exist_ok=True)

        command = [
            "kaggle",
            "datasets",
            "download",
            "-d",
            dataset_name,
            "-p",
            str(output_path),
            "--unzip",
        ]

        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "Kaggle CLI failed")

    def download_image_datasets(self) -> None:
        datasets = [
            {"name": "kmader/skin-cancer-mnist-ham10000", "path": "skin", "description": "HAM10000"},
            {"name": "paultimothymooney/chest-xray-pneumonia", "path": "xray/lung", "description": "Chest X-ray"},
            {"name": "andrewmvd/ocular-disease-recognition-odir5k", "path": "eye", "description": "ODIR"},
            {"name": "truthisneverlinear/oral-cavity-images-dataset", "path": "oral", "description": "Oral cavity"},
            {
                "name": "vuppalaadithyasairam/bone-fracture-detection-using-xrays",
                "path": "xray/bone",
                "description": "Bone fracture",
            },
        ]

        print("Downloading image datasets...")
        for item in datasets:
            target = self.base_path / item["path"]
            try:
                print(f"  - {item['description']} ({item['name']})")
                self._run_kaggle_download(item["name"], target)
                print(f"    saved to: {target}")
            except Exception as exc:
                print(f"    failed: {exc}")

    def download_text_datasets(self) -> None:
        datasets = [
            {"name": "finalepoch/medical-qa-datasets", "path": "medical_text", "description": "Medical QA"},
            {"name": "chaitanyakck/medical-text", "path": "medical_text", "description": "Medical text"},
            {"name": "rustyshacklford/medical-dialog-dataset", "path": "medical_text", "description": "Medical dialog"},
        ]

        print("Downloading text datasets...")
        for item in datasets:
            target = self.base_path / item["path"]
            try:
                print(f"  - {item['description']} ({item['name']})")
                self._run_kaggle_download(item["name"], target)
                print(f"    saved to: {target}")
            except Exception as exc:
                print(f"    failed: {exc}")

    def prepare_dataset_structure(self) -> None:
        structure = {
            "skin": ["train", "val", "test"],
            "xray/lung": ["train", "val", "test"],
            "xray/bone": ["train", "val", "test"],
            "eye": ["train", "val", "test"],
            "oral": ["train", "val", "test"],
        }

        for organ, splits in structure.items():
            for split in splits:
                (self.base_path / organ / split).mkdir(parents=True, exist_ok=True)

        print("Created standard train/val/test directory structure")

    def create_disease_mapping(self) -> Path:
        mappings = {
            "skin": {
                0: "Actinic keratosis",
                1: "Basal cell carcinoma",
                2: "Benign keratosis",
                3: "Dermatofibroma",
                4: "Melanoma",
                5: "Melanocytic nevus",
                6: "Vascular lesion",
            },
            "lung": {0: "Normal", 1: "Pneumonia", 2: "COVID-19", 3: "Tuberculosis"},
            "eye": {
                0: "Normal",
                1: "Cataract",
                2: "Glaucoma",
                3: "Diabetic Retinopathy",
                4: "Age-related Macular Degeneration",
            },
        }

        output = self.base_path / "disease_mappings.json"
        with output.open("w", encoding="utf-8") as handle:
            json.dump(mappings, handle, indent=2)

        print(f"Saved disease mappings to {output}")
        return output

    def run_all(self) -> None:
        print("=" * 60)
        print("SVASTHAAI DATASET PREPARATION")
        print("=" * 60)

        self.download_image_datasets()
        self.download_text_datasets()
        self.prepare_dataset_structure()
        self.create_disease_mapping()


if __name__ == "__main__":
    print("Before running, ensure Kaggle API is configured:")
    print("1) Download kaggle.json from Kaggle account settings")
    print("2) Place it in ~/.kaggle/kaggle.json")
    print("3) Set permissions accordingly")

    manager = SvasthaAIDatasetManager()
    manager.run_all()
