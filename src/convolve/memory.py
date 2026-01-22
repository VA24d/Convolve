from __future__ import annotations

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

    def recall_cases(self, query_text: str, limit: int = 3) -> list[qdrant_models.ScoredPoint]:
        vector = self._embedder.embed_query(query_text)
        return self._qdrant.search_case_memory(vector, limit=limit)