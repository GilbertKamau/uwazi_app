from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from signals.aggregation import aggregate_signals
from signals.storage import append_signal, load_signals
from signals.types import SIGNAL_TYPES
from signals.validation import validate_and_normalize

DATA_PATH = Path(__file__).parent / "data" / "signals.json"

app = FastAPI(
    title="Integrity Signals API",
    version="1.0.0",
    description="API for submitting and aggregating integrity signals. "
    "Signals are validated, stored, and aggregated by group (window + type) only—never by individuals.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# In production, restrict this to your real frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models for request/response schemas ---


class ContextIn(BaseModel):
    """Optional context for a signal submission."""

    eventId: Optional[str] = Field(None, description="Related event identifier")
    note: Optional[str] = Field(None, description="Optional note")


class SignalIn(BaseModel):
    """Payload for submitting a new signal."""

    type: str = Field(
        ...,
        description="Signal type key (e.g. suspicious_timing_pattern, repeated_unusual_submissions)",
    )
    timestamp: str = Field(
        ...,
        description="ISO-8601 timestamp, e.g. 2026-01-24T20:10:00Z",
        examples=["2026-01-24T20:10:00Z"],
    )
    context: Optional[ContextIn] = None


class SignalTypeOut(BaseModel):
    """A signal type definition."""

    key: str
    description: str


class SignalOut(BaseModel):
    """Stored signal record (normalized)."""

    signalId: str
    type: str
    timestamp: str
    context: Dict[str, Any]
    source: str
    version: int


class SubmitSignalOut(BaseModel):
    """Response after successfully submitting a signal."""

    ok: bool = True
    signal: Dict[str, Any]


class AggregatedStatOut(BaseModel):
    """Aggregated stat for a window and signal type."""

    window: str
    type: str
    count: int
    baseline: float
    trend: str
    status: str


# --- Endpoints ---


@app.get(
    "/health",
    response_model=Dict[str, str],
    summary="Health check",
    tags=["Health"],
)
def health() -> Dict[str, str]:
    """Check that the API is running."""
    return {"status": "ok"}


@app.get(
    "/signal-types",
    response_model=List[SignalTypeOut],
    summary="List signal types",
    tags=["Signal Types"],
    description="Returns the list of allowed signal types that can be submitted.",
)
def list_signal_types() -> List[Dict[str, str]]:
    """List all allowed signal types."""
    return [{"key": st.key, "description": st.description} for st in SIGNAL_TYPES]


@app.post(
    "/signals",
    response_model=SubmitSignalOut,
    status_code=201,
    summary="Submit a signal",
    tags=["Signals"],
    description="Submit a new integrity signal. The payload is validated and normalized before storage.",
    responses={
        201: {"description": "Signal submitted successfully"},
        400: {"description": "Validation error (invalid type, timestamp, etc.)"},
    },
)
def submit_signal(payload: SignalIn) -> Dict[str, Any]:
    """Accept JSON, validate, normalize, then store."""
    try:
        normalized = validate_and_normalize(
            {
                "type": payload.type,
                "timestamp": payload.timestamp,
                "context": payload.context.model_dump() if payload.context else {},
                "source": "api",
                "version": 1,
            }
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    append_signal(DATA_PATH, normalized)
    return {"ok": True, "signal": normalized}


@app.get(
    "/stats",
    response_model=List[AggregatedStatOut],
    summary="Get aggregated stats",
    tags=["Stats"],
    description="Returns group-only aggregated counts and trends by window and signal type. "
    "Never exposes individual records.",
    responses={
        200: {"description": "List of aggregated stats"},
        400: {"description": "Invalid window parameter"},
    },
)
def get_stats(
    window: str = Query(
        "day",
        pattern="^(day|week)$",
        description="Aggregation window: 'day' or 'week'",
    ),
) -> List[Dict[str, Any]]:
    """Group-only reporting: returns aggregated counts/trends, not individual records."""
    signals = load_signals(DATA_PATH)
    stats = aggregate_signals(signals, window=window)
    return [stat.to_dict() for stat in stats]

