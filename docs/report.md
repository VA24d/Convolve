# Yojana-Drishti Report (Qdrant Convolve 4.0)

## 1. Problem Statement
Millions of rural citizens struggle to identify which welfare schemes they qualify for due to complex eligibility rules, language barriers, and limited access to official portals.

## 2. System Design
The system is a three-stage pipeline:

- **Drishti (Vision)** extracts structured eligibility signals from images.
- **Vidhi (Qdrant Retrieval)** performs filtered semantic search over schemes.
- **Sahayak (Action)** provides evidence-based recommendations and stores memory.

Qdrant is critical for semantic search + metadata filtering + memory storage.

## 3. Multimodal Strategy
- **Image signals**: extracted from photos (housing type, assets, demographics).
- **Text signals**: scheme descriptions and user intent.
- **Embeddings**: sentence-transformers for text; optional OpenAI if configured.

## 4. Search / Memory / Recommendation Logic
- **Search**: hybrid retrieval (dense + sparse) with filters (state, housing, caste, land).
- **Memory**: each interaction is stored in a `case_memory` collection with update-ready fields
  (status, feedback score, chosen scheme). Recency-aware recall favors updated cases.
- **Recommendation**: top schemes with explanation of matched filters + traceable Qdrant point IDs.
- **Form readiness**: recommended schemes can be turned into prefilled form drafts with applicant
  details, ready to share with officials.
- **Filter stress demo**: a backend endpoint compares retrieval under no/medium/heavy filters
  to illustrate Qdrants performance under strict metadata constraints.

## 5. Evidence-based Outputs
Each recommendation includes:
- Retrieved scheme payload
- The filter matches (signals vs. rules)
- A traceable relevance score
- Qdrant point IDs for auditability
- A shareable Evidence Pack with memory IDs, signals, and Qdrant IDs for judge review.

## 6. Limitations & Ethics
See `docs/ethics.md` for risks and mitigations.