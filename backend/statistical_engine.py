"""
Statistical Engine — Statistical Modeling of Stock Returns Using Market Indicators
================================================================================
Implements ONLY the approved statistical scope:
  Module I  — Descriptive Statistics
  Module IX — Pearson Correlation
  Module X  — Simple & Multiple Regression + Evaluation

CONSTITUTION RULE: No advanced ML, no investment advice, no fabricated results.
Every formula is documented with its source definition.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# DATA STRUCTURES
# ---------------------------------------------------------------------------

@dataclass
class DescriptiveStats:
    """Results of Module I descriptive statistics for a single variable."""
    variable: str
    count: int
    mean: float
    median: float
    std_dev: float
    variance: float
    minimum: float
    maximum: float
    range_: float  # max - min


@dataclass
class PearsonResult:
    """Results of Module IX Pearson correlation for a variable pair."""
    x_label: str
    y_label: str
    r: float                  # Pearson r  (-1 to +1)
    n: int                    # number of paired observations
    interpretation: str       # plain-language, non-causal
    strength: str             # "strong", "moderate", "weak", "negligible"
    direction: str            # "positive", "negative", "none"


@dataclass
class RegressionResult:
    """Results of Module X regression (simple or multiple)."""
    model_type: str           # "simple" | "multiple"
    predictors: list[str]
    coefficients: dict[str, float]   # {"intercept": β₀, "market_return": β₁, ...}
    r_squared: float
    fitted_values: list[float]
    residuals: list[float]
    equation_string: str


@dataclass
class EvaluationResult:
    """Results of chronological train/test evaluation."""
    model_type: str
    train_size: int
    test_size: int
    train_start: str
    train_end: str
    test_start: str
    test_end: str
    r_squared_train: float
    mae: float
    rmse: float
    r_squared_test: float
    actual: list[float]
    predicted: list[float]
    dates: list[str]


# ---------------------------------------------------------------------------
# MODULE I — DESCRIPTIVE STATISTICS
# ---------------------------------------------------------------------------

def _mean(values: list[float]) -> float:
    """Population/sample mean: μ = (Σxᵢ) / n"""
    n = len(values)
    if n == 0:
        raise ValueError("Cannot compute mean of empty sequence.")
    return sum(values) / n


def _variance(values: list[float]) -> float:
    """
    Sample variance (Bessel's correction): s² = Σ(xᵢ - x̄)² / (n-1)
    Uses n-1 (sample) because we are working with a sample of trading days,
    not the entire population of all possible days.
    """
    n = len(values)
    if n < 2:
        raise ValueError("Variance requires at least 2 observations.")
    mu = _mean(values)
    return sum((x - mu) ** 2 for x in values) / (n - 1)


def _std_dev(values: list[float]) -> float:
    """Sample standard deviation: s = √(sample variance)"""
    return math.sqrt(_variance(values))


def _median(values: list[float]) -> float:
    """
    Median: middle value of a sorted sequence.
    For even n: average of two middle values.
    """
    n = len(values)
    if n == 0:
        raise ValueError("Cannot compute median of empty sequence.")
    sorted_vals = sorted(values)
    mid = n // 2
    if n % 2 == 1:
        return sorted_vals[mid]
    return (sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0


def calculate_descriptive_stats(values: list[float], variable_name: str) -> DescriptiveStats:
    """
    Compute all approved Module I descriptive statistics for a variable.

    Args:
        values: List of numeric observations (NaN/None already removed by pipeline).
        variable_name: Human-readable name of the variable.

    Returns:
        DescriptiveStats dataclass with all computed fields.
    """
    if len(values) < 2:
        raise ValueError(
            f"Insufficient observations for '{variable_name}': "
            f"need ≥ 2, got {len(values)}."
        )

    mu = _mean(values)
    med = _median(values)
    var = _variance(values)
    std = _std_dev(values)
    mn = min(values)
    mx = max(values)

    return DescriptiveStats(
        variable=variable_name,
        count=len(values),
        mean=round(mu, 6),
        median=round(med, 6),
        std_dev=round(std, 6),
        variance=round(var, 6),
        minimum=round(mn, 6),
        maximum=round(mx, 6),
        range_=round(mx - mn, 6),
    )


# ---------------------------------------------------------------------------
# MODULE IX — PEARSON CORRELATION
# ---------------------------------------------------------------------------

def _pearson_r(x: list[float], y: list[float]) -> float:
    """
    Pearson product-moment correlation coefficient:
        r = Σ((xᵢ - x̄)(yᵢ - ȳ))
            ─────────────────────────────────────
            √(Σ(xᵢ - x̄)²) × √(Σ(yᵢ - ȳ)²)

    Returns value in [-1, +1].
    Returns 0.0 if either variable has zero variance (constant series).
    """
    n = len(x)
    if n != len(y):
        raise ValueError("x and y must have equal length.")
    if n < 3:
        raise ValueError("Pearson r requires at least 3 paired observations.")

    x_bar = _mean(x)
    y_bar = _mean(y)

    num = sum((xi - x_bar) * (yi - y_bar) for xi, yi in zip(x, y))
    ss_x = sum((xi - x_bar) ** 2 for xi in x)
    ss_y = sum((yi - y_bar) ** 2 for yi in y)

    denom = math.sqrt(ss_x * ss_y)
    if denom == 0:
        return 0.0

    r = num / denom
    # Clamp to [-1, 1] to handle floating-point edge cases
    return max(-1.0, min(1.0, r))


def _interpret_pearson(r: float) -> tuple[str, str, str]:
    """
    Convert r to plain-language, non-causal interpretation.
    Returns (strength, direction, interpretation_text).

    LANGUAGE RULE: Never use "causes". Use "associated with" or "linear association".
    """
    abs_r = abs(r)

    if abs_r >= 0.8:
        strength = "strong"
    elif abs_r >= 0.6:
        strength = "moderate-to-strong"
    elif abs_r >= 0.4:
        strength = "moderate"
    elif abs_r >= 0.2:
        strength = "weak"
    else:
        strength = "negligible"

    if r > 0.05:
        direction = "positive"
        dir_phrase = "positive linear association"
    elif r < -0.05:
        direction = "negative"
        dir_phrase = "negative linear association"
    else:
        direction = "none"
        dir_phrase = "negligible linear association"

    if abs_r < 0.2:
        interp = (
            f"The analyzed sample shows negligible linear association "
            f"(r = {r:.4f}). This does not rule out non-linear relationships "
            f"or associations when controlling for other variables."
        )
    else:
        interp = (
            f"The analyzed sample shows a {strength} {dir_phrase} "
            f"(r = {r:.4f}). This describes the direction and degree of linear "
            f"co-movement in the observed data. Correlation does not establish causation."
        )

    return strength, direction, interp


def calculate_pearson(
    x: list[float], y: list[float],
    x_label: str, y_label: str
) -> PearsonResult:
    """
    Compute Pearson r and provide non-causal interpretation.

    Args:
        x, y: Paired numeric observations.
        x_label, y_label: Human-readable variable names.

    Returns:
        PearsonResult with r, n, and interpretation.
    """
    r = _pearson_r(x, y)
    strength, direction, interp = _interpret_pearson(r)

    return PearsonResult(
        x_label=x_label,
        y_label=y_label,
        r=round(r, 6),
        n=len(x),
        interpretation=interp,
        strength=strength,
        direction=direction,
    )


# ---------------------------------------------------------------------------
# MODULE X — REGRESSION
# ---------------------------------------------------------------------------

def _ols_simple(x: list[float], y: list[float]) -> tuple[float, float]:
    """
    Ordinary Least Squares for simple linear regression:
        β₁ = Σ((xᵢ - x̄)(yᵢ - ȳ)) / Σ(xᵢ - x̄)²
        β₀ = ȳ - β₁·x̄

    Returns (intercept β₀, slope β₁).
    """
    n = len(x)
    if n < 2:
        raise ValueError("OLS requires at least 2 observations.")

    x_bar = _mean(x)
    y_bar = _mean(y)

    ss_xy = sum((xi - x_bar) * (yi - y_bar) for xi, yi in zip(x, y))
    ss_xx = sum((xi - x_bar) ** 2 for xi in x)

    if ss_xx == 0:
        raise ValueError("Predictor has zero variance; cannot fit OLS regression.")

    beta1 = ss_xy / ss_xx
    beta0 = y_bar - beta1 * x_bar

    return round(beta0, 6), round(beta1, 6)


def _ols_multiple(X: list[list[float]], y: list[float]) -> list[float]:
    """
    Ordinary Least Squares for multiple linear regression using normal equations:
        β = (XᵀX)⁻¹ Xᵀy

    X is the design matrix (already includes intercept column of 1s).
    Returns coefficient vector [β₀, β₁, β₂, ...].
    """
    n = len(y)
    p = len(X[0])  # number of columns (including intercept)

    # Compute XᵀX (p × p matrix)
    XtX = [[0.0] * p for _ in range(p)]
    for row in X:
        for i in range(p):
            for j in range(p):
                XtX[i][j] += row[i] * row[j]

    # Compute Xᵀy (p-vector)
    Xty = [0.0] * p
    for k, row in enumerate(X):
        for i in range(p):
            Xty[i] += row[i] * y[k]

    # Solve XᵀX · β = Xᵀy using Gaussian elimination with partial pivoting
    coeffs = _gauss_solve(XtX, Xty)
    return [round(c, 6) for c in coeffs]


def _gauss_solve(A: list[list[float]], b: list[float]) -> list[float]:
    """Gaussian elimination with partial pivoting to solve A·x = b."""
    n = len(b)
    # Augmented matrix
    M = [A[i][:] + [b[i]] for i in range(n)]

    for col in range(n):
        # Partial pivot
        max_row = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[max_row] = M[max_row], M[col]

        pivot = M[col][col]
        if abs(pivot) < 1e-12:
            raise ValueError(
                "Matrix is singular or near-singular. "
                "Check for multicollinearity among predictors."
            )

        for row in range(col + 1, n):
            factor = M[row][col] / pivot
            for k in range(col, n + 1):
                M[row][k] -= factor * M[col][k]

    # Back substitution
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = M[i][n]
        for j in range(i + 1, n):
            x[i] -= M[i][j] * x[j]
        x[i] /= M[i][i]

    return x


def _r_squared(y_actual: list[float], y_fitted: list[float]) -> float:
    """
    R² = 1 - SS_res / SS_tot
    SS_res = Σ(yᵢ - ŷᵢ)²
    SS_tot = Σ(yᵢ - ȳ)²

    LANGUAGE RULE: R² is NOT an accuracy percentage.
    It describes the proportion of variance in y explained by the model.
    """
    y_bar = _mean(y_actual)
    ss_res = sum((yi - yh) ** 2 for yi, yh in zip(y_actual, y_fitted))
    ss_tot = sum((yi - y_bar) ** 2 for yi in y_actual)
    if ss_tot == 0:
        return 0.0
    return round(1.0 - ss_res / ss_tot, 6)


def fit_simple_regression(
    x: list[float], y: list[float],
    x_label: str = "Market Return"
) -> RegressionResult:
    """
    Fit simple OLS linear regression: Y = β₀ + β₁·X

    Args:
        x: Predictor variable values.
        y: Response variable (stock return) values.
        x_label: Human-readable predictor name.

    Returns:
        RegressionResult with coefficients, R², fitted values, residuals.
    """
    beta0, beta1 = _ols_simple(x, y)
    fitted = [beta0 + beta1 * xi for xi in x]
    residuals = [yi - yh for yi, yh in zip(y, fitted)]
    r2 = _r_squared(y, fitted)

    sign = "+" if beta1 >= 0 else "-"
    equation = (
        f"Stock Return = {beta0:.4f} {sign} {abs(beta1):.4f} × {x_label}"
    )

    return RegressionResult(
        model_type="simple",
        predictors=[x_label],
        coefficients={"intercept": beta0, x_label: beta1},
        r_squared=r2,
        fitted_values=[round(f, 6) for f in fitted],
        residuals=[round(r, 6) for r in residuals],
        equation_string=equation,
    )


def fit_multiple_regression(
    x_market: list[float],
    x_volume: list[float],
    x_prev: list[float],
    y: list[float],
) -> RegressionResult:
    """
    Fit multiple OLS regression:
        Stock Return = β₀ + β₁·MarketReturn + β₂·VolumeChange + β₃·PreviousReturn

    Args:
        x_market: Market return values.
        x_volume: Volume change values.
        x_prev:   Previous-day stock return values.
        y:        Current stock return values.

    Returns:
        RegressionResult with all coefficients, R², fitted values, residuals.
    """
    n = len(y)
    if not (len(x_market) == len(x_volume) == len(x_prev) == n):
        raise ValueError("All predictor and response arrays must have equal length.")

    # Design matrix with intercept column
    X = [[1.0, x_market[i], x_volume[i], x_prev[i]] for i in range(n)]

    coeffs = _ols_multiple(X, y)
    beta0, beta1, beta2, beta3 = coeffs

    fitted = [beta0 + beta1 * x_market[i] + beta2 * x_volume[i] + beta3 * x_prev[i]
              for i in range(n)]
    residuals = [y[i] - fitted[i] for i in range(n)]
    r2 = _r_squared(y, fitted)

    def _fmt(v: float) -> str:
        return f"+ {v:.4f}" if v >= 0 else f"- {abs(v):.4f}"

    equation = (
        f"Stock Return = {beta0:.4f} "
        f"{_fmt(beta1)} × Market Return "
        f"{_fmt(beta2)} × Volume Change "
        f"{_fmt(beta3)} × Previous Return"
    )

    return RegressionResult(
        model_type="multiple",
        predictors=["Market Return", "Volume Change", "Previous Return"],
        coefficients={
            "intercept": beta0,
            "Market Return": beta1,
            "Volume Change": beta2,
            "Previous Return": beta3,
        },
        r_squared=r2,
        fitted_values=[round(f, 6) for f in fitted],
        residuals=[round(r, 6) for r in residuals],
        equation_string=equation,
    )


# ---------------------------------------------------------------------------
# CHRONOLOGICAL EVALUATION
# ---------------------------------------------------------------------------

def create_chronological_split(
    n: int, test_fraction: float = 0.20
) -> tuple[list[int], list[int]]:
    """
    Create a strictly chronological train/test split.

    CONSTITUTION RULE: Earlier observations = training. Later = testing.
    Random split is FORBIDDEN for financial time-series.

    Args:
        n: Total number of observations.
        test_fraction: Fraction to reserve for testing (default 0.20 = 20%).

    Returns:
        (train_indices, test_indices) — non-overlapping, chronological.
    """
    if not 0 < test_fraction < 1:
        raise ValueError("test_fraction must be strictly between 0 and 1.")

    test_size = max(1, round(n * test_fraction))
    train_size = n - test_size

    if train_size < 5:
        raise ValueError(
            f"Insufficient training observations ({train_size}). "
            "Reduce test fraction or supply more data."
        )
    if test_size < 2:
        raise ValueError(
            f"Insufficient test observations ({test_size}). "
            "Increase test fraction or supply more data."
        )

    train_indices = list(range(train_size))
    test_indices = list(range(train_size, n))

    return train_indices, test_indices


def _mae(actual: list[float], predicted: list[float]) -> float:
    """
    Mean Absolute Error: MAE = (1/n) Σ|yᵢ - ŷᵢ|
    Interpretation: Average absolute magnitude of prediction error.
    """
    n = len(actual)
    if n == 0:
        return 0.0
    return round(sum(abs(a - p) for a, p in zip(actual, predicted)) / n, 6)


def _rmse(actual: list[float], predicted: list[float]) -> float:
    """
    Root Mean Squared Error: RMSE = √((1/n) Σ(yᵢ - ŷᵢ)²)
    Interpretation: Squared-error metric that penalises larger errors more heavily.
    LANGUAGE RULE: RMSE is NOT an accuracy percentage.
    """
    n = len(actual)
    if n == 0:
        return 0.0
    mse = sum((a - p) ** 2 for a, p in zip(actual, predicted)) / n
    return round(math.sqrt(mse), 6)


def evaluate_model_chronological(
    model_result: RegressionResult,
    x_market: list[float],
    x_volume: list[float],
    x_prev: list[float],
    y: list[float],
    dates: list[str],
    test_fraction: float = 0.20,
) -> EvaluationResult:
    """
    Evaluate a multiple regression model using a chronological train/test split.

    Args:
        model_result: Fitted regression model (coefficients from FULL training set).
        x_market, x_volume, x_prev: Predictor arrays.
        y: Actual stock return values.
        dates: ISO date strings aligned with the data arrays.
        test_fraction: Proportion of observations reserved for testing.

    Returns:
        EvaluationResult with MAE, RMSE, R², actual vs predicted for test set.
    """
    n = len(y)
    train_idx, test_idx = create_chronological_split(n, test_fraction)

    # Re-fit model on TRAINING DATA ONLY
    x_m_train = [x_market[i] for i in train_idx]
    x_v_train = [x_volume[i] for i in train_idx]
    x_p_train = [x_prev[i] for i in train_idx]
    y_train = [y[i] for i in train_idx]

    if model_result.model_type == "multiple":
        trained_model = fit_multiple_regression(x_m_train, x_v_train, x_p_train, y_train)
        b = trained_model.coefficients
        # Predict on TEST SET using training-fitted coefficients only
        y_pred = [
            b["intercept"]
            + b["Market Return"] * x_market[i]
            + b["Volume Change"] * x_volume[i]
            + b["Previous Return"] * x_prev[i]
            for i in test_idx
        ]
    else:
        # Simple regression using market return only
        x_train = [x_market[i] for i in train_idx]
        trained_model = fit_simple_regression(x_train, y_train, "Market Return")
        b = trained_model.coefficients
        y_pred = [
            b["intercept"] + b["Market Return"] * x_market[i]
            for i in test_idx
        ]

    y_actual = [y[i] for i in test_idx]
    test_dates = [dates[i] for i in test_idx]

    return EvaluationResult(
        model_type=model_result.model_type,
        train_size=len(train_idx),
        test_size=len(test_idx),
        train_start=dates[train_idx[0]],
        train_end=dates[train_idx[-1]],
        test_start=dates[test_idx[0]],
        test_end=dates[test_idx[-1]],
        r_squared_train=trained_model.r_squared,
        mae=_mae(y_actual, y_pred),
        rmse=_rmse(y_actual, y_pred),
        r_squared_test=_r_squared(y_actual, y_pred),
        actual=[round(v, 6) for v in y_actual],
        predicted=[round(v, 6) for v in y_pred],
        dates=test_dates,
    )


# ---------------------------------------------------------------------------
# SELF-TEST (run directly: python statistical_engine.py)
# ---------------------------------------------------------------------------

def _run_self_tests():
    """Quick numerical sanity checks against known values."""
    import sys

    print("Running statistical engine self-tests...")
    errors: list[str] = []

    # --- Mean ---
    assert abs(_mean([1, 2, 3, 4, 5]) - 3.0) < 1e-9, "Mean failed"

    # --- Variance (sample) ---
    var = _variance([2, 4, 4, 4, 5, 5, 7, 9])
    assert abs(var - 4.571428571) < 1e-6, f"Variance failed: {var}"

    # --- Pearson r: perfect positive ---
    r = _pearson_r([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    assert abs(r - 1.0) < 1e-9, f"Pearson perfect positive failed: {r}"

    # --- Pearson r: perfect negative ---
    r = _pearson_r([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])
    assert abs(r - (-1.0)) < 1e-9, f"Pearson perfect negative failed: {r}"

    # --- Pearson r: known value ---
    # x = [1,2,3,4,5], y = [1,3,2,5,4] → r ≈ 0.8
    r = _pearson_r([1, 2, 3, 4, 5], [1, 3, 2, 5, 4])
    assert abs(r - 0.8) < 1e-6, f"Pearson known value failed: {r}"

    # --- OLS simple regression ---
    # y = 2x + 1 exactly → β₀=1, β₁=2
    b0, b1 = _ols_simple([1, 2, 3, 4, 5], [3, 5, 7, 9, 11])
    assert abs(b0 - 1.0) < 1e-9, f"OLS intercept failed: {b0}"
    assert abs(b1 - 2.0) < 1e-9, f"OLS slope failed: {b1}"

    # --- R² = 1 for perfect fit ---
    fitted = [3.0, 5.0, 7.0, 9.0, 11.0]
    actual = [3.0, 5.0, 7.0, 9.0, 11.0]
    r2 = _r_squared(actual, fitted)
    assert abs(r2 - 1.0) < 1e-9, f"R² perfect fit failed: {r2}"

    # --- MAE ---
    mae = _mae([1, 2, 3], [1.5, 2.5, 3.5])
    assert abs(mae - 0.5) < 1e-9, f"MAE failed: {mae}"

    # --- RMSE ---
    rmse = _rmse([1, 2, 3], [2, 3, 4])
    assert abs(rmse - 1.0) < 1e-9, f"RMSE failed: {rmse}"

    # --- Chronological split: no overlap ---
    tr, te = create_chronological_split(100, 0.20)
    assert max(tr) < min(te), "Chronological split overlap detected!"
    assert len(tr) + len(te) == 100, "Chronological split size mismatch"

    # --- Multiple regression: known system ---
    # y = 1 + 2*x1 + 3*x2 exactly
    X_rows = [[1.0, 1.0, 1.0], [1.0, 2.0, 1.0], [1.0, 1.0, 2.0], [1.0, 2.0, 2.0]]
    y_vals = [1 + 2*r[1] + 3*r[2] for r in X_rows]
    coeffs = _ols_multiple(X_rows, y_vals)
    assert abs(coeffs[0] - 1.0) < 1e-6, f"Multiple OLS intercept: {coeffs[0]}"
    assert abs(coeffs[1] - 2.0) < 1e-6, f"Multiple OLS β₁: {coeffs[1]}"
    assert abs(coeffs[2] - 3.0) < 1e-6, f"Multiple OLS β₂: {coeffs[2]}"

    print(f"SUCCESS: All {9} statistical engine self-tests passed.")
    return True


if __name__ == "__main__":
    _run_self_tests()
