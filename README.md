# Yojana-Drishti (Convolve 4.0 - Qdrant)

Yojana-Drishti is a multimodal eligibility assistant for Indian welfare schemes. It combines
signal extraction (text + optional vision), filtered semantic retrieval in Qdrant, and
explainable recommendations. The project ships both a Streamlit demo and an Expo mobile app
that can run orchestration on-device.

## Highlights
- Multimodal eligibility signals (text + optional photo analysis).
- Qdrant hybrid search (dense + sparse) with metadata filters.
- Evidence-based explanations with traceable Qdrant point IDs.
- Long-term memory that supports updates and recency-aware recall.
- Mobile form drafts that prefill applicant details and shareable outputs.

## Repository Layout
- `src/convolve/` - Core retrieval, memory, and vision orchestration.
- `scripts/` - Ingest, demo CLI, and smoke tests.
- `streamlit_app.py` - Desktop demo UI.
- `mobile/` - Expo app with on-device LangChain.js orchestration.
- `docs/` - Architecture, ethics, ADRs, and submission report.

## Quickstart (Backend + Streamlit)
1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Add environment variables:

```bash
cp .env.example .env
```

Fill in:
- `OPENAI_API_KEY` (for vision or OpenAI embeddings)
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `EMBEDDING_BACKEND=sentence-transformers` (default) or `openai`

3. Ingest seed schemes (recreates the Qdrant scheme collection for hybrid vectors):

```bash
python scripts/ingest_schemes.py
```

4. Run the Streamlit demo:

```bash
streamlit run streamlit_app.py
```

## Mobile App (Expo)
The mobile app runs LangChain orchestration on-device and talks directly to Qdrant/OpenAI.
It supports photo capture/library selection, lets Vision fill missing details, and includes
an end-to-end scheme form workflow for field officers.

1. Configure `mobile/config.ts` with your OpenAI key + Qdrant URL/API key.
2. Install Expo dependencies:

```bash
cd mobile
pnpm install
```

3. Run the app:

```bash
pnpm start
```

Open Expo Go on your phone and scan the QR code (iOS requires the latest Expo Go SDK).
If you see the Expo AppEntry error, ensure `mobile/index.js` is present and `main` is set to
`index.js`.

## Demo Flow
- Provide state/caste/land and optional assets/demographics.
- Upload a photo to infer housing and asset signals.
- Review matched schemes with traceable explanations.
- Share prefilled scheme form drafts with required documents.

## Documentation
- `docs/report.md` - Submission-ready report
- `docs/architecture.md` - Architecture overview
- `docs/ethics.md` - Limitations & ethics
- `docs/adr/0002-mobile-orchestration.md` - Mobile orchestration decision

## Notes
- Uses Qdrant Cloud by default.
- Streamlit UI is a demo; CLI available at `scripts/demo_cli.py`.
- Memory updates are available via the `/memory/{case_id}` endpoint for feedback loops.
- Keep secrets in `.env` and `mobile/config.ts` (ignored by Git).