// Module X — Regression + Evaluation Page

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { TrendingUp, Activity, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GUIDED_DEMO_STEPS } from '../guidedDemo';
import {
  LoadingDots, EmptyState, ErrorAlert, SyntheticBanner,
  Explainer, SectionHeader, ModuleBadge, Num, R2Indicator, InfoAlert
} from '../components/UI';

// ─── Coefficient Table ────────────────────────────────────────────────────────
function CoefficientTable({ coefficients, predictors, beginnerMode }) {
  const rows = [
    { key: 'intercept', label: 'Intercept (β₀)', explanation: 'Baseline estimated stock return when all predictors equal zero.' },
    ...predictors.map((p, i) => ({
      key: p, label: `${p} (β${i + 1})`,
      explanation: `Estimated change in stock return associated with a one-unit increase in ${p}, holding other predictors constant.`
    }))
  ];

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Predictor</th>
          <th className="num">Coefficient</th>
          {beginnerMode && <th>Interpretation</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.key}>
            <td style={{ fontWeight: 600 }}>{r.label}</td>
            <td className="num"><Num v={coefficients[r.key]} decimals={6} /></td>
            {beginnerMode && <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{r.explanation}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Model Comparison Card ────────────────────────────────────────────────────
function ModelComparison({ comparison, testFraction }) {
  const { simple, multiple } = comparison;
  const metrics = [
    { key: 'r_squared_full', label: 'R² (full dataset)', note: 'Proportion of variance explained — NOT accuracy' },
    { key: 'r_squared_test', label: 'R² (test set)', note: `Chronological ${Math.round(testFraction * 100)}% hold-out` },
    { key: 'mae_test', label: 'MAE (test)', note: 'Mean Absolute Error — average magnitude of prediction error' },
    { key: 'rmse_test', label: 'RMSE (test)', note: 'Root Mean Squared Error — penalises larger errors more' },
    { key: 'n_predictors', label: 'Predictors', note: 'Number of predictors in model' },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th className="num">Simple Regression</th>
            <th className="num">Multiple Regression</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => (
            <tr key={m.key}>
              <td style={{ fontWeight: 600 }}>{m.label}</td>
              <td className="num"><Num v={simple[m.key]} decimals={m.key === 'n_predictors' ? 0 : 6} /></td>
              <td className="num"><Num v={multiple[m.key]} decimals={m.key === 'n_predictors' ? 0 : 6} /></td>
              <td style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{m.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
        ⚠ Do not interpret R² as "accuracy". These metrics describe statistical performance in the analyzed dataset only.
        Lower MAE/RMSE = smaller average prediction error on held-out data.
      </p>
    </div>
  );
}

// ─── Actual vs Predicted Chart ────────────────────────────────────────────────
function ActualVsPredicted({ evalData, title }) {
  if (!evalData?.actual?.length) return null;

  const chartData = evalData.dates.map((d, i) => ({
    date: d,
    actual: evalData.actual[i],
    predicted: evalData.predicted[i],
    error: (evalData.actual[i] - evalData.predicted[i]),
  }));

  return (
    <div>
      <div className="chart-container" style={{ marginBottom: '1rem' }}>
        <div className="chart-title">{title} — Test Set</div>
        <div className="chart-question">How well do predicted values track actual stock returns?</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={v => v?.slice(5)} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="custom-tooltip">
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{label}</div>
                    {payload.map(p => (
                      <div key={p.name} style={{ color: p.color, fontSize: '0.8125rem' }}>
                        {p.name}: {p.value?.toFixed(4)}%
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>
                      Error: {(payload[0]?.payload?.error).toFixed(4)}%
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--color-accent)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="predicted" name="Predicted" stroke="var(--color-warning)" dot={false} strokeWidth={2} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Residual plot */}
      <div className="chart-container">
        <div className="chart-title">Residual Plot</div>
        <div className="chart-question">Are errors randomly distributed (no systematic pattern)?</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={v => v?.slice(5)} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <div className="custom-tooltip">
                <div style={{ fontWeight: 700 }}>{label}</div>
                <div>Residual: {payload[0]?.value?.toFixed(4)}%</div>
              </div>
            ) : null} />
            <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="4 2" />
            <Line type="monotone" dataKey="error" name="Residual" stroke="var(--color-danger)" dot={false} strokeWidth={1} />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
          Residual = Observed − Predicted. Values near zero indicate good fit. Systematic patterns may indicate model limitations.
        </p>
      </div>
    </div>
  );
}

// ─── Split Info ───────────────────────────────────────────────────────────────
function SplitInfo({ evalData, testFraction }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'
    }}>
      <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '1rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
          Training Set ({evalData.train_size} obs)
        </div>
        <div style={{ fontWeight: 700 }}>{evalData.train_start} → {evalData.train_end}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>
          Model is fitted on this data only
        </div>
      </div>
      <div style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, padding: '1rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
          Test Set ({evalData.test_size} obs)
        </div>
        <div style={{ fontWeight: 700 }}>{evalData.test_start} → {evalData.test_end}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>
          Evaluation on <em>unseen, later</em> data
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RegressionPage({ view = 'regression' }) {
  const {
    dataset, regression, runRegression, beginnerMode, testFraction, setTestFraction,
    guidedDemo,
  } = useApp();
  const isEvaluationView = view === 'evaluation' || (guidedDemo.active && guidedDemo.step === 7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('simple');
  const activeTab = guidedDemo.active
    ? GUIDED_DEMO_STEPS[guidedDemo.step].regressionTab || selectedTab
    : selectedTab;

  useEffect(() => {
    if (dataset && !regression) {
      setLoading(true);
      runRegression(testFraction).catch(e => setError(e.message)).finally(() => setLoading(false));
    }
  }, [dataset]);

  const handleTestFractionChange = (val) => {
    setTestFraction(val);
    setLoading(true);
    runRegression(val).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  if (!dataset) {
    return (
      <EmptyState
        icon={Database}
        title="No Dataset Loaded"
        subtitle="Load a dataset to fit regression models."
      />
    );
  }

  const reg = regression;
  const activeModel = reg?.[`${activeTab}_regression`];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <SectionHeader
        title={isEvaluationView ? 'Model Evaluation' : 'Linear Regression'}
        subtitle={isEvaluationView
          ? 'Evaluating simple and multiple regression models on later observations'
          : 'Fitting OLS regression models (simple and multiple)'}
        badge={<ModuleBadge label="Module X" />}
      />

      {dataset.is_synthetic && <SyntheticBanner />}

      <Explainer title="What is OLS Regression?" show={beginnerMode}>
        <p>
          Ordinary Least Squares (OLS) regression fits a linear equation to minimize the sum of squared errors
          between actual and fitted values. <strong>Simple regression</strong> uses one predictor;
          <strong> multiple regression</strong> uses three.
          The coefficients represent the <em>estimated linear association</em> — not causation.
        </p>
      </Explainer>

      {/* Test fraction selector */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Test Set Fraction:</div>
          {[0.10, 0.15, 0.20, 0.25].map(f => (
            <button
              key={f}
              className={`btn ${testFraction === f ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleTestFractionChange(f)}
              style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
            >
              {Math.round(f * 100)}%
            </button>
          ))}
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
            Test set is always chronologically later than training set (no random mixing).
          </div>
        </div>
      </div>

      {loading && <LoadingDots label="Fitting regression models..." />}
      {error && <ErrorAlert message={error} />}

      {reg && (
        <>
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {['simple', 'multiple'].map(t => (
              <button
                key={t}
                className={`btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedTab(t)}
              >
                {t === 'simple' ? 'Simple Regression (1 predictor)' : 'Multiple Regression (3 predictors)'}
              </button>
            ))}
          </div>

          {activeModel && (
            <>
              {!isEvaluationView && (
                <>
                  <div
                    className="card"
                    data-guided-demo-target={activeTab === 'simple' ? 'demo-simple-equation' : 'demo-multiple-equation'}
                    style={{ marginBottom: '1.5rem' }}
                  >
                    <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Fitted Equation</h3>
                    <div className="equation-box">{activeModel.equation}</div>
                    <Explainer title="Reading the equation" show={beginnerMode}>
                      The first term is the intercept (β₀). Each subsequent term shows the estimated linear association
                      between that predictor and stock return. All coefficients were computed by OLS on the training set.
                      "Associated with" — not "causes".
                    </Explainer>
                  </div>

                  <div
                    className="card"
                    data-guided-demo-target={activeTab === 'simple' ? 'demo-simple-coefficients' : 'demo-multiple-coefficients'}
                    style={{ marginBottom: '1.5rem' }}
                  >
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Coefficients</h3>
                    <CoefficientTable
                      coefficients={activeModel.coefficients}
                      predictors={activeModel.predictors}
                      beginnerMode={beginnerMode}
                    />
                  </div>

                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Explanatory Performance (Full Dataset)</h3>
                    <R2Indicator value={activeModel.r_squared_full} />
                    <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      R² = <strong>{activeModel.r_squared_full?.toFixed(6)}</strong> — The model accounts for{' '}
                      {(activeModel.r_squared_full * 100).toFixed(2)}% of the total variance in stock return across the full dataset.
                    </div>
                  </div>
                </>
              )}

              {isEvaluationView && <div className="card" data-guided-demo-target="demo-model-evaluation" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Chronological Evaluation</h3>
                <InfoAlert message="The model is trained on earlier observations only. Evaluation is performed on later, unseen observations. This prevents future data from informing the training." />
                <div style={{ marginTop: '1rem' }}>
                  <SplitInfo evalData={activeModel.evaluation} testFraction={testFraction} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div className="card" style={{ padding: '0.875rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>R² (Training)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {activeModel.evaluation.r_squared_train?.toFixed(4)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Variance explained on training data</div>
                    </div>
                    <div className="card" style={{ padding: '0.875rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>MAE (Test)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {activeModel.evaluation.mae?.toFixed(4)}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Average absolute error</div>
                    </div>
                    <div className="card" style={{ padding: '0.875rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>RMSE (Test)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {activeModel.evaluation.rmse?.toFixed(4)}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Root mean squared error</div>
                    </div>
                    <div className="card" style={{ padding: '0.875rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>R² (Test)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {activeModel.evaluation.r_squared_test?.toFixed(4)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>On held-out test set</div>
                    </div>
                  </div>
                </div>
              </div>}

              {isEvaluationView && <div className="card" data-guided-demo-target="demo-actual-predicted" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Actual vs. Predicted — Test Period</h3>
                <ActualVsPredicted
                  evalData={activeModel.evaluation}
                  title={activeTab === 'simple' ? 'Simple Regression' : 'Multiple Regression'}
                />
              </div>}
            </>
          )}

          {isEvaluationView && <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Model Comparison</h3>
            <ModelComparison comparison={reg.model_comparison} testFraction={testFraction} />
            <Explainer title="How to interpret the comparison" show={beginnerMode}>
              <p>
                Compare <strong>test-set metrics</strong> (not full-dataset R²) to understand out-of-sample performance.
                A model is not "better" simply because it has a higher full-dataset R²—it may be overfitting.
                Lower MAE and RMSE indicate smaller average prediction errors on unseen data.
                Honest reporting: if both models perform poorly, this is a valid finding.
              </p>
            </Explainer>
          </div>}

          {isEvaluationView && <div className="disclaimer">
            {reg.language_note}
          </div>}
        </>
      )}
    </div>
  );
}
