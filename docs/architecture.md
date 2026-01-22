# Architecture Overview

## Problem
Rural citizens struggle to understand which welfare schemes they qualify for due to complex eligibility rules and language barriers.

## System
Yojana-Drishti is a multimodal eligibility assistant that combines:

- **Vision extraction (Drishti)** to turn photos into structured signals.
- **Qdrant filtered hybrid search (Vidhi)** to retrieve matching schemes via dense + sparse fusion.
- **Action output (Sahayak)** to present evidence-based recommendations and audio feedback.
- **On-device or backend orchestration (mobile)** to run LangChain embeddings locally or call the
  FastAPI API for hybrid retrieval + memory IDs.
- **Guided mobile UI** with safe-area support and Vision hints that allow missing details to be inferred from photos.
- **Filter stress demo** endpoint to highlight retrieval under no/medium/heavy metadata filters.

## Data Flow
1. User uploads a photo (library or camera) or provides manual evidence.
2. Drishti extracts `EligibilitySignals` JSON (or falls back to defaults).
3. On mobile, LangChain embeddings are computed on-device; signals + intent are sent to Qdrant with metadata filters.
4. Qdrant performs hybrid retrieval (dense + sparse) and returns top matching schemes.
5. The system generates explanations and stores the interaction in memory (with update-ready metadata).
6. The API can run a filter-stress comparison for judge-facing demos.

## Why Qdrant is Critical
- Hybrid retrieval (dense + sparse) captures both semantic similarity and keyword matches.
- Payload filtering supports rule-based eligibility checks (state, housing, caste, land).
- Memory collection stores past cases and accepts updates for long-term recall.