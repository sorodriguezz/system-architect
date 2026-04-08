import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeEntity } from '@/domain/entities/Node.entity';
import { EdgeEntity } from '@/domain/entities/Edge.entity';
import { detectSpofIds } from '@/domain/services/SpofDetection.service';
import { computeNodeTick } from '@/application/services/SimulationEngine.service';
import { aggregateGlobalMetrics, buildHistoryPoint } from '@/application/services/MetricsAggregator.service';
import { computeEdgeTrafficPercentage } from '@/application/services/SimulationEngine.service';
import { GlobalMetrics, HistoryPoint } from '@/domain/value-objects/GlobalMetrics.vo';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';

export interface SimulationTickParams {
  trafficLevel: number;
  speed:        number;
  isChaosMode:  boolean;
  currentTime:  number;
}

export interface SimulationTickResult {
  globalMetrics: GlobalMetrics;
  historyPoint:  HistoryPoint;
  nextTime:      number;
}

/**
 * TickSimulation — the core simulation step.
 *
 * Orchestrates one tick across all nodes and edges:
 * 1. Advances each node's metrics via the SimulationEngine
 * 2. Re-runs SPOF detection with updated metrics
 * 3. Recomputes edge traffic percentages
 * 4. Aggregates global metrics
 *
 * Returns aggregated results — the infrastructure layer applies them
 * to state in a single atomic update.
 */
export function tickSimulation(
  repository: IArchitectureRepository,
  params: SimulationTickParams
): SimulationTickResult {
  const nodes = repository.getAllNodes();
  const edges = repository.getAllEdges();

  // 1. Advance each node's metrics
  const updatedNodes = nodes.map(node => {
    const { metrics, status } = computeNodeTick({
      node,
      trafficLevel: params.trafficLevel,
      speed:        params.speed,
      isChaosMode:  params.isChaosMode,
    });
    return NodeEntity.update(node, { metrics, status });
  });

  // 2. Detect SPOFs on the updated node set
  const spofIds = detectSpofIds(updatedNodes, edges);
  const nodesWithSpof = updatedNodes.map(n =>
    NodeEntity.update(n, { isSpof: spofIds.has(n.id) })
  );

  // 3. Recompute edge traffic
  const nodeMap = new Map(nodesWithSpof.map(n => [n.id, n]));
  const updatedEdges = edges.map(edge => {
    const trafficPercentage = computeEdgeTrafficPercentage(nodeMap.get(edge.sourceId));
    return EdgeEntity.withTraffic(edge, trafficPercentage);
  });

  // 4. Persist updated collections atomically
  repository.replaceAllNodes(nodesWithSpof);
  repository.replaceAllEdges(updatedEdges);

  // 5. Aggregate and return
  const nextTime     = params.currentTime + params.speed * 0.5;
  const globalMetrics = aggregateGlobalMetrics(nodesWithSpof);
  const historyPoint  = buildHistoryPoint(nextTime, globalMetrics);

  return { globalMetrics, historyPoint, nextTime };
}
