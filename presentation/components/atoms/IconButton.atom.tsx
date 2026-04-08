import React from 'react';

interface IconButtonProps {
  onClick:    () => void;
  title?:     string;
  children:   React.ReactNode;
  variant?:   'default' | 'danger' | 'success' | 'warning' | 'primary';
  size?:      'sm' | 'md';
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'bg-white/3 border-white/8 text-white/50 hover:text-white/80 hover:border-white/20',
  danger:  'bg-red-500/10 border-red-500/20 text-red-400/70 hover:bg-red-500/20 hover:text-red-400',
  success: 'bg-green-500/10 border-green-500/20 text-green-400/70 hover:bg-green-500/20 hover:text-green-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400/70 hover:bg-amber-500/20 hover:text-amber-400',
  primary: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30',
};

const SIZE_STYLES: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'p-1',
  md: 'p-1.5',
};

/**
 * IconButton — small icon-only button atom with semantic variants.
 */
export function IconButton({
  onClick,
  title,
  children,
  variant = 'default',
  size    = 'md',
  className = '',
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center rounded-lg border transition-all ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
    >
      {children}
    </button>
  );
}
