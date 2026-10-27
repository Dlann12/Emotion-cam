from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
from pydantic import BaseModel
from typing import Optional
from app.schemas import PredictResponse
from app.detector import get_detector

app = FastAPI(title="Wajah Emosi ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = get_detector()

class Base64PredictRequest(BaseModel):
    image: str

@app.get("/health")
def health_check():
    import torch
    device = getattr(detector, "device", "cpu")
    return {
        "status": "ok",
        "detector": type(detector).__name__,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "ready": True
    }

@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return PredictResponse(success=False, faces=[], error="Invalid image format")

        faces = detector.detect_emotions(img)
        return PredictResponse(success=True, faces=faces)
    except Exception as e:
        return PredictResponse(success=False, faces=[], error=str(e))

@app.post("/predict-base64", response_model=PredictResponse)
async def predict_base64(payload: Base64PredictRequest):
    try:
        data = payload.image
        if "," in data:
            data = data.split(",", 1)[1]
        img_bytes = base64.b64decode(data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return PredictResponse(success=False, faces=[], error="Could not decode base64 image")

        faces = detector.detect_emotions(img)
        return PredictResponse(success=True, faces=faces)
    except Exception as e:
        return PredictResponse(success=False, faces=[], error=str(e))
