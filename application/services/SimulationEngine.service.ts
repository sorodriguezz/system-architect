import { NodeEntity } from '@/domain/entities/Node.entity';
import { NodeMetrics } from '@/domain/value-objects/NodeMetrics.vo';
import { NodeConfig } from '@/domain/value-objects/NodeConfig.vo';
import { NodeStatus, NodeType, ServiceTier, CloudRegion } from '@/domain/constants/NodeTypes.constant';

/**
 * SimulationEngine — realistic traffic simulation per node type.
 *
 * EVERY config field matters:
 * - replicas:    Horizontal scaling. CPU load divides across replicas.
 * - maxRps:      Per-replica throughput ceiling. Total capacity = maxRps × replicas.
 * - tier:        Infra quality multiplier (free=0.5×, standard=1×, premium=1.5×, enterprise=2×).
 * - region:      Geographic latency offset (us-east-1 baseline, ap-southeast-1 +80ms).
 * - timeout:     If response latency > timeout → request fails → error rate rises.
 * - retries:     On error, client retries N times → amplifies actual load by (1 + retries × errorRate/100).
 * - autoscaling: Handled by TickSimulation (scales replicas based on CPU).
 * - ssl:         Adds ~2ms latency overhead for TLS handshake.
 * - auth:        Adds ~5ms latency for token validation per request.
 */

// ── Protocol profiles (real-world overhead per communication protocol) ────────
//
// Each protocol adds latency overhead and has a max throughput ceiling.
// These impact: edge latency, edge RPS capacity, and CPU overhead on target.
//
//   HTTP:      Standard REST. ~2ms overhead per request (parsing, headers).
//   HTTPS:     HTTP + TLS handshake. ~5ms overhead. CPU cost for encryption.
//   gRPC:      Binary protobuf. ~1ms overhead. 3× more efficient than JSON.
//   TCP:       Raw socket. ~0.5ms overhead. Highest throughput.
//   WebSocket: Persistent connection. ~0.2ms per message after handshake.
//   AMQP:      Message broker protocol. ~3ms overhead (routing, ACK).
//   Redis:     In-memory protocol. ~0.3ms overhead. Very low latency.

export interface ProtocolProfile {
  latencyOverheadMs: number;  // Added to target node's latency per request
  throughputFactor:  number;  // Multiplier on edge throughput (1.0 = baseline HTTP)
  cpuOverhead:       number;  // Additional CPU % added to target (e.g., TLS = 5%)
  label:             string;  // Human-readable name
}

export const PROTOCOL_PROFILES: Record<string, ProtocolProfile> = {
  http:      { latencyOverheadMs: 2,   throughputFactor: 1.0, cpuOverhead: 0,  label: 'HTTP'  },
  https:     { latencyOverheadMs: 5,   throughputFactor: 0.9, cpuOverhead: 5,  label: 'HTTPS' },
  grpc:      { latencyOverheadMs: 1,   throughputFactor: 1.8, cpuOverhead: 3,  label: 'gRPC'  },
  tcp:       { latencyOverheadMs: 0.5, throughputFactor: 2.0, cpuOverhead: 0,  label: 'TCP'   },
  websocket: { latencyOverheadMs: 0.2, throughputFactor: 1.5, cpuOverhead: 1,  label: 'WS'    },
  amqp:      { latencyOverheadMs: 3,   throughputFactor: 1.2, cpuOverhead: 2,  label: 'AMQP'  },
  redis:     { latencyOverheadMs: 0.3, throughputFactor: 2.5, cpuOverhead: 1,  label: 'Redis' },
};

// ── Tier multipliers ──────────────────────────────────────────────────────────

const TIER_THROUGHPUT_MULT: Record<string, number> = {
  free:       0.5,
  standard:   1.0,
  premium:    1.5,
  enterprise: 2.0,
};

const TIER_LATENCY_MULT: Record<string, number> = {
  free:       1.4,   // Noisy neighbors, shared infra
  standard:   1.0,
  premium:    0.8,   // Better hardware, dedicated resources
  enterprise: 0.6,   // Top-tier hardware, priority networking
};

// ── Region latency offsets (ms added to base latency) ────────────────────────

const REGION_LATENCY_OFFSET: Record<string, number> = {
  'us-east-1':       0,
  'us-west-2':       15,
  'eu-west-1':       40,
  'ap-southeast-1':  80,
  'ap-northeast-1':  60,
};

// ── Per-type realistic baseline profiles ──────────────────────────────────────

interface NodeProfile {
  baseLatencyMs:    number;
  latencyAtMaxLoad: number;
  jitterFraction:   number;
  cpuEfficiency:    number;
  errorAtHighLoad:  number;
  maxThroughputMbs: number;
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
  if (!Number.isFinite(base) || base === 0) return 0;
  return base * (1 + (Math.random() - 0.5) * fraction);
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function safe(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/** Compute effective capacity = maxRps × replicas × tierMultiplier */
function effectiveCapacity(config: NodeConfig): number {
  const tierMult = TIER_THROUGHPUT_MULT[config.tier] ?? 1;
  return config.maxRps * config.replicas * tierMult;
}

function computeEffectiveCpuLoad(
  trafficLevel: number,
  replicas: number,
  efficiency: number,
  tierMult: number,
): number {
  // Higher tier = better hardware = less CPU for same load
  const baseLoad = (trafficLevel / 100) * 75 / tierMult;
  const scaledLoad = replicas > 0
    ? baseLoad / Math.pow(replicas, efficiency)
    : baseLoad;
  return clamp(addNoise(scaledLoad, 0.12), 0, 100);
}

function computeLatency(
  profile: NodeProfile,
  cpuLoad: number,
  config: NodeConfig,
): number {
  if (profile.baseLatencyMs <= 0) return 0;

  // Region offset
  const regionOffset = REGION_LATENCY_OFFSET[config.region] ?? 0;

  // Tier multiplier (enterprise = faster hardware)
  const tierLatMult = TIER_LATENCY_MULT[config.tier] ?? 1;

  // SSL overhead
  const sslOverhead = config.sslEnabled ? 2 : 0;

  // Auth overhead
  const authOverhead = config.authEnabled ? 5 : 0;

  let loadFactor: number;
  if (cpuLoad < 70) {
    loadFactor = 1 + (cpuLoad / 70) * 0.3;
  } else {
    const ratio = profile.baseLatencyMs > 0
      ? profile.latencyAtMaxLoad / profile.baseLatencyMs
      : 1;
    loadFactor = 1.3 + Math.pow((cpuLoad - 70) / 30, 2.5) * (ratio - 1);
  }

  if (!Number.isFinite(loadFactor)) loadFactor = 1;

  const baseResult = profile.baseLatencyMs * loadFactor * tierLatMult;
  return clamp(
    addNoise(baseResult, profile.jitterFraction) + regionOffset + sslOverhead + authOverhead,
    0,
    30000,
  );
}

function computeErrorRate(
  profile: NodeProfile,
  cpuLoad: number,
  latency: number,
  config: NodeConfig,
  isChaos: boolean,
  isChaosMode: boolean,
): number {
  let base = 0;

  // High CPU → errors (saturation)
  if (cpuLoad > 85) {
    base += profile.errorAtHighLoad * Math.pow((cpuLoad - 85) / 15, 1.5);
  }

  // Timeout exceeded → requests fail
  if (config.timeoutMs > 0 && latency > config.timeoutMs) {
    base += 50 + (latency / config.timeoutMs - 1) * 30;
  } else if (config.timeoutMs > 0 && latency > config.timeoutMs * 0.8) {
    // Close to timeout — some requests start timing out
    base += ((latency / config.timeoutMs - 0.8) / 0.2) * 15;
  }

  // Chaos injection
  if (isChaos || isChaosMode) {
    base += addNoise(18, 0.7) || 18;
  }

  return clamp(addNoise(base, 0.5), 0, 100);
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface SimulationTickInput {
  node:         NodeEntity;
  trafficLevel: number;
  speed:        number;
  isChaosMode:  boolean;
  upstreamDegradation?: number;
  /** Extra CPU % from protocol overhead (e.g., HTTPS TLS termination = 5%) */
  protocolCpuOverhead?: number;
  /** How many consecutive ticks this node has been OVERLOADED (for auto-crash) */
  overloadedTicks?: number;
}

// ── Auto-crash thresholds ────────────────────────────────────────────────────
// If a node stays OVERLOADED for this many consecutive ticks, it crashes (goes DOWN).
// At 500ms per tick, 6 ticks ≈ 3 seconds of sustained overload.
export const CRASH_AFTER_TICKS = 6;

// Error rate threshold for crash: if errors exceed this AND CPU is high, crash.
export const CRASH_ERROR_THRESHOLD = 80;

export interface SimulationTickOutput {
  metrics: NodeMetrics;
  status:  NodeStatus;
}

export function computeNodeTick({
  node,
  trafficLevel,
  speed,
  isChaosMode,
  upstreamDegradation = 1,
  protocolCpuOverhead = 0,
  overloadedTicks = 0,
}: SimulationTickInput): SimulationTickOutput {
  const config = node.config;

  // ── DOWN nodes ──────────────────────────────────────────────────────────
  if (node.status === NodeStatus.DOWN) {
    return {
      metrics: { ...node.metrics, rps: 0, uptime: 0, errorRate: 100, cpuLoad: 0, latency: 0 },
      status:  NodeStatus.DOWN,
    };
  }

  // ── CLIENT nodes (Users) ────────────────────────────────────────────────
  if (node.type === NodeType.CLIENT) {
    const maxCap = effectiveCapacity(config);
    const rps = safe((trafficLevel / 100) * maxCap);
    return {
      metrics: {
        rps:         safe(rps),
        latency:     0,
        errorRate:   0,
        cpuLoad:     safe(clamp(maxCap > 0 ? (rps / maxCap) * 50 : 0, 0, 100)),
        memoryLoad:  safe(clamp(maxCap > 0 ? (rps / maxCap) * 30 : 0, 0, 100)),
        connections: Math.min(Math.floor(rps), 999999),
        throughput:  safe(rps * 0.005),
        uptime:      node.metrics.uptime + speed * 0.5,
      },
      status: NodeStatus.HEALTHY,
    };
  }

  // ── Server nodes ────────────────────────────────────────────────────────
  const profile = NODE_PROFILES[node.type] ?? NODE_PROFILES[NodeType.APP_SERVER];
  const tierMult = TIER_THROUGHPUT_MULT[config.tier] ?? 1;

  let cpuLoad = computeEffectiveCpuLoad(
    trafficLevel, config.replicas, profile.cpuEfficiency, tierMult,
  );

  // Protocol overhead: HTTPS TLS termination, gRPC protobuf, etc.
  cpuLoad = clamp(cpuLoad + protocolCpuOverhead * (trafficLevel / 100), 0, 100);

  // Cascade: upstream degradation increases CPU pressure
  if (upstreamDegradation > 1) {
    cpuLoad = clamp(cpuLoad * upstreamDegradation, 0, 100);
  }

  // Chaos amplification
  const chaosCpu = (node.isChaosActive || isChaosMode)
    ? clamp(cpuLoad * safe(addNoise(2.2, 0.4) || 2.2), 0, 100)
    : cpuLoad;

  const latency = computeLatency(profile, chaosCpu, config);

  const errorRate = computeErrorRate(
    profile, chaosCpu, latency, config,
    node.isChaosActive, isChaosMode,
  );

  // RPS: limited by effective capacity, reduced at high error rate
  const maxCap = effectiveCapacity(config);

  // Retries amplify load: each error triggers `retries` additional attempts
  const retryAmplification = 1 + (config.retries * (errorRate / 100));
  const effectiveTraffic = Math.min(trafficLevel * retryAmplification, 100);

  const loadRps = (effectiveTraffic / 100) * maxCap * (1 - errorRate / 200);
  const rps = clamp(addNoise(loadRps, 0.08), 0, maxCap);

  // Memory: correlates with CPU but with slower response
  const memoryLoad = clamp(addNoise(chaosCpu * 0.72 + 15, 0.1), 0, 100);

  // Connections
  const connectionsPerRps = node.type === NodeType.DATABASE ? 0.8
    : node.type === NodeType.CACHE ? 0.2
    : 0.5;
  const connections = clamp(Math.floor(safe(rps) * connectionsPerRps), 0, 50000);

  // Throughput in MB/s
  const throughput = clamp(
    addNoise((safe(rps) / (config.maxRps || 1)) * profile.maxThroughputMbs, 0.2),
    0,
    profile.maxThroughputMbs * tierMult * 1.1,
  );

  const rawMetrics: NodeMetrics = {
    rps:        safe(rps),
    latency:    safe(latency),
    errorRate:  safe(errorRate),
    cpuLoad:    safe(chaosCpu),
    memoryLoad: safe(memoryLoad),
    connections:safe(connections),
    throughput: safe(throughput),
    uptime:     node.metrics.uptime + speed * 0.5,
  };

  const ALPHA = 0.35;
  const smoothed = NodeMetrics.smooth(node.metrics, rawMetrics, ALPHA);
  const status = deriveStatus(node, smoothed.cpuLoad, smoothed.errorRate, overloadedTicks);

  return { metrics: smoothed, status };
}

function deriveStatus(
  node: NodeEntity,
  cpuLoad: number,
  errorRate: number,
  overloadedTicks: number,
): NodeStatus {
  if (node.status === NodeStatus.DOWN) return NodeStatus.DOWN;

  // Auto-crash: sustained overload → node crashes (like a real server OOM/watchdog kill)
  if (overloadedTicks >= CRASH_AFTER_TICKS) return NodeStatus.DOWN;

  // Catastrophic error rate + high CPU → immediate crash
  if (errorRate >= CRASH_ERROR_THRESHOLD && cpuLoad > 90) return NodeStatus.DOWN;

  if (node.isChaosActive)              return NodeStatus.DEGRADED;
  if (cpuLoad > 95)                    return NodeStatus.OVERLOADED;
  if (cpuLoad > 75 || errorRate > 10)  return NodeStatus.DEGRADED;
  return NodeStatus.HEALTHY;
}
