"""
Stock Return Prediction — Market Analytics API
=============================================
REST API exposing the market analytics engine and data pipeline to the React frontend.

Routes:
  POST /api/upload          — Upload and process CSV
  GET  /api/demo            — Load synthetic dataset
  GET  /api/dataset         — Get current dataset metadata
  GET  /api/descriptive     — Descriptive statistics
  GET  /api/correlation     — Pearson correlation analysis
  GET  /api/regression      — Regression results
  GET  /api/report          — Generate structured report data

CONSTITUTION RULE: This API NEVER fabricates results.
  If analysis is not available, it returns 404 with a clear message.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from data_pipeline import (
    AnalyticalDataset,
    generate_synthetic_dataset,
    run_pipeline,
)
from statistical_engine import (
    calculate_descriptive_stats,
    calculate_pearson,
    create_chronological_split,
    evaluate_model_chronological,
    fit_multiple_regression,
    fit_simple_regression,
)

# ---------------------------------------------------------------------------
# APP SETUP
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Stock Return Prediction — Market Analytics API",
    description=(
        "Market analytics backend for descriptive statistics, correlation analysis, "
        "and regression modeling of stock returns. "
        "The API reports historical statistical relationships and does not provide "
        "guaranteed future performance forecasts."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# GLOBAL ERROR CONTRACT
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "details": None
            }
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": exc.errors()
            }
        },
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error at {request.url.path}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "details": "See server logs for diagnostic information."
            }
        },
    )

# ---------------------------------------------------------------------------
# IN-MEMORY SESSION STATE
# ---------------------------------------------------------------------------

_session: dict[str, Optional[AnalyticalDataset]] = {}


def _get_dataset(session_id: str = "default") -> AnalyticalDataset:
    """Return current dataset for the session or raise 404."""
    ds = _session.get(session_id)
    if ds is None:
        raise HTTPException(
            status_code=404,
            detail="No dataset loaded. Upload a CSV file or load the demo dataset first."
        )
    return ds


def _dataset_to_dict(ds: AnalyticalDataset) -> dict:
    """Convert dataset to JSON-serializable dict for frontend."""
    return {
        "source_filename": ds.source_filename,
        "is_synthetic": ds.is_synthetic,
        "source_description": ds.source_description,
        "date_range_start": ds.date_range_start,
        "date_range_end": ds.date_range_end,
        "n_observations": ds.n_observations,
        "processing_log": [
            {
                "step": e.step,
                "status": e.status,
                "detail": e.detail,
                "rows_affected": e.rows_affected,
            }
            for e in ds.processing_log
        ],
        "quality_summary": {
            "total_rows": ds.quality_summary.total_rows,
            "valid_rows": ds.quality_summary.valid_rows,
            "duplicate_rows": ds.quality_summary.duplicate_rows,
            "missing_value_cells": ds.quality_summary.missing_value_cells,
            "invalid_value_cells": ds.quality_summary.invalid_value_cells,
            "date_ordering": ds.quality_summary.date_ordering,
            "required_columns_present": ds.quality_summary.required_columns_present,
            "analytical_rows": ds.quality_summary.analytical_rows,
            "warnings": ds.quality_summary.warnings,
            "errors": ds.quality_summary.errors,
        },
        "preview": {
            "dates": ds.dates[:10],
            "stock_return": ds.stock_return[:10],
            "market_return": ds.market_return[:10],
            "volume_change": ds.volume_change[:10],
            "prev_stock_return": ds.prev_stock_return[:10],
        }
    }


# ---------------------------------------------------------------------------
# ROUTES: DATA
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "scope": "Module I + IX + X"}


# ---------------------------------------------------------------------------
# ROOT ENDPOINT — makes direct backend access informative
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """
    Root endpoint. The React frontend is served independently by Vite.
    This endpoint exists only to make direct backend access clear — it does
    NOT serve the React application.
    """
    return {
        "service": "Stock Return Prediction API",
        "status": "ok",
        "version": "1.0.0",
        "frontend": "http://localhost:5173",
        "docs": "/docs",
        "api": "/api",
        "endpoints": [
            "GET  /api/health",
            "POST /api/upload",
            "GET  /api/demo",
            "GET  /api/dataset",
            "GET  /api/dataset/full",
            "GET  /api/descriptive",
            "GET  /api/correlation",
            "GET  /api/regression",
            "GET  /api/report",
        ]
    }


@app.post("/api/upload")
async def upload_csv(
    file: UploadFile = File(...),
    source_description: str = Form(default="User-provided dataset"),
    column_mapping: Optional[str] = Form(default=None),
    x_session_id: str = Header(default="default"),
):
    """
    Upload and process a CSV file through the data pipeline.
    If column_mapping is provided, it must be a JSON string:
      {"date": "Date", "stock_close": "Close", "volume": "Volume", "market_close": "NIFTY_Close"}
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported. Please upload a .csv file."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")

    # Parse column mapping if provided
    col_map = None
    if column_mapping:
        try:
            col_map = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="column_mapping must be valid JSON."
            )

    try:
        ds = run_pipeline(
            content=content,
            column_mapping=col_map,
            source_filename=file.filename,
            source_description=source_description,
            is_synthetic=False,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Data processing error: {str(e)}"
        )

    _session[x_session_id] = ds
    return _dataset_to_dict(ds)


@app.get("/api/demo")
def load_demo(x_session_id: str = Header(default="default")):
    """Load the synthetic teaching dataset."""
    ds = generate_synthetic_dataset()
    _session[x_session_id] = ds
    return _dataset_to_dict(ds)


@app.get("/api/dataset")
def get_dataset(x_session_id: str = Header(default="default")):
    """Return current dataset metadata (without full data arrays)."""
    ds = _get_dataset(x_session_id)
    return _dataset_to_dict(ds)


@app.get("/api/dataset/full")
def get_dataset_full(x_session_id: str = Header(default="default")):
    """Return full dataset including all analytical arrays for charting."""
    ds = _get_dataset(x_session_id)
    base = _dataset_to_dict(ds)
    base["full_data"] = {
        "dates": ds.dates,
        "stock_return": ds.stock_return,
        "market_return": ds.market_return,
        "volume_change": ds.volume_change,
        "prev_stock_return": ds.prev_stock_return,
    }
    return base


# ---------------------------------------------------------------------------
# ROUTES: MODULE I — DESCRIPTIVE STATISTICS
# ---------------------------------------------------------------------------

@app.get("/api/descriptive")
def descriptive_statistics(x_session_id: str = Header(default="default")):
    """
    Module I — Compute descriptive statistics for all analytical variables.
    Returns statistics for: stock_return, market_return, volume_change, prev_stock_return.
    """
    ds = _get_dataset(x_session_id)

    variables = {
        "Stock Return (%)": ds.stock_return,
        "Market Return (%)": ds.market_return,
        "Volume Change (%)": ds.volume_change,
        "Previous Stock Return (%)": ds.prev_stock_return,
    }

    results = []
    for name, values in variables.items():
        try:
            stats = calculate_descriptive_stats(values, name)
            results.append({
                "variable": stats.variable,
                "count": stats.count,
                "mean": stats.mean,
                "median": stats.median,
                "std_dev": stats.std_dev,
                "variance": stats.variance,
                "minimum": stats.minimum,
                "maximum": stats.maximum,
                "range": stats.range_,
            })
        except ValueError as e:
            results.append({
                "variable": name,
                "error": str(e),
            })

    return {
        "module": "Module I — Descriptive Statistics",
        "n_observations": ds.n_observations,
        "is_synthetic": ds.is_synthetic,
        "results": results,
    }


# ---------------------------------------------------------------------------
# ROUTES: MODULE IX — CORRELATION
# ---------------------------------------------------------------------------

@app.get("/api/correlation")
def pearson_correlation(x_session_id: str = Header(default="default")):
    """
    Module IX — Compute Pearson correlations between predictors and stock return.
    Pairs:
      1. Market Return ↔ Stock Return
      2. Volume Change ↔ Stock Return
      3. Previous Stock Return ↔ Current Stock Return
    Also computes full correlation matrix for all 4 variables.
    """
    ds = _get_dataset(x_session_id)
    y = ds.stock_return

    pairs = [
        ("Market Return (%)", ds.market_return, "market_vs_stock"),
        ("Volume Change (%)", ds.volume_change, "volume_vs_stock"),
        ("Previous Return (%)", ds.prev_stock_return, "prev_vs_stock"),
    ]

    correlations = []
    for x_label, x_vals, key in pairs:
        try:
            result = calculate_pearson(x_vals, y, x_label, "Stock Return (%)")
            correlations.append({
                "key": key,
                "x_label": result.x_label,
                "y_label": result.y_label,
                "r": result.r,
                "n": result.n,
                "strength": result.strength,
                "direction": result.direction,
                "interpretation": result.interpretation,
            })
        except ValueError as e:
            correlations.append({
                "key": key,
                "x_label": x_label,
                "y_label": "Stock Return (%)",
                "error": str(e),
            })

    # Build 4×4 correlation matrix
    all_vars = {
        "Stock Return": ds.stock_return,
        "Market Return": ds.market_return,
        "Volume Change": ds.volume_change,
        "Previous Return": ds.prev_stock_return,
    }
    var_names = list(all_vars.keys())
    matrix = []
    for row_name in var_names:
        row_vals = []
        for col_name in var_names:
            if row_name == col_name:
                row_vals.append(1.0)
            else:
                try:
                    r = calculate_pearson(
                        all_vars[row_name], all_vars[col_name],
                        row_name, col_name
                    ).r
                    row_vals.append(r)
                except Exception:
                    row_vals.append(None)
        matrix.append(row_vals)

    # Scatter plot data (sample up to 500 points for performance)
    n = ds.n_observations
    step = max(1, n // 500)
    scatter_indices = list(range(0, n, step))

    scatter = {
        "market_vs_stock": {
            "x": [ds.market_return[i] for i in scatter_indices],
            "y": [ds.stock_return[i] for i in scatter_indices],
        },
        "volume_vs_stock": {
            "x": [ds.volume_change[i] for i in scatter_indices],
            "y": [ds.stock_return[i] for i in scatter_indices],
        },
        "prev_vs_stock": {
            "x": [ds.prev_stock_return[i] for i in scatter_indices],
            "y": [ds.stock_return[i] for i in scatter_indices],
        },
    }

    return {
        "module": "Module IX — Pearson Correlation",
        "n_observations": ds.n_observations,
        "is_synthetic": ds.is_synthetic,
        "correlations": correlations,
        "matrix": {
            "variables": var_names,
            "values": matrix,
        },
        "scatter_data": scatter,
        "disclaimer": (
            "Correlation describes the direction and strength of linear association "
            "in the analyzed sample. It does NOT establish causation."
        ),
    }


# ---------------------------------------------------------------------------
# ROUTES: MODULE X — REGRESSION
# ---------------------------------------------------------------------------

@app.get("/api/regression")
def regression(test_fraction: float = 0.20, x_session_id: str = Header(default="default")):
    """
    Module X — Fit simple and multiple regression models.
    Also computes chronological evaluation metrics.
    """
    if not 0.05 <= test_fraction <= 0.40:
        raise HTTPException(
            status_code=400,
            detail="test_fraction must be between 0.05 and 0.40."
        )

    ds = _get_dataset(x_session_id)
    y = ds.stock_return
    x_m = ds.market_return
    x_v = ds.volume_change
    x_p = ds.prev_stock_return
    
    # Enforce regression minimum observation threshold
    n_obs = ds.n_observations
    n_train = n_obs - int(n_obs * test_fraction)
    if n_train < 16:  # 10 + (2 * 3 predictors)
        raise HTTPException(
            status_code=422,
            detail=f"Insufficient training observations ({n_train}). Project-level minimum observation threshold used to prevent extremely small regression samples (n >= 16)."
        )

    # Fit on full dataset
    try:
        simple = fit_simple_regression(x_m, y, "Market Return")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Simple regression failed: {e}")

    try:
        multiple = fit_multiple_regression(x_m, x_v, x_p, y)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Multiple regression failed: {e}")

    # Chronological evaluation
    try:
        eval_simple = evaluate_model_chronological(
            simple, x_m, x_v, x_p, y, ds.dates, test_fraction
        )
        eval_multiple = evaluate_model_chronological(
            multiple, x_m, x_v, x_p, y, ds.dates, test_fraction
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Evaluation failed: {e}")

    # Scatter data for actual vs fitted (full dataset, sampled)
    n = ds.n_observations
    step = max(1, n // 300)
    idx = list(range(0, n, step))

    return {
        "module": "Module X — Regression",
        "n_observations": ds.n_observations,
        "is_synthetic": ds.is_synthetic,
        "test_fraction_used": test_fraction,

        "simple_regression": {
            "equation": simple.equation_string,
            "coefficients": simple.coefficients,
            "r_squared_full": simple.r_squared,
            "predictors": simple.predictors,
            "fitted_vs_actual_sample": {
                "dates": [ds.dates[i] for i in idx],
                "actual": [y[i] for i in idx],
                "fitted": [simple.fitted_values[i] for i in idx],
            },
            "residuals_sample": {
                "fitted": [simple.fitted_values[i] for i in idx],
                "residuals": [simple.residuals[i] for i in idx],
            },
            "evaluation": {
                "train_size": eval_simple.train_size,
                "test_size": eval_simple.test_size,
                "train_start": eval_simple.train_start,
                "train_end": eval_simple.train_end,
                "test_start": eval_simple.test_start,
                "test_end": eval_simple.test_end,
                "r_squared_train": eval_simple.r_squared_train,
                "mae": eval_simple.mae,
                "rmse": eval_simple.rmse,
                "r_squared_test": eval_simple.r_squared_test,
                "actual": eval_simple.actual,
                "predicted": eval_simple.predicted,
                "dates": eval_simple.dates,
            }
        },

        "multiple_regression": {
            "equation": multiple.equation_string,
            "coefficients": multiple.coefficients,
            "r_squared_full": multiple.r_squared,
            "predictors": multiple.predictors,
            "fitted_vs_actual_sample": {
                "dates": [ds.dates[i] for i in idx],
                "actual": [y[i] for i in idx],
                "fitted": [multiple.fitted_values[i] for i in idx],
            },
            "residuals_sample": {
                "fitted": [multiple.fitted_values[i] for i in idx],
                "residuals": [multiple.residuals[i] for i in idx],
            },
            "evaluation": {
                "train_size": eval_multiple.train_size,
                "test_size": eval_multiple.test_size,
                "train_start": eval_multiple.train_start,
                "train_end": eval_multiple.train_end,
                "test_start": eval_multiple.test_start,
                "test_end": eval_multiple.test_end,
                "r_squared_train": eval_multiple.r_squared_train,
                "mae": eval_multiple.mae,
                "rmse": eval_multiple.rmse,
                "r_squared_test": eval_multiple.r_squared_test,
                "actual": eval_multiple.actual,
                "predicted": eval_multiple.predicted,
                "dates": eval_multiple.dates,
            }
        },

        "model_comparison": {
            "simple": {
                "r_squared_full": simple.r_squared,
                "mae_test": eval_simple.mae,
                "rmse_test": eval_simple.rmse,
                "r_squared_test": eval_simple.r_squared_test,
                "n_predictors": len(simple.predictors),
            },
            "multiple": {
                "r_squared_full": multiple.r_squared,
                "mae_test": eval_multiple.mae,
                "rmse_test": eval_multiple.rmse,
                "r_squared_test": eval_multiple.r_squared_test,
                "n_predictors": len(multiple.predictors),
            },
        },

        "language_note": (
            "Regression coefficients describe the estimated linear association "
            "between predictors and stock return in the fitted model. "
            "They do not imply causation or guarantee future performance."
        ),
    }


# ---------------------------------------------------------------------------
# ROUTES: REPORT
# ---------------------------------------------------------------------------

@app.get("/api/report")
def generate_report(test_fraction: float = 0.20, x_session_id: str = Header(default="default")):
    """
    Generate structured report data from actual analysis results.
    CONSTITUTION RULE: Every value must come from analysis engine. Zero fabrication.
    If analysis is not yet computed, returns partial report with placeholders.
    """
    ds = _get_dataset(x_session_id)

    # Run all analyses
    try:
        desc_resp = descriptive_statistics(x_session_id)
        corr_resp = pearson_correlation(x_session_id)
        reg_resp = regression(test_fraction, x_session_id)
        analyses_available = True
    except Exception as e:
        analyses_available = False
        error_msg = str(e)

    report = {
        "title": "Stock Return Prediction",
        "subtitle": "Market Analytics Report",
        "is_synthetic": ds.is_synthetic,
        "synthetic_disclaimer": (
            "⚠ SYNTHETIC DEMO DATASET — All results in this report are based on "
            "artificially generated data for demonstration purposes only. "
            "This report does NOT reflect real financial observations."
        ) if ds.is_synthetic else None,
        "dataset": {
            "source_filename": ds.source_filename,
            "source_description": ds.source_description,
            "date_range": f"{ds.date_range_start} to {ds.date_range_end}",
            "n_observations": ds.n_observations,
            "is_synthetic": ds.is_synthetic,
        },
        "disclaimer": (
            "This analysis summarizes historical market data using descriptive statistics, "
            "correlation, and regression. Statistical relationships do not imply future "
            "performance or guarantee predictive accuracy."
        ),
        "analyses_available": analyses_available,
    }

    if analyses_available:
        report["descriptive_statistics"] = desc_resp["results"]
        report["correlation"] = corr_resp["correlations"]
        report["correlation_matrix"] = corr_resp["matrix"]
        report["simple_regression"] = reg_resp["simple_regression"]
        report["multiple_regression"] = reg_resp["multiple_regression"]
        report["model_comparison"] = reg_resp["model_comparison"]
    else:
        report["error"] = f"Analysis could not be completed: {error_msg}"

    return report
