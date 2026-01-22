from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import hashlib
import re
from typing import Iterable

from qdrant_client.http import models as qdrant_models


TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower())


def stable_hash(token: str) -> int:
    digest = hashlib.md5(token.encode("utf-8"), usedforsecurity=False).hexdigest()
    return int(digest, 16)


def combine_texts(parts: Iterable[str]) -> str:
    return " ".join(part for part in parts if part)


@dataclass(frozen=True)
class SparseEncoder:
    vocab_size: int = 20000
    max_terms: int = 128

    def encode(self, text: str) -> qdrant_models.SparseVector:
        tokens = tokenize(text)
        if not tokens:
            return qdrant_models.SparseVector(indices=[], values=[])

        hashed_counts: Counter[int] = Counter()
        for token in tokens:
            index = stable_hash(token) % self.vocab_size
            hashed_counts[index] += 1

        most_common = hashed_counts.most_common(self.max_terms)
        max_count = most_common[0][1]
        indices: list[int] = []
        values: list[float] = []

        for index, count in most_common:
            indices.append(index)
            values.append(count / max_count)

        return qdrant_models.SparseVector(indices=indices, values=values)

    def encode_batch(self, texts: Iterable[str]) -> list[qdrant_models.SparseVector]:
        return [self.encode(text) for text in texts]