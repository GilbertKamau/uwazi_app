# Enable postponed evaluation of type annotations (PEP 563):
# Allows type hints to use names not yet defined (forward references),
# helping with circular imports and improving compatibility with static analyzers.
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict

from .utils import format_iso8601, parse_iso8601


@dataclass(frozen=True)
class SignalRecord:
    signal_id: str
    type: str
    timestamp: datetime
    context: Dict[str, Any]
    source: str
    version: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "signalId": self.signal_id,
            "type": self.type,
            "timestamp": format_iso8601(self.timestamp),
            "context": self.context,
            "source": self.source,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "SignalRecord":
        return cls(
            signal_id=payload["signalId"],
            type=payload["type"],
            timestamp=parse_iso8601(payload["timestamp"]),
            context=payload.get("context", {}),
            source=payload.get("source", "form"),
            version=payload.get("version", 1),
        )


@dataclass(frozen=True)
class AggregatedStat:
    window: date
    type: str
    count: int
    baseline: float
    trend: str
    status: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "window": self.window.isoformat(),
            "type": self.type,
            "count": self.count,
            "baseline": round(self.baseline, 2),
            "trend": self.trend,
            "status": self.status,
        }
