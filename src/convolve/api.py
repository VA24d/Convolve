from __future__ import annotations

import base64
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient

from convolve.chains import run_retrieval_pipeline
from convolve.config import load_settings, require_qdrant_settings
from convolve.qdrant_client import QdrantService
from convolve.schemas import EligibilitySignals
from convolve.vision import VisionService, fallback_signals


app = FastAPI(title="Yojana-Drishti API")
settings = load_settings()
require_qdrant_settings(settings)


class AnalyzeRequest(BaseModel):
    state: str | None = None
    caste: str | None = None
    land_acres: float | None = None
    housing_type: str | None = None
    assets: list[str] = Field(default_factory=list)
    demographics: list[str] = Field(default_factory=list)
    intent: str | None = None
    image_base64: str | None = None
    use_vision: bool = False


class AnalyzeResponse(BaseModel):
    signals: EligibilitySignals
    explanations: list[dict[str, Any]]
    memories: list[dict[str, Any]]
    memory_id: str


class MemoryUpdateRequest(BaseModel):
    status: Literal["draft", "submitted", "approved", "rejected"] | None = None
    feedback_score: float | None = Field(default=None, ge=0, le=1)
    notes: str | None = None
    chosen_scheme_id: str | None = None


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    if request.use_vision and request.image_base64:
        if not settings.openai_api_key:
            raise HTTPException(status_code=400, detail="OPENAI_API_KEY is required for vision")
        try:
            payload = request.image_base64
            if "," in payload:
                payload = payload.split(",", 1)[1]
            image_bytes = base64.b64decode(payload, validate=True)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="image_base64 must be valid base64") from exc
        vision = VisionService(settings)
        hints = {
            "state": request.state,
            "caste": request.caste,
            "land_acres": request.land_acres,
        }
        signals = vision.extract_signals(image_bytes, hints=hints)
    else:
        signals = fallback_signals()

    signals.state = request.state or signals.state
    signals.caste = request.caste or signals.caste
    signals.land_acres = request.land_acres
    if request.housing_type and request.housing_type != "unknown":
        signals.housing_type = request.housing_type
    signals.assets = request.assets
    signals.demographics = request.demographics
    signals.intent = request.intent

    result = run_retrieval_pipeline(settings, signals, query_intent=request.intent or "")
    memories = [memory.payload or {} for memory in result.memories]
    return AnalyzeResponse(
        signals=signals,
        explanations=result.explanations,
        memories=memories,
        memory_id=result.memory_id,
    )


@app.post("/memory/{case_id}")
async def update_memory(case_id: str, update: MemoryUpdateRequest) -> dict[str, str]:
    updates: dict[str, object] = {"updated_at": update_timestamp()}
    if update.status is not None:
        updates["status"] = update.status
    if update.feedback_score is not None:
        updates["feedback_score"] = update.feedback_score
    if update.notes is not None:
        updates["notes"] = update.notes
    if update.chosen_scheme_id is not None:
        updates["chosen_scheme_id"] = update.chosen_scheme_id

    if len(updates) == 1:
        raise HTTPException(status_code=400, detail="Provide at least one field to update")

    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    qdrant = QdrantService(client)
    qdrant.update_case_memory(case_id, updates)
    return {"status": "updated"}


def update_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()