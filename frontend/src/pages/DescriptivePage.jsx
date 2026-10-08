// Module I — Descriptive Statistics Page

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Brush
} from 'recharts';
import { Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ChartInteractions from '../components/ChartInteractions';
import InteractiveLegend from '../components/InteractiveLegend';
import ChartWheelZoom from '../components/ChartWheelZoom';
import useChartZoom from '../hooks/useChartZoom';
import {
  LoadingDots, EmptyState, ErrorAlert, SyntheticBanner,
  Explainer, SectionHeader, ModuleBadge, Num, StatCard
} from '../components/UI';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, variable }) {
  if (!active || !payload?.length) return null;
  const bin = payload[0]?.payload;
  return (
    <div className="custom-tooltip">
      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
        {bin?.lowerBound !== undefined ? `${bin.lowerBound.toFixed(4)}% to ${bin.upperBound.toFixed(4)}%` : label}
      </div>
      {variable && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{variable}</div>}
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: '0.8125rem' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Histogram ────────────────────────────────────────────────────────────────
function Histogram({ data, color, title, bins = 20 }) {
  if (!data?.length) return null;

  const values = data.filter(Number.isFinite);
  if (!values.length) return null;
  const { min, max } = values.reduce(
    (range, value) => ({ min: Math.min(range.min, value), max: Math.max(range.max, value) }),
    { min: Infinity, max: -Infinity }
  );
  const binWidth = max === min ? 1 : (max - min) / bins;
  const binData = Array.from({ length: bins }, (_, i) => ({
    bin: `${(min + i * binWidth).toFixed(2)}`,
    lowerBound: min + i * binWidth,
    upperBound: min + (i + 1) * binWidth,
    count: 0,
  }));
  values.forEach((value) => {
    const index = Math.min(bins - 1, Math.floor((value - min) / binWidth));
    binData[index].count += 1;
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          accessibilityLayer
          aria-label={`${title} distribution histogram, showing frequency counts across value bins`}
          data={binData}
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
          <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip content={<ChartTooltip variable={title} />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
          <Bar dataKey="count" fill={color || 'var(--color-primary)'} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <ChartInteractions data={binData} title={`${title} distribution`} />
    </>
  );
}

function TimeSeriesChart({ fullData }) {
  const data = fullData?.dates?.map((date, index) => ({
    date,
    stock: fullData.stock_return[index],
    market: fullData.market_return[index],
  })) || [];
  const zoom = useChartZoom(data.length);
  const [isolatedSeries, setIsolatedSeries] = useState(null);
  const [hoveredSeries, setHoveredSeries] = useState(null);

  if (!data.length) return null;

  const displayedData = data.slice(zoom.startIndex, zoom.endIndex + 1);
  const chartOpacity = (key) => hoveredSeries && hoveredSeries !== key ? 0.35 : 1;
  const toggleSeries = (key) => setIsolatedSeries((current) => current === key ? null : key);

  return (
    <>
      <ChartWheelZoom
        onWheel={zoom.onWheel}
        ariaLabel="Time series chart. Use the mouse wheel to zoom around the pointer, or drag the range handles below."
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            accessibilityLayer
            aria-label="Stock return and market return time series"
            data={data}
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={v => v?.slice(5)} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.55)', strokeDasharray: '3 3' }} />
            <Legend content={(props) => (
              <InteractiveLegend
                {...props}
                isolatedSeries={isolatedSeries}
                onToggle={toggleSeries}
                onHover={setHoveredSeries}
              />
            )} />
            <Line
              type="monotone" dataKey="stock" name="Stock Return (%)"
              stroke="var(--color-accent)" dot={false} activeDot={{ r: 4 }} strokeWidth={1.5}
              hide={!!isolatedSeries && isolatedSeries !== 'stock'} strokeOpacity={chartOpacity('stock')}
            />
            <Line
              type="monotone" dataKey="market" name="Market Return (%)"
              stroke="var(--color-primary)" dot={false} activeDot={{ r: 4 }} strokeWidth={1}
              hide={!!isolatedSeries && isolatedSeries !== 'market'} strokeOpacity={chartOpacity('market')}
            />
            <Brush
              dataKey="date"
              startIndex={zoom.startIndex}
              endIndex={zoom.endIndex}
              onChange={zoom.onBrushChange}
              travellerWidth={8}
              height={18}
              stroke="var(--color-primary)"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartWheelZoom>
      <ChartInteractions
        data={displayedData}
        title="Stock and market returns over time"
        onResetView={zoom.resetZoom}
      />
    </>
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
                    <Histogram data={datasetFull.full_data?.[key]} color={color} title={label} />
                  </div>
                ))}
              </div>

              {/* Time series */}
              <div className="chart-container" data-guided-demo-target="demo-time-series" style={{ marginBottom: '1.5rem' }}>
                <div className="chart-title">Time Series</div>
                <div className="chart-question">How did stock returns vary over time?</div>
                <TimeSeriesChart fullData={datasetFull.full_data} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
