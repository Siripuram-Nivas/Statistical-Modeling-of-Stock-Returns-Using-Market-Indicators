"""
Data Pipeline — Statistical Modeling of Stock Returns Using Market Indicators
=============================================================================
Implements the canonical data pipeline from the project specification:

  RAW DATA → VALIDATE → SORT CHRONOLOGICALLY → DOCUMENT INVALID/MISSING
  → CALCULATE RETURNS → CALCULATE MARKET RETURN → CALCULATE VOLUME CHANGE
  → CREATE PREVIOUS RETURN → REMOVE NON-CALCULABLE LAG ROWS
  → FINAL ANALYTICAL DATASET

CONSTITUTION RULES:
  - Every transformation is logged and visible
  - Never silently discard or alter data
  - Never fabricate observations
  - Synthetic data must be explicitly flagged
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Optional


# ---------------------------------------------------------------------------
# DATA STRUCTURES
# ---------------------------------------------------------------------------

@dataclass
class ProcessingLogEntry:
    step: str
    status: str          # "ok" | "warning" | "error" | "info"
    detail: str
    rows_affected: int = 0


@dataclass
class DataQualitySummary:
    total_rows: int
    valid_rows: int
    duplicate_rows: int
    missing_value_cells: int
    invalid_value_cells: int
    date_ordering: str       # "correct" | "unsorted" | "corrected"
    required_columns_present: bool
    analytical_rows: int     # rows after lag removal
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


@dataclass
class AnalyticalDataset:
    """The final dataset ready for statistical analysis."""
    dates: list[str]
    stock_return: list[float]
    market_return: list[float]
    volume_change: list[float]
    prev_stock_return: list[float]
    # Metadata
    source_filename: str
    is_synthetic: bool
    source_description: str
    date_range_start: str
    date_range_end: str
    n_observations: int
    processing_log: list[ProcessingLogEntry]
    quality_summary: DataQualitySummary


# ---------------------------------------------------------------------------
# COLUMN MAPPING
# ---------------------------------------------------------------------------

# Canonical internal name → list of accepted CSV column names (case-insensitive)
COLUMN_ALIASES: dict[str, list[str]] = {
    "date":         ["date", "timestamp", "trading_date", "trade_date", "day"],
    "stock_close":  ["close", "stock_close", "adj_close", "adjusted_close", "price"],
    "volume":       ["volume", "stock_volume", "vol", "shares_traded"],
    "market_close": [
        "market_close", "nifty_close", "index_close", "market_index",
        "sensex_close", "spy_close", "market", "benchmark"
    ],
}


def detect_column_mapping(headers: list[str]) -> dict[str, Optional[str]]:
    """
    Attempt to automatically map CSV headers to required internal field names.

    Returns dict: internal_name → matched_csv_header (or None if not found).
    Low-confidence matches are kept as None; the UI must ask the user.
    """
    mapping: dict[str, Optional[str]] = {}
    headers_lower = {h.lower().strip(): h for h in headers}

    for internal, aliases in COLUMN_ALIASES.items():
        found = None
        for alias in aliases:
            if alias in headers_lower:
                found = headers_lower[alias]
                break
        mapping[internal] = found

    return mapping


def validate_column_mapping(mapping: dict[str, Optional[str]]) -> list[str]:
    """Return list of required fields that could not be auto-mapped."""
    return [field for field, col in mapping.items() if col is None]


# ---------------------------------------------------------------------------
# PARSING HELPERS
# ---------------------------------------------------------------------------

_DATE_FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%m/%d/%Y",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%d-%b-%Y",
    "%b %d, %Y",
    "%Y%m%d",
]


def _parse_date(value: str) -> Optional[date]:
    """Try multiple date formats. Return None if all fail."""
    value = value.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _parse_float(value: Any) -> Optional[float]:
    """Parse a numeric value from any input type."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", "")
    if s in ("", "nan", "null", "n/a", "na", "-", "#n/a"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# CSV PARSING
# ---------------------------------------------------------------------------

def parse_csv(
    content: str | bytes,
    column_mapping: Optional[dict[str, str]] = None,
) -> tuple[list[dict[str, Any]], list[str], list[ProcessingLogEntry]]:
    """
    Parse CSV content, apply column mapping, and return raw rows.

    Args:
        content: CSV file content as string or bytes.
        column_mapping: Override auto-detection (internal_name → csv_header).

    Returns:
        (rows, headers, log_entries)
    """
    log: list[ProcessingLogEntry] = []

    if isinstance(content, bytes):
        content = content.decode("utf-8-sig", errors="replace")

    # Sniff delimiter
    sniffer = csv.Sniffer()
    sample = content[:2048]
    try:
        dialect = sniffer.sniff(sample)
    except csv.Error:
        dialect = csv.excel

    reader = csv.DictReader(io.StringIO(content), dialect=dialect)
    headers = reader.fieldnames or []

    if not headers:
        log.append(ProcessingLogEntry(
            step="CSV Parse", status="error",
            detail="No column headers found in the uploaded file."
        ))
        return [], [], log

    log.append(ProcessingLogEntry(
        step="CSV Parse", status="ok",
        detail=f"Parsed CSV with {len(headers)} columns: {', '.join(headers)}."
    ))

    # Auto-detect or use provided mapping
    if column_mapping is None:
        column_mapping = detect_column_mapping(list(headers))

    missing = validate_column_mapping(column_mapping)
    if missing:
        log.append(ProcessingLogEntry(
            step="Column Mapping", status="warning",
            detail=f"Could not auto-map: {', '.join(missing)}. User mapping required."
        ))

    rows = []
    for raw_row in reader:
        row: dict[str, Any] = {}
        for internal, csv_col in column_mapping.items():
            if csv_col and csv_col in raw_row:
                row[internal] = raw_row[csv_col]
            else:
                row[internal] = None
        rows.append(row)

    log.append(ProcessingLogEntry(
        step="CSV Parse", status="ok",
        detail=f"Read {len(rows)} data rows from CSV."
    ))

    return rows, list(headers), log


# ---------------------------------------------------------------------------
# VALIDATION
# ---------------------------------------------------------------------------

def validate_and_clean(
    rows: list[dict[str, Any]],
    log: list[ProcessingLogEntry],
) -> tuple[list[dict[str, Any]], DataQualitySummary]:
    """
    Validate raw rows and build a data quality summary.

    Operations:
      1. Parse date field
      2. Parse numeric fields
      3. Identify blank/invalid cells
      4. Remove duplicate dates (keep first occurrence, log count)
      5. Sort chronologically
      6. Flag negative close prices (invalid)

    Returns cleaned rows (with parsed types) and quality summary.
    """
    total_rows = len(rows)
    missing_value_cells = 0
    invalid_value_cells = 0
    invalid_rows_idx: list[int] = []
    seen_dates: set[date] = set()
    duplicate_count = 0
    cleaned: list[dict[str, Any]] = []

    for idx, row in enumerate(rows):
        row_errors = []

        # --- Date ---
        raw_date = row.get("date")
        if raw_date is None or str(raw_date).strip() == "":
            missing_value_cells += 1
            row_errors.append("missing date")
            row["_date_parsed"] = None
        else:
            parsed = _parse_date(str(raw_date))
            if parsed is None:
                invalid_value_cells += 1
                row_errors.append(f"invalid date format '{raw_date}'")
                row["_date_parsed"] = None
            else:
                if parsed in seen_dates:
                    duplicate_count += 1
                    row_errors.append(f"duplicate date {parsed}")
                    row["_date_parsed"] = None
                else:
                    seen_dates.add(parsed)
                    row["_date_parsed"] = parsed

        # --- Numeric fields ---
        for field_name in ("stock_close", "volume", "market_close"):
            raw_val = row.get(field_name)
            parsed_val = _parse_float(raw_val)
            if parsed_val is None:
                missing_value_cells += 1
                row_errors.append(f"missing/invalid {field_name}")
            elif field_name in ("stock_close", "market_close") and parsed_val <= 0:
                invalid_value_cells += 1
                row_errors.append(f"non-positive {field_name}={parsed_val}")
                parsed_val = None
            elif field_name == "volume" and parsed_val < 0:
                invalid_value_cells += 1
                row_errors.append(f"negative volume={parsed_val}")
                parsed_val = None
            row[field_name] = parsed_val

        if row_errors:
            invalid_rows_idx.append(idx)
            row["_is_valid"] = False
            row["_errors"] = row_errors
        else:
            row["_is_valid"] = True
            row["_errors"] = []

        cleaned.append(row)

    # Keep only fully valid rows with parsed dates
    valid_rows = [
        r for r in cleaned
        if r["_is_valid"] and r["_date_parsed"] is not None
    ]
    valid_count = len(valid_rows)

    # Sort chronologically
    pre_sort_order = [r["_date_parsed"] for r in valid_rows]
    valid_rows.sort(key=lambda r: r["_date_parsed"])
    post_sort_order = [r["_date_parsed"] for r in valid_rows]

    if pre_sort_order == post_sort_order:
        date_ordering = "correct"
        log.append(ProcessingLogEntry(
            step="Date Sort", status="ok",
            detail="Data is already in chronological order."
        ))
    else:
        date_ordering = "corrected"
        log.append(ProcessingLogEntry(
            step="Date Sort", status="info",
            detail="Data was not in chronological order and has been sorted ascending.",
            rows_affected=valid_count
        ))

    if duplicate_count > 0:
        log.append(ProcessingLogEntry(
            step="Duplicate Detection", status="warning",
            detail=f"{duplicate_count} duplicate date(s) found and removed.",
            rows_affected=duplicate_count
        ))

    warnings = []
    errors_list = []

    if total_rows - valid_count > 0:
        dropped = total_rows - valid_count
        msg = f"{dropped} row(s) dropped due to missing/invalid values or duplicates."
        warnings.append(msg)
        log.append(ProcessingLogEntry(
            step="Row Filtering", status="warning",
            detail=msg, rows_affected=dropped
        ))

    if valid_count < 30:
        msg = f"Only {valid_count} valid rows remain. Results may not be statistically reliable."
        warnings.append(msg)

    quality = DataQualitySummary(
        total_rows=total_rows,
        valid_rows=valid_count,
        duplicate_rows=duplicate_count,
        missing_value_cells=missing_value_cells,
        invalid_value_cells=invalid_value_cells,
        date_ordering=date_ordering,
        required_columns_present=True,
        analytical_rows=0,  # updated after lag removal below
        warnings=warnings,
        errors=errors_list,
    )

    return valid_rows, quality


# ---------------------------------------------------------------------------
# RETURN CALCULATIONS
# ---------------------------------------------------------------------------

def calculate_returns(
    valid_rows: list[dict[str, Any]],
    log: list[ProcessingLogEntry],
) -> list[dict[str, Any]]:
    """
    Calculate all derived return variables:
      - stock_return(t) = ((close_t - close_{t-1}) / close_{t-1}) × 100
      - market_return(t) = ((mkt_t - mkt_{t-1}) / mkt_{t-1}) × 100
      - volume_change(t) = ((vol_t - vol_{t-1}) / vol_{t-1}) × 100  [zero-safe]
      - prev_stock_return(t) = stock_return(t-1)

    The first row cannot have a return (requires previous row); it is removed.
    The second row cannot have prev_stock_return; it is also removed.
    Therefore we lose 2 leading rows per the specification.

    CONSTITUTION RULE: All transformations logged.
    """
    n = len(valid_rows)
    if n < 3:
        raise ValueError(
            f"Insufficient rows ({n}) for return calculation. Need ≥ 3."
        )

    enriched = []
    for i in range(n):
        row = valid_rows[i].copy()

        if i == 0:
            # First row: no previous period — cannot calculate any return
            row["stock_return"] = None
            row["market_return"] = None
            row["volume_change"] = None
            row["prev_stock_return"] = None
            enriched.append(row)
            continue

        prev = valid_rows[i - 1]

        # Stock return
        c_curr = row["stock_close"]
        c_prev = prev["stock_close"]
        if c_curr is not None and c_prev is not None and c_prev > 0:
            row["stock_return"] = ((c_curr - c_prev) / c_prev) * 100.0
        else:
            row["stock_return"] = None

        # Market return
        m_curr = row["market_close"]
        m_prev = prev["market_close"]
        if m_curr is not None and m_prev is not None and m_prev > 0:
            row["market_return"] = ((m_curr - m_prev) / m_prev) * 100.0
        else:
            row["market_return"] = None

        # Volume change (guard against zero denominator)
        v_curr = row["volume"]
        v_prev = prev["volume"]
        if v_curr is not None and v_prev is not None and v_prev > 0:
            row["volume_change"] = ((v_curr - v_prev) / v_prev) * 100.0
        elif v_curr is not None and v_prev == 0:
            # Cannot compute % change from zero — log and skip
            row["volume_change"] = None
        else:
            row["volume_change"] = None

        # Previous stock return (requires i ≥ 2)
        row["prev_stock_return"] = None  # filled in next pass

        enriched.append(row)

    # Fill prev_stock_return (requires i ≥ 2)
    for i in range(2, n):
        sr_prev = enriched[i - 1]["stock_return"]
        enriched[i]["prev_stock_return"] = sr_prev

    log.append(ProcessingLogEntry(
        step="Return Calculation", status="ok",
        detail=(
            "Calculated: stock_return, market_return, volume_change, prev_stock_return. "
            "Formula: ((current - previous) / previous) × 100."
        )
    ))

    # Remove non-calculable lag rows (first 2)
    before_count = len(enriched)
    final = [
        r for r in enriched
        if all(
            r.get(k) is not None
            for k in ("stock_return", "market_return", "volume_change", "prev_stock_return")
        )
    ]
    removed = before_count - len(final)
    log.append(ProcessingLogEntry(
        step="Lag Row Removal", status="info",
        detail=f"Removed {removed} non-calculable lag row(s) (first 2 rows by definition).",
        rows_affected=removed
    ))

    return final


# ---------------------------------------------------------------------------
# MAIN PIPELINE
# ---------------------------------------------------------------------------

def run_pipeline(
    content: str | bytes,
    column_mapping: Optional[dict[str, str]] = None,
    source_filename: str = "unknown.csv",
    source_description: str = "User-provided dataset",
    is_synthetic: bool = False,
    test_fraction: float = 0.20,
) -> AnalyticalDataset:
    """
    Execute the complete data pipeline from raw CSV to analytical dataset.

    This is the single entry point for all data processing.

    Args:
        content: Raw CSV bytes or string.
        column_mapping: Optional override for column detection.
        source_filename: Name of the uploaded file.
        source_description: Human-readable source description.
        is_synthetic: True if this is a synthetic teaching dataset.
        test_fraction: Reserved (not used in pipeline; passed through).

    Returns:
        AnalyticalDataset ready for statistical analysis.

    Raises:
        ValueError: If the data is too corrupted or insufficient for analysis.
    """
    log: list[ProcessingLogEntry] = []

    # STEP 1: Parse CSV
    raw_rows, headers, parse_log = parse_csv(content, column_mapping)
    log.extend(parse_log)

    if not raw_rows:
        raise ValueError("The uploaded file contains no parseable rows.")

    # STEP 2: Validate and clean
    valid_rows, quality = validate_and_clean(raw_rows, log)

    if len(valid_rows) < 10:
        raise ValueError(
            f"Only {len(valid_rows)} valid rows after cleaning. "
            "At least 10 valid observations are required."
        )

    # STEP 3: Calculate returns
    analytical_rows = calculate_returns(valid_rows, log)

    if len(analytical_rows) < 8:
        raise ValueError(
            f"Only {len(analytical_rows)} analytical rows after return calculation. "
            "Insufficient for meaningful statistical analysis."
        )

    quality.analytical_rows = len(analytical_rows)

    log.append(ProcessingLogEntry(
        step="Pipeline Complete", status="ok",
        detail=(
            f"Final analytical dataset: {len(analytical_rows)} observations. "
            f"Date range: {analytical_rows[0]['_date_parsed']} → "
            f"{analytical_rows[-1]['_date_parsed']}."
        )
    ))

    return AnalyticalDataset(
        dates=[str(r["_date_parsed"]) for r in analytical_rows],
        stock_return=[round(r["stock_return"], 6) for r in analytical_rows],
        market_return=[round(r["market_return"], 6) for r in analytical_rows],
        volume_change=[round(r["volume_change"], 6) for r in analytical_rows],
        prev_stock_return=[round(r["prev_stock_return"], 6) for r in analytical_rows],
        source_filename=source_filename,
        is_synthetic=is_synthetic,
        source_description=source_description,
        date_range_start=str(analytical_rows[0]["_date_parsed"]),
        date_range_end=str(analytical_rows[-1]["_date_parsed"]),
        n_observations=len(analytical_rows),
        processing_log=log,
        quality_summary=quality,
    )


# ---------------------------------------------------------------------------
# SYNTHETIC DEMO DATASET
# ---------------------------------------------------------------------------

def generate_synthetic_dataset() -> AnalyticalDataset:
    """
    Generate a clearly-labelled synthetic teaching dataset.

    CONSTITUTION RULE:
      This dataset is for APPLICATION DEMONSTRATION ONLY.
      It must NEVER be used as a source of real financial claims.
      The is_synthetic flag must be True.
      Reports generated from this data must carry a prominent disclaimer.

    The dataset simulates 252 trading days (~1 year) with
    realistic-looking but entirely artificial values.
    """
    import random
    random.seed(42)  # Deterministic for reproducibility

    n_days = 252
    dates = []
    stock_closes = []
    market_closes = []
    volumes = []

    # Seed prices
    stock_price = 1000.0
    market_price = 15000.0
    base_volume = 1_000_000.0

    # Generate price series
    from datetime import date, timedelta
    start = date(2023, 1, 2)

    day = start
    count = 0
    while count < n_days:
        # Skip weekends
        if day.weekday() < 5:
            dates.append(day)
            market_shock = random.gauss(0.0, 0.8)
            stock_move = 0.7 * market_shock + random.gauss(0.0, 0.4)
            volume_factor = 1.0 + random.gauss(0.0, 0.15)

            stock_price = max(10.0, stock_price * (1 + stock_move / 100))
            market_price = max(1000.0, market_price * (1 + market_shock / 100))
            vol = max(10_000, base_volume * volume_factor)

            stock_closes.append(round(stock_price, 2))
            market_closes.append(round(market_price, 2))
            volumes.append(round(vol, 0))
            count += 1
        day += timedelta(days=1)

    # Build CSV content
    lines = ["date,close,volume,market_close"]
    for i in range(n_days):
        lines.append(f"{dates[i]},{stock_closes[i]},{int(volumes[i])},{market_closes[i]}")

    csv_content = "\n".join(lines)

    result = run_pipeline(
        content=csv_content,
        column_mapping={
            "date": "date",
            "stock_close": "close",
            "volume": "volume",
            "market_close": "market_close",
        },
        source_filename="synthetic_demo.csv",
        source_description="Synthetic Teaching Dataset — For Application Demonstration Only",
        is_synthetic=True,
    )

    return result
