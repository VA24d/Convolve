from __future__ import annotations

from typing import Any

from qdrant_client.http import models as qdrant_models

from convolve.schemas import EligibilitySignals


def explain_match(signals: EligibilitySignals, result: qdrant_models.ScoredPoint) -> dict[str, Any]:
    payload = result.payload or {}
    rules = payload.get("eligibility_rules", {})
    explanation = {
        "scheme_name": payload.get("scheme_name", "Unknown"),
        "benefits": payload.get("benefits", ""),
        "score": result.score,
        "matched_filters": {},
        "notes": signals.notes,
    }

    if signals.housing_type != "unknown":
        explanation["matched_filters"]["housing"] = {
            "signal": signals.housing_type,
            "rule": rules.get("housing"),
        }

    if signals.state:
        explanation["matched_filters"]["state"] = {
            "signal": signals.state,
            "rule": payload.get("states"),
        }

    if signals.caste:
        explanation["matched_filters"]["caste"] = {
            "signal": signals.caste,
            "rule": rules.get("caste"),
        }

    if signals.land_acres is not None:
        explanation["matched_filters"]["land_acres"] = {
            "signal": signals.land_acres,
            "rule": rules.get("land_max_acres"),
        }

    return explanation