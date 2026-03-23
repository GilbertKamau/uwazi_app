from __future__ import annotations

import json
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, urlparse

from signals.aggregation import aggregate_signals
from signals.storage import append_signal, load_signals
from signals.types import SIGNAL_TYPES
from signals.utils import format_iso8601
from signals.validation import validate_and_normalize

DATA_PATH = Path(__file__).parent / "data" / "signals.json"


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    # CORS (dev-friendly). In production, restrict Access-Control-Allow-Origin.
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler) -> Tuple[bool, Any]:
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        return False, {"error": "Invalid Content-Length"}
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    try:
        return True, json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return False, {"error": "Body must be valid JSON"}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        # Keep output minimal for hackathon demos.
        return

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = parse_qs(parsed.query)

        if path == "/health":
            _json_response(self, 200, {"status": "ok"})
            return

        if path == "/signal-types":
            _json_response(
                self,
                200,
                [{"key": st.key, "description": st.description} for st in SIGNAL_TYPES],
            )
            return

        if path == "/stats":
            window = (query.get("window", ["day"])[0] or "day").strip()
            if window not in {"day", "week"}:
                _json_response(self, 400, {"error": "window must be 'day' or 'week'"})
                return

            signals = load_signals(DATA_PATH)
            stats = aggregate_signals(signals, window=window)
            _json_response(self, 200, [stat.to_dict() for stat in stats])
            return

        _json_response(self, 404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        if path != "/signals":
            _json_response(self, 404, {"error": "Not found"})
            return

        ok, body = _read_json(self)
        if not ok:
            _json_response(self, 400, body)
            return

        # Expected body shape:
        # {
        #   "type": "...",
        #   "timestamp": "ISO-8601" (optional; default now),
        #   "context": { "eventId": "...", "note": "..." } (optional)
        # }
        if not isinstance(body, dict):
            _json_response(self, 400, {"error": "Body must be a JSON object"})
            return

        timestamp = body.get("timestamp") or format_iso8601(datetime.now(timezone.utc))
        context = body.get("context") or {}

        try:
            normalized = validate_and_normalize(
                {
                    "type": body.get("type"),
                    "timestamp": timestamp,
                    "context": context,
                    "source": "api",
                    "version": 1,
                }
            )
        except ValueError as exc:
            _json_response(self, 400, {"error": str(exc)})
            return

        append_signal(DATA_PATH, normalized)
        _json_response(self, 201, {"ok": True, "signal": normalized})


def main() -> None:
    host = "127.0.0.1"
    port = 8000
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port}")
    print("Endpoints: GET /health, GET /signal-types, POST /signals, GET /stats?window=day|week")
    server.serve_forever()


if __name__ == "__main__":
    main()

