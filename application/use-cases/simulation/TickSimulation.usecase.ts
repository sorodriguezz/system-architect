import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeEntity } from '@/domain/entities/Node.entity';
import { EdgeEntity } from '@/domain/entities/Edge.entity';
import { SimulationEvent } from '@/domain/entities/SimulationEvent.entity';
import { detectSpofIds } from '@/domain/services/SpofDetection.service';
import { computeNodeTick, PROTOCOL_PROFILES } from '@/application/services/SimulationEngine.service';
import { aggregateGlobalMetrics, buildHistoryPoint } from '@/application/services/MetricsAggregator.service';
import { GlobalMetrics, HistoryPoint } from '@/domain/value-objects/GlobalMetrics.vo';
import { NodeConfig } from '@/domain/value-objects/NodeConfig.vo';
import { NodeStatus, NodeType } from '@/domain/constants/NodeTypes.constant';

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
  events:        SimulationEvent[];
}

// ── Persistent state across ticks (module-level singleton) ───────────────────
// Tracks how many consecutive ticks each node has been OVERLOADED.
const _overloadedTicks = new Map<string, number>();
// Tracks previous status for event diff detection.
const _prevStatus = new Map<string, NodeStatus>();
// Tracks previous SPOF set for diff detection.
const _prevSpofIds = new Set<string>();
// Tracks previous replica counts for auto-scale event detection.
const _prevReplicas = new Map<string, number>();

/** Reset all tick-persistent state (call on simulation reset). */
export function resetTickState(): void {
  _overloadedTicks.clear();
  _prevStatus.clear();
  _prevSpofIds.clear();
  _prevReplicas.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TOPOLOGY-AWARE TRAFFIC PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

interface TopologyResult {
  trafficLevels: Map<string, number>;
  effectiveRps:  Map<string, number>;
}

function computeTopology(
  nodes:  NodeEntity[],
  edges:  EdgeEntity[],
  globalTrafficLevel: number,
): TopologyResult {
  const nodeMap   = new Map(nodes.map(n => [n.id, n]));
  const clientIds = new Set(nodes.filter(n => n.type === NodeType.CLIENT).map(n => n.id));

  const requestEdges = edges.filter(e =>
    !clientIds.has(e.targetId) &&
    nodeMap.has(e.sourceId) &&
    nodeMap.has(e.targetId)
  );

  const incomingEdges = new Map<string, EdgeEntity[]>();
  const outgoing      = new Map<string, string[]>();
  nodes.forEach(n => { incomingEdges.set(n.id, []); outgoing.set(n.id, []); });

  requestEdges.forEach(e => {
    incomingEdges.get(e.targetId)?.push(e);
    outgoing.get(e.sourceId)?.push(e.targetId);
  });

  // Kahn's topological sort
  const inDegree = new Map<string, number>();
  nodes.forEach(n => inDegree.set(n.id, incomingEdges.get(n.id)!.length));
  clientIds.forEach(id => inDegree.set(id, 0));

  const queue: string[] = [];
  nodes.forEach(n => { if (inDegree.get(n.id)! === 0) queue.push(n.id); });

  const rpsMap        = new Map<string, number>();
  const trafficLevels = new Map<string, number>();
  const visited       = new Set<string>();

  while (queue.length > 0) {
    const id   = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node  = nodeMap.get(id)!;
    const inEdges = incomingEdges.get(id)!;
    const ownCapacity = node.config.maxRps * node.config.replicas;

    let receivedRps: number;

    const isClient    = clientIds.has(id);
    const isDown      = node.status === NodeStatus.DOWN;
    const hasIncoming = inEdges.length > 0;

    if (isDown) {
      receivedRps = 0;
    } else if (isClient) {
      receivedRps = (globalTrafficLevel / 100) * ownCapacity;
    } else if (!hasIncoming) {
      receivedRps = 0;
    } else {
      const upstreamValues = inEdges.map(edge => {
        const srcRps = rpsMap.get(edge.sourceId) ?? 0;
        const protProfile = PROTOCOL_PROFILES[edge.protocol];
        const protoFactor = protProfile?.throughputFactor ?? 1;
        return srcRps * Math.min(protoFactor, 1);
      });

      const upstreamParents = new Set<string>();
      inEdges.forEach(e => {
        const srcIn = incomingEdges.get(e.sourceId) ?? [];
        srcIn.forEach(pe => upstreamParents.add(pe.sourceId));
      });

      let aggregatedRps: number;
      if (upstreamParents.size > 0 && upstreamParents.size < inEdges.length) {
        aggregatedRps = Math.max(...upstreamValues);
      } else {
        aggregatedRps = upstreamValues.reduce((sum, v) => sum + v, 0);
      }

      receivedRps = ownCapacity > 0
        ? Math.min(aggregatedRps, ownCapacity)
        : 0;
    }

    rpsMap.set(id, receivedRps);

    const effectiveLevel = ownCapacity > 0
      ? Math.min((receivedRps / ownCapacity) * 100, 100)
      : 0;

    trafficLevels.set(id, effectiveLevel);

    outgoing.get(id)!.forEach(targetId => {
      const newDeg = (inDegree.get(targetId) ?? 1) - 1;
      inDegree.set(targetId, Math.max(0, newDeg));
      if (newDeg <= 0 && !visited.has(targetId)) queue.push(targetId);
    });
  }

  nodes.forEach(n => {
    if (!trafficLevels.has(n.id)) {
      trafficLevels.set(n.id, clientIds.has(n.id) ? globalTrafficLevel : 0);
      rpsMap.set(n.id, 0);
    }
  });

  return { trafficLevels, effectiveRps: rpsMap };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CASCADE FAILURE PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeCascadeDegradation(
  nodes: NodeEntity[],
  edges: EdgeEntity[],
): Map<string, number> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const result  = new Map<string, number>();

  nodes.forEach(n => {
    const upstreams = edges
      .filter(e => e.targetId === n.id)
      .map(e => nodeMap.get(e.sourceId))
      .filter(Boolean) as NodeEntity[];

    if (upstreams.length === 0) {
      result.set(n.id, 1.0);
      return;
    }

    let degradation = 1.0;
    for (const up of upstreams) {
      if (up.status === NodeStatus.DOWN)            degradation *= 2.5;
      else if (up.status === NodeStatus.OVERLOADED) degradation *= 1.5;
      else if (up.status === NodeStatus.DEGRADED)   degradation *= 1.2;
    }

    result.set(n.id, degradation);
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AUTO-SCALING
// ═══════════════════════════════════════════════════════════════════════════════

interface AutoscaleResult {
  nodes:  NodeEntity[];
  events: SimulationEvent[];
}

function applyAutoscaling(nodes: NodeEntity[], time: number): AutoscaleResult {
  const events: SimulationEvent[] = [];

  const result = nodes.map(node => {
    if (!node.config.autoscaling) return node;
    if (node.type === NodeType.CLIENT) return node;
    if (node.status === NodeStatus.DOWN) return node;

    const cpu = node.metrics.cpuLoad;
    const currentReplicas = node.config.replicas;

    if (Math.random() > 0.33) return node;

    let newReplicas = currentReplicas;

    if (cpu > 70 && currentReplicas < node.config.maxReplicas) {
      newReplicas = currentReplicas + 1;
    } else if (cpu < 30 && currentReplicas > node.config.minReplicas) {
      newReplicas = currentReplicas - 1;
    }

    if (newReplicas === currentReplicas) return node;

    const isUp = newReplicas > currentReplicas;
    events.push(SimulationEvent.create(
      time,
      isUp ? 'AUTOSCALE_UP' : 'AUTOSCALE_DOWN',
      'info',
      `${node.label}: ${isUp ? 'scaled up' : 'scaled down'} ${currentReplicas} → ${newReplicas} replicas (CPU ${Math.round(cpu)}%)`,
      { nodeId: node.id, nodeLabel: node.label, nodeType: node.type },
    ));

    return NodeEntity.update(node, {
      config: NodeConfig.update(node.config, { replicas: newReplicas }),
    });
  });

  return { nodes: result, events };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EDGE SIMULATION DATA
// ═══════════════════════════════════════════════════════════════════════════════

function computeEdgeSimulationData(
  edge:    EdgeEntity,
  nodeMap: Map<string, NodeEntity>,
): { trafficPercentage: number; rpsOnEdge: number; targetLatencyMs: number } {
  const sourceNode = nodeMap.get(edge.sourceId);
  const targetNode = nodeMap.get(edge.targetId);

  if (!sourceNode || sourceNode.status === NodeStatus.DOWN) {
    return { trafficPercentage: 0, rpsOnEdge: 0, targetLatencyMs: 0 };
  }

  const capacity = sourceNode.config.maxRps * sourceNode.config.replicas;
  const trafficPercentage = capacity > 0
    ? Math.min((sourceNode.metrics.rps / capacity) * 100, 100)
    : 0;

  const rpsOnEdge = sourceNode.metrics.rps;

  const protProfile     = PROTOCOL_PROFILES[edge.protocol];
  const protocolLatency = protProfile?.latencyOverheadMs ?? 2;
  const targetNodeLat   = targetNode ? targetNode.metrics.latency : 0;
  const targetLatencyMs = targetNodeLat + protocolLatency;

  return {
    trafficPercentage: Number.isFinite(trafficPercentage) ? trafficPercentage : 0,
    rpsOnEdge:         Number.isFinite(rpsOnEdge)         ? rpsOnEdge         : 0,
    targetLatencyMs:   Number.isFinite(targetLatencyMs)   ? targetLatencyMs   : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EVENT DETECTION — diff between prev tick and current tick
// ═══════════════════════════════════════════════════════════════════════════════

function detectEvents(
  nodes: NodeEntity[],
  spofIds: ReadonlySet<string>,
  time: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  for (const node of nodes) {
    if (node.type === NodeType.CLIENT) continue;

    const prev = _prevStatus.get(node.id);
    const curr = node.status;

    // Skip if status unchanged
    if (prev === curr) {
      // Check timeout/error even when status is stable
      if (curr !== NodeStatus.DOWN && curr !== NodeStatus.HEALTHY) {
        if (node.config.timeoutMs > 0 && node.metrics.latency > node.config.timeoutMs) {
          // Only log once per sustained timeout (check if already logged recently)
        }
      }
      continue;
    }

    // Status CHANGED — generate event
    const opts = { nodeId: node.id, nodeLabel: node.label, nodeType: node.type };

    if (curr === NodeStatus.DOWN && prev !== NodeStatus.DOWN && prev !== undefined) {
      // Crash! (not from manual kill — those are handled elsewhere)
      events.push(SimulationEvent.create(time, 'NODE_CRASHED', 'critical',
        `${node.label} CRASHED — sustained overload caused service failure`,
        { ...opts, details: `CPU: ${Math.round(node.metrics.cpuLoad)}%, Errors: ${node.metrics.errorRate.toFixed(1)}%, Overloaded for ${_overloadedTicks.get(node.id) ?? 0} ticks` },
      ));
    } else if (curr === NodeStatus.OVERLOADED && prev !== NodeStatus.OVERLOADED) {
      events.push(SimulationEvent.create(time, 'NODE_OVERLOADED', 'critical',
        `${node.label} is OVERLOADED — CPU at ${Math.round(node.metrics.cpuLoad)}%`,
        { ...opts, details: `RPS: ${Math.round(node.metrics.rps)}, Latency: ${Math.round(node.metrics.latency)}ms` },
      ));
    } else if (curr === NodeStatus.DEGRADED && prev !== NodeStatus.DEGRADED) {
      events.push(SimulationEvent.create(time, 'NODE_DEGRADED', 'warning',
        `${node.label} is DEGRADED — performance reduced`,
        { ...opts, details: `CPU: ${Math.round(node.metrics.cpuLoad)}%, Errors: ${node.metrics.errorRate.toFixed(1)}%` },
      ));
    } else if (curr === NodeStatus.HEALTHY && prev && prev !== NodeStatus.HEALTHY) {
      events.push(SimulationEvent.create(time, 'NODE_RECOVERED', 'success',
        `${node.label} recovered to HEALTHY`,
        opts,
      ));
    }

    _prevStatus.set(node.id, curr);
  }

  // SPOF diff
  for (const id of spofIds) {
    if (!_prevSpofIds.has(id)) {
      const node = nodes.find(n => n.id === id);
      if (node) {
        events.push(SimulationEvent.create(time, 'SPOF_DETECTED', 'warning',
          `${node.label} identified as Single Point of Failure`,
          { nodeId: id, nodeLabel: node.label, nodeType: node.type },
        ));
      }
    }
  }
  for (const id of _prevSpofIds) {
    if (!spofIds.has(id)) {
      const node = nodes.find(n => n.id === id);
      if (node) {
        events.push(SimulationEvent.create(time, 'SPOF_RESOLVED', 'success',
          `${node.label} is no longer a SPOF`,
          { nodeId: id, nodeLabel: node.label, nodeType: node.type },
        ));
      }
    }
  }

  // Update prev SPOF set
  _prevSpofIds.clear();
  spofIds.forEach(id => _prevSpofIds.add(id));

  return events;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MAIN TICK
// ═══════════════════════════════════════════════════════════════════════════════

export function tickSimulation(
  repository: IArchitectureRepository,
  params: SimulationTickParams,
): SimulationTickResult {
  const nodes = repository.getAllNodes();
  const edges = repository.getAllEdges();

  // 1. Topology-aware per-node traffic levels
  const { trafficLevels } = computeTopology(nodes, edges, params.trafficLevel);

  // 2. Cascade degradation from upstream failures
  const cascadeDeg = computeCascadeDegradation(nodes, edges);

  // 2b. Pre-compute per-node protocol CPU overhead
  const protocolCpuOverhead = new Map<string, number>();
  nodes.forEach(n => {
    const inEdges = edges.filter(e => e.targetId === n.id);
    if (inEdges.length === 0) {
      protocolCpuOverhead.set(n.id, 0);
    } else {
      const maxOverhead = Math.max(
        ...inEdges.map(e => PROTOCOL_PROFILES[e.protocol]?.cpuOverhead ?? 0)
      );
      protocolCpuOverhead.set(n.id, maxOverhead);
    }
  });

  // 3. Advance each node's metrics + track overloaded ticks
  const updatedNodes = nodes.map(node => {
    const effectiveTrafficLevel = trafficLevels.get(node.id) ?? 0;
    const degradation = cascadeDeg.get(node.id) ?? 1;
    const protoCpuExtra = protocolCpuOverhead.get(node.id) ?? 0;

    // Track overloaded ticks for auto-crash
    let ticks = _overloadedTicks.get(node.id) ?? 0;
    if (node.status === NodeStatus.OVERLOADED) {
      ticks += 1;
    } else if (node.status !== NodeStatus.DOWN) {
      ticks = 0; // Reset if not overloaded and not already crashed
    }
    _overloadedTicks.set(node.id, ticks);

    const { metrics, status } = computeNodeTick({
      node,
      trafficLevel:        effectiveTrafficLevel,
      speed:               params.speed,
      isChaosMode:         params.isChaosMode,
      upstreamDegradation: degradation,
      protocolCpuOverhead: protoCpuExtra,
      overloadedTicks:     ticks,
    });

    // If node just crashed, reset its overloaded counter
    if (status === NodeStatus.DOWN && node.status !== NodeStatus.DOWN) {
      _overloadedTicks.set(node.id, 0);
    }

    return NodeEntity.update(node, { metrics, status });
  });

  // 4. Auto-scaling (mutates in-memory, no race condition)
  const { nodes: scaledNodes, events: scaleEvents } = applyAutoscaling(updatedNodes, params.currentTime);

  // 5. Detect SPOFs
  const spofIds       = detectSpofIds(scaledNodes, edges);
  const nodesWithSpof = scaledNodes.map(n =>
    NodeEntity.update(n, { isSpof: spofIds.has(n.id) })
  );

  // 6. Detect status-change events
  const statusEvents = detectEvents(nodesWithSpof, spofIds, params.currentTime);
  const allEvents = [...scaleEvents, ...statusEvents];

  // 7. Recompute edge traffic + latency metadata
  const nodeMap      = new Map(nodesWithSpof.map(n => [n.id, n]));
  const updatedEdges = edges.map(edge => {
    const { trafficPercentage, rpsOnEdge, targetLatencyMs } =
      computeEdgeSimulationData(edge, nodeMap);
    return EdgeEntity.withSimulationData(edge, trafficPercentage, rpsOnEdge, targetLatencyMs);
  });

  // 8. Persist atomically
  repository.replaceAllNodes(nodesWithSpof);
  repository.replaceAllEdges(updatedEdges);

  // 9. Aggregate and return
  const nextTime      = params.currentTime + params.speed * 0.5;
  const globalMetrics = aggregateGlobalMetrics(nodesWithSpof);
  const historyPoint  = buildHistoryPoint(nextTime, globalMetrics);

  return { globalMetrics, historyPoint, nextTime, events: allEvents };
}
