"""
Public Vendor Index gating.

A benchmark cell (e.g. "ZoomInfo, SaaS, 201-500 employees") may be shown publicly
ONLY once it is backed by enough records AND enough distinct customers, so no
single client's list can be reverse-engineered from a sparse cell.

Thresholds locked 2026-06-16: n >= 30 records AND >= 5 distinct customers.

This module is pure (no DB calls) so it's trivially testable. The aggregation
query lives wherever the index is served; pass its output through `gate_cells`
before anything reaches a public surface. Internal/admin views may bypass this.
"""
from __future__ import annotations

from typing import Iterable

MIN_RECORDS = 30
MIN_CUSTOMERS = 5


def is_publishable(record_count: int, distinct_customers: int) -> bool:
    """True if a cell clears both the record-count and distinct-customer floors."""
    try:
        n = int(record_count or 0)
        c = int(distinct_customers or 0)
    except (TypeError, ValueError):
        return False
    return n >= MIN_RECORDS and c >= MIN_CUSTOMERS


def gate_cells(
    cells: Iterable[dict],
    record_key: str = "n",
    customers_key: str = "distinct_customers",
) -> list[dict]:
    """Return only the cells safe to publish. Each cell is a dict with a record
    count and a distinct-customer count under the given keys. Missing/None counts
    are treated as 0 (i.e. suppressed)."""
    return [
        cell
        for cell in cells
        if is_publishable(cell.get(record_key, 0), cell.get(customers_key, 0))
    ]
