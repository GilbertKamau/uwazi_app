from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def load_signals(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Signals file must contain a JSON list.")
    return data


def append_signal(path: Path, record: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    signals = load_signals(path)
    signals.append(record)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(signals, handle, indent=2, sort_keys=True)
