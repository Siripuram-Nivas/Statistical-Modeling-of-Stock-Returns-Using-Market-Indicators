# PROJECT MEMORY

## Phase 2: Statistical Engine (FastAPI)

### Current Status: 🟡 NOT CLOSED YET

**Phase 2 Gate Checklist:**
- [x] Mathematical tests pass
- [x] HTTP/API tests pass
- [x] Test collection count reconciled (6/6 tests collected and passing)
- [x] Edge cases pass
- [x] Training/test separation verified
- [x] Error contract verified (Stack traces hidden from user, logged internally)
- [x] Session isolation verified (the user session ID is retained for the browser tab; Guided Demo uses a separate session ID)
- [ ] CodeRabbit review completed
- [ ] Critical CodeRabbit findings resolved
- [x] PROJECT_MEMORY updated

### Architectural Decisions & Behaviors
- **Error Handling**: The generic exception handler in `main.py` hides the raw exception string from API clients to prevent information leakage, but logs the full traceback internally using `logging.error(..., exc_info=True)`.
- **Session Isolation**: The frontend retains the user's `X-Session-ID` in `sessionStorage` across page reloads and restores dataset metadata from that session. Backend datasets remain in memory, so a backend restart clears the user's dataset. Guided Demo uses its own session ID and reloads a synthetic dataset if that demo session is missing.

## Guided Demo

- The Overview and Tools navigation launch the nine-step Guided Demo.
- The Overview has a single demo entry point; loading a synthetic dataset directly into the user session remains an explicit action in Market Data.
- Focused manual review found the former Overview "Explore Demo" action could load synthetic data into the retained user session, so that duplicate action was removed; no other Guided Demo blockers were found.
- Demo state uses a dedicated backend session ID, separate from the retained user session. Starting or restarting a demo therefore does not overwrite an uploaded dataset.
- The active demo session, step, return destination, and current page are stored in `sessionStorage`. Refreshing resumes the walkthrough; if the backend has restarted and lost its in-memory demo dataset, the frontend regenerates the synthetic demo dataset in the same demo session.
- During a live session, exiting restores the user's full in-memory UI state. After a browser refresh, exiting reloads the user's dataset metadata from the retained session; analysis results are recalculated as their pages are visited.
- Guided steps focus real Market Data, Descriptive Statistics, Correlation, Regression, and Model Evaluation UI elements. Displayed statistics and coefficients come from the existing API/engine.
- Chronological evaluation now returns `r_squared_train` from the training-only OLS fit. This exposes the engine's existing R² calculation for the actual training subset; no formula or model behavior changed.
- API validation includes a separate-session test that uploads a real dataset, loads synthetic demo data in another session, and verifies both datasets remain isolated.
- Final browser verification traversed all nine steps, confirmed live descriptive/correlation/regression/evaluation results and spotlight targets, tested refresh recovery including a missing demo-session 404 fallback, previous/next/exit/restart, and checked the walkthrough panel at a 390px viewport. The retained user session remained unchanged.
