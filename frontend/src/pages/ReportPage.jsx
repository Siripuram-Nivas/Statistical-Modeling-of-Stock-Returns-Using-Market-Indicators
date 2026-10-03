// Report Generator Page

import React, { useEffect, useState } from 'react';
import { Database, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  LoadingDots, EmptyState, ErrorAlert, SectionHeader, ModuleBadge,
  SyntheticBanner, InfoAlert
} from '../components/UI';

export default function ReportPage() {
  const { dataset, testFraction, runReport } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runReport(testFraction);
      if (res.error) throw new Error(res.error);
      return res;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (dataset && !reportData) {
      fetchReport().then(data => {
        if (data) setReportData(data);
      });
    }
  }, [dataset, testFraction, runReport]);

  if (!dataset) {
    return (
      <EmptyState
        icon={Database}
        title="No Dataset Loaded"
        subtitle="Load a dataset to generate the market analytics report."
      />
    );
  }

  if (loading) return <LoadingDots label="Compiling report from analysis engine..." />;
  if (error) return <ErrorAlert message={error} />;
  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: '4rem' }} className="report-container">
      <div className="no-print">
        <SectionHeader
          title="Report Generator"
          subtitle="Generate a market analytics report of your findings"
          badge={<ModuleBadge label="Export" />}
          action={
            <button className="btn btn-primary" onClick={handlePrint}>
              <Download size={16} /> Print / PDF
            </button>
          }
        />
        {reportData.is_synthetic && <SyntheticBanner />}
        <InfoAlert message="This report is generated directly from the statistical engine results. No values are fabricated. Use Print/PDF to save." />
      </div>

      <div style={{
        background: '#fff',
        color: '#000',
        padding: '3rem 4rem',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginTop: '2rem'
      }} className="print-area">

        {/* Cover */}
        <div style={{ textAlign: 'center', marginBottom: '4rem', paddingBottom: '4rem', borderBottom: '2px solid #eee' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#111' }}>
            {reportData.title}
          </h1>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 400, color: '#555', marginBottom: '3rem' }}>
            {reportData.subtitle}
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Dataset:</strong> {reportData.dataset.source_filename}</p>
          </div>
          {reportData.is_synthetic && (
            <div style={{ marginTop: '2rem', padding: '1rem', border: '2px solid #ef4444', color: '#ef4444', fontWeight: 700 }}>
              {reportData.synthetic_disclaimer}
            </div>
          )}
        </div>

        {/* Ch 1: Data */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            1. Data Provenance & Scope
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            This study analyses historical financial data to investigate linear associations between market indicators and stock returns.
            The analysis is restricted to Descriptive Statistics, Pearson Correlation, and Linear Regression.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.875rem' }}>
            <tbody>
              <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600, width: '30%' }}>Source File</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{reportData.dataset.source_filename}</td></tr>
              <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600 }}>Description</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{reportData.dataset.source_description}</td></tr>
              <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600 }}>Date Range</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{reportData.dataset.date_range}</td></tr>
              <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600 }}>Observations (n)</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{reportData.dataset.n_observations}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Ch 2: Descriptive */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            2. Descriptive Statistics
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            The following table summarizes the distribution of the dependent variable and all evaluated predictors across the dataset.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Variable</th>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'right' }}>Mean</th>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'right' }}>Std Dev</th>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'right' }}>Min</th>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'right' }}>Max</th>
              </tr>
            </thead>
            <tbody>
              {reportData.descriptive_statistics.map(s => (
                <tr key={s.variable}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600 }}>{s.variable}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{s.mean.toFixed(4)}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{s.std_dev.toFixed(4)}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{s.minimum.toFixed(4)}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{s.maximum.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ch 3: Correlation */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            3. Pearson Correlation
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            Pearson's r was calculated to assess the direction and strength of linear association between each predictor and the dependent variable (Stock Return). <strong>Correlation does not establish causation.</strong>
          </p>
          <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
            {reportData.correlation.map(c => (
              <li key={c.key} style={{ marginBottom: '0.75rem' }}>
                <strong>{c.x_label}:</strong> r = {c.r.toFixed(4)} <br />
                <span style={{ fontSize: '0.875rem', color: '#555' }}>({c.interpretation})</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ch 4: Regression */}
        <div style={{ marginBottom: '3rem', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            4. Regression Modeling
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            Ordinary Least Squares (OLS) regression was used to estimate the linear association between predictors and stock return.
          </p>
          
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Simple Regression</h4>
          <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', fontFamily: 'monospace', marginBottom: '1rem' }}>
            {reportData.simple_regression.equation}
          </div>
          
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Multiple Regression</h4>
          <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', fontFamily: 'monospace', marginBottom: '1rem' }}>
            {reportData.multiple_regression.equation}
          </div>
        </div>

        {/* Ch 5: Evaluation */}
        <div style={{ marginBottom: '3rem', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            5. Chronological Evaluation
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            Models were evaluated using a strict chronological split to prevent future-data leakage. 
            Metrics below describe out-of-sample performance on the held-out test set.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Model</th>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'right' }}>MAE (Test)</th>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'right' }}>RMSE (Test)</th>
                <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc', textAlign: 'right' }}>R² (Test)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600 }}>Simple (1 predictor)</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{reportData.model_comparison.simple.mae_test.toFixed(4)}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{reportData.model_comparison.simple.rmse_test.toFixed(4)}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{reportData.model_comparison.simple.r_squared_test.toFixed(4)}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600 }}>Multiple (3 predictors)</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{reportData.model_comparison.multiple.mae_test.toFixed(4)}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{reportData.model_comparison.multiple.rmse_test.toFixed(4)}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{reportData.model_comparison.multiple.r_squared_test.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: '4rem', paddingTop: '1rem', borderTop: '1px solid #ccc', fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
          {reportData.disclaimer}
        </div>
      </div>
    </div>
  );
}
