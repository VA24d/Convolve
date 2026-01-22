# Changelog

## Unreleased
- Added hybrid Qdrant retrieval (dense + sparse) with fusion queries for scheme matching.
- Added sparse vector ingestion and collection recreation for hybrid search.
- Added recency-aware memory recall and update-ready memory metadata.
- Added memory update endpoint to store feedback and chosen scheme decisions.
- Added traceable Qdrant point IDs to explanations.
- Added ADR documenting hybrid dense + sparse retrieval design.
- Updated docs to reflect hybrid retrieval, memory updates, and evidence tracing.
- Restored memory-bank files locally and added them to .gitignore.
- Removed memory-bank documentation artifacts from version control.
- Refreshed README with clearer setup, architecture highlights, and usage flow.
- Hardened Switch state handling in the mobile app to coerce boolean values consistently.
- Fixed Switch components to coerce boolean values in the mobile scheme form workflow.
- Added scheme form draft workflow to the mobile Results screen, including prefilled applicant
  details, required-document checklist, and shareable draft export.
- Added applicant profile capture on the mobile home screen for form filling.
- Added safe area support and streamlined the mobile eligibility form for clearer input.
- Clarified that Vision can infer missing details when fields are left blank.
- Fixed Expo image picker media type usage and OpenAI vision image payload formatting.
- Replaced deprecated SafeAreaView usage with react-native-safe-area-context.
- Added error feedback when photo selection or capture fails to launch or returns no assets.
- Added navigation (Home, Results, History, Settings) with text-to-speech for explanations.
- Enabled gesture handling and native screens for React Navigation.
- Improved vision JSON parsing to handle fenced code blocks.
- Upgraded Expo mobile dependencies to SDK 54 for compatibility with latest Expo Go.
- Added camera capture in the mobile app alongside photo library selection.
- Documented on-device LangChain orchestration and SDK 54 upgrade guidance.

## 0.1.0
- Add Yojana-Drishti MVP with Qdrant retrieval, memory, and Streamlit demo.
- Add FastAPI backend and Expo mobile client.