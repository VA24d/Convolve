from __future__ import annotations

import sys
from pathlib import Path

import uvicorn


def configure_pythonpath() -> None:
    project_root = Path(__file__).resolve().parents[1]
    src_path = project_root / "src"
    if str(src_path) not in sys.path:
        sys.path.insert(0, str(src_path))


if __name__ == "__main__":
    configure_pythonpath()
    uvicorn.run("convolve.api:app", host="0.0.0.0", port=8000, reload=True)