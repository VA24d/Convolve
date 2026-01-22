# 0004 - Hybrid Dense + Sparse Retrieval with Qdrant

## Status
Accepted

## Context
The hackathon evaluation emphasizes hybrid search (dense + sparse) and explicit use of Qdrant's
retrieval strengths. The previous implementation only used dense vector search with metadata
filters, which limited keyword matching and explainability for eligibility rules.

## Decision
- Introduce a hybrid retrieval pipeline for scheme search using Qdrant's fusion query (RRF).
- Store two vectors per scheme:
  - `dense`: sentence-transformer embeddings over scheme descriptions.
  - `sparse`: hashed token vectors for keyword matching (BM25-style) with IDF modifier.
- Use Qdrant payload filters for state, housing, caste, and land eligibility rules as before.

## Consequences
- The ingest pipeline now recreates the scheme collection to apply the named vector schema.
- Hybrid retrieval improves robustness for both semantic similarity and exact keyword matches.
- Documentation must describe the hybrid retrieval and Qdrant's role in evidence-based outputs.