from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from uuid import uuid4

from .types import ALLOWED_SIGNAL_TYPES
from .utils import format_iso8601, normalize_text, parse_iso8601

ALLOWED_SOURCES = {"form", "api", "import"}
MAX_NOTE_LENGTH = 280
MAX_EVENT_ID_LENGTH = 64
MAX_DAYS_PAST = 365
MAX_MINUTES_FUTURE = 10


def validate_signal_payload(payload: Dict[str, Any]) -> List[str]:
    """Validation protects storage integrity and keeps aggregation safe."""
    errors: List[str] = []

    if not isinstance(payload, dict):
        return ["Payload must be a JSON object."]

    signal_type = payload.get("type")
    if not signal_type or not isinstance(signal_type, str):
        errors.append("Signal type is required.")
    elif signal_type not in ALLOWED_SIGNAL_TYPES:
        errors.append(f"Signal type '{signal_type}' is not allowed.")

    timestamp_raw = payload.get("timestamp")
    if not timestamp_raw or not isinstance(timestamp_raw, str):
        errors.append("Timestamp is required and must be a string.")
    else:
        try:
            timestamp = parse_iso8601(timestamp_raw)
            now = datetime.now(timezone.utc)
            if timestamp < now - timedelta(days=MAX_DAYS_PAST):
                errors.append("Timestamp is too far in the past.")
            if timestamp > now + timedelta(minutes=MAX_MINUTES_FUTURE):
                errors.append("Timestamp is too far in the future.")
        except ValueError:
            errors.append("Timestamp must be valid ISO-8601.")

    context = payload.get("context")
    if context is not None and not isinstance(context, dict):
        errors.append("Context must be an object when provided.")

    if isinstance(context, dict):
        note = context.get("note")
        if note is not None and not isinstance(note, str):
            errors.append("Context note must be a string.")
        elif isinstance(note, str) and len(note.strip()) > MAX_NOTE_LENGTH:
            errors.append(f"Context note exceeds {MAX_NOTE_LENGTH} characters.")

        event_id = context.get("eventId")
        if event_id is not None and not isinstance(event_id, str):
            errors.append("Context eventId must be a string.")
        elif isinstance(event_id, str) and len(event_id.strip()) > MAX_EVENT_ID_LENGTH:
            errors.append(f"Context eventId exceeds {MAX_EVENT_ID_LENGTH} characters.")

    source = payload.get("source")
    if source is not None:
        if not isinstance(source, str):
            errors.append("Source must be a string.")
        elif source not in ALLOWED_SOURCES:
            errors.append("Source is not allowed.")

    version = payload.get("version")
    if version is not None:
        if not isinstance(version, int):
            errors.append("Version must be an integer.")
        elif version < 1:
            errors.append("Version must be >= 1.")

    return errors


def validate_and_normalize(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize optional fields so aggregation logic is consistent."""
    errors = validate_signal_payload(payload)
    if errors:
        raise ValueError("; ".join(errors))

    context = payload.get("context") or {}
    normalized_context = {}
    note = normalize_text(context.get("note"))
    event_id = normalize_text(context.get("eventId"))
    if note:
        normalized_context["note"] = note
    if event_id:
        normalized_context["eventId"] = event_id

    timestamp = format_iso8601(parse_iso8601(payload["timestamp"]))

    return {
        "signalId": payload.get("signalId") or str(uuid4()),
        "type": payload["type"],
        "timestamp": timestamp,
        "context": normalized_context,
        "source": payload.get("source") or "form",
        "version": payload.get("version") or 1,
    }
