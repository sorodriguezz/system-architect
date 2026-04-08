import React from 'react';

interface ToggleProps {
  value:    boolean;
  onChange: (value: boolean) => void;
  color?:   string;
}

/**
 * Toggle — accessible boolean switch atom.
 */
export function Toggle({ value, onChange, color = '#6366f1' }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      style={{ background: value ? color : 'rgba(255,255,255,0.1)' }}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: value ? 'translateX(20px)' : 'translateX(4px)' }}
      />
    </button>
  );
}
