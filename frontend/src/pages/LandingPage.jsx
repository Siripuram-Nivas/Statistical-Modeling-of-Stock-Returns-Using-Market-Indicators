// Landing Page — Overview
import React from 'react';
import { ArrowRight, Database, AlertTriangle, CheckCircle, PlayCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const WORKFLOW = [
  { step: 'MARKET DATA', desc: 'Upload historical indicators' },
  { step: 'DESCRIPTIVE', desc: 'Summarize distributions' },
  { step: 'CORRELATION', desc: 'Measure linear associations' },
  { step: 'REGRESSION', desc: 'Fit predictive OLS models' },
  { step: 'EVALUATION', desc: 'Test model performance' },
];

export default function LandingPage() {
  const { setActiveModule, dataLoading, dataset, guidedDemo, startGuidedDemo } = useApp();
  const hasData = !!dataset;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Hero Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          STOCK RETURN <span className="text-gradient">PREDICTION</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-primary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          Market Analytics
        </p>
        <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)', fontWeight: 400, maxWidth: '600px', lineHeight: 1.6 }}>
          Analyze historical market indicators and model daily stock returns using statistical relationships and regression.
        </p>
      </div>

      {/* Dataset Status Panel */}
      <div className="card" style={{ 
        marginBottom: '2.5rem', 
        borderLeft: hasData ? '4px solid var(--color-success)' : '4px solid var(--color-primary)',
        background: hasData ? 'rgba(52,211,153,0.03)' : 'rgba(99,102,241,0.03)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '0.5rem' }}>
              Dataset Status
            </div>
            {hasData ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <CheckCircle size={20} color="var(--color-success)" />
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {dataset.is_synthetic ? 'Synthetic Demo Dataset' : 'Custom Uploaded Dataset'}
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  {dataset.n_observations} observations loaded from {dataset.date_range_start} to {dataset.date_range_end}.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <AlertTriangle size={20} color="var(--color-warning)" />
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>No Data Loaded</span>
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  Load market data to activate analytics.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {!guidedDemo.active && (
              <button className="btn btn-outline" onClick={startGuidedDemo} disabled={dataLoading}>
                <PlayCircle size={16} /> Try Guided Demo
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setActiveModule('data')}>
              <Database size={16} /> {hasData ? 'Manage Data' : 'Load Market Data'}
            </button>
            {hasData && (
              <button className="btn btn-outline" onClick={() => setActiveModule('descriptive')}>
                Start Analysis <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Research Objective */}
        <div className="card card-accent" data-guided-demo-target="demo-objective" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
            Core Objective
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4 }}>
            "Can selected market indicators statistically explain variation in daily stock returns?"
          </p>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Predictive modeling using historical pricing and volume data.
          </div>
        </div>

        {/* Variables */}
        <div className="card" data-guided-demo-target="demo-variables">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
            Core Variables
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 8, borderLeft: '3px solid var(--color-accent)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Dependent Variable (Y)</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Daily Stock Return (%)</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 8, borderLeft: '3px solid var(--color-primary)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Predictors (X)</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.5 }}>
                1. Market Return (%)<br />
                2. Volume Change (%)<br />
                3. Previous Day Return (%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow visualization */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)', fontWeight: 700, marginBottom: '1rem' }}>Analytics Pipeline</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {WORKFLOW.map((w, i) => (
            <React.Fragment key={w.step}>
              <div style={{ textAlign: 'center', flex: 1, minWidth: 100 }}>
                <div style={{
                  padding: '0.75rem 0.5rem', borderRadius: 8,
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  fontWeight: 700, fontSize: '0.75rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {w.step}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: '0.5rem', padding: '0 0.25rem' }}>
                  {w.desc}
                </div>
              </div>
              {i < WORKFLOW.length - 1 && (
                <ArrowRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0, margin: '0 0.25rem 2rem 0.25rem' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
