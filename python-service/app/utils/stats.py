"""Text statistics and stage-timing helpers."""

import time
from contextlib import contextmanager


def char_count(text: str) -> int:
    return len(text)


def word_count(text: str) -> int:
    return len(text.split())


@contextmanager
def stage_timer(timings: dict[str, float], stage: str):
    """Records the wall-clock duration of a pipeline stage in milliseconds."""
    start = time.perf_counter()
    try:
        yield
    finally:
        timings[stage] = round((time.perf_counter() - start) * 1000, 2)
