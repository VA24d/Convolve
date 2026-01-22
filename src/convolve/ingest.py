from __future__ import annotations

import json
from pathlib import Path

from qdrant_client import QdrantClient

from convolve.config import Settings, load_settings, require_qdrant_settings
from convolve.embeddings import EmbeddingService
from convolve.qdrant_client import QdrantService, VectorConfig
from convolve.schemas import Scheme
from convolve.sparse import SparseEncoder, combine_texts


SEED_PATH = Path(__file__).resolve().parents[2] / "data" / "schemes_seed.json"


def load_seed_schemes() -> list[Scheme]:
    with SEED_PATH.open("r", encoding="utf-8") as handle:
        raw_items = json.load(handle)
    return [Scheme(**item) for item in raw_items]


def build_sparse_text(scheme: Scheme) -> str:
    return combine_texts(
        [
            scheme.scheme_name,
            scheme.description,
            scheme.benefits,
            " ".join(scheme.states),
        ]
    )


def ingest_schemes(settings: Settings) -> None:
    require_qdrant_settings(settings)
    client = QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        timeout=60,
    )
    embedder = EmbeddingService(settings)
    sparse_encoder = SparseEncoder()
    service = QdrantService(client)

    schemes = load_seed_schemes()
    descriptions = [scheme.description for scheme in schemes]
    dense_vectors = embedder.embed_documents(descriptions)
    sparse_texts = [build_sparse_text(scheme) for scheme in schemes]
    sparse_vectors = sparse_encoder.encode_batch(sparse_texts)

    vector_size = len(dense_vectors[0])
    service.recreate_schemes_collection(VectorConfig(size=vector_size))
    service.create_collections(
        scheme_vector=VectorConfig(size=vector_size),
        memory_vector=VectorConfig(size=vector_size),
    )
    service.upsert_schemes(schemes, dense_vectors, sparse_vectors)


if __name__ == "__main__":
    ingest_schemes(load_settings())