from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List

from .models import AggregatedStat


def _stats_to_dicts(stats: Iterable[Any]) -> List[Dict[str, Any]]:
    converted: List[Dict[str, Any]] = []
    for stat in stats:
        if isinstance(stat, AggregatedStat):
            converted.append(stat.to_dict())
        elif isinstance(stat, dict):
            converted.append(stat)
    return converted


def _build_matrix(stats: List[Dict[str, Any]]):
    windows = sorted({str(item["window"]) for item in stats})
    types = sorted({item["type"] for item in stats})
    counts = {
        (str(item["window"]), item["type"]): int(item["count"])
        for item in stats
    }
    matrix = [
        [counts.get((window, signal_type), 0) for signal_type in types]
        for window in windows
    ]
    return windows, types, matrix


def render_basic_charts(stats: Iterable[Any], output_dir: Path) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    stats_list = _stats_to_dicts(stats)
    if not stats_list:
        return []

    windows, types, matrix = _build_matrix(stats_list)
    totals = [sum(row) for row in matrix]
    outputs: List[Path] = []

    try:
        import matplotlib.pyplot as plt

        plt.figure(figsize=(10, 4))
        plt.plot(windows, totals, marker="o")
        plt.title("Total Signals by Window")
        plt.xlabel("Window")
        plt.ylabel("Count")
        plt.xticks(rotation=45, ha="right")
        plt.tight_layout()
        line_path = output_dir / "counts_by_window.png"
        plt.savefig(line_path)
        plt.close()
        outputs.append(line_path)

        plt.figure(figsize=(10, 4))
        bottoms = [0] * len(windows)
        for index, signal_type in enumerate(types):
            values = [row[index] for row in matrix]
            plt.bar(windows, values, bottom=bottoms, label=signal_type)
            bottoms = [bottoms[i] + values[i] for i in range(len(values))]
        plt.title("Stacked Signals by Type")
        plt.xlabel("Window")
        plt.ylabel("Count")
        plt.xticks(rotation=45, ha="right")
        plt.legend()
        plt.tight_layout()
        stacked_path = output_dir / "stacked_by_type.png"
        plt.savefig(stacked_path)
        plt.close()
        outputs.append(stacked_path)

        plt.figure(figsize=(8, 4))
        type_totals = [sum(row[index] for row in matrix) for index in range(len(types))]
        plt.bar(types, type_totals)
        plt.title("Totals by Signal Type")
        plt.xlabel("Signal Type")
        plt.ylabel("Count")
        plt.xticks(rotation=30, ha="right")
        plt.tight_layout()
        totals_path = output_dir / "totals_by_type.png"
        plt.savefig(totals_path)
        plt.close()
        outputs.append(totals_path)

        return outputs
    except Exception:
        ascii_path = output_dir / "charts.txt"
        with ascii_path.open("w", encoding="utf-8") as handle:
            handle.write("Total signals by window\n")
            for window, total in zip(windows, totals):
                handle.write(f"{window} | {'#' * total} ({total})\n")
            handle.write("\nSignals by type per window\n")
            for window, row in zip(windows, matrix):
                counts = ", ".join(f"{types[i]}={row[i]}" for i in range(len(types)))
                handle.write(f"{window} | {counts}\n")
        return [ascii_path]
