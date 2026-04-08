import React from 'react';

interface MetricChipProps {
  label:    string;
  value:    string;
  color:    string;
  icon?:    React.ReactNode;
}

/**
 * MetricChip — compact inline metric display for the top bar.
 */
export function MetricChip({ label, value, color, icon }: MetricChipProps) {
  return (
    <div className="flex items-center gap-1.5 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5">
      {icon}
      <span className="text-white/40 text-xs">{label}</span>
      <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
