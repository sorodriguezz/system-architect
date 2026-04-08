import { NodeType, NodeStatus } from '../constants/NodeTypes.constant';
import { NodeMetrics } from '../value-objects/NodeMetrics.vo';
import { NodeConfig } from '../value-objects/NodeConfig.vo';

/**
 * NodeEntity — the core domain object for an architectural component.
 *
 * Responsibilities:
 * - Holds identity, position, and behavioral state of a node
 * - Exposes factory and mutation helpers that enforce invariants
 *
 * NOT responsible for:
 * - Persistence (infrastructure concern)
 * - Rendering (presentation concern)
 * - Simulation math (application service concern)
 */
export interface NodeEntity {
  readonly id: string;
  readonly type: NodeType;
  readonly label: string;
  readonly position: Position;
  readonly metrics: NodeMetrics;
  readonly config: NodeConfig;
  readonly status: NodeStatus;
  readonly isChaosActive: boolean;
  readonly isSpof: boolean;
  readonly notes: string;
}

export interface Position {
  readonly x: number;
  readonly y: number;
}

let _idCounter = 0;
function generateNodeId(type: NodeType): string {
  const timestamp = Date.now();
  const suffix = (++_idCounter).toString(36);
  return `${type}-${timestamp}-${suffix}`;
}

export const NodeEntity = {
  /**
   * Factory: creates a new, healthy node with zeroed metrics.
   */
  create(type: NodeType, label: string, position: Position): NodeEntity {
    return {
      id:           generateNodeId(type),
      type,
      label,
      position,
      metrics:      NodeMetrics.zero(),
      config:       NodeConfig.createForType(type),
      status:       NodeStatus.HEALTHY,
      isChaosActive:false,
      isSpof:       false,
      notes:        '',
    };
  },

  /**
   * Returns a new entity with the given scalar fields updated.
   */
  update(node: NodeEntity, partial: Partial<Omit<NodeEntity, 'id' | 'type'>>): NodeEntity {
    return { ...node, ...partial };
  },

  /**
   * Returns a copy of the node marked as killed (offline).
   */
  kill(node: NodeEntity): NodeEntity {
    return {
      ...node,
      status:       NodeStatus.DOWN,
      isChaosActive:true,
      metrics:      NodeMetrics.update(node.metrics, { rps: 0, errorRate: 100, cpuLoad: 0 }),
    };
  },

  /**
   * Returns a copy of the node restored to healthy status.
   */
  restore(node: NodeEntity): NodeEntity {
    return {
      ...node,
      status:       NodeStatus.HEALTHY,
      isChaosActive:false,
    };
  },

  /**
   * Returns a copy of the node put under artificial stress.
   */
  overload(node: NodeEntity): NodeEntity {
    return {
      ...node,
      status:       NodeStatus.OVERLOADED,
      isChaosActive:true,
      metrics:      NodeMetrics.update(node.metrics, {
        cpuLoad:   98,
        errorRate: 25,
        latency:   node.metrics.latency * 5,
      }),
    };
  },

  /**
   * Derives the correct NodeStatus from current metrics.
   * Pure function — no side effects.
   */
  deriveStatus(node: NodeEntity, cpuLoad: number, errorRate: number): NodeStatus {
    if (node.status === NodeStatus.DOWN) return NodeStatus.DOWN;
    if (node.isChaosActive)             return NodeStatus.DEGRADED;
    if (cpuLoad > 95)                   return NodeStatus.OVERLOADED;
    if (cpuLoad > 70 || errorRate > 10) return NodeStatus.DEGRADED;
    return NodeStatus.HEALTHY;
  },
} as const;
