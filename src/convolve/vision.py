from __future__ import annotations

import base64
from typing import Any

from openai import OpenAI

from convolve.config import Settings
from convolve.schemas import EligibilitySignals


class VisionService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for vision extraction")
        self._client = OpenAI(api_key=settings.openai_api_key)

    def extract_signals(self, image_bytes: bytes, hints: dict[str, Any] | None = None) -> EligibilitySignals:
        prompt = (
            "Analyze this image for Indian government welfare eligibility. "
            "Return JSON with keys: housing_type (kutcha/pucca/unknown), assets (list), "
            "demographics (list), notes (string). Keep lists short."
        )
        if hints:
            prompt += f"\nHints: {hints}"

        response = self._client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "image_url": {
                                "url": "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode("utf-8")
                            },
                        },
                    ],
                }
            ],
        )

        content = response.output_text
        return EligibilitySignals.model_validate_json(content)


def fallback_signals() -> EligibilitySignals:
    return EligibilitySignals(
        housing_type="unknown",
        assets=[],
        demographics=[],
        notes="Fallback signals (no vision API).",
    )