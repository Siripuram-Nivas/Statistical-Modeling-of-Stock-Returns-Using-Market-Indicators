// Module IX — Pearson Correlation Page

import React, { useEffect, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ChartInteractions from '../components/ChartInteractions';
import {
  LoadingDots, EmptyState, ErrorAlert, SyntheticBanner,
  Explainer, SectionHeader, ModuleBadge, CorrelationBadge, InfoAlert
} from '../components/UI';

// ─── Correlation matrix cell color ───────────────────────────────────────────
function rToColor(r) {
  if (r === null || r === undefined) return '#334155';
  const abs = Math.abs(r);
  if (r === 1.0) return '#1e3a5f';
  if (abs >= 0.7) return r > 0 ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)';
  if (abs >= 0.4) return r > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)';
  if (abs >= 0.2) return r > 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)';
  return 'rgba(71,85,105,0.2)';
}

// ─── Scatter plot ─────────────────────────────────────────────────────────────
function CorrelationScatter({ data, xLabel, yLabel, r, color }) {
  const points = (data?.x || []).map((x, i) => ({
    date: data?.dates?.[i],
    x,
    y: data?.y?.[i],
  })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  return (
    <div className="chart-container">
      <div className="chart-title">{xLabel} vs {yLabel}</div>
      <div className="chart-question">
        Is there a linear association? r = <strong style={{ color }}>{r?.toFixed(4)}</strong>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart
          accessibilityLayer
          aria-label={`${xLabel} versus ${yLabel} scatter plot; Pearson r ${r?.toFixed(4) ?? 'not available'}`}
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
          <XAxis
            dataKey="x" name={xLabel} type="number"
            tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%"
            label={{ value: xLabel, position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 10 }}
          />
          <YAxis
            dataKey="y" name={yLabel} type="number"
            tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%"
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="custom-tooltip">
                  {d?.date && <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{d.date}</div>}
                  <div style={{ fontSize: '0.75rem' }}>{xLabel}: <strong>{d?.x?.toFixed(4)}</strong></div>
                  <div style={{ fontSize: '0.75rem' }}>{yLabel}: <strong>{d?.y?.toFixed(4)}</strong></div>
                </div>
              );
            }}
          />
          <Scatter
            data={points}
            fill={color || 'var(--color-primary)'}
            opacity={0.6}
            activeShape={({ cx, cy, fill: pointColor }) => (
              <circle cx={cx} cy={cy} r={5} fill={pointColor} stroke="white" strokeWidth={1.5} />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <ChartInteractions data={points} title={`${xLabel} versus ${yLabel}`} />
    </div>
  );
}

// ─── Correlation result card ──────────────────────────────────────────────────
function CorrelationCard({ corr, beginnerMode }) {
  if (corr.error) {
    return (
      <div className="card">
        <div style={{ fontWeight: 700 }}>{corr.x_label} ↔ {corr.y_label}</div>
        <ErrorAlert message={corr.error} />
      </div>
    );
  }

  const isPositive = corr.direction === 'positive';
  const rColor = Math.abs(corr.r) >= 0.4
    ? (isPositive ? 'var(--color-success)' : 'var(--color-danger)')
    : 'var(--color-text-muted)';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
          {corr.x_label} ↔ Stock Return
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: rColor, fontVariantNumeric: 'tabular-nums' }}>
            {corr.r?.toFixed(4)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Pearson r</div>
        </div>
      </div>

      <CorrelationBadge strength={corr.strength} direction={corr.direction} />

      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', lineHeight: 1.6 }}>
        {corr.interpretation}
      </p>

      <Explainer title="What does this r value mean?" show={beginnerMode}>
        <p>
          Pearson r = {corr.r?.toFixed(4)} means there is a <strong>{corr.strength}</strong> {corr.direction} linear association
          in this sample of {corr.n} observations.
          r ranges from −1 (perfect negative) to +1 (perfect positive). A value near 0 suggests little linear association.
          <strong> This does not prove causation.</strong>
        </p>
      </Explainer>
    </div>
  );
}

// ─── Correlation Matrix ───────────────────────────────────────────────────────
function CorrelationMatrix({ matrix }) {
  if (!matrix) return null;
  const { variables, values } = matrix;
  const tableData = variables.map((variable, rowIndex) => ({
    variable,
    ...Object.fromEntries(variables.map((column, columnIndex) => [column, values[rowIndex][columnIndex]])),
  }));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
        <thead>
          <tr>
            <th style={{ padding: '0.5rem', color: 'var(--color-text-dim)', fontSize: '0.75rem' }}></th>
            {variables.map(v => (
              <th key={v} style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, minWidth: 110 }}>{v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variables.map((rowVar, i) => (
            <tr key={rowVar}>
              <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{rowVar}</td>
              {variables.map((_, j) => {
                const val = values[i][j];
                const hasValue = typeof val === 'number' && Number.isFinite(val);
                const displayedValue = hasValue ? val.toFixed(4) : 'not available';
                return (
                  <td key={j}>
                    <div
                      className="matrix-cell"
                      role="img"
                      tabIndex={0}
                      aria-label={`Pearson correlation between ${rowVar} and ${variables[j]}: ${displayedValue}`}
                      title={`Pearson r: ${displayedValue}`}
                      style={{
                        background: rToColor(val),
                        color: val === 1.0 ? 'var(--color-text-dim)' : 'var(--color-text)',
                        padding: '0.5rem 0.75rem',
                        minWidth: 80,
                      }}
                    >
                      {hasValue ? val.toFixed(4) : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
        Green shading = positive association · Red shading = negative association · Intensity reflects magnitude
      </p>
      <ChartInteractions data={tableData} title="Pearson correlation matrix" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CorrelationPage() {
  const { dataset, correlation, runCorrelation, beginnerMode } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dataset && !correlation) {
      setLoading(true);
      runCorrelation().catch(e => setError(e.message)).finally(() => setLoading(false));
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <EmptyState
        icon={Database}
        title="No Dataset Loaded"
        subtitle="Load a dataset from Market Data to compute Pearson correlations."
      />
    );
  }

  const SCATTER_COLORS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-accent)'];
  const SCATTER_KEYS = ['market_vs_stock', 'volume_vs_stock', 'prev_vs_stock'];
  const SCATTER_LABELS = [
    { x: 'Market Return (%)', y: 'Stock Return (%)' },
    { x: 'Volume Change (%)', y: 'Stock Return (%)' },
    { x: 'Previous Return (%)', y: 'Stock Return (%)' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <SectionHeader
        title="Pearson Correlation"
        subtitle="Measuring linear association between market indicators and stock returns"
        badge={<ModuleBadge label="Module IX" />}
      />

      {dataset.is_synthetic && <SyntheticBanner />}

      <Explainer title="What is Pearson Correlation?" show={beginnerMode}>
        <p>
          Pearson r measures the <strong>direction</strong> and <strong>strength</strong> of a linear relationship between two variables.
          It ranges from <strong>−1</strong> (perfect negative) to <strong>+1</strong> (perfect positive).
          A value near 0 indicates little linear association. <strong>Important: correlation does not establish causation.</strong>
        </p>
      </Explainer>

      <InfoAlert message="Correlation disclaimer: These values describe linear association in the analyzed sample only. They do not establish causation, and they may not generalize beyond this dataset." />

      {loading && <LoadingDots label="Calculating Pearson correlations..." />}
      {error && <ErrorAlert message={error} />}

      {correlation && (
        <>
          {/* Correlation cards */}
          <div data-guided-demo-target="demo-correlation-pairs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
            {correlation.correlations.map((corr) => (
              <CorrelationCard key={corr.key} corr={corr} beginnerMode={beginnerMode} />
            ))}
          </div>

          {/* Matrix */}
          <div className="card" data-guided-demo-target="demo-correlation-matrix" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Correlation Matrix (4 × 4)</h3>
            <CorrelationMatrix matrix={correlation.matrix} />
          </div>

          {/* Scatter plots */}
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Scatter Plots</h3>
          <div data-guided-demo-target="demo-scatter-plots" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {SCATTER_KEYS.map((key, i) => {
              const corr = correlation.correlations.find(c => c.key === key);
              return (
                <CorrelationScatter
                  key={key}
                  data={correlation.scatter_data[key]}
                  xLabel={SCATTER_LABELS[i].x}
                  yLabel={SCATTER_LABELS[i].y}
                  r={corr?.r}
                  color={SCATTER_COLORS[i]}
                />
              );
            })}
          </div>

          {/* Disclaimer */}
          <div className="disclaimer" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}>
            <strong>Language note:</strong> {correlation.disclaimer}
          </div>
        </>
      )}
    </div>
  );
}
