import { useCallback, useState } from 'react';

export default function useChartZoom(length) {
  const [range, setRange] = useState(null);
  const startIndex = Math.max(0, Math.min(range?.startIndex ?? 0, Math.max(0, length - 1)));
  const endIndex = Math.max(startIndex + 1, Math.min(range?.endIndex ?? length - 1, Math.max(1, length - 1)));

  const onBrushChange = useCallback((nextRange) => {
    if (!nextRange || !Number.isInteger(nextRange.startIndex) || !Number.isInteger(nextRange.endIndex)) return;
    setRange({ startIndex: nextRange.startIndex, endIndex: nextRange.endIndex });
  }, []);

  const onWheel = useCallback((event) => {
    if (length < 12) return;
    event.preventDefault();
    const currentSpan = Math.max(1, endIndex - startIndex);
    const nextSpan = Math.max(
      5,
      Math.min(length - 1, Math.round(currentSpan * (event.deltaY < 0 ? 0.8 : 1.25)))
    );
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerRatio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const anchor = startIndex + currentSpan * pointerRatio;
    const nextStart = Math.max(0, Math.min(length - 1 - nextSpan, Math.round(anchor - nextSpan * pointerRatio)));
    setRange({ startIndex: nextStart, endIndex: nextStart + nextSpan });
  }, [endIndex, length, startIndex]);

  const resetZoom = useCallback(() => setRange(null), []);

  return {
    startIndex,
    endIndex: length > 1 ? endIndex : 0,
    onBrushChange,
    onWheel,
    resetZoom,
    hasZoom: startIndex > 0 || endIndex < length - 1,
  };
}
