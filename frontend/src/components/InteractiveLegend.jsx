import React from 'react';

export default function InteractiveLegend({ payload = [], isolatedSeries, onToggle, onHover }) {
  return (
    <div className="chart-legend" role="group" aria-label="Chart series">
      {payload.map((item) => {
        const key = item.dataKey || item.value;
        const isMuted = isolatedSeries && isolatedSeries !== key;
        return (
          <button
            key={key}
            type="button"
            className={`chart-legend-item${isMuted ? ' is-muted' : ''}`}
            onClick={() => onToggle(key)}
            onMouseEnter={() => onHover(key)}
            onMouseLeave={() => onHover(null)}
            aria-pressed={!isMuted}
            title={isMuted ? `Show ${item.value} with all series` : `Isolate ${item.value}`}
          >
            <span className="chart-legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.value}
          </button>
        );
      })}
    </div>
  );
}
