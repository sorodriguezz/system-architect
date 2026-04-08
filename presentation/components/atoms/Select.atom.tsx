'use client';
import React, { useState, useRef, useEffect } from 'react';

interface SelectProps {
  value:    string;
  onChange: (value: string) => void;
  options:  ReadonlyArray<string>;
  label?:   string;
}

/**
 * Select — fully custom dark-themed dropdown.
 * Replaces native <select> to avoid OS white-background flash in dark UIs.
 */
export function Select({ value, onChange, options, label }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }} aria-label={label}>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          background: open
            ? 'rgba(99,102,241,0.12)'
            : 'rgba(255,255,255,0.05)',
          border: open
            ? '1px solid rgba(99,102,241,0.45)'
            : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          color: 'rgba(255,255,255,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s, background 0.15s',
          outline: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{
            color: 'rgba(255,255,255,0.35)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#111118',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 8,
            boxShadow: '0 12px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)',
            zIndex: 9999,
            overflow: 'hidden',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {options.map(opt => (
            <DropdownOption
              key={opt}
              label={opt}
              selected={opt === value}
              onSelect={() => { onChange(opt); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownOption({
  label, selected, onSelect,
}: { label: string; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '7px 10px',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: selected ? 600 : 400,
        color: selected ? '#818cf8' : hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)',
        background: selected
          ? 'rgba(99,102,241,0.15)'
          : hovered
          ? 'rgba(255,255,255,0.05)'
          : 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {selected && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {!selected && <span style={{ width: 10 }} />}
      {label}
    </button>
  );
}
