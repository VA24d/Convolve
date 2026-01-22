from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field
from typing import Any


HousingType = Literal["kutcha", "pucca", "unknown"]


class EligibilitySignals(BaseModel):
    housing_type: HousingType = "unknown"
    assets: list[str] = Field(default_factory=list)
    demographics: list[str] = Field(default_factory=list)
    state: str | None = None
    caste: str | None = None
    land_acres: float | None = None
    intent: str | None = None
    notes: str | None = None

    def summary_text(self) -> str:
        segments: list[str] = [f"housing={self.housing_type}"]
        if self.state:
            segments.append(f"state={self.state}")
        if self.caste:
            segments.append(f"caste={self.caste}")
        if self.land_acres is not None:
            segments.append(f"land_acres={self.land_acres}")
        if self.assets:
            segments.append("assets=" + ", ".join(self.assets))
        if self.demographics:
            segments.append("demographics=" + ", ".join(self.demographics))
        if self.intent:
            segments.append(f"intent={self.intent}")
        if self.notes:
            segments.append(f"notes={self.notes}")
        return " | ".join(segments)


class Scheme(BaseModel):
    scheme_id: str
    scheme_name: str
    description: str
    states: list[str]
    eligibility_rules: dict[str, Any]
    benefits: str
    source_url: str | None = None


class CaseMemory(BaseModel):
    case_id: str | None = None
    signals: EligibilitySignals
    query_intent: str
    retrieved_scheme_ids: list[str]
    chosen_scheme_id: str | None = None
    status: Literal["draft", "submitted", "approved", "rejected"] | None = None
    feedback_score: float | None = None
    notes: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def summary_text(self) -> str:
        summary = self.signals.summary_text()
        return f"intent={self.query_intent} | {summary}"