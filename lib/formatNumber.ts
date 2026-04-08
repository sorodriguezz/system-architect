/**
 * formatNumber — Human-friendly number formatting with K/M/B/T suffixes.
 *
 * Examples:
 *   formatNumber(42)           → "42"
 *   formatNumber(1_500)        → "1.5K"
 *   formatNumber(23_400)       → "23.4K"
 *   formatNumber(1_200_000)    → "1.2M"
 *   formatNumber(3_500_000_000)→ "3.5B"
 *   formatNumber(NaN)          → "0"
 *   formatNumber(Infinity)     → "∞"
 *   formatNumber(-350)         → "-350"
 *   formatNumber(999)          → "999"
 */
export function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) {
    if (value === Infinity || value === -Infinity) return '∞';
    return '0';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs < 1_000) {
    // Small integers — no decimal for whole numbers
    return abs === Math.floor(abs)
      ? `${sign}${Math.round(abs)}`
      : `${sign}${abs.toFixed(decimals)}`;
  }

  const tiers: [number, string][] = [
    [1e15, 'Q'],
    [1e12, 'T'],
    [1e9,  'B'],
    [1e6,  'M'],
    [1e3,  'K'],
  ];

  for (const [threshold, suffix] of tiers) {
    if (abs >= threshold) {
      const scaled = abs / threshold;
      // Cap display — if scaled is insanely large, recurse with next tier
      if (scaled >= 1e6) return `${sign}∞`;
      const formatted = scaled >= 100
        ? Math.round(scaled).toString()
        : scaled >= 10
          ? scaled.toFixed(scaled % 1 === 0 ? 0 : 1)
          : scaled.toFixed(decimals);
      return `${sign}${formatted}${suffix}`;
    }
  }

  return `${sign}${Math.round(abs)}`;
}

/**
 * formatRps — Specifically for RPS values.
 * Same as formatNumber but appends nothing (caller adds "rps" label).
 */
export function formatRps(value: number): string {
  return formatNumber(value);
}

/**
 * formatLatency — Formats latency in ms, switching to seconds for large values.
 * Examples:
 *   formatLatency(42)    → "42ms"
 *   formatLatency(1500)  → "1.5s"
 *   formatLatency(350)   → "350ms"
 */
export function formatLatency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0ms';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

/**
 * formatBytes — Formats bytes/sec with appropriate unit.
 * Examples:
 *   formatBytes(1500)     → "1.5 KB/s"
 *   formatBytes(2500000)  → "2.5 MB/s"
 */
export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B/s';
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} KB/s`;
  return `${Math.round(value)} B/s`;
}
