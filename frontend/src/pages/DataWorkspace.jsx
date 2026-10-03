// Market Data — CSV Upload, Column Mapping, Preview, Quality Summary

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  LoadingDots, EmptyState, ErrorAlert, SyntheticBanner,
  LogEntry, SectionHeader, ModuleBadge, InfoAlert
} from '../components/UI';

// ─── Column Mapping UI ────────────────────────────────────────────────────────
function ColumnMapper({ headers, mapping, onChange }) {
  const FIELDS = [
    { key: 'date', label: 'Date Column', hint: 'e.g. Date, timestamp, trading_date' },
    { key: 'stock_close', label: 'Stock Close Price', hint: 'e.g. Close, price, adj_close' },
    { key: 'volume', label: 'Trading Volume', hint: 'e.g. Volume, vol, shares_traded' },
    { key: 'market_close', label: 'Market Index Close', hint: 'e.g. NIFTY_Close, market_close, SPY_Close' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      {FIELDS.map(f => (
        <div key={f.key}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.375rem' }}>
            {f.label}
          </label>
          <select
            value={mapping[f.key] || ''}
            onChange={e => onChange({ ...mapping, [f.key]: e.target.value || null })}
            style={{
              width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', fontSize: '0.875rem',
            }}
          >
            <option value="">— Auto-detect —</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>{f.hint}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Quality Summary ─────────────────────────────────────────────────────────
function QualitySummary({ quality }) {
  const rows = [
    ['Total Input Rows', quality.total_rows, ''],
    ['Valid Rows (after cleaning)', quality.valid_rows, quality.valid_rows < quality.total_rows ? 'warning' : 'ok'],
    ['Duplicate Date Rows', quality.duplicate_rows, quality.duplicate_rows > 0 ? 'warning' : 'ok'],
    ['Missing Value Cells', quality.missing_value_cells, quality.missing_value_cells > 0 ? 'warning' : 'ok'],
    ['Invalid Value Cells', quality.invalid_value_cells, quality.invalid_value_cells > 0 ? 'warning' : 'ok'],
    ['Date Ordering', quality.date_ordering, quality.date_ordering === 'correct' ? 'ok' : 'info'],
    ['Analytical Rows (after lag removal)', quality.analytical_rows, quality.analytical_rows < 30 ? 'warning' : 'ok'],
  ];

  const colors = { ok: 'var(--color-success)', warning: 'var(--color-warning)', error: 'var(--color-danger)', info: 'var(--color-accent)' };

  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th className="num">Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value, status]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className="num">{typeof value === 'string' ? value : value.toLocaleString()}</td>
              <td>
                {status && (
                  <span style={{ color: colors[status], fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
                    ● {status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {quality.warnings?.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          {quality.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Data Preview Table ───────────────────────────────────────────────────────
function DataPreview({ preview }) {
  const cols = ['dates', 'stock_return', 'market_return', 'volume_change', 'prev_stock_return'];
  const labels = ['Date', 'Stock Return (%)', 'Market Return (%)', 'Volume Change (%)', 'Prev Return (%)'];
  const n = preview.dates?.length || 0;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>{labels.map(l => <th key={l}>{l}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i}>
              <td>{preview.dates[i]}</td>
              <td className="num" style={{ color: preview.stock_return[i] >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {preview.stock_return[i]?.toFixed(4)}
              </td>
              <td className="num">{preview.market_return[i]?.toFixed(4)}</td>
              <td className="num">{preview.volume_change[i]?.toFixed(4)}</td>
              <td className="num">{preview.prev_stock_return[i]?.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
        Showing first {n} rows of computed analytical dataset (after return calculations).
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DataWorkspace() {
  const { dataset, dataLoading, dataError, uploadCSV, loadDemo, setActiveModule, guidedDemo } = useApp();
  const [file, setFile] = useState(null);
  const [sourceDesc, setSourceDesc] = useState('');
  const [columnMapping, setColumnMapping] = useState({});
  const [headers, setHeaders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [step, setStep] = useState('drop'); // 'drop' | 'map' | 'done'

  const onDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    setUploadError(null);

    // Read headers for column mapping
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const firstLine = text.split('\n')[0];
      const cols = firstLine.split(',').map(c => c.trim().replace(/"/g, ''));
      setHeaders(cols);
      setStep('map');
    };
    reader.readAsText(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadCSV(file, sourceDesc || 'User-provided dataset', columnMapping);
      setStep('done');
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDemo = async () => {
    await loadDemo();
    setStep('done');
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <SectionHeader
        title="Market Data"
        subtitle="Upload historical market data or explore the synthetic demo dataset"
        badge={<ModuleBadge label="Data Pipeline" />}
      />

      {!dataset && step !== 'done' && !guidedDemo.active && (
        <>
          {/* Drop zone */}
          {step === 'drop' && (
            <>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                  <input {...getInputProps()} />
                  <Upload size={40} color="var(--color-text-dim)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                    {isDragActive ? 'Drop CSV file here' : 'Drag & drop a CSV file'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
                    Or click to browse. Supported: Date, Close, Volume, Market Index columns.
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                    Expected columns: date · close · volume · market_close (names flexible)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>

              <div className="card" style={{ background: 'rgba(251,191,36,0.05)', borderColor: 'rgba(251,191,36,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="badge badge-synthetic">⚗ Demo</span>
                      <span style={{ fontWeight: 700 }}>Synthetic Market Dataset</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      252 artificially generated trading days for demonstration and analysis workflows.
                    </p>
                  </div>
                  <button className="btn btn-outline" onClick={handleDemo}>
                    Load Demo
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Column Mapping Step */}
          {step === 'map' && file && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <FileText size={20} color="var(--color-primary)" />
                <div>
                  <div style={{ fontWeight: 700 }}>{file.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                    {(file.size / 1024).toFixed(1)} KB · {headers.length} columns detected
                  </div>
                </div>
              </div>

              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Column Mapping</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Map your CSV columns to the required fields. Leave as "Auto-detect" if the names are standard.
              </p>

              <ColumnMapper headers={headers} mapping={columnMapping} onChange={setColumnMapping} />

              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
                  Data Source Description (optional)
                </label>
                <input
                  type="text"
                  value={sourceDesc}
                  onChange={e => setSourceDesc(e.target.value)}
                  placeholder="e.g. TCS.NS from Yahoo Finance, Jan 2022 – Dec 2023"
                  style={{
                    width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8,
                    background: 'var(--color-card)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text)', fontSize: '0.875rem',
                  }}
                />
              </div>

              {uploadError && <div style={{ marginTop: '1rem' }}><ErrorAlert message={uploadError} /></div>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Processing...' : 'Process Dataset'}
                </button>
                <button className="btn btn-outline" onClick={() => { setFile(null); setStep('drop'); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading */}
      {(dataLoading || uploading) && <LoadingDots label="Processing dataset through pipeline..." />}

      {/* Error */}
      {dataError && !dataLoading && <ErrorAlert message={dataError} />}

      {/* Dataset Loaded */}
      {dataset && (
        <>
          {dataset.is_synthetic && <SyntheticBanner />}

          <div data-guided-demo-target="demo-data-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
            {[
              { label: 'Observations', value: dataset.n_observations?.toLocaleString() },
              { label: 'Start Date', value: dataset.date_range_start },
              { label: 'End Date', value: dataset.date_range_end },
              { label: 'Source', value: dataset.is_synthetic ? 'Synthetic' : 'User Upload' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{s.label}</div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Source */}
          <div className="card" data-guided-demo-target="demo-data-source" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Dataset Provenance</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              <strong>File:</strong> {dataset.source_filename}<br />
              <strong>Description:</strong> {dataset.source_description}
            </p>
          </div>

          {/* Data Quality */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Data Quality Summary</h3>
            <QualitySummary quality={dataset.quality_summary} />
          </div>

          {/* Processing Log */}
          <div className="card" data-guided-demo-target="demo-processing-log" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Processing Log</h3>
            {dataset.processing_log?.map((entry, i) => (
              <LogEntry key={i} {...entry} rowsAffected={entry.rows_affected} />
            ))}
          </div>

          {/* Preview */}
          {dataset.preview && (
            <div className="card" data-guided-demo-target="demo-data-preview" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Analytical Dataset Preview</h3>
              <InfoAlert message="Return variables are computed from the pipeline. Raw close prices are not shown here." />
              <div style={{ marginTop: '1rem' }}>
                <DataPreview preview={dataset.preview} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setActiveModule('descriptive')}>
              → Run Descriptive Statistics
            </button>
            {!guidedDemo.active && (
              <button className="btn btn-outline" onClick={() => {
                setFile(null); setStep('drop'); setHeaders([]);
              }}>
                Upload Different Dataset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
