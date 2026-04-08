import React from 'react';

interface MetricBarProps {
  value:    number;
  max?:     number;
  color:    string;
  animated?: boolean;
}

/**
 * MetricBar — single-line progress bar for visualizing a 0–max value.
 * Pure display atom: no logic, no state.
 */
export function MetricBar({ value, max = 100, color, animated = true }: MetricBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
      <div
        className={animated ? 'h-full rounded-full transition-all duration-300' : 'h-full rounded-full'}
        style={{ width: `${percentage}%`, background: color }}
      />
    </div>
  );
}
