import os

class Settings:
    YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "models/best.pt")
    APP_NAME = "Wajah Emosi ML Service"

settings = Settings()
