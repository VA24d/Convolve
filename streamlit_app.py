from __future__ import annotations

from io import BytesIO
import json

import streamlit as st
from gtts import gTTS

from convolve.chains import run_retrieval_pipeline
from convolve.config import load_settings, require_qdrant_settings
from convolve.vision import VisionService, fallback_signals


st.set_page_config(page_title="Yojana-Drishti", layout="centered")

st.title("Yojana-Drishti")
st.caption("AI assistant for welfare scheme eligibility using Qdrant + multimodal signals")

settings = load_settings()
require_qdrant_settings(settings)

st.sidebar.header("Inputs")
state = st.sidebar.text_input("State", value="Rajasthan")
caste = st.sidebar.text_input("Caste", value="SC")
land_acres = st.sidebar.number_input("Land (acres)", min_value=0.0, value=2.0)
query_intent = st.sidebar.text_input("Intent", value="housing support for rural families")

st.sidebar.markdown("### Optional manual evidence")
housing_type = st.sidebar.selectbox("Housing type", ["unknown", "kutcha", "pucca"], index=1)
assets = st.sidebar.text_input("Assets (comma separated)", value="cattle")
demographics = st.sidebar.text_input("Demographics (comma separated)", value="elderly female present")

uploaded_image = st.file_uploader("Upload a photo", type=["png", "jpg", "jpeg"])

use_fallback = st.checkbox("Use fallback signals (skip vision)", value=True)

if st.button("Analyze and Match"):
    if uploaded_image and not use_fallback:
        if not settings.openai_api_key:
            st.error("OPENAI_API_KEY is required for vision extraction.")
            st.stop()
        image_bytes = uploaded_image.getvalue()
        hints = {
            "state": state,
            "caste": caste,
            "land_acres": land_acres,
        }
        vision = VisionService(settings)
        signals = vision.extract_signals(image_bytes, hints=hints)
    else:
        signals = fallback_signals()

    signals.state = state or signals.state
    signals.caste = caste or signals.caste
    signals.land_acres = land_acres
    signals.housing_type = housing_type if housing_type != "unknown" else signals.housing_type
    signals.assets = [item.strip() for item in assets.split(",") if item.strip()]
    signals.demographics = [item.strip() for item in demographics.split(",") if item.strip()]
    signals.intent = query_intent

    result = run_retrieval_pipeline(settings, signals, query_intent=query_intent)

    st.subheader("Extracted Signals")
    st.json(json.loads(signals.model_dump_json()))

    st.subheader("Matched Schemes")
    for explanation in result.explanations:
        st.markdown(f"**{explanation['scheme_name']}**")
        st.write(explanation.get("benefits", ""))
        st.json(explanation)

    st.subheader("Memory Recall")
    if result.memories:
        for memory in result.memories:
            st.json(memory.payload)
    else:
        st.info("No prior cases found.")

    st.subheader("Hindi Audio")
    if result.explanations:
        text = (
            f"Namaste. Aap {result.explanations[0]['scheme_name']} ke liye yogy hain. "
            f"Labh: {result.explanations[0]['benefits']}"
        )
        audio_buffer = BytesIO()
        gTTS(text, lang="hi").write_to_fp(audio_buffer)
        st.audio(audio_buffer.getvalue(), format="audio/mp3")

st.markdown("---")
st.caption("Demo: Qdrant filtered semantic search + multimodal evidence extraction")