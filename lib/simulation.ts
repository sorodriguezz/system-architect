import type { ArchNode, ArchEdge, NodeMetrics, GlobalMetrics, HistoryPoint, NodeConfig } from '@/types';

export const NODE_COSTS: Record<string, number> = {
  client: 0,
  dns: 0.01,
  cdn: 0.08,
  waf: 0.05,
  loadbalancer: 0.02,
  apigateway: 0.04,
  appserver: 0.10,
  microservice: 0.08,
  cache: 0.06,
  database: 0.15,
  queue: 0.04,
  worker: 0.07,
  storage: 0.02,
  servicemesh: 0.03,
  circuitbreaker: 0.01,
  search: 0.12,
  monitor: 0.05,
  auth: 0.03,
  email: 0.02,
  payment: 0.05,
};

export const NODE_BASE_LATENCY: Record<string, number> = {
  client: 0,
  dns: 10,
  cdn: 5,
  waf: 3,
  loadbalancer: 1,
  apigateway: 8,
  appserver: 20,
  microservice: 15,
  cache: 1,
  database: 10,
  queue: 5,
  worker: 30,
  storage: 8,
  servicemesh: 2,
  circuitbreaker: 1,
  search: 15,
  monitor: 2,
  auth: 12,
  email: 50,
  payment: 100,
};

export const COMPONENT_COLORS: Record<string, string> = {
  client: '#6366f1',
  dns: '#8b5cf6',
  cdn: '#3b82f6',
  waf: '#ef4444',
  loadbalancer: '#f59e0b',
  apigateway: '#10b981',
  appserver: '#06b6d4',
  microservice: '#14b8a6',
  cache: '#f97316',
  database: '#a855f7',
  queue: '#eab308',
  worker: '#84cc16',
  storage: '#64748b',
  servicemesh: '#22d3ee',
  circuitbreaker: '#fb923c',
  search: '#e879f9',
  monitor: '#34d399',
  auth: '#f43f5e',
  email: '#94a3b8',
  payment: '#4ade80',
};

function noise(base: number, variance: number): number {
  return base + (Math.random() - 0.5) * 2 * variance;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function simulateNodeMetrics(
  node: ArchNode,
  trafficLevel: number,
  speed: number,
  chaosMode: boolean
): NodeMetrics {
  const prev = node.metrics;
  const config = node.config;
  const baseCpu = (trafficLevel / 100) * 60 * (1 / config.replicas);
  const baseRps = (trafficLevel / 100) * config.maxRps * (1 / config.replicas) * config.replicas;
  const baseLatency = NODE_BASE_LATENCY[node.type] || 10;
  const loadFactor = Math.max(1, baseCpu / 70);

  let cpuLoad = clamp(noise(baseCpu, 8), 0, 100);
  let memLoad = clamp(noise(baseCpu * 0.8, 5), 0, 100);
  let rps = clamp(noise(baseRps, baseRps * 0.1), 0, config.maxRps * config.replicas * 1.2);
  let latency = clamp(noise(baseLatency * loadFactor, baseLatency * 0.2), 1, 5000);
  let errorRate = 0;
  let connections = clamp(Math.floor(noise(rps * 0.5, rps * 0.1)), 0, 10000);
  let throughput = clamp(noise(rps * 0.005, 0.001), 0, 100);

  // Apply chaos
  if (node.isChaos || chaosMode) {
    cpuLoad = clamp(cpuLoad + noise(30, 15), 0, 100);
    latency = clamp(latency * noise(3, 1), 1, 10000);
    errorRate = clamp(noise(15, 10), 0, 100);
  }

  // Overload detection
  if (cpuLoad > 90) {
    errorRate = clamp(errorRate + (cpuLoad - 90) * 2, 0, 100);
    latency = latency * 2;
  }

  // Status logic
  const status = node.status === 'down'
    ? 'down'
    : cpuLoad > 90
    ? 'overloaded'
    : cpuLoad > 70 || errorRate > 5
    ? 'degraded'
    : 'healthy';

  // Smooth metrics (low pass filter)
  const alpha = 0.3;
  return {
    rps: prev.rps * (1 - alpha) + rps * alpha,
    latency: prev.latency * (1 - alpha) + latency * alpha,
    errorRate: prev.errorRate * (1 - alpha) + errorRate * alpha,
    cpuLoad: prev.cpuLoad * (1 - alpha) + cpuLoad * alpha,
    memoryLoad: prev.memoryLoad * (1 - alpha) + memLoad * alpha,
    connections: Math.floor(prev.connections * (1 - alpha) + connections * alpha),
    throughput: prev.throughput * (1 - alpha) + throughput * alpha,
    uptime: node.status === 'down' ? 0 : prev.uptime + speed,
  };
}

export function computeGlobalMetrics(nodes: ArchNode[]): GlobalMetrics {
  const activeNodes = nodes.filter(n => n.status !== 'down' && n.type !== 'client');
  if (activeNodes.length === 0) {
    return {
      totalRps: 0, avgLatency: 0, p95Latency: 0, p99Latency: 0,
      errorRate: 0, costPerHour: 0, totalNodes: nodes.length,
      healthyNodes: 0, activeConnections: 0, totalThroughput: 0,
    };
  }

  const latencies = activeNodes.map(n => n.metrics.latency).sort((a, b) => a - b);
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p99Idx = Math.floor(latencies.length * 0.99);

  const totalRps = nodes
    .filter(n => n.type === 'apigateway' || n.type === 'loadbalancer')
    .reduce((sum, n) => sum + n.metrics.rps, 0) || activeNodes.reduce((sum, n) => sum + n.metrics.rps, 0) / activeNodes.length;

  const avgLatency = activeNodes.reduce((sum, n) => sum + n.metrics.latency, 0) / activeNodes.length;
  const errorRate = activeNodes.reduce((sum, n) => sum + n.metrics.errorRate, 0) / activeNodes.length;
  const costPerHour = nodes.reduce((sum, n) => sum + (NODE_COSTS[n.type] || 0) * n.config.replicas, 0);
  const healthyNodes = nodes.filter(n => n.status === 'healthy').length;
  const activeConnections = activeNodes.reduce((sum, n) => sum + n.metrics.connections, 0);
  const totalThroughput = activeNodes.reduce((sum, n) => sum + n.metrics.throughput, 0);

  return {
    totalRps,
    avgLatency,
    p95Latency: latencies[p95Idx] || avgLatency * 1.5,
    p99Latency: latencies[p99Idx] || avgLatency * 2.5,
    errorRate,
    costPerHour,
    totalNodes: nodes.length,
    healthyNodes,
    activeConnections,
    totalThroughput,
  };
}

export function detectSPOF(nodes: ArchNode[], edges: ArchEdge[]): string[] {
  const spofIds: string[] = [];
  const criticalTypes = new Set(['loadbalancer', 'apigateway', 'database', 'auth']);

  // Build adjacency
  const inDegree: Record<string, number> = {};
  const outDegree: Record<string, number> = {};
  nodes.forEach(n => { inDegree[n.id] = 0; outDegree[n.id] = 0; });
  edges.forEach(e => {
    inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    outDegree[e.source] = (outDegree[e.source] || 0) + 1;
  });

  nodes.forEach(n => {
    if (n.type === 'client') return;
    // SPOF: only one replica AND critical node AND has traffic
    if (n.config.replicas === 1 && criticalTypes.has(n.type) && n.metrics.rps > 0) {
      spofIds.push(n.id);
    }
    // SPOF: is the only path (single connection in both directions on critical path)
    if (inDegree[n.id] === 1 && outDegree[n.id] === 1 && criticalTypes.has(n.type)) {
      if (!spofIds.includes(n.id)) spofIds.push(n.id);
    }
  });

  return spofIds;
}

export function getDefaultMetrics(): NodeMetrics {
  return {
    rps: 0,
    latency: 0,
    errorRate: 0,
    cpuLoad: 0,
    memoryLoad: 0,
    connections: 0,
    throughput: 0,
    uptime: 0,
  };
}

export function getDefaultConfig(type: string): NodeConfig {
  const configs: Partial<Record<string, Partial<NodeConfig>>> = {
    loadbalancer: { algorithm: 'round-robin', maxRps: 10000 },
    cache: { cacheHitRate: 85, maxRps: 50000 },
    database: { dbType: 'postgres', maxRps: 3000 },
    queue: { queueType: 'kafka', maxRps: 100000 },
    storage: { storageType: 's3', maxRps: 5000 },
  };
  return {
    replicas: 1,
    maxRps: 1000,
    timeout: 30000,
    retries: 3,
    autoscaling: false,
    minReplicas: 1,
    maxReplicas: 10,
    sslEnabled: true,
    authEnabled: false,
    region: 'us-east-1',
    tier: 'standard',
    ...(configs[type] || {}),
  };
}

export function computeEdgeTraffic(
  edge: ArchEdge,
  nodes: ArchNode[]
): number {
  const source = nodes.find(n => n.id === edge.source);
  if (!source || source.status === 'down') return 0;
  return clamp(source.metrics.rps / (source.config.maxRps || 1000) * 100, 0, 100);
}
