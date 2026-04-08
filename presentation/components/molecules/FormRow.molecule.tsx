import React from 'react';

interface FormRowProps {
  label:    string;
  children: React.ReactNode;
  hint?:    string;
}

/**
 * FormRow — label + control layout molecule.
 */
export function FormRow({ label, children, hint }: FormRowProps) {
  return (
    <div className="space-y-1">
      <label className="text-white/50 text-xs font-medium block">{label}</label>
      {children}
      {hint && <p className="text-white/25 text-xs">{hint}</p>}
    </div>
  );
}
