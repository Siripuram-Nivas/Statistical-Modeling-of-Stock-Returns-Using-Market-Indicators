// Shared reusable UI components

import React, { useState } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Loading State ──────────────────────────────────────────────────────────
export function LoadingDots({ label = 'Loading...' }) {
  return (
    <div className="empty-state">
      <div className="loading-dots">
        <span /><span /><span />
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</p>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="empty-state__icon" />}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 'var(--font-size-sm)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Error Alert ─────────────────────────────────────────────────────────────
export function ErrorAlert({ message }) {
  return (
    <div className="disclaimer" style={{
      background: 'rgba(248,113,113,0.08)',
      borderColor: 'rgba(248,113,113,0.3)',
      color: 'var(--color-danger)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem'
    }}>
      <XCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{message}</span>
    </div>
  );
}

// ─── Warning Alert ───────────────────────────────────────────────────────────
export function WarningAlert({ message }) {
  return (
    <div className="disclaimer disclaimer-warning" style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
    }}>
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{message}</span>
    </div>
  );
}

// ─── Info Alert ──────────────────────────────────────────────────────────────
export function InfoAlert({ message }) {
  return (
    <div className="disclaimer" style={{
      background: 'rgba(34,211,238,0.06)',
      borderColor: 'rgba(34,211,238,0.25)',
      color: 'var(--color-text-muted)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem'
    }}>
      <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-accent)' }} />
      <span>{message}</span>
    </div>
  );
}

// ─── Analytical Context Banner ───────────────────────────────────────────────
export function FinancialDisclaimer() {
  return (
    <div className="disclaimer" style={{ marginTop: '1.5rem' }}>
      Historical market data is analyzed using descriptive statistics, correlation,
      and regression. Statistical relationships in the dataset do not guarantee
      future performance or forecast accuracy.
    </div>
  );
}

// ─── Synthetic Data Warning ──────────────────────────────────────────────────
export function SyntheticBanner() {
  return (
    <div className="disclaimer disclaimer-warning" style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600
    }}>
      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
      ⚠ SYNTHETIC DEMO DATASET — Data is artificially generated for
      demonstration purposes only. Results do NOT reflect real financial observations.
    </div>
  );
}

// ─── Context Explainer ───────────────────────────────────────────────────────
export function Explainer({ title, children, show = true }) {
  if (!show) return null;
  return (
    <div className="explainer">
      {title && <div className="explainer__title">{title}</div>}
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 'var(--space-xl)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-1)' }}>{title}</h2>
      {subtitle && <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function CardTitle({ children }) {
  return <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: 'var(--space-4)' }}>{children}</div>;
}

export function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

// ─── Module Badge ────────────────────────────────────────────────────────────
export function ModuleBadge({ label }) {
  return <span className="badge badge-module">{label}</span>;
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, badge, action }) {
  return (
    <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        {badge && <div style={{ marginBottom: 'var(--space-3)' }}>{badge}</div>}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-1)' }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value" style={color ? { color } : {}}>
        {value ?? '—'}
      </div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function Num({ v, decimals = 4, prefix = '', suffix = '' }) {
  if (v === null || v === undefined) return <span style={{ color: 'var(--color-text-dim)' }}>—</span>;
  const formatted = typeof v === 'number' ? v.toFixed(decimals) : v;
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
    {prefix}{formatted}{suffix}
  </span>;
}

// ─── Collapsible panel ────────────────────────────────────────────────────────
export function Collapsible({ title, children, defaultOpen = false, danger = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`info-card ${danger ? 'alert-card' : ''}`}>
      <div className="info-card__header" onClick={() => setOpen(!open)} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(!open)}>
        <span>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {open && <div className="info-card__body">{children}</div>}
    </div>
  );
}

// ─── R² Strength Indicator ───────────────────────────────────────────────────
export function R2Indicator({ value }) {
  if (value === null || value === undefined) return null;
  const pct = Math.max(0, Math.min(1, value));
  let label, color;
  if (pct >= 0.7) { label = 'Strong fit'; color = 'var(--color-success)'; }
  else if (pct >= 0.4) { label = 'Moderate fit'; color = 'var(--color-warning)'; }
  else { label = 'Weak fit'; color = 'var(--color-danger)'; }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-xs)' }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Proportion of variance explained (R²)</span>
        <span style={{ color, fontWeight: 700 }}>{label}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginTop: 'var(--space-2)' }}>
        Note: R² is not an accuracy percentage. It describes the proportion of variance in stock return
        explained by the model relative to a mean-only baseline.
      </p>
    </div>
  );
}

// ─── Correlation strength badge ───────────────────────────────────────────────
export function CorrelationBadge({ strength, direction }) {
  const colors = {
    strong: 'var(--color-success)',
    'moderate-to-strong': '#86efac',
    moderate: 'var(--color-warning)',
    weak: 'var(--color-text-muted)',
    negligible: 'var(--color-text-dim)',
  };
  return (
    <span style={{
      color: colors[strength] || 'var(--color-text-muted)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 700,
      textTransform: 'capitalize'
    }}>
      {strength} {direction !== 'none' ? direction : ''} association
    </span>
  );
}

// ─── Processing log entry ─────────────────────────────────────────────────────
export function LogEntry({ step, status, detail, rowsAffected }) {
  const icons = {
    ok: <CheckCircle size={14} color="var(--color-success)" />,
    warning: <AlertTriangle size={14} color="var(--color-warning)" />,
    error: <XCircle size={14} color="var(--color-danger)" />,
    info: <Info size={14} color="var(--color-accent)" />,
  };
  return (
    <div style={{
      display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) 0',
      borderBottom: '1px solid rgba(71,85,105,0.3)', fontSize: 'var(--font-size-sm)'
    }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icons[status] || icons.info}</div>
      <div>
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{step}</span>
        <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>{detail}</span>
        {rowsAffected > 0 && (
          <span style={{ color: 'var(--color-text-dim)', marginLeft: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
            ({rowsAffected} rows)
          </span>
        )}
      </div>
    </div>
  );
}
