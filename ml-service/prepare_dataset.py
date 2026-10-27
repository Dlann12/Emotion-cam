import os
import sys
import glob
import shutil
import zipfile
import random
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
RAW_DIR = DATASET_DIR / "raw"
IMAGES_DIR = DATASET_DIR / "images"
LABELS_DIR = DATASET_DIR / "labels"

# Mapping Kaggle class folder names to standard normalized labels
CLASS_MAP = {
    "angry": 0,
    "fear": 1,
    "happy": 2,
    "sad": 3,
    "suprise": 4,
    "surprise": 4,
    "surprised": 4,
}

def check_or_download_dataset():
    """Finds downloaded zip file or uses Kaggle API if credentials exist."""
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Check if raw images are already extracted
    for d in RAW_DIR.rglob("*"):
        if d.is_dir() and d.name.lower() in CLASS_MAP:
            print(f"Found existing raw dataset in: {d.parent}")
            return True

    # 2. Look for zip file in dataset/, root dataset/, or Downloads
    candidate_zips = [
        *list(DATASET_DIR.glob("*.zip")),
        *list(BASE_DIR.parent.glob("dataset/*.zip")),
        *list(Path.home().glob("Downloads/*emotion*.zip")),
        *list(Path.home().glob("Downloads/*human-face*.zip")),
    ]

    if candidate_zips:
        zip_path = candidate_zips[0]
        print(f"Extracting zip archive: {zip_path} -> {RAW_DIR}")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(RAW_DIR)
        print("Extraction complete.")
        return True

    # 3. Check for Kaggle API credentials
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    has_env = os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY")

    if kaggle_json.exists() or has_env:
        print("Kaggle credentials found. Downloading dataset from Kaggle...")
        try:
            import kaggle
            kaggle.api.dataset_download_files(
                "samithsachidanandan/human-face-emotions",
                path=str(RAW_DIR),
                unzip=True
            )
            print("Download and extraction complete.")
            return True
        except Exception as e:
            print(f"Kaggle download failed: {e}")

    print("\n" + "="*70)
    print("DATASET BELUM DITEMUKAN!")
    print("Silakan unduh dataset dari link berikut:")
    print("👉 https://www.kaggle.com/datasets/samithsachidanandan/human-face-emotions")
    print(f"Lalu letakkan file zip (contoh: archive.zip) di dalam folder:\n   {DATASET_DIR}")
    print("Atau buat token Kaggle di ~/.kaggle/kaggle.json")
    print("="*70 + "\n")
    return False

def organize_dataset_for_yolo(val_split=0.2, max_per_class=None):
    """
    Converts folder-structured images (Angry, Fear, Happy, Sad, Surprised)
    into standard YOLO Object Detection format (images/train, labels/train, images/val, labels/val)
    and updates data.yaml.
    """
    print("\nMenyiapkan struktur direktori YOLO...")
    for split in ["train", "val"]:
        (IMAGES_DIR / split).mkdir(parents=True, exist_ok=True)
        (LABELS_DIR / split).mkdir(parents=True, exist_ok=True)

    # Locate class folders inside RAW_DIR (handle nested folders if any)
    found_folders = {}
    for path in RAW_DIR.rglob("*"):
        if path.is_dir():
            norm_name = path.name.lower()
            if norm_name in CLASS_MAP and norm_name not in found_folders:
                found_folders[norm_name] = path

    if not found_folders:
        print(f"Tidak dapat menemukan folder kelas (Angry, Fear, Happy, Sad, Surprised) di {RAW_DIR}")
        return False

    print(f"Folder kelas ditemukan: {list(found_folders.keys())}")

    total_train = 0
    total_val = 0

    for class_name, folder_path in found_folders.items():
        class_id = CLASS_MAP[class_name]
        image_files = [f for f in folder_path.glob("*") if f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]]
        random.seed(42)
        random.shuffle(image_files)

        if max_per_class and len(image_files) > max_per_class:
            image_files = image_files[:max_per_class]

        num_val = int(len(image_files) * val_split)
        val_files = image_files[:num_val]
        train_files = image_files[num_val:]

        print(f"Proses kelas '{class_name}' (ID: {class_id}): {len(train_files)} train, {len(val_files)} val")

        for split, file_list in [("train", train_files), ("val", val_files)]:
            for img_path in file_list:
                stem = f"{class_name}_{img_path.stem}"
                ext = img_path.suffix.lower()
                dest_img = IMAGES_DIR / split / f"{stem}{ext}"
                dest_label = LABELS_DIR / split / f"{stem}.txt"

                # Copy image
                if not dest_img.exists():
                    shutil.copy2(img_path, dest_img)

                # Generate face bounding box annotation
                # Since the Kaggle human-face-emotions dataset consists of cropped face portraits,
                # bounding box covers [center_x=0.5, center_y=0.5, width=0.92, height=0.92]
                if not dest_label.exists():
                    with open(dest_label, "w") as lf:
                        lf.write(f"{class_id} 0.500000 0.500000 0.920000 0.920000\n")

                if split == "train":
                    total_train += 1
                else:
                    total_val += 1

    # Update data.yaml
    yaml_content = f"""path: {DATASET_DIR.resolve()}
train: images/train
val: images/val

names:
  0: angry
  1: fear
  2: happy
  3: sad
  4: surprise
"""
    yaml_file = DATASET_DIR / "data.yaml"
    with open(yaml_file, "w") as yf:
        yf.write(yaml_content)

    print(f"\nBerhasil mengorganisasi dataset YOLO!")
    print(f"- Total Training: {total_train} gambar")
    print(f"- Total Validasi: {total_val} gambar")
    print(f"- data.yaml diperbarui di: {yaml_file}")
    return True

if __name__ == "__main__":
    if check_or_download_dataset():
        organize_dataset_for_yolo()
