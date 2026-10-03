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
        <Card className="mt-4">
          <CardContent className="py-12 text-center text-(--color-text-dim)">
            <p>Load market data to activate analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-6 mt-6">
          <Card>
            <CardTitle>Total Observations</CardTitle>
            <CardContent>
              <div className="text-3xl font-light text-(--color-primary)">
                {dataSummary?.rows || 0}
              </div>
              <div className="text-sm text-(--color-text-dim) mt-1">
                Trading days
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardTitle>Date Range</CardTitle>
            <CardContent>
              <div className="text-lg font-medium">
                {dataSummary?.date_range?.[0] || 'N/A'}
              </div>
              <div className="text-sm text-(--color-text-dim) my-1">to</div>
              <div className="text-lg font-medium">
                {dataSummary?.date_range?.[1] || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardTitle>Core Variables</CardTitle>
            <CardContent>
              <ul className="text-sm space-y-2 mt-2">
                <li><span className="text-(--color-accent) font-medium">Daily Stock Return (%)</span></li>
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
