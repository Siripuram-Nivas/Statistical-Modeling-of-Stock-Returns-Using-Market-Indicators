import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Explainer, Card, CardTitle, CardContent } from '../components/UI';

export default function MarketOverviewPage() {
  const { dataset } = useApp();
  const isLoaded = !!dataset;
  const dataSummary = dataset ? {
    rows: dataset.n_observations,
    date_range: [dataset.date_range_start, dataset.date_range_end],
  } : null;

  return (
    <div className="page-container">
      <PageHeader 
        title="Market Overview" 
        subtitle="High-level view of the current market dataset" 
      />

      <Explainer>
        <p>This overview summarizes the key indicators present in the current market dataset. 
        It gives a snapshot of trading volume, market returns, and daily stock returns over the selected period.</p>
      </Explainer>

      {!isLoaded ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--color-text-dim)' }}>
            <p style={{ margin: 0 }}>Load market data to activate analytics.</p>
          </div>
        </div>
      ) : (
        <div className="market-overview-grid">
          <Card>
            <CardTitle>Total Observations</CardTitle>
            <CardContent>
              <div className="market-kpi-value">
                {dataSummary?.rows || 0}
              </div>
              <div className="market-kpi-sub">
                Trading days
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardTitle>Date Range</CardTitle>
            <CardContent>
              <div className="market-date-value">
                {dataSummary?.date_range?.[0] || 'N/A'}
              </div>
              <div className="market-date-sep">to</div>
              <div className="market-date-value">
                {dataSummary?.date_range?.[1] || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardTitle>Core Variables</CardTitle>
            <CardContent>
              <ul className="market-vars-list">
                <li><span className="accent">Daily Stock Return (%)</span></li>
                <li>Market Return (%)</li>
                <li>Volume Change (%)</li>
                <li>Previous Day Return (%)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
