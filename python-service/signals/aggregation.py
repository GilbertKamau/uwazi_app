# This import statement enables the 'annotations' feature from future versions of Python.
# By importing 'annotations' from __future__, all type hints in this file are treated as string literals.
# This means the evaluation of the type hints is postponed until runtime.
# - It allows you to use forward references for type hints (referring to types that are defined later in the code).
# - It helps with circular imports and improves compatibility with static analysis tools.
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Tuple

from .models import AggregatedStat
from .normality import evaluate_normality
from .utils import parse_iso8601

TREND_DELTA = 0.1
BASELINE_WINDOWS = 7


def _window_key(timestamp: datetime, window: str) -> str:
    if window == "day":
        return timestamp.date().isoformat()
    if window == "week":
        week_start = timestamp.date() - timedelta(days=timestamp.weekday())
        return week_start.isoformat()
    raise ValueError("Window must be 'day' or 'week'.")


def _parse_window_key(window_key: str) -> datetime.date:
    return datetime.fromisoformat(window_key).date()


def _compute_trend(count: int, baseline: float) -> str:
    if baseline <= 0:
        return "up" if count > 0 else "steady"
    if count > baseline * (1 + TREND_DELTA):
        return "up"
    if count < baseline * (1 - TREND_DELTA):
        return "down"
    return "steady"


def aggregate_signals(
    records: Iterable[Dict[str, Any]],
    *,
    window: str = "day",
) -> List[AggregatedStat]:
    """Aggregate only on groups (window + type), never on individuals."""
    counts: Dict[Tuple[str, str], int] = defaultdict(int)
    windows = set()
    types = set()

    for record in records:
        signal_type = record.get("type")
        timestamp_raw = record.get("timestamp")
        if not signal_type or not timestamp_raw:
            continue
        try:
            timestamp = parse_iso8601(timestamp_raw)
        except ValueError:
            continue
        window_key = _window_key(timestamp, window)
        counts[(window_key, signal_type)] += 1
        windows.add(window_key)
        types.add(signal_type)

    sorted_windows = sorted(windows)
    sorted_types = sorted(types)
    results: List[AggregatedStat] = []

    for signal_type in sorted_types:
        series = [
            (window_key, counts.get((window_key, signal_type), 0))
            for window_key in sorted_windows
        ]
        for index, (window_key, count) in enumerate(series):
            history = [value for _, value in series[max(0, index - BASELINE_WINDOWS) : index]]
            baseline = sum(history) / len(history) if history else 0.0
            trend = _compute_trend(count, baseline)
            status = evaluate_normality(count, baseline)
            results.append(
                AggregatedStat(
                    window=_parse_window_key(window_key),
                    type=signal_type,
                    count=count,
                    baseline=baseline,
                    trend=trend,
                    status=status,
                )
            )

    return results
