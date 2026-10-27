import os
import cv2
import numpy as np
from typing import List, Dict
from abc import ABC, abstractmethod
from ultralytics import YOLO
import torch
from app.schemas import FaceDetectionResult
from app.config import settings

STANDARD_EMOTIONS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

NAME_MAPPING = {
    "anger": "angry",
    "content": "happy",
    "joy": "happy",
    "sorrow": "sad",
}

def compute_emotion_scores(primary: str, conf: float) -> Dict[str, float]:
    conf = max(0.35, min(float(conf), 0.98))
    remaining = 1.0 - conf

    affinities = {
        "happy": {"neutral": 0.45, "surprise": 0.35, "sad": 0.05, "fear": 0.05, "angry": 0.05, "disgust": 0.05},
        "sad": {"neutral": 0.40, "fear": 0.25, "angry": 0.20, "disgust": 0.10, "surprise": 0.03, "happy": 0.02},
        "angry": {"disgust": 0.35, "sad": 0.25, "neutral": 0.25, "fear": 0.10, "surprise": 0.03, "happy": 0.02},
        "fear": {"surprise": 0.40, "sad": 0.25, "neutral": 0.20, "angry": 0.10, "disgust": 0.03, "happy": 0.02},
        "surprise": {"fear": 0.35, "happy": 0.35, "neutral": 0.20, "angry": 0.05, "sad": 0.03, "disgust": 0.02},
        "disgust": {"angry": 0.40, "sad": 0.25, "neutral": 0.20, "fear": 0.10, "surprise": 0.03, "happy": 0.02},
        "neutral": {"happy": 0.30, "sad": 0.25, "surprise": 0.20, "fear": 0.10, "angry": 0.10, "disgust": 0.05},
    }

    target_weights = affinities.get(primary, {e: 1.0 for e in STANDARD_EMOTIONS if e != primary})
    total_w = sum(target_weights.get(e, 0.1) for e in STANDARD_EMOTIONS if e != primary)

    scores = {}
    for emo in STANDARD_EMOTIONS:
        if emo == primary:
            scores[emo] = round(conf, 3)
        else:
            w = target_weights.get(emo, 0.1) / total_w
            scores[emo] = round(remaining * w, 3)

    tot = sum(scores.values())
    if tot > 0:
        scores = {k: round(v / tot, 3) for k, v in scores.items()}
    return scores

class EmotionDetectionService(ABC):
    device: str = "cpu"

    @abstractmethod
    def detect_emotions(self, image: np.ndarray) -> List[FaceDetectionResult]:
        pass

class MockEmotionDetectionService(EmotionDetectionService):
    def __init__(self):
        self.device = "cpu"

    def detect_emotions(self, image: np.ndarray) -> List[FaceDetectionResult]:
        h, w = image.shape[:2]
        return [
            FaceDetectionResult(
                bbox=[int(w*0.25), int(h*0.2), int(w*0.75), int(h*0.8)],
                emotion="happy",
                confidence=0.912,
                scores={
                    "angry": 0.01,
                    "disgust": 0.005,
                    "fear": 0.01,
                    "happy": 0.912,
                    "sad": 0.015,
                    "surprise": 0.03,
                    "neutral": 0.018
                }
            )
        ]

class RealYoloEmotionDetectionService(EmotionDetectionService):
    def __init__(self, model_path: str):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"YOLO model not found at {model_path}")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = YOLO(model_path)
        self.model.to(self.device)
        self.raw_names = getattr(self.model, 'names', {})
        print(f"Loaded Real YOLO model on device: {self.device}")

    def detect_emotions(self, image: np.ndarray) -> List[FaceDetectionResult]:
        h, w = image.shape[:2]
        
        # Primary prediction pass with standard confidence threshold
        results = self.model.predict(image, conf=0.18, device=self.device, verbose=False)
        boxes = results[0].boxes if len(results) > 0 else []
        
        # Fallback pass with lower confidence if no faces detected
        if len(boxes) == 0:
            results = self.model.predict(image, conf=0.10, device=self.device, verbose=False)
            boxes = results[0].boxes if len(results) > 0 else []

        faces = []
        for box in boxes:
            xyxy = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls_idx = int(box.cls[0])
            
            raw_label = str(self.raw_names.get(cls_idx, "neutral")).lower()
            emotion = NAME_MAPPING.get(raw_label, raw_label)
            if emotion not in STANDARD_EMOTIONS:
                emotion = "neutral"
                
            scores = compute_emotion_scores(emotion, conf)
            
            x1 = max(0, min(int(xyxy[0]), w - 1))
            y1 = max(0, min(int(xyxy[1]), h - 1))
            x2 = max(x1 + 1, min(int(xyxy[2]), w))
            y2 = max(y1 + 1, min(int(xyxy[3]), h))
            
            faces.append(FaceDetectionResult(
                bbox=[x1, y1, x2, y2],
                emotion=emotion,
                confidence=round(conf, 3),
                scores=scores
            ))
            
        # Sort faces by bounding box area (largest face first)
        faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
        return faces

def get_detector() -> EmotionDetectionService:
    model_path = settings.YOLO_MODEL_PATH
    if os.path.exists(model_path):
        try:
            detector = RealYoloEmotionDetectionService(model_path)
            print(f"Successfully loaded Real YOLO model from {model_path}")
            return detector
        except Exception as e:
            print(f"Error loading real YOLO model from {model_path}: {e}")
            return MockEmotionDetectionService()
    print("Model file not found. Falling back to MockEmotionDetectionService.")
    return MockEmotionDetectionService()
