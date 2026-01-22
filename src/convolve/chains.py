from __future__ import annotations

from dataclasses import dataclass

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from convolve.config import Settings, require_qdrant_settings
from convolve.embeddings import EmbeddingService
from convolve.explain import explain_match
from convolve.memory import MemoryService
from convolve.qdrant_client import QdrantService
from convolve.schemas import CaseMemory, EligibilitySignals


@dataclass(frozen=True)
class RetrievalResult:
    signals: EligibilitySignals
    schemes: list[qdrant_models.ScoredPoint]
    explanations: list[dict[str, object]]
    memories: list[qdrant_models.ScoredPoint]
    memory_id: str


def run_retrieval_pipeline(
    settings: Settings,
    signals: EligibilitySignals,
    query_intent: str,
    limit: int = 3,
) -> RetrievalResult:
    require_qdrant_settings(settings)
    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    embedder = EmbeddingService(settings)
    qdrant = QdrantService(client)
    memory = MemoryService(qdrant, embedder)

    query_text = query_intent or signals.summary_text()
    query_vector = embedder.embed_query(query_text)
    sparse_vector = qdrant.build_sparse_query(query_text)

    schemes = qdrant.search_schemes(
        query_vector=query_vector,
        sparse_vector=sparse_vector,
        state=signals.state,
        housing=signals.housing_type if signals.housing_type != "unknown" else None,
        caste=signals.caste,
        land_acres=signals.land_acres,
        limit=limit,
    )

    explanations = [explain_match(signals, scheme) for scheme in schemes]

    memories = memory.recall_cases(query_text)
    case = CaseMemory(
        signals=signals,
        query_intent=query_text,
        retrieved_scheme_ids=[str(scheme.id) for scheme in schemes],
        status="draft",
    )
    memory_id = memory.save_case(case)

    return RetrievalResult(
        signals=signals,
        schemes=schemes,
        explanations=explanations,
        memories=memories,
        memory_id=memory_id,
    )