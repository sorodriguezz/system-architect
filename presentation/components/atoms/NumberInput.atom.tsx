import React from 'react';

interface NumberInputProps {
  value:    number;
  onChange: (value: number) => void;
  min?:     number;
  max?:     number;
  step?:    number;
  label?:   string;
}

/**
 * NumberInput — styled numeric input atom.
 */
export function NumberInput({ value, onChange, min = 0, max = 100000, step = 1, label }: NumberInputProps) {
  return (
    <input
      type="number"
      aria-label={label}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors"
    />
  );
}
