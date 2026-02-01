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

app = FastAPI(title="Integrity Signals API", version="1.0.0")

# In production, restrict this to your real frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ContextIn(BaseModel):
    eventId: Optional[str] = None
    note: Optional[str] = None


class SignalIn(BaseModel):
    type: str = Field(..., description="Signal type key")
    timestamp: str = Field(..., description="ISO-8601 timestamp, e.g. 2026-01-24T20:10:00Z")
    context: Optional[ContextIn] = None


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/signal-types")
def list_signal_types() -> List[Dict[str, str]]:
    return [{"key": st.key, "description": st.description} for st in SIGNAL_TYPES]


@app.post("/signals")
def submit_signal(payload: SignalIn) -> Dict[str, Any]:
    # Accept JSON, validate, normalize, then store.
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


@app.get("/stats")
def get_stats(
    window: str = Query("day", pattern="^(day|week)$"),
) -> List[Dict[str, Any]]:
    # Group-only reporting: returns aggregated counts/trends, not individual records.
    signals = load_signals(DATA_PATH)
    stats = aggregate_signals(signals, window=window)
    return [stat.to_dict() for stat in stats]

