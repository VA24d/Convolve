from __future__ import annotations

from datetime import datetime, timezone

from qdrant_client.http import models as qdrant_models

from convolve.embeddings import EmbeddingService
from convolve.qdrant_client import QdrantService
from convolve.schemas import CaseMemory


class MemoryService:
    def __init__(self, qdrant: QdrantService, embedder: EmbeddingService) -> None:
        self._qdrant = qdrant
        self._embedder = embedder

    def save_case(self, memory: CaseMemory) -> str:
        vector = self._embedder.embed_query(memory.summary_text())
        return self._qdrant.upsert_case_memory(memory, vector)

    def update_case(self, case_id: str, updates: dict[str, object]) -> None:
        if updates:
            self._qdrant.update_case_memory(case_id, updates)

    def recall_cases(self, query_text: str, limit: int = 3) -> list[qdrant_models.ScoredPoint]:
        vector = self._embedder.embed_query(query_text)
        memories = self._qdrant.search_case_memory(vector, limit=limit)
        return self._rank_memories(memories)

    def _rank_memories(
        self, memories: list[qdrant_models.ScoredPoint]
    ) -> list[qdrant_models.ScoredPoint]:
        now = datetime.now(timezone.utc)

        def sort_key(point: qdrant_models.ScoredPoint) -> tuple[float, float]:
            payload = point.payload or {}
            updated_at = payload.get("updated_at")
            recency_boost = self._recency_boost(updated_at, now)
            base_score = float(point.score or 0.0)
            return (base_score + recency_boost, recency_boost)

        return sorted(memories, key=sort_key, reverse=True)

    def _recency_boost(self, value: object, now: datetime) -> float:
        timestamp = self._parse_timestamp(value)
        if not timestamp:
            return 0.0
        age_seconds = (now - timestamp).total_seconds()
        age_days = max(age_seconds / 86_400, 0.0)
        return 1.0 / (1.0 + age_days)

    def _parse_timestamp(self, value: object) -> datetime | None:
        if not isinstance(value, str):
            return None
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed