export type NodeType =
  | 'client'
  | 'dns'
  | 'cdn'
  | 'waf'
  | 'loadbalancer'
  | 'apigateway'
  | 'appserver'
  | 'microservice'
  | 'cache'
  | 'database'
  | 'queue'
  | 'worker'
  | 'storage'
  | 'servicemesh'
  | 'circuitbreaker'
  | 'search'
  | 'monitor'
  | 'auth'
  | 'email'
  | 'payment';

export type NodeStatus = 'healthy' | 'degraded' | 'down' | 'overloaded' | 'starting';

export interface NodeMetrics {
  rps: number;
  latency: number; // ms
  errorRate: number; // 0-100 %
  cpuLoad: number; // 0-100 %
  memoryLoad: number; // 0-100 %
  connections: number;
  throughput: number; // MB/s
  uptime: number; // seconds
}

export interface NodeConfig {
  replicas: number;
  maxRps: number;
  timeout: number; // ms
  retries: number;
  algorithm?: string; // for LB: round-robin, least-conn, ip-hash, random
  cacheHitRate?: number; // 0-100 for cache nodes
  dbType?: string; // postgres, mysql, mongo, redis
  queueType?: string; // kafka, rabbitmq, sqs
  storageType?: string; // s3, gcs, azure
  region?: string;
  tier?: string; // free, standard, premium
  autoscaling: boolean;
  minReplicas: number;
  maxReplicas: number;
  sslEnabled: boolean;
  authEnabled: boolean;
}

export interface ArchNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  metrics: NodeMetrics;
  config: NodeConfig;
  status: NodeStatus;
  selected?: boolean;
  isChaos?: boolean; // chaos engineering active
  spof?: boolean; // single point of failure
  notes?: string;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  protocol?: 'http' | 'https' | 'grpc' | 'tcp' | 'websocket' | 'amqp' | 'redis';
  traffic?: number; // 0-100
  latency?: number;
  encrypted?: boolean;
}

export interface SimulationState {
  running: boolean;
  speed: number; // 0.5x, 1x, 2x, 5x
  trafficLevel: number; // 0-100
  chaosMode: boolean;
  time: number; // simulation seconds elapsed
}

export interface GlobalMetrics {
  totalRps: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  costPerHour: number;
  totalNodes: number;
  healthyNodes: number;
  activeConnections: number;
  totalThroughput: number;
}

export interface ChaosAction {
  type: 'kill' | 'slowdown' | 'overload' | 'partition' | 'restore';
  nodeId?: string;
  edgeId?: string;
  intensity?: number;
}

export type ComponentCategory = 'Traffic & Edge' | 'Compute' | 'Storage' | 'Messaging' | 'Security' | 'Observability' | 'Services';

export interface ComponentTemplate {
  type: NodeType;
  label: string;
  category: ComponentCategory;
  description: string;
  icon: string;
  color: string;
  defaultConfig: Partial<NodeConfig>;
  costPerHour: number; // base cost
}

export interface HistoryPoint {
  time: number;
  rps: number;
  latency: number;
  errorRate: number;
  cost: number;
}
