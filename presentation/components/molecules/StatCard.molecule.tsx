import React from 'react';

interface StatCardProps {
  label:     string;
  value:     string | number;
  unit?:     string;
  sublabel?: string;
  color?:    string;
  icon?:     React.ReactNode;
}

/**
 * StatCard — displays a single KPI metric with optional icon and sublabel.
 * Pure display molecule — no logic.
 */
export function StatCard({ label, value, unit, sublabel, color = '#6366f1', icon }: StatCardProps) {
  return (
    <div
      className="relative p-3 rounded-xl border border-white/5 overflow-hidden"
      style={{ background: 'rgba(15,15,28,0.8)' }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${color}, transparent)` }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/40 text-xs">{label}</span>
          {icon && <span style={{ color }}>{icon}</span>}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-lg font-mono leading-none">{value}</span>
          {unit && <span className="text-white/40 text-xs">{unit}</span>}
        </div>

        {sublabel && (
          <div className="text-white/30 text-xs mt-0.5">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
