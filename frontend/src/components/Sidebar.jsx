// Sidebar Navigation Component

import React from 'react';
import {
  Home, Database, BarChart2, GitBranch, TrendingUp,
  FileText, Activity, PlayCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GUIDED_DEMO_STEPS } from '../guidedDemo';

const NAV_SECTIONS = [
  {
    label: 'Data',
    items: [
      { id: 'landing', label: 'Overview', icon: Home },
      { id: 'data', label: 'Market Data', icon: Database },
    ]
  },
  {
    label: 'Analysis',
    items: [
      { id: 'market-overview', label: 'Market Overview', icon: Activity },
      { id: 'descriptive', label: 'Descriptive Statistics', icon: BarChart2 },
      { id: 'correlation', label: 'Correlation', icon: GitBranch },
      { id: 'regression', label: 'Regression', icon: TrendingUp },
      { id: 'evaluation', label: 'Model Evaluation', icon: Activity },
    ]
  },
  {
    label: 'Tools',
    items: [
      { id: 'guided-demo', label: 'Guided Demo', icon: PlayCircle },
      { id: 'report', label: 'Report Generator', icon: FileText },
    ]
  }
];

export default function Sidebar({ isOpen = false, onClose }) {
  const {
    activeModule, setActiveModule, dataset, beginnerMode, setBeginnerMode,
    guidedDemo, startGuidedDemo,
  } = useApp();
  const hasData = !!dataset;

  return (
    <nav
      className={`sidebar${isOpen ? ' is-open' : ''}`}
      id="sidebar-nav"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          fontSize: 'var(--font-size-sm)', fontWeight: 800, letterSpacing: '0.05em',
          color: 'var(--color-primary)', marginBottom: 'var(--space-1)', lineHeight: 1.2
        }}>
          STOCK RETURN<br/>PREDICTION
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', lineHeight: 1.4, fontWeight: 500 }}>
          Market Analytics
        </div>
      </div>

      {/* Dataset status */}
      <div style={{
        padding: '0.75rem', borderRadius: '8px',
        background: hasData
          ? 'rgba(52,211,153,0.08)'
          : 'rgba(99,102,241,0.08)',
        border: `1px solid ${hasData ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.2)'}`,
        marginBottom: '1rem', fontSize: '0.75rem',
      }}>
        {hasData ? (
          <>
            <div style={{ color: 'var(--color-success)', fontWeight: 700, marginBottom: '0.25rem' }}>
              ● Dataset Loaded
            </div>
            <div style={{ color: 'var(--color-text-dim)' }}>
              {dataset.n_observations} observations<br />
              {dataset.date_range_start} → {dataset.date_range_end}
            </div>
            {dataset.is_synthetic && (
              <div style={{ color: 'var(--color-warning)', fontWeight: 600, marginTop: '0.375rem', fontSize: '0.7rem' }}>
                ⚠ SYNTHETIC DATA
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--color-text-dim)' }}>
            No dataset loaded.<br />Upload CSV or load demo.
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div className="nav-section-label" style={{ textTransform: 'uppercase' }}>{section.label}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              const needsData = item.id !== 'landing' && item.id !== 'data' && item.id !== 'guided-demo';
              const disabled = needsData && !hasData;
              const isActive = item.id === 'guided-demo'
                ? guidedDemo.active
                : activeModule === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (disabled) return;
                    if (item.id === 'guided-demo') {
                      if (guidedDemo.active) {
                        setActiveModule(GUIDED_DEMO_STEPS[guidedDemo.step].module);
                      } else {
                        startGuidedDemo();
                      }
                      return;
                    }
                    setActiveModule(item.id);
                  }}
                  disabled={disabled}
                  style={{ opacity: disabled ? 0.4 : 1 }}
                  title={disabled ? 'Load a dataset first' : undefined}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.875rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Analysis Mode
          </span>
          <button
            onClick={() => setBeginnerMode(!beginnerMode)}
            role="switch"
            aria-checked={beginnerMode}
            style={{
              width: '40px', height: '22px', borderRadius: '11px',
              background: beginnerMode ? 'var(--color-primary)' : 'var(--color-card)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background var(--motion-instant) var(--motion-ease)',
            }}
            aria-label="Toggle analysis mode"
          >
            <span style={{
              position: 'absolute', top: '3px',
              left: beginnerMode ? '20px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>
    </nav>
  );
}
