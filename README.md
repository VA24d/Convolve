# Yojana-Drishti (Convolve 4.0 - Qdrant)

A multimodal eligibility assistant for Indian welfare schemes. It uses Qdrant for filtered semantic search and memory, LangChain for embeddings, and an optional vision step for extracting eligibility signals from photos. The mobile app can run the orchestration locally using LangChain.js and direct Qdrant/OpenAI calls.

## Setup

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

3. Ingest seed schemes:

```bash
python scripts/ingest_schemes.py
```

4. Run the demo UI:

```bash
streamlit run streamlit_app.py
```

## Demo Flow
- Upload a photo or use the fallback signals.
- Provide state/caste/land to trigger heavy filtering.
- See the matched schemes + traceable evidence.
- Memory recall shows prior cases.

## Documentation
- `docs/report.md` - Submission-ready report
- `docs/architecture.md` - Architecture overview
- `docs/ethics.md` - Limitations & ethics
- `docs/adr/0002-mobile-orchestration.md` - Mobile orchestration decision

## Notes
- Uses Qdrant Cloud by default.
- Streamlit UI is for demo; CLI available at `scripts/demo_cli.py`.

## Mobile App (Expo)
The mobile app runs LangChain orchestration on-device and talks directly to Qdrant/OpenAI.
It supports selecting images from the photo library or capturing a photo on-device, and the
eligibility form can be left partially blank when Vision is enabled to infer missing details.
The Results screen now includes a scheme form workflow to prefill applicant details and
share a scheme application draft, including a checklist of required documents.
The new Home/Results/History/Settings navigation includes text-to-speech to read scheme
explanations aloud on the Results screen.

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
If you see the Expo AppEntry error, ensure `mobile/index.js` is present and `main` is set to `index.js`.