import os
import argparse
import shutil
from pathlib import Path
from ultralytics import YOLO
import torch

def main():
    default_device = "0" if torch.cuda.is_available() else "cpu"
    parser = argparse.ArgumentParser(description="Train YOLO on Human Face Emotions Dataset")
    parser.add_argument("--model", type=str, default="yolo11n.pt", help="Base model (e.g. yolo11n.pt, yolov8n.pt)")
    parser.add_argument("--epochs", type=int, default=30, help="Number of epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (e.g. 8, 16, 32)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default=default_device, help="Device (cpu, 0, mps)")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent
    data_yaml = base_dir / "dataset" / "data.yaml"

    if not data_yaml.exists():
        print(f"Error: {data_yaml} tidak ditemukan. Jalankan `python prepare_dataset.py` terlebih dahulu.")
        return

    print("=" * 60)
    print(" Memulai Training Model YOLO untuk Deteksi Emosi Wajah")
    print(f" - Model Dasar : {args.model}")
    print(f" - Data YAML   : {data_yaml}")
    print(f" - Epochs      : {args.epochs}")
    print(f" - Batch Size  : {args.batch}")
    print(f" - Device      : {args.device}")
    print("=" * 60)

    model = YOLO(args.model)
    results = model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        project=str(base_dir / "runs"),
        name="emotion_train",
        exist_ok=True,
    )

    # Export best model
    best_weights = base_dir / "runs" / "emotion_train" / "weights" / "best.pt"
    target_weights = base_dir / "models" / "best.pt"

    if best_weights.exists():
        target_weights.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(best_weights, target_weights)
        print("\n" + "=" * 60)
        print(" TRAINING SELESAI DENGAN SUKSES! ")
        print(f"Model terbaik disimpan ke: {target_weights}")
        print("Model baru akan otomatis digunakan oleh ML Service.")
        print("=" * 60)
    else:
        print("File bobot hasil training tidak ditemukan di:", best_weights)

if __name__ == "__main__":
    main()
