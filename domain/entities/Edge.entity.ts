import { EdgeProtocol } from '../constants/NodeTypes.constant';

/**
 * EdgeEntity — represents a directed connection between two nodes.
 *
 * In a real system this models the communication channel:
 * its protocol, encryption, and observed traffic level.
 */
export interface EdgeEntity {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly protocol: EdgeProtocol;
  readonly isEncrypted: boolean;
  readonly trafficPercentage: number; // 0–100, derived during simulation
  readonly rpsOnEdge: number;         // Actual RPS flowing through this edge
  readonly targetLatencyMs: number;   // Latency of target node (ms) — drives particle speed
}

let _edgeCounter = 0;
function generateEdgeId(): string {
  return `edge-${Date.now()}-${(++_edgeCounter).toString(36)}`;
}

export interface CreateEdgeParams {
  sourceId: string;
  targetId: string;
  protocol?: EdgeProtocol;
  isEncrypted?: boolean;
}

export const EdgeEntity = {
  /**
   * Factory: creates a new edge with sensible defaults.
   */
  create(params: CreateEdgeParams): EdgeEntity {
    return {
      id:                 generateEdgeId(),
      sourceId:           params.sourceId,
      targetId:           params.targetId,
      protocol:           params.protocol    ?? EdgeProtocol.HTTP,
      isEncrypted:        params.isEncrypted ?? false,
      trafficPercentage:  0,
      rpsOnEdge:          0,
      targetLatencyMs:    0,
    };
  },

  /**
   * Returns a new edge with updated fields.
   */
  update(edge: EdgeEntity, partial: Partial<Omit<EdgeEntity, 'id' | 'sourceId' | 'targetId'>>): EdgeEntity {
    return { ...edge, ...partial };
  },

  /**
   * Returns a new edge with the observed traffic percentage applied.
   */
  withTraffic(edge: EdgeEntity, trafficPercentage: number): EdgeEntity {
    return { ...edge, trafficPercentage: Math.max(0, Math.min(100, trafficPercentage)) };
  },

  /**
   * Returns a new edge with full simulation metadata applied.
   */
  withSimulationData(
    edge: EdgeEntity,
    trafficPercentage: number,
    rpsOnEdge: number,
    targetLatencyMs: number,
  ): EdgeEntity {
    return {
      ...edge,
      trafficPercentage: Math.max(0, Math.min(100, trafficPercentage)),
      rpsOnEdge:         Math.max(0, rpsOnEdge),
      targetLatencyMs:   Math.max(0, targetLatencyMs),
    };
  },
} as const;
