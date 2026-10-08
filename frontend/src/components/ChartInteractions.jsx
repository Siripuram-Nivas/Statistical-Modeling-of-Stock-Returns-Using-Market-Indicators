import React, { useEffect, useId, useRef, useState } from 'react';
import { Download, Expand, Minimize2, Table2 } from 'lucide-react';

const PAGE_SIZE = 100;

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function displayValue(value) {
  if (value === null || value === undefined) return '—';
  return typeof value === 'number' ? String(value) : value;
}

export default function ChartInteractions({ data = [], title = 'Chart data', onResetView }) {
  const tableId = useId();
  const rootRef = useRef(null);
  const fullscreenTarget = useRef(null);
  const [showData, setShowData] = useState(false);
  const [page, setPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState('');
  const rows = Array.isArray(data) ? data : [];
  const columns = Object.keys(rows[0] || {});
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenTarget.current);
    };
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  const exportData = () => {
    if (!rows.length || !columns.length) return;
    try {
      const content = [
        columns.map(csvValue).join(','),
        ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(',')),
      ].join('\r\n');
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'chart'}-data.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError('');
    } catch (exportError) {
      console.error('Could not export chart data:', exportError);
      setError('Chart data could not be exported. Please try again.');
    }
  };

  const toggleFullscreen = async () => {
    const target = rootRef.current?.closest('.chart-container, .card');
    if (!target) {
      setError('Chart fullscreen is unavailable in this view.');
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (target.requestFullscreen) {
        fullscreenTarget.current = target;
        await target.requestFullscreen();
      } else {
        setError('Fullscreen is not supported by this browser.');
      }
    } catch (fullscreenError) {
      console.error('Could not change chart fullscreen state:', fullscreenError);
      setError('Chart fullscreen could not be opened. Please check browser permissions.');
    }
  };

  return (
    <div className="chart-interactions" ref={rootRef}>
      <div className="chart-interaction-actions" role="group" aria-label={`${title} controls`}>
        <button
          className="chart-interaction-button"
          type="button"
          onClick={() => {
            setShowData((visible) => !visible);
            setPage(0);
          }}
          aria-expanded={showData}
          aria-controls={tableId}
        >
          <Table2 size={14} aria-hidden="true" />
          {showData ? 'Hide Data' : 'View Data'}
        </button>
        <button
          className="chart-interaction-button"
          type="button"
          onClick={exportData}
          disabled={!rows.length}
          aria-label={`Export ${title} data as CSV`}
        >
          <Download size={14} aria-hidden="true" />
          Export Data
        </button>
        <button
          className="chart-interaction-button"
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? `Exit fullscreen for ${title}` : `Expand ${title}`}
        >
          {isFullscreen
            ? <Minimize2 size={14} aria-hidden="true" />
            : <Expand size={14} aria-hidden="true" />}
          {isFullscreen ? 'Close Expanded Chart' : 'Expand Chart'}
        </button>
        {onResetView && (
          <button className="chart-interaction-button" type="button" onClick={onResetView}>
            Reset View
          </button>
        )}
      </div>

      {error && <p className="chart-interaction-error" role="alert">{error}</p>}

      {showData && (
        <div className="chart-data-view" id={tableId}>
          {rows.length === 0 ? (
            <p>No chart data is available.</p>
          ) : (
            <>
              <div className="chart-data-scroll">
                <table className="data-table">
                  <caption className="chart-data-caption">{title} — underlying chart values</caption>
                  <thead>
                    <tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, index) => (
                      <tr key={page * PAGE_SIZE + index}>
                        {columns.map((column) => (
                          <td key={column}>{displayValue(row[column])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pageCount > 1 && (
                <div className="chart-data-pagination">
                  <span>Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}</span>
                  <button
                    className="chart-interaction-button"
                    type="button"
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    disabled={page === 0}
                    aria-label="Previous data page"
                  >
                    Previous
                  </button>
                  <button
                    className="chart-interaction-button"
                    type="button"
                    onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                    disabled={page === pageCount - 1}
                    aria-label="Next data page"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
