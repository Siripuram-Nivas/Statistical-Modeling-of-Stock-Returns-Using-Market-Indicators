import json
from datetime import date, timedelta
from fastapi.testclient import TestClient
from main import app
from statistical_engine import fit_multiple_regression

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "scope": "Module I + IX + X"}

def test_demo_load_and_session_isolation():
    # T-028: Session isolation
    # Session A
    res_a = client.get("/api/demo", headers={"X-Session-ID": "session_a"})
    assert res_a.status_code == 200
    # Session B
    res_b = client.get("/api/demo", headers={"X-Session-ID": "session_b"})
    assert res_b.status_code == 200

    # Ensure isolation by fetching dataset
    res_a_fetch = client.get("/api/dataset", headers={"X-Session-ID": "session_a"})
    assert res_a_fetch.status_code == 200
    
    # Try an unknown session
    res_c = client.get("/api/dataset", headers={"X-Session-ID": "unknown"})
    assert res_c.status_code == 404
    # T-026: API error responses structure
    assert "error" in res_c.json()
    assert res_c.json()["error"]["code"] == "HTTP_404"

def test_guided_demo_session_does_not_overwrite_uploaded_dataset():
    rows = ["Date,Close,Volume,Market_Close"]
    for index in range(40):
        trading_date = date(2024, 1, 1) + timedelta(days=index)
        rows.append(
            f"{trading_date.isoformat()},{100 + index * 0.4},{1000 + index * 15},{5000 + index * 4}"
        )
    csv_content = "\n".join(rows)

    uploaded = client.post(
        "/api/upload",
        files={"file": ("real-market-data.csv", csv_content, "text/csv")},
        data={"source_description": "Session isolation test"},
        headers={"X-Session-ID": "guided-demo-user-session"},
    )
    assert uploaded.status_code == 200
    assert uploaded.json()["is_synthetic"] is False

    demo = client.get("/api/demo", headers={"X-Session-ID": "guided-demo-isolated-session"})
    assert demo.status_code == 200
    assert demo.json()["is_synthetic"] is True

    user_dataset = client.get(
        "/api/dataset",
        headers={"X-Session-ID": "guided-demo-user-session"},
    )
    assert user_dataset.status_code == 200
    assert user_dataset.json()["source_filename"] == "real-market-data.csv"
    assert user_dataset.json()["is_synthetic"] is False

    isolated_demo = client.get(
        "/api/dataset",
        headers={"X-Session-ID": "guided-demo-isolated-session"},
    )
    assert isolated_demo.status_code == 200
    assert isolated_demo.json()["is_synthetic"] is True

def test_cors_headers():
    # T-029: CORS
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

def test_statistical_endpoints():
    # Load demo dataset first
    client.get("/api/demo", headers={"X-Session-ID": "test_session"})

    # T-027: Frontend/backend integration (smoke testing endpoints)
    res_desc = client.get("/api/descriptive", headers={"X-Session-ID": "test_session"})
    assert res_desc.status_code == 200
    assert "module" in res_desc.json()

    res_corr = client.get("/api/correlation", headers={"X-Session-ID": "test_session"})
    assert res_corr.status_code == 200
    assert "matrix" in res_corr.json()

    res_reg = client.get("/api/regression?test_fraction=0.20", headers={"X-Session-ID": "test_session"})
    assert res_reg.status_code == 200
    data = res_reg.json()
    
    # T-021: Multiple regression coefficients
    coeffs = data["multiple_regression"]["coefficients"]
    assert "intercept" in coeffs
    assert "Market Return" in coeffs

    # T-022: Multiple regression predictions
    # Predictions should be present in actual vs fitted
    fitted = data["multiple_regression"]["fitted_vs_actual_sample"]["fitted"]
    assert len(fitted) > 0

    # T-023: Training R² (full)
    r2_train = data["multiple_regression"]["r_squared_full"]
    assert isinstance(r2_train, float)

    # T-024: Test R² (eval)
    r2_test = data["multiple_regression"]["evaluation"]["r_squared_test"]
    assert isinstance(r2_test, float)

    # Training R² is computed from the chronological training subset.
    r2_train = data["multiple_regression"]["evaluation"]["r_squared_train"]
    assert isinstance(r2_train, float)
    assert data["simple_regression"]["evaluation"]["r_squared_train"] is not None
    full_dataset = client.get(
        "/api/dataset/full",
        headers={"X-Session-ID": "test_session"},
    ).json()["full_data"]
    train_size = len(full_dataset["stock_return"]) - round(len(full_dataset["stock_return"]) * 0.20)
    expected_train_model = fit_multiple_regression(
        full_dataset["market_return"][:train_size],
        full_dataset["volume_change"][:train_size],
        full_dataset["prev_stock_return"][:train_size],
        full_dataset["stock_return"][:train_size],
    )
    assert abs(r2_train - expected_train_model.r_squared) < 1e-12

def test_validation_thresholds():
    # T-025: API validation
    # Send a bad test_fraction
    res = client.get("/api/regression?test_fraction=0.99", headers={"X-Session-ID": "test_session"})
    assert res.status_code == 400
    assert "error" in res.json()
    assert res.json()["error"]["code"] == "HTTP_400"
