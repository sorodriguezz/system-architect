/**
 * NodeMetrics — immutable value object representing a snapshot of node performance.
 * All fields are readonly. Use the factory to create and the updater to derive new instances.
 */
export interface NodeMetrics {
  readonly rps: number;         // Requests per second
  readonly latency: number;     // Average latency in ms
  readonly errorRate: number;   // Error percentage 0–100
  readonly cpuLoad: number;     // CPU utilization 0–100
  readonly memoryLoad: number;  // Memory utilization 0–100
  readonly connections: number; // Active connections count
  readonly throughput: number;  // Throughput in MB/s
  readonly uptime: number;      // Cumulative uptime in seconds
}

export const NodeMetrics = {
  /**
   * Creates a zero-initialized NodeMetrics value object.
   * Use this as the initial state for any new node.
   */
  zero(): NodeMetrics {
    return {
      rps: 0,
      latency: 0,
      errorRate: 0,
      cpuLoad: 0,
      memoryLoad: 0,
      connections: 0,
      throughput: 0,
      uptime: 0,
    };
  },

  /**
   * Creates an updated NodeMetrics by merging partial values.
   * Preserves immutability — returns a new object every time.
   */
  update(current: NodeMetrics, partial: Partial<NodeMetrics>): NodeMetrics {
    return { ...current, ...partial };
  },

  /**
   * Applies exponential moving average smoothing between two snapshots.
   * Prevents jarring metric jumps in the UI.
   */
  smooth(previous: NodeMetrics, next: NodeMetrics, alpha: number): NodeMetrics {
    // NaN-safe EMA blend: if either operand is NaN/Infinity, fallback to next.
    const blend = (a: number, b: number): number => {
      const result = a * (1 - alpha) + b * alpha;
      return Number.isFinite(result) ? result : (Number.isFinite(b) ? b : 0);
    };
    return {
      rps:         blend(previous.rps,         next.rps),
      latency:     blend(previous.latency,      next.latency),
      errorRate:   blend(previous.errorRate,    next.errorRate),
      cpuLoad:     blend(previous.cpuLoad,      next.cpuLoad),
      memoryLoad:  blend(previous.memoryLoad,   next.memoryLoad),
      connections: Math.floor(blend(previous.connections, next.connections)),
      throughput:  blend(previous.throughput,   next.throughput),
      uptime:      Number.isFinite(next.uptime) ? next.uptime : 0,
    };
  },
} as const;
