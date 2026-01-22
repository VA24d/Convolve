from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable
import uuid

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from convolve.schemas import CaseMemory, Scheme


@dataclass(frozen=True)
class QdrantCollections:
    schemes: str = "gov_schemes"
    memories: str = "case_memory"


@dataclass(frozen=True)
class VectorConfig:
    size: int
    distance: qdrant_models.Distance = qdrant_models.Distance.COSINE


@dataclass(frozen=True)
class QdrantDependencies:
    client: QdrantClient


class QdrantService:
    def __init__(self, client: QdrantClient) -> None:
        self._client = client
        self._collections = QdrantCollections()

    def create_collections(self, scheme_vector: VectorConfig, memory_vector: VectorConfig) -> None:
        if not self._client.collection_exists(self._collections.schemes):
            self._client.create_collection(
                collection_name=self._collections.schemes,
                vectors_config=qdrant_models.VectorParams(
                    size=scheme_vector.size,
                    distance=scheme_vector.distance,
                ),
            )
            self._client.create_payload_index(
                collection_name=self._collections.schemes,
                field_name="states",
                field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
            )
            self._client.create_payload_index(
                collection_name=self._collections.schemes,
                field_name="eligibility_rules.housing",
                field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
            )
            self._client.create_payload_index(
                collection_name=self._collections.schemes,
                field_name="eligibility_rules.assets_excluded",
                field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
            )
            self._client.create_payload_index(
                collection_name=self._collections.schemes,
                field_name="eligibility_rules.caste",
                field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
            )
            self._client.create_payload_index(
                collection_name=self._collections.schemes,
                field_name="eligibility_rules.land_max_acres",
                field_schema=qdrant_models.PayloadSchemaType.FLOAT,
            )

        if not self._client.collection_exists(self._collections.memories):
            self._client.create_collection(
                collection_name=self._collections.memories,
                vectors_config=qdrant_models.VectorParams(
                    size=memory_vector.size,
                    distance=memory_vector.distance,
                ),
            )

    def upsert_schemes(self, schemes: Iterable[Scheme], vectors: list[list[float]]) -> None:
        points = []
        for scheme, vector in zip(schemes, vectors, strict=True):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, scheme.scheme_id))
            points.append(
                qdrant_models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "scheme_id": scheme.scheme_id,
                        "scheme_name": scheme.scheme_name,
                        "description": scheme.description,
                        "states": scheme.states,
                        "eligibility_rules": scheme.eligibility_rules,
                        "benefits": scheme.benefits,
                        "source_url": scheme.source_url,
                    },
                )
            )
        self._client.upsert(
            collection_name=self._collections.schemes,
            points=points,
        )

    def search_schemes(
        self,
        query_vector: list[float],
        state: str | None,
        housing: str | None,
        caste: str | None,
        land_acres: float | None,
        limit: int,
    ) -> list[qdrant_models.ScoredPoint]:
        must: list[qdrant_models.FieldCondition] = []
        should: list[qdrant_models.FieldCondition] = []
        if state:
            should.extend(
                [
                    qdrant_models.FieldCondition(
                        key="states",
                        match=qdrant_models.MatchValue(value=state),
                    ),
                    qdrant_models.FieldCondition(
                        key="states",
                        match=qdrant_models.MatchValue(value="All"),
                    ),
                ]
            )
        if housing:
            must.append(
                qdrant_models.FieldCondition(
                    key="eligibility_rules.housing",
                    match=qdrant_models.MatchValue(value=housing),
                )
            )
        if caste:
            must.append(
                qdrant_models.FieldCondition(
                    key="eligibility_rules.caste",
                    match=qdrant_models.MatchValue(value=caste),
                )
            )
        if land_acres is not None:
            must.append(
                qdrant_models.FieldCondition(
                    key="eligibility_rules.land_max_acres",
                    range=qdrant_models.Range(lte=land_acres),
                )
            )

        query_filter = qdrant_models.Filter(must=must, should=should) if (must or should) else None
        return self._client.search(
            collection_name=self._collections.schemes,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )

    def upsert_case_memory(self, memory: CaseMemory, vector: list[float]) -> str:
        case_id = memory.case_id or str(uuid.uuid4())
        payload = {
            "signals": memory.signals.model_dump(),
            "query_intent": memory.query_intent,
            "retrieved_scheme_ids": memory.retrieved_scheme_ids,
            "chosen_scheme_id": memory.chosen_scheme_id,
            "created_at": memory.created_at.isoformat(),
        }
        self._client.upsert(
            collection_name=self._collections.memories,
            points=[
                qdrant_models.PointStruct(
                    id=case_id,
                    vector=vector,
                    payload=payload,
                )
            ],
        )
        return case_id

    def search_case_memory(self, query_vector: list[float], limit: int = 3) -> list[qdrant_models.ScoredPoint]:
        return self._client.search(
            collection_name=self._collections.memories,
            query_vector=query_vector,
            limit=limit,
            with_payload=True,
        )