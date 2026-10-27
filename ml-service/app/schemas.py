from pydantic import BaseModel
from typing import List, Dict, Optional

class FaceDetectionResult(BaseModel):
    bbox: List[int]
    emotion: str
    confidence: float
    scores: Dict[str, float]

class PredictResponse(BaseModel):
    success: bool
    faces: List[FaceDetectionResult]
    error: Optional[str] = None
