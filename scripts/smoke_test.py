from convolve.chains import run_retrieval_pipeline
from convolve.config import load_settings
from convolve.vision import fallback_signals


def main() -> None:
    settings = load_settings()
    signals = fallback_signals()
    signals.state = "Rajasthan"
    signals.caste = "SC"
    signals.land_acres = 2.0
    signals.intent = "support for distressed farmers"

    result = run_retrieval_pipeline(settings, signals, query_intent=signals.intent)
    print(f"Matches: {len(result.explanations)}")
    if result.explanations:
        print(f"Top scheme: {result.explanations[0]['scheme_name']}")


if __name__ == "__main__":
    main()