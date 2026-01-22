from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable
import uuid

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from convolve.schemas import CaseMemory, Scheme
from convolve.sparse import SparseEncoder


DENSE_VECTOR_NAME = "dense"
SPARSE_VECTOR_NAME = "sparse"


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
        self._sparse_encoder_instance: SparseEncoder | None = None

    def create_collections(self, scheme_vector: VectorConfig, memory_vector: VectorConfig) -> None:
        if not self._client.collection_exists(self._collections.schemes):
            self._client.create_collection(
                collection_name=self._collections.schemes,
                vectors_config=self._scheme_vectors_config(scheme_vector),
                sparse_vectors_config=self._scheme_sparse_config(),
            )
            self._create_scheme_indexes()

        if not self._client.collection_exists(self._collections.memories):
            self._client.create_collection(
                collection_name=self._collections.memories,
                vectors_config=qdrant_models.VectorParams(
                    size=memory_vector.size,
                    distance=memory_vector.distance,
                ),
            )
            self._create_memory_indexes()

    def recreate_schemes_collection(self, scheme_vector: VectorConfig) -> None:
        self._client.recreate_collection(
            collection_name=self._collections.schemes,
            vectors_config=self._scheme_vectors_config(scheme_vector),
            sparse_vectors_config=self._scheme_sparse_config(),
        )
        self._create_scheme_indexes()

    def build_sparse_query(self, text: str) -> qdrant_models.SparseVector:
        return self._sparse_encoder().encode(text)

    def upsert_schemes(
        self,
        schemes: Iterable[Scheme],
        dense_vectors: list[list[float]],
        sparse_vectors: list[qdrant_models.SparseVector],
    ) -> None:
        points = []
        for scheme, dense_vector, sparse_vector in zip(
            schemes, dense_vectors, sparse_vectors, strict=True
        ):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, scheme.scheme_id))
            points.append(
                qdrant_models.PointStruct(
                    id=point_id,
                    vector={
                        DENSE_VECTOR_NAME: dense_vector,
                        SPARSE_VECTOR_NAME: sparse_vector,
                    },
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
        sparse_vector: qdrant_models.SparseVector,
        state: str | None,
        housing: str | None,
        caste: str | None,
        land_acres: float | None,
        limit: int,
    ) -> list[qdrant_models.ScoredPoint]:
        query_filter = self._build_scheme_filter(state, housing, caste, land_acres)
        response = self._client.query_points(
            collection_name=self._collections.schemes,
            query=qdrant_models.FusionQuery(fusion=qdrant_models.Fusion.RRF),
            prefetch=[
                qdrant_models.Prefetch(
                    query=query_vector,
                    using=DENSE_VECTOR_NAME,
                    filter=query_filter,
                    limit=limit,
                ),
                qdrant_models.Prefetch(
                    query=sparse_vector,
                    using=SPARSE_VECTOR_NAME,
                    filter=query_filter,
                    limit=limit,
                ),
            ],
            limit=limit,
            with_payload=True,
        )
        return response.points

    def upsert_case_memory(self, memory: CaseMemory, vector: list[float]) -> str:
        case_id = memory.case_id or str(uuid.uuid4())
        payload = {
            "signals": memory.signals.model_dump(),
            "query_intent": memory.query_intent,
            "retrieved_scheme_ids": memory.retrieved_scheme_ids,
            "chosen_scheme_id": memory.chosen_scheme_id,
            "status": memory.status,
            "feedback_score": memory.feedback_score,
            "notes": memory.notes,
            "created_at": memory.created_at.isoformat(),
            "updated_at": memory.updated_at.isoformat(),
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

    def update_case_memory(self, case_id: str, updates: dict[str, object]) -> None:
        if not updates:
            return
        self._client.set_payload(
            collection_name=self._collections.memories,
            payload=updates,
            points=[case_id],
            wait=True,
        )

    def search_case_memory(self, query_vector: list[float], limit: int = 3) -> list[qdrant_models.ScoredPoint]:
        response = self._client.query_points(
            collection_name=self._collections.memories,
            query=query_vector,
            limit=limit,
            with_payload=True,
        )
        return response.points

    def _scheme_vectors_config(self, scheme_vector: VectorConfig) -> dict[str, qdrant_models.VectorParams]:
        return {
            DENSE_VECTOR_NAME: qdrant_models.VectorParams(
                size=scheme_vector.size,
                distance=scheme_vector.distance,
            )
        }

    def _scheme_sparse_config(self) -> dict[str, qdrant_models.SparseVectorParams]:
        modifier_type = getattr(qdrant_models, "Modifier", None)
        if modifier_type is None:
            return {
                SPARSE_VECTOR_NAME: qdrant_models.SparseVectorParams(
                    index=qdrant_models.SparseIndexParams(),
                )
            }

        return {
            SPARSE_VECTOR_NAME: qdrant_models.SparseVectorParams(
                index=qdrant_models.SparseIndexParams(),
                modifier=modifier_type.IDF,
            )
        }

    def _sparse_encoder(self) -> SparseEncoder:
        if self._sparse_encoder_instance is None:
            self._sparse_encoder_instance = SparseEncoder()
        return self._sparse_encoder_instance

    def _build_scheme_filter(
        self,
        state: str | None,
        housing: str | None,
        caste: str | None,
        land_acres: float | None,
    ) -> qdrant_models.Filter | None:
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

        if not must and not should:
            return None

        return qdrant_models.Filter(
            must=must or None,
            should=should or None,
        )

    def _create_scheme_indexes(self) -> None:
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

    def _create_memory_indexes(self) -> None:
        self._client.create_payload_index(
            collection_name=self._collections.memories,
            field_name="created_at",
            field_schema=qdrant_models.PayloadSchemaType.DATETIME,
        )
        self._client.create_payload_index(
            collection_name=self._collections.memories,
            field_name="updated_at",
            field_schema=qdrant_models.PayloadSchemaType.DATETIME,
        )
        self._client.create_payload_index(
            collection_name=self._collections.memories,
            field_name="status",
            field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
        )