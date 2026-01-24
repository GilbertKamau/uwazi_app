# The following import allows the use of postponed evaluation of type annotations (PEP 563).
# This enables the code to use annotations as string literals, which makes it possible to
# use types before they are actually defined in the code. It's most useful in type hints,
# especially for type checkers and static analyzers.
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from signals.aggregation import aggregate_signals
from signals.charts import render_basic_charts
from signals.form import prompt_for_signal
from signals.storage import append_signal, load_signals
from signals.utils import format_iso8601
from signals.validation import validate_and_normalize

DATA_PATH = Path(__file__).parent / "data" / "signals.json"
OUTPUT_DIR = Path(__file__).parent / "output"


def _payload_from_args(args: argparse.Namespace) -> Dict[str, Any]:
    context: Dict[str, Any] = {}
    if args.event_id:
        context["eventId"] = args.event_id
    if args.note:
        context["note"] = args.note

    timestamp = args.timestamp or format_iso8601(datetime.now(timezone.utc))

    return {
        "type": args.type,
        "timestamp": timestamp,
        "context": context,
        "source": "form",
        "version": 1,
    }


def _handle_submit(args: argparse.Namespace) -> int:
    if args.interactive or not args.type:
        payload = prompt_for_signal()
    else:
        payload = _payload_from_args(args)

    try:
        normalized = validate_and_normalize(payload)
    except ValueError as exc:
        print(f"Validation failed: {exc}")
        return 1

    append_signal(DATA_PATH, normalized)
    print(f"Signal stored in {DATA_PATH}")
    return 0


def _handle_aggregate(args: argparse.Namespace) -> int:
    signals = load_signals(DATA_PATH)
    stats = aggregate_signals(signals, window=args.window)
    payload = [stat.to_dict() for stat in stats]

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
        print(f"Aggregates saved to {output_path}")

    print(json.dumps(payload, indent=2))
    return 0


def _handle_charts(args: argparse.Namespace) -> int:
    signals = load_signals(DATA_PATH)
    stats = aggregate_signals(signals, window=args.window)
    outputs = render_basic_charts(stats, OUTPUT_DIR)
    if outputs:
        print("Charts written:")
        for path in outputs:
            print(f"- {path}")
    else:
        print("No data available for charts.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Integrity signal utilities")
    subparsers = parser.add_subparsers(dest="command", required=True)

    submit_parser = subparsers.add_parser("submit", help="Submit a signal")
    submit_parser.add_argument("--type", help="Signal type key")
    submit_parser.add_argument("--timestamp", help="ISO-8601 timestamp")
    submit_parser.add_argument("--event-id", help="Optional eventId")
    submit_parser.add_argument("--note", help="Optional note")
    submit_parser.add_argument(
        "--interactive",
        action="store_true",
        help="Use the interactive signal form",
    )
    submit_parser.set_defaults(func=_handle_submit)

    aggregate_parser = subparsers.add_parser("aggregate", help="Aggregate signals")
    aggregate_parser.add_argument(
        "--window",
        choices=["day", "week"],
        default="day",
        help="Aggregation window",
    )
    aggregate_parser.add_argument(
        "--output",
        help="Optional path to save aggregates as JSON",
    )
    aggregate_parser.set_defaults(func=_handle_aggregate)

    chart_parser = subparsers.add_parser("charts", help="Render basic charts")
    chart_parser.add_argument(
        "--window",
        choices=["day", "week"],
        default="day",
        help="Aggregation window",
    )
    chart_parser.set_defaults(func=_handle_charts)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
