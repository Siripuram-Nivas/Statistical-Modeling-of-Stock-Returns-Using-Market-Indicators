// Module I — Descriptive Statistics Page

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { BarChart2, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  LoadingDots, EmptyState, ErrorAlert, SyntheticBanner,
  Explainer, SectionHeader, ModuleBadge, Num, StatCard
} from '../components/UI';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: '0.8125rem' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Histogram ────────────────────────────────────────────────────────────────
function Histogram({ data, color, bins = 20 }) {
  if (!data?.length) return null;

  // Build bins
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins;

  const binData = Array.from({ length: bins }, (_, i) => {
    const binMin = min + i * binWidth;
    const binMax = binMin + binWidth;
    const count = data.filter(v => v >= binMin && (i === bins - 1 ? v <= binMax : v < binMax)).length;
    return { bin: binMin.toFixed(2), count };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={binData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
        <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" fill={color || 'var(--color-primary)'} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Stats Table ──────────────────────────────────────────────────────────────
function StatsTable({ stats }) {
  const metrics = [
    { key: 'count', label: 'Count (n)', decimals: 0 },
    { key: 'mean', label: 'Mean', decimals: 6 },
    { key: 'median', label: 'Median', decimals: 6 },
    { key: 'std_dev', label: 'Standard Deviation', decimals: 6 },
    { key: 'variance', label: 'Variance', decimals: 6 },
    { key: 'minimum', label: 'Minimum', decimals: 6 },
    { key: 'maximum', label: 'Maximum', decimals: 6 },
    { key: 'range', label: 'Range (Max − Min)', decimals: 6 },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Statistic</th>
            {stats.filter(s => !s.error).map(s => (
              <th key={s.variable} className="num">{s.variable}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => (
            <tr key={m.key}>
              <td style={{ fontWeight: 600 }}>{m.label}</td>
              {stats.filter(s => !s.error).map(s => (
                <td key={s.variable} className="num">
                  <Num v={s[m.key]} decimals={m.decimals} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DescriptivePage() {
  const { dataset, descriptive, runDescriptive, beginnerMode, datasetFull, loadDatasetFull } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dataset && !descriptive) {
      setLoading(true);
      runDescriptive().catch(e => setError(e.message)).finally(() => setLoading(false));
    }
    if (dataset && !datasetFull) {
      loadDatasetFull();
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <EmptyState
        icon={Database}
        title="No Dataset Loaded"
        subtitle="Upload a documented CSV or load the demo dataset to begin descriptive analysis."
      />
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <SectionHeader
        title="Descriptive Statistics"
        subtitle="Summarizing the distribution of daily returns and market indicators"
        badge={<ModuleBadge label="Module I" />}
      />

      {dataset.is_synthetic && <SyntheticBanner />}

      <Explainer title="What is Descriptive Statistics?" show={beginnerMode}>
        <p>Descriptive statistics summarizes and describes the main characteristics of a dataset.
          We use measures like the <strong>mean</strong> (average), <strong>standard deviation</strong> (spread),
          and <strong>range</strong> (min to max) to understand what the return data looks like before modeling it.
          These calculations describe <em>observed</em> data — they make no predictions.</p>
      </Explainer>

      {loading && <LoadingDots label="Computing descriptive statistics..." />}
      {error && <ErrorAlert message={error} />}

      {descriptive && (
        <>
          {/* Summary stat cards for Stock Return */}
          {(() => {
            const stockStats = descriptive.results.find(r => r.variable.startsWith('Stock Return'));
            if (!stockStats || stockStats.error) return null;
            return (
              <div data-guided-demo-target="demo-descriptive-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', margin: '1.5rem 0' }}>
                <StatCard label="Count (n)" value={stockStats.count?.toLocaleString()} sub="observations" />
                <StatCard label="Mean Return" value={<Num v={stockStats.mean} decimals={4} suffix="%" />} sub="average daily" color="var(--color-accent)" />
                <StatCard label="Std. Deviation" value={<Num v={stockStats.std_dev} decimals={4} suffix="%" />} sub="spread around mean" color="var(--color-primary)" />
                <StatCard label="Minimum" value={<Num v={stockStats.minimum} decimals={4} suffix="%" />} sub="lowest return" color="var(--color-danger)" />
                <StatCard label="Maximum" value={<Num v={stockStats.maximum} decimals={4} suffix="%" />} sub="highest return" color="var(--color-success)" />
              </div>
            );
          })()}

          {/* Full stats table */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Complete Descriptive Statistics Table</h3>
            <StatsTable stats={descriptive.results} />

            <Explainer title="Interpreting the Table" show={beginnerMode}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><strong>Mean:</strong> The arithmetic average return across all analyzed observations.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Standard deviation:</strong> Measures the average spread of returns around their mean. A larger value indicates more dispersed observations.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Variance:</strong> The square of standard deviation (sample variance, n−1 denominator).</li>
                <li><strong>Range:</strong> The difference between the maximum and minimum observed values.</li>
              </ul>
            </Explainer>
          </div>

          {/* Distribution histograms */}
          {datasetFull && (
            <>
              <div data-guided-demo-target="demo-histograms" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { key: 'stock_return', label: 'Stock Return (%)', color: 'var(--color-accent)', q: 'What does the return distribution look like?' },
                  { key: 'market_return', label: 'Market Return (%)', color: 'var(--color-primary)', q: 'How are market returns distributed?' },
                  { key: 'volume_change', label: 'Volume Change (%)', color: 'var(--color-success)', q: 'What does volume change look like?' },
                ].map(({ key, label, color, q }) => (
                  <div key={key} className="chart-container">
                    <div className="chart-title">{label}</div>
                    <div className="chart-question">{q}</div>
                    <Histogram data={datasetFull.full_data?.[key]} color={color} />
                  </div>
                ))}
              </div>

              {/* Time series */}
              <div className="chart-container" data-guided-demo-target="demo-time-series" style={{ marginBottom: '1.5rem' }}>
                <div className="chart-title">Time Series</div>
                <div className="chart-question">How did stock returns vary over time?</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={datasetFull.full_data?.dates?.map((d, i) => ({
                      date: d,
                      stock: datasetFull.full_data.stock_return[i],
                      market: datasetFull.full_data.market_return[i],
                    }))}
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={v => v?.slice(5)} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
                    <Line type="monotone" dataKey="stock" name="Stock Return (%)" stroke="var(--color-accent)" dot={false} strokeWidth={1.5} />
                    <Line type="monotone" dataKey="market" name="Market Return (%)" stroke="var(--color-primary)" dot={false} strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
