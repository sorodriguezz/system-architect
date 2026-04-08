import React from 'react';

interface SelectProps {
  value:    string;
  onChange: (value: string) => void;
  options:  ReadonlyArray<string>;
  label?:   string;
}

/**
 * Select — minimal styled select atom.
 */
export function Select({ value, onChange, options, label }: SelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
