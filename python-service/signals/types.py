from dataclasses import dataclass


@dataclass(frozen=True)
class SignalType:
    key: str
    description: str


SIGNAL_TYPES = [
    SignalType(
        key="suspicious_timing_pattern",
        description="Submissions clustered in unlikely time windows.",
    ),
    SignalType(
        key="repeated_unusual_submissions",
        description="Multiple unusual submissions within a short period.",
    ),
    SignalType(
        key="sudden_score_spikes",
        description="Abrupt increases in scores beyond typical variance.",
    ),
    SignalType(
        key="multiple_submissions_same_device",
        description="High volume of submissions from a single device.",
    ),
]

ALLOWED_SIGNAL_TYPES = {signal_type.key for signal_type in SIGNAL_TYPES}
