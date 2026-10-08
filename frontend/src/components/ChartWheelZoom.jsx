import React, { useEffect, useRef } from 'react';

export default function ChartWheelZoom({ onWheel, ariaLabel, children }) {
  const chartRef = useRef(null);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return undefined;
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  return (
    <div className="chart-wheel-zoom" ref={chartRef} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
