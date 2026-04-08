import { NodeEntity } from '@/domain/entities/Node.entity';
import { NodeMetrics } from '@/domain/value-objects/NodeMetrics.vo';
import { NodeStatus, NodeType } from '@/domain/constants/NodeTypes.constant';

/**
 * SimulationEngine — realistic traffic simulation per node type.
 *
 * Each node type has real-world baseline characteristics:
 * - CDN: 95%+ cache hit rate → very low origin traffic, sub-10ms latency
 * - Database: high latency at load (10-150ms), strict connection limits
 * - Cache: sub-millisecond read, very high throughput
 * - Load Balancer: minimal latency addition (0.5-3ms overhead)
 * - API Gateway: auth + routing overhead (8-30ms)
 * etc.
 */

// ── Per-type realistic baseline profiles ──────────────────────────────────────

interface NodeProfile {
  baseLatencyMs:    number;   // P50 latency at 0% load
  latencyAtMaxLoad: number;   // P50 latency at 100% CPU
  jitterFraction:   number;   // latency noise coefficient (0..1)
  cpuEfficiency:    number;   // how efficiently replicas distribute load (0..1)
  errorAtHighLoad:  number;   // error rate injected at >85% CPU
  maxThroughputMbs: number;   // realistic MB/s at full RPS
}

const NODE_PROFILES: Record<string, NodeProfile> = {
  [NodeType.CLIENT]: {
    baseLatencyMs: 0, latencyAtMaxLoad: 0, jitterFraction: 0,
    cpuEfficiency: 1, errorAtHighLoad: 0, maxThroughputMbs: 0,
  },
  [NodeType.DNS]: {
    baseLatencyMs: 3, latencyAtMaxLoad: 8, jitterFraction: 0.4,
    cpuEfficiency: 0.98, errorAtHighLoad: 0.1, maxThroughputMbs: 0.1,
  },
  [NodeType.CDN]: {
    baseLatencyMs: 8, latencyAtMaxLoad: 25, jitterFraction: 0.3,
    cpuEfficiency: 0.97, errorAtHighLoad: 0.05, maxThroughputMbs: 800,
  },
  [NodeType.WAF]: {
    baseLatencyMs: 2, latencyAtMaxLoad: 15, jitterFraction: 0.25,
    cpuEfficiency: 0.9, errorAtHighLoad: 0.2, maxThroughputMbs: 200,
  },
  [NodeType.LOAD_BALANCER]: {
    baseLatencyMs: 1, latencyAtMaxLoad: 5, jitterFraction: 0.2,
    cpuEfficiency: 0.95, errorAtHighLoad: 0.3, maxThroughputMbs: 500,
  },
  [NodeType.API_GATEWAY]: {
    baseLatencyMs: 12, latencyAtMaxLoad: 80, jitterFraction: 0.35,
    cpuEfficiency: 0.88, errorAtHighLoad: 1.5, maxThroughputMbs: 150,
  },
  [NodeType.APP_SERVER]: {
    baseLatencyMs: 35, latencyAtMaxLoad: 800, jitterFraction: 0.5,
    cpuEfficiency: 0.82, errorAtHighLoad: 3, maxThroughputMbs: 60,
  },
  [NodeType.MICROSERVICE]: {
    baseLatencyMs: 18, latencyAtMaxLoad: 300, jitterFraction: 0.45,
    cpuEfficiency: 0.85, errorAtHighLoad: 2, maxThroughputMbs: 80,
  },
  [NodeType.AUTH]: {
    baseLatencyMs: 20, latencyAtMaxLoad: 120, jitterFraction: 0.4,
    cpuEfficiency: 0.87, errorAtHighLoad: 0.5, maxThroughputMbs: 20,
  },
  [NodeType.CACHE]: {
    baseLatencyMs: 0.4, latencyAtMaxLoad: 3, jitterFraction: 0.6,
    cpuEfficiency: 0.99, errorAtHighLoad: 0.1, maxThroughputMbs: 1000,
  },
  [NodeType.DATABASE]: {
    baseLatencyMs: 5, latencyAtMaxLoad: 250, jitterFraction: 0.6,
    cpuEfficiency: 0.75, errorAtHighLoad: 5, maxThroughputMbs: 50,
  },
  [NodeType.QUEUE]: {
    baseLatencyMs: 4, latencyAtMaxLoad: 30, jitterFraction: 0.3,
    cpuEfficiency: 0.96, errorAtHighLoad: 0.2, maxThroughputMbs: 400,
  },
  [NodeType.WORKER]: {
    baseLatencyMs: 50, latencyAtMaxLoad: 3000, jitterFraction: 0.7,
    cpuEfficiency: 0.8, errorAtHighLoad: 2, maxThroughputMbs: 30,
  },
  [NodeType.STORAGE]: {
    baseLatencyMs: 15, latencyAtMaxLoad: 100, jitterFraction: 0.5,
    cpuEfficiency: 0.95, errorAtHighLoad: 0.3, maxThroughputMbs: 200,
  },
  [NodeType.SERVICE_MESH]: {
    baseLatencyMs: 1.5, latencyAtMaxLoad: 10, jitterFraction: 0.2,
    cpuEfficiency: 0.94, errorAtHighLoad: 0.2, maxThroughputMbs: 300,
  },
  [NodeType.CIRCUIT_BREAKER]: {
    baseLatencyMs: 0.5, latencyAtMaxLoad: 5, jitterFraction: 0.3,
    cpuEfficiency: 0.98, errorAtHighLoad: 0.1, maxThroughputMbs: 500,
  },
  [NodeType.SEARCH]: {
    baseLatencyMs: 20, latencyAtMaxLoad: 400, jitterFraction: 0.55,
    cpuEfficiency: 0.8, errorAtHighLoad: 2, maxThroughputMbs: 40,
  },
  [NodeType.MONITOR]: {
    baseLatencyMs: 5, latencyAtMaxLoad: 30, jitterFraction: 0.4,
    cpuEfficiency: 0.9, errorAtHighLoad: 0.1, maxThroughputMbs: 10,
  },
  [NodeType.EMAIL]: {
    baseLatencyMs: 200, latencyAtMaxLoad: 2000, jitterFraction: 0.8,
    cpuEfficiency: 0.85, errorAtHighLoad: 3, maxThroughputMbs: 2,
  },
  [NodeType.PAYMENT]: {
    baseLatencyMs: 120, latencyAtMaxLoad: 800, jitterFraction: 0.6,
    cpuEfficiency: 0.9, errorAtHighLoad: 4, maxThroughputMbs: 5,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function addNoise(base: number, fraction: number): number {
  return base * (1 + (Math.random() - 0.5) * fraction);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function computeEffectiveCpuLoad(
  trafficLevel: number,
  replicas: number,
  efficiency: number
): number {
  // Real-world: load distributes with diminishing returns on replicas
  const baseLoad = (trafficLevel / 100) * 75;
  const scaledLoad = baseLoad / Math.pow(replicas, efficiency);
  return clamp(addNoise(scaledLoad, 0.12), 0, 100);
}

function computeLatency(profile: NodeProfile, cpuLoad: number): number {
  // Exponential latency curve: near-zero impact until ~70% CPU, then spike
  const loadFactor = cpuLoad < 70
    ? 1 + (cpuLoad / 70) * 0.3
    : 1.3 + Math.pow((cpuLoad - 70) / 30, 2.5) * ((profile.latencyAtMaxLoad / profile.baseLatencyMs) - 1);
  return clamp(addNoise(profile.baseLatencyMs * loadFactor, profile.jitterFraction), 0.1, 30000);
}

function computeErrorRate(
  profile: NodeProfile,
  cpuLoad: number,
  isChaos: boolean,
  isChaosMode: boolean
): number {
  let base = 0;

  // Realistic: errors appear >85% CPU
  if (cpuLoad > 85) {
    base += profile.errorAtHighLoad * Math.pow((cpuLoad - 85) / 15, 1.5);
  }
  if (isChaos || isChaosMode) {
    base += addNoise(18, 0.7);
  }

  return clamp(addNoise(base, 0.5), 0, 100);
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface SimulationTickInput {
  node:         NodeEntity;
  trafficLevel: number;
  speed:        number;
  isChaosMode:  boolean;
}

export interface SimulationTickOutput {
  metrics: NodeMetrics;
  status:  NodeStatus;
}

export function computeNodeTick({
  node,
  trafficLevel,
  speed,
  isChaosMode,
}: SimulationTickInput): SimulationTickOutput {
  if (node.status === NodeStatus.DOWN) {
    return {
      metrics: { ...node.metrics, rps: 0, uptime: 0, errorRate: 100, cpuLoad: 0 },
      status:  NodeStatus.DOWN,
    };
  }

  const profile   = NODE_PROFILES[node.type] ?? NODE_PROFILES[NodeType.APP_SERVER];
  const cpuLoad   = computeEffectiveCpuLoad(trafficLevel, node.config.replicas, profile.cpuEfficiency);

  // Chaos amplification
  const chaosCpu  = (node.isChaosActive || isChaosMode) ? clamp(cpuLoad * addNoise(2.2, 0.4), 0, 100) : cpuLoad;

  const latency   = computeLatency(profile, chaosCpu);
  const errorRate = computeErrorRate(profile, chaosCpu, node.isChaosActive, isChaosMode);

  // RPS: realistic — limited by maxRps × replicas, reduced at high error rate
  const maxCapacity = node.config.maxRps * node.config.replicas;
  const loadRps     = (trafficLevel / 100) * maxCapacity * (1 - errorRate / 200);
  const rps         = clamp(addNoise(loadRps, 0.08), 0, maxCapacity);

  // Memory: correlates with CPU but with slower response
  const memoryLoad = clamp(addNoise(chaosCpu * 0.72 + 15, 0.1), 0, 100);

  // Connections: realistic ratio per node type
  const connectionsPerRps = node.type === NodeType.DATABASE ? 0.8 : node.type === NodeType.CACHE ? 0.2 : 0.5;
  const connections       = clamp(Math.floor(rps * connectionsPerRps), 0, 50000);

  // Throughput in MB/s
  const throughput = clamp(addNoise((rps / (node.config.maxRps || 1)) * profile.maxThroughputMbs, 0.2), 0, profile.maxThroughputMbs * 1.1);

  const rawMetrics: NodeMetrics = {
    rps, latency, errorRate,
    cpuLoad: chaosCpu, memoryLoad, connections, throughput,
    uptime: node.metrics.uptime + speed * 0.5,
  };

  // Smooth with EMA to avoid flickery UI
  const ALPHA = 0.35;
  const smoothed = NodeMetrics.smooth(node.metrics, rawMetrics, ALPHA);

  // Derive status from smoothed values
  const status = deriveStatus(node, smoothed.cpuLoad, smoothed.errorRate);

  return { metrics: smoothed, status };
}

function deriveStatus(node: NodeEntity, cpuLoad: number, errorRate: number): NodeStatus {
  if (node.status === NodeStatus.DOWN) return NodeStatus.DOWN;
  if (node.isChaosActive)             return NodeStatus.DEGRADED;
  if (cpuLoad > 95)                   return NodeStatus.OVERLOADED;
  if (cpuLoad > 75 || errorRate > 8)  return NodeStatus.DEGRADED;
  return NodeStatus.HEALTHY;
}

export function computeEdgeTrafficPercentage(
  sourceNode: NodeEntity | undefined
): number {
  if (!sourceNode || sourceNode.status === NodeStatus.DOWN) return 0;
  const capacity = sourceNode.config.maxRps * sourceNode.config.replicas;
  if (capacity === 0) return 0;
  return clamp((sourceNode.metrics.rps / capacity) * 100, 0, 100);
}
