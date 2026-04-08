/**
 * GlobalMetrics — aggregated system-wide performance snapshot.
 * Derived from all active node metrics; never directly mutated.
 */
export interface GlobalMetrics {
  readonly totalRps: number;
  readonly avgLatency: number;
  readonly p95Latency: number;
  readonly p99Latency: number;
  readonly errorRate: number;
  readonly costPerHour: number;
  readonly totalNodes: number;
  readonly healthyNodes: number;
  readonly activeConnections: number;
  readonly totalThroughput: number;
}

export const GlobalMetrics = {
  zero(): GlobalMetrics {
    return {
      totalRps:         0,
      avgLatency:       0,
      p95Latency:       0,
      p99Latency:       0,
      errorRate:        0,
      costPerHour:      0,
      totalNodes:       0,
      healthyNodes:     0,
      activeConnections:0,
      totalThroughput:  0,
    };
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * HistoryPoint — a time-series data point for chart rendering.
 */
export interface HistoryPoint {
  readonly time: number;
  readonly rps: number;
  readonly latency: number;
  readonly errorRate: number;
  readonly cost: number;
}
