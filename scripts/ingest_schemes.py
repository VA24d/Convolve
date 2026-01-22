from __future__ import annotations

from convolve.config import load_settings
from convolve.ingest import ingest_schemes


if __name__ == "__main__":
    ingest_schemes(load_settings())