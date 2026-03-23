def evaluate_normality(
    count: int,
    baseline: float,
    *,
    threshold: float = 2.0,
    min_count_for_review: int = 3,
) -> str:
    """Simple group-level check to avoid individual accusations."""
    if baseline <= 0:
        return "Needs Review" if count >= min_count_for_review else "Normal"
    return "Needs Review" if count > baseline * threshold else "Normal"
