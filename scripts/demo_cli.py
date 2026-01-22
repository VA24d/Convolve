from __future__ import annotations

import json

from convolve.chains import run_retrieval_pipeline
from convolve.config import load_settings
from convolve.vision import fallback_signals


if __name__ == "__main__":
    settings = load_settings()
    signals = fallback_signals()
    signals.state = "Rajasthan"
    signals.caste = "SC"
    signals.land_acres = 2.0
    signals.intent = "support for distressed farmers"

    result = run_retrieval_pipeline(settings, signals, query_intent=signals.intent)
    print(json.dumps([ex for ex in result.explanations], indent=2))