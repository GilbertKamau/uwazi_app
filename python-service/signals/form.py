from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any

from .types import SIGNAL_TYPES
from .utils import format_iso8601, normalize_text


def prompt_for_signal() -> Dict[str, Any]:
    print("Select a signal type:")
    for index, signal_type in enumerate(SIGNAL_TYPES, start=1):
        print(f"{index}. {signal_type.key} - {signal_type.description}")

    selection = input("Enter the number of the signal type: ").strip()
    try:
        selected = SIGNAL_TYPES[int(selection) - 1].key
    except (ValueError, IndexError):
        raise ValueError("Invalid selection.")

    timestamp_input = input(
        "Timestamp (ISO-8601, leave blank for now): "
    ).strip()
    timestamp = (
        timestamp_input
        if timestamp_input
        else format_iso8601(datetime.now(timezone.utc))
    )

    event_id = normalize_text(input("Optional eventId: "))
    note = normalize_text(input("Optional note: "))

    context: Dict[str, Any] = {}
    if event_id:
        context["eventId"] = event_id
    if note:
        context["note"] = note

    return {
        "type": selected,
        "timestamp": timestamp,
        "context": context,
        "source": "form",
        "version": 1,
    }
