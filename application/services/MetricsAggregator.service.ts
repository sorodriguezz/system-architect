import { NodeEntity } from '@/domain/entities/Node.entity';
import { GlobalMetrics, HistoryPoint } from '@/domain/value-objects/GlobalMetrics.vo';
import { NodeStatus, NodeType } from '@/domain/constants/NodeTypes.constant';
import { computeCostPerHour } from '@/domain/services/CostCalculation.service';

/**
 * MetricsAggregator — application service.
 *
 * Aggregates per-node metrics into a single GlobalMetrics snapshot.
 * Pure function — input nodes in, GlobalMetrics out.
 */

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.floor(sortedValues.length * p);
  return sortedValues[Math.min(idx, sortedValues.length - 1)];
}

function computeTotalRps(nodes: NodeEntity[]): number {
  const gatewayNodes = nodes.filter(
    n => n.type === NodeType.API_GATEWAY || n.type === NodeType.LOAD_BALANCER
  );

  if (gatewayNodes.length > 0) {
    return gatewayNodes.reduce((sum, n) => sum + n.metrics.rps, 0);
  }

  // Fallback: average across all active nodes
  const active = nodes.filter(n => n.status !== NodeStatus.DOWN);
  if (active.length === 0) return 0;
  return active.reduce((sum, n) => sum + n.metrics.rps, 0) / active.length;
}

export function aggregateGlobalMetrics(nodes: NodeEntity[]): GlobalMetrics {
  const activeNodes = nodes.filter(
    n => n.status !== NodeStatus.DOWN && n.type !== NodeType.CLIENT
  );

  if (activeNodes.length === 0) return GlobalMetrics.zero();

  const sortedLatencies = [...activeNodes.map(n => n.metrics.latency)].sort(
    (a, b) => a - b
  );

  const avgLatency = activeNodes.reduce((sum, n) => sum + n.metrics.latency, 0) / activeNodes.length;
  const errorRate  = activeNodes.reduce((sum, n) => sum + n.metrics.errorRate, 0) / activeNodes.length;

  return {
    totalRps:          computeTotalRps(nodes),
    avgLatency,
    p95Latency:        percentile(sortedLatencies, 0.95),
    p99Latency:        percentile(sortedLatencies, 0.99),
    errorRate,
    costPerHour:       computeCostPerHour(nodes),
    totalNodes:        nodes.length,
    healthyNodes:      nodes.filter(n => n.status === NodeStatus.HEALTHY).length,
    activeConnections: activeNodes.reduce((sum, n) => sum + n.metrics.connections, 0),
    totalThroughput:   activeNodes.reduce((sum, n) => sum + n.metrics.throughput, 0),
  };
}

export function buildHistoryPoint(
  time: number,
  metrics: GlobalMetrics
): HistoryPoint {
  return {
    time,
    rps:       metrics.totalRps,
    latency:   metrics.avgLatency,
    errorRate: metrics.errorRate,
    cost:      metrics.costPerHour,
  };
}
