import { NodeEntity } from '@/domain/entities/Node.entity';
import { NodeMetrics } from '@/domain/value-objects/NodeMetrics.vo';
import { NodeStatus } from '@/domain/constants/NodeTypes.constant';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';

/**
 * SimulationEngine — application service that computes the next tick's node metrics.
 *
 * Design goals:
 * - All public functions are pure (same input → same random distribution)
 * - No state held in this module — callers maintain state
 * - The simulation math is isolated here so it can be tested without a UI
 */

const { SMOOTHING_ALPHA, CPU_OVERLOAD_THRESHOLD, CPU_DEGRADED_THRESHOLD } = SimulationConstants;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function addNoise(base: number, varianceFraction: number): number {
  return base + (Math.random() - 0.5) * 2 * base * varianceFraction;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Raw metric computation ────────────────────────────────────────────────────

interface RawMetrics {
  cpuLoad:    number;
  memoryLoad: number;
  rps:        number;
  latency:    number;
  errorRate:  number;
  connections:number;
  throughput: number;
}

function computeBaseLoad(
  node: NodeEntity,
  trafficLevel: number
): number {
  // CPU load scales with traffic, inversely with replica count
  return (trafficLevel / 100) * 60 * (1 / node.config.replicas);
}

function computeRawMetrics(
  node: NodeEntity,
  trafficLevel: number,
  isChaosMode: boolean
): RawMetrics {
  const baseCpu     = computeBaseLoad(node, trafficLevel);
  const baseRps     = (trafficLevel / 100) * node.config.maxRps;
  const baseLatency = SimulationConstants.BASE_LATENCY_MS_BY_TYPE[node.type] ?? 10;
  const loadFactor  = Math.max(1, baseCpu / 70);

  let cpuLoad    = clamp(addNoise(baseCpu, 0.13), 0, 100);
  let memoryLoad = clamp(addNoise(baseCpu * 0.8, 0.08), 0, 100);
  let rps        = clamp(addNoise(baseRps, 0.10), 0, node.config.maxRps * node.config.replicas * 1.2);
  let latency    = clamp(addNoise(baseLatency * loadFactor, 0.20), 1, 5000);
  let errorRate  = 0;

  if (node.isChaosActive || isChaosMode) {
    cpuLoad   = clamp(cpuLoad + addNoise(30, 0.5), 0, 100);
    latency   = clamp(latency * addNoise(3, 0.33), 1, 10000);
    errorRate = clamp(addNoise(15, 0.66), 0, 100);
  }

  // Cascade: when CPU overloads, errors and latency spike
  if (cpuLoad > CPU_OVERLOAD_THRESHOLD) {
    errorRate = clamp(errorRate + (cpuLoad - CPU_OVERLOAD_THRESHOLD) * 2, 0, 100);
    latency   = latency * 2;
  }

  const connections = clamp(Math.floor(addNoise(rps * 0.5, 0.1)), 0, 10000);
  const throughput  = clamp(addNoise(rps * 0.005, 0.20), 0, 100);

  return { cpuLoad, memoryLoad, rps, latency, errorRate, connections, throughput };
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

/**
 * Computes the next metrics for a single node in one simulation tick.
 * Returns a new metrics value object and the derived status.
 */
export function computeNodeTick({
  node,
  trafficLevel,
  speed,
  isChaosMode,
}: SimulationTickInput): SimulationTickOutput {
  if (node.status === NodeStatus.DOWN) {
    return {
      metrics: NodeMetrics.update(node.metrics, { rps: 0, uptime: 0 }),
      status:  NodeStatus.DOWN,
    };
  }

  const raw = computeRawMetrics(node, trafficLevel, isChaosMode);

  const nextMetrics = NodeMetrics.smooth(
    node.metrics,
    {
      rps:         raw.rps,
      latency:     raw.latency,
      errorRate:   raw.errorRate,
      cpuLoad:     raw.cpuLoad,
      memoryLoad:  raw.memoryLoad,
      connections: raw.connections,
      throughput:  raw.throughput,
      uptime:      node.metrics.uptime + speed * 0.5,
    },
    SMOOTHING_ALPHA
  );

  const nextStatus = NodeEntity_deriveStatus(node, raw.cpuLoad, raw.errorRate);

  return { metrics: nextMetrics, status: nextStatus };
}

// Avoid importing the full entity module to prevent circular deps;
// replicate the pure status-derivation logic here.
function NodeEntity_deriveStatus(
  node: NodeEntity,
  cpuLoad: number,
  errorRate: number
): NodeStatus {
  if (node.status === NodeStatus.DOWN) return NodeStatus.DOWN;
  if (node.isChaosActive)             return NodeStatus.DEGRADED;
  if (cpuLoad > CPU_OVERLOAD_THRESHOLD)  return NodeStatus.OVERLOADED;
  if (cpuLoad > CPU_DEGRADED_THRESHOLD || errorRate > 10) return NodeStatus.DEGRADED;
  return NodeStatus.HEALTHY;
}

/**
 * Computes the traffic percentage for an edge based on its source node.
 */
export function computeEdgeTrafficPercentage(
  sourceNode: NodeEntity | undefined
): number {
  if (!sourceNode || sourceNode.status === NodeStatus.DOWN) return 0;
  const capacity = sourceNode.config.maxRps * sourceNode.config.replicas;
  return clamp((sourceNode.metrics.rps / capacity) * 100, 0, 100);
}
