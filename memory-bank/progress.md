# Progress

## What Works
- Backend retrieval pipeline with Qdrant and optional vision extraction.
- Streamlit demo UI.
- Expo mobile app UI for eligibility inputs.
- Mobile orchestration using LangChain.js with direct Qdrant/OpenAI calls.
- Mobile scheme form workflow with applicant profile capture, scheme cards, and shareable draft.

## What's Left
- Validate mobile orchestration with live API keys.
- Validate scheme form drafts on-device and align with official templates.
- Consider secure key storage for production.

## Known Issues
- Mobile app requires embedding and vision calls to OpenAI; keys are stored in config for demo use.