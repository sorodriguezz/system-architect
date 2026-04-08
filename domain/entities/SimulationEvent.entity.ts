/**
 * SimulationEvent — domain entity for tracking system events during simulation.
 *
 * Inspired by Packet Tracer's event log: every significant state change
 * (crash, degradation, recovery, auto-scaling, SPOF detection) is recorded
 * with a timestamp, severity, and human-readable description.
 */

export type EventSeverity = 'info' | 'warning' | 'critical' | 'success';

export type EventType =
  | 'NODE_CRASHED'        // Node went DOWN due to sustained overload
  | 'NODE_DEGRADED'       // Node entered DEGRADED state
  | 'NODE_OVERLOADED'     // Node entered OVERLOADED state
  | 'NODE_RECOVERED'      // Node returned to HEALTHY from non-healthy
  | 'NODE_KILLED'         // Manual chaos: node killed
  | 'NODE_RESTORED'       // Manual chaos: node restored
  | 'AUTOSCALE_UP'        // Auto-scaling added a replica
  | 'AUTOSCALE_DOWN'      // Auto-scaling removed a replica
  | 'SPOF_DETECTED'       // Single point of failure identified
  | 'SPOF_RESOLVED'       // SPOF resolved (replicas added or redundancy)
  | 'CASCADE_FAILURE'     // Downstream affected by upstream failure
  | 'TIMEOUT_EXCEEDED'    // Latency exceeded timeout threshold
  | 'HIGH_ERROR_RATE'     // Error rate exceeded critical threshold
  | 'SIMULATION_START'    // Simulation started
  | 'SIMULATION_STOP';    // Simulation stopped

export interface SimulationEvent {
  readonly id: string;
  readonly timestamp: number;        // Simulation time (seconds)
  readonly type: EventType;
  readonly severity: EventSeverity;
  readonly nodeId?: string;
  readonly nodeLabel?: string;
  readonly nodeType?: string;
  readonly message: string;
  readonly details?: string;         // Extra context (CPU %, RPS, etc.)
}

let _eventCounter = 0;

export const SimulationEvent = {
  create(
    timestamp: number,
    type: EventType,
    severity: EventSeverity,
    message: string,
    opts?: {
      nodeId?: string;
      nodeLabel?: string;
      nodeType?: string;
      details?: string;
    },
  ): SimulationEvent {
    return {
      id: `evt-${Date.now()}-${(++_eventCounter).toString(36)}`,
      timestamp,
      type,
      severity,
      message,
      nodeId: opts?.nodeId,
      nodeLabel: opts?.nodeLabel,
      nodeType: opts?.nodeType,
      details: opts?.details,
    };
  },

  /** Max events kept in memory */
  MAX_EVENTS: 200,

  /** Severity → color mapping for UI */
  SEVERITY_COLORS: {
    info:     '#60a5fa',
    warning:  '#fbbf24',
    critical: '#ef4444',
    success:  '#4ade80',
  } as Record<EventSeverity, string>,

  /** EventType → icon mapping */
  TYPE_ICONS: {
    NODE_CRASHED:     'Skull',
    NODE_DEGRADED:    'AlertTriangle',
    NODE_OVERLOADED:  'Flame',
    NODE_RECOVERED:   'HeartPulse',
    NODE_KILLED:      'Bomb',
    NODE_RESTORED:    'RefreshCw',
    AUTOSCALE_UP:     'ArrowUpCircle',
    AUTOSCALE_DOWN:   'ArrowDownCircle',
    SPOF_DETECTED:    'Zap',
    SPOF_RESOLVED:    'Shield',
    CASCADE_FAILURE:  'GitBranch',
    TIMEOUT_EXCEEDED: 'Timer',
    HIGH_ERROR_RATE:  'XCircle',
    SIMULATION_START: 'Play',
    SIMULATION_STOP:  'Square',
  } as Record<EventType, string>,
} as const;
