'use client';
import { create } from 'zustand';
import type { ArchNode, ArchEdge, SimulationState, GlobalMetrics, HistoryPoint, NodeConfig, ChaosAction } from '@/types';
import {
  simulateNodeMetrics,
  computeGlobalMetrics,
  detectSPOF,
  getDefaultMetrics,
  getDefaultConfig,
  NODE_COSTS,
} from '@/lib/simulation';
import { COMPONENT_TEMPLATES } from '@/lib/componentTemplates';

export interface ArchitectureStore {
  nodes: ArchNode[];
  edges: ArchEdge[];
  simulation: SimulationState;
  globalMetrics: GlobalMetrics;
  history: HistoryPoint[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  showMetricsPanel: boolean;

  // Node actions
  addNode: (type: string, position: { x: number; y: number }, label?: string) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<ArchNode>) => void;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>) => void;
  duplicateNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // Edge actions
  addEdge: (edge: Omit<ArchEdge, 'id'>) => void;
  removeEdge: (id: string) => void;
  updateEdge: (id: string, updates: Partial<ArchEdge>) => void;
  selectEdge: (id: string | null) => void;

  // Simulation
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  setTrafficLevel: (level: number) => void;
  toggleChaosMode: () => void;
  tick: () => void;

  // Chaos
  applyChaos: (action: ChaosAction) => void;
  killNode: (id: string) => void;
  restoreNode: (id: string) => void;
  overloadNode: (id: string) => void;

  // Layout
  setShowMetricsPanel: (show: boolean) => void;
  autoLayout: () => void;
  clearAll: () => void;
  loadDefaultArchitecture: () => void;
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

const defaultGlobalMetrics: GlobalMetrics = {
  totalRps: 0, avgLatency: 0, p95Latency: 0, p99Latency: 0,
  errorRate: 0, costPerHour: 0, totalNodes: 0, healthyNodes: 0,
  activeConnections: 0, totalThroughput: 0,
};

export const useArchitectureStore = create<ArchitectureStore>((set, get) => ({
  nodes: [],
  edges: [],
  simulation: { running: false, speed: 1, trafficLevel: 60, chaosMode: false, time: 0 },
  globalMetrics: defaultGlobalMetrics,
  history: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  showMetricsPanel: true,

  addNode: (type, position, label) => {
    const template = COMPONENT_TEMPLATES.find(t => t.type === type);
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNode: ArchNode = {
      id,
      type: type as any,
      label: label || template?.label || type,
      position,
      metrics: getDefaultMetrics(),
      config: { ...getDefaultConfig(type), ...(template?.defaultConfig || {}) } as any,
      status: 'healthy',
      spof: false,
      isChaos: false,
    };
    set(state => ({ nodes: [...state.nodes, newNode] }));
  },

  removeNode: (id) => {
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== id),
      edges: state.edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  updateNode: (id, updates) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n),
    }));
  },

  updateNodeConfig: (id, config) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, config: { ...n.config, ...config } } : n),
    }));
  },

  duplicateNode: (id) => {
    const node = get().nodes.find(n => n.id === id);
    if (!node) return;
    const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set(state => ({
      nodes: [...state.nodes, {
        ...node,
        id: newId,
        label: `${node.label} (copy)`,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
        metrics: getDefaultMetrics(),
      }],
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),

  addEdge: (edge) => {
    const id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set(state => ({
      edges: [...state.edges, { ...edge, id, animated: true, traffic: 0 }],
    }));
  },

  removeEdge: (id) => {
    set(state => ({
      edges: state.edges.filter(e => e.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    }));
  },

  updateEdge: (id, updates) => {
    set(state => ({
      edges: state.edges.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  },

  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  startSimulation: () => {
    if (tickInterval) clearInterval(tickInterval);
    set(state => ({ simulation: { ...state.simulation, running: true } }));
    const tick = () => {
      const { simulation } = get();
      if (simulation.running) {
        get().tick();
      }
    };
    tickInterval = setInterval(tick, 500);
  },

  stopSimulation: () => {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    set(state => ({ simulation: { ...state.simulation, running: false } }));
  },

  resetSimulation: () => {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    set(state => ({
      simulation: { ...state.simulation, running: false, time: 0 },
      nodes: state.nodes.map(n => ({
        ...n,
        metrics: getDefaultMetrics(),
        status: 'healthy' as const,
        isChaos: false,
        spof: false,
      })),
      history: [],
      globalMetrics: defaultGlobalMetrics,
    }));
  },

  setSimulationSpeed: (speed) => set(state => ({ simulation: { ...state.simulation, speed } })),
  setTrafficLevel: (level) => set(state => ({ simulation: { ...state.simulation, trafficLevel: level } })),
  toggleChaosMode: () => set(state => ({ simulation: { ...state.simulation, chaosMode: !state.simulation.chaosMode } })),

  tick: () => {
    set(state => {
      const { simulation, nodes, edges } = state;
      const { speed, trafficLevel, chaosMode } = simulation;

      // Update node metrics
      const updatedNodes = nodes.map(n => {
        if (n.status === 'down') return n;
        const newMetrics = simulateNodeMetrics(n, trafficLevel, speed, chaosMode);
        // Determine status
        const status = n.isChaos
          ? 'degraded'
          : newMetrics.cpuLoad > 95 ? 'overloaded'
          : newMetrics.cpuLoad > 70 || newMetrics.errorRate > 10 ? 'degraded'
          : 'healthy';
        return { ...n, metrics: newMetrics, status: status as any };
      });

      // Detect SPOF
      const spofIds = detectSPOF(updatedNodes, edges);
      const nodesWithSpof = updatedNodes.map(n => ({ ...n, spof: spofIds.includes(n.id) }));

      // Update edge traffic
      const updatedEdges = edges.map(e => {
        const sourceNode = nodesWithSpof.find(n => n.id === e.source);
        const traffic = sourceNode && sourceNode.status !== 'down'
          ? Math.min(100, (sourceNode.metrics.rps / (sourceNode.config.maxRps * sourceNode.config.replicas)) * 100)
          : 0;
        return { ...e, traffic };
      });

      const globalMetrics = computeGlobalMetrics(nodesWithSpof);
      const newTime = simulation.time + speed * 0.5;

      // History (keep last 60 points)
      const newHistory: HistoryPoint = {
        time: newTime,
        rps: globalMetrics.totalRps,
        latency: globalMetrics.avgLatency,
        errorRate: globalMetrics.errorRate,
        cost: globalMetrics.costPerHour,
      };
      const history = [...state.history, newHistory].slice(-60);

      return {
        nodes: nodesWithSpof,
        edges: updatedEdges,
        globalMetrics,
        history,
        simulation: { ...simulation, time: newTime },
      };
    });
  },

  applyChaos: (action) => {
    const { killNode, restoreNode, overloadNode } = get();
    if (action.type === 'kill' && action.nodeId) killNode(action.nodeId);
    if (action.type === 'restore' && action.nodeId) restoreNode(action.nodeId);
    if (action.type === 'overload' && action.nodeId) overloadNode(action.nodeId);
  },

  killNode: (id) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? {
        ...n, status: 'down', isChaos: true,
        metrics: { ...n.metrics, rps: 0, errorRate: 100, cpuLoad: 0 }
      } : n),
    }));
  },

  restoreNode: (id) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? {
        ...n, status: 'healthy', isChaos: false,
      } : n),
    }));
  },

  overloadNode: (id) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? {
        ...n, isChaos: true, status: 'overloaded',
        metrics: { ...n.metrics, cpuLoad: 98, errorRate: 25, latency: n.metrics.latency * 5 }
      } : n),
    }));
  },

  setShowMetricsPanel: (show) => set({ showMetricsPanel: show }),

  autoLayout: () => {
    set(state => {
      const { nodes } = state;
      if (nodes.length === 0) return state;

      // Simple layered layout
      const typeOrder: Record<string, number> = {
        client: 0, dns: 1, cdn: 1, waf: 2,
        loadbalancer: 3, apigateway: 4,
        appserver: 5, microservice: 5, auth: 5, servicemesh: 5,
        cache: 6, database: 6, queue: 6, search: 6,
        worker: 7, storage: 7, monitor: 7, email: 8, payment: 8,
        circuitbreaker: 4,
      };

      const layers: Record<number, ArchNode[]> = {};
      nodes.forEach(n => {
        const layer = typeOrder[n.type] ?? 5;
        if (!layers[layer]) layers[layer] = [];
        layers[layer].push(n);
      });

      const layerKeys = Object.keys(layers).map(Number).sort((a, b) => a - b);
      const LAYER_GAP_X = 220;
      const NODE_GAP_Y = 140;
      const START_X = 80;
      const START_Y = 80;

      const newPositions: Record<string, { x: number; y: number }> = {};
      layerKeys.forEach((layer, lIdx) => {
        const layerNodes = layers[layer];
        const totalHeight = (layerNodes.length - 1) * NODE_GAP_Y;
        const startY = START_Y + (300 - totalHeight) / 2;
        layerNodes.forEach((n, nIdx) => {
          newPositions[n.id] = {
            x: START_X + lIdx * LAYER_GAP_X,
            y: startY + nIdx * NODE_GAP_Y,
          };
        });
      });

      return {
        nodes: nodes.map(n => ({
          ...n,
          position: newPositions[n.id] || n.position,
        })),
      };
    });
  },

  clearAll: () => {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    set({
      nodes: [],
      edges: [],
      simulation: { running: false, speed: 1, trafficLevel: 60, chaosMode: false, time: 0 },
      globalMetrics: defaultGlobalMetrics,
      history: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  loadDefaultArchitecture: () => {
    const { addNode, addEdge, clearAll } = get();
    clearAll();

    setTimeout(() => {
      const store = get();
      // Add nodes
      store.addNode('client', { x: 60, y: 280 }, 'Users');
      store.addNode('dns', { x: 280, y: 180 }, 'DNS');
      store.addNode('cdn', { x: 280, y: 380 }, 'CDN');
      store.addNode('waf', { x: 500, y: 180 }, 'WAF');
      store.addNode('loadbalancer', { x: 720, y: 280 }, 'Load Balancer');
      store.addNode('apigateway', { x: 950, y: 280 }, 'API Gateway');
      store.addNode('auth', { x: 950, y: 100 }, 'Auth Service');
      store.addNode('appserver', { x: 1180, y: 180 }, 'App Server 1');
      store.addNode('appserver', { x: 1180, y: 380 }, 'App Server 2');
      store.addNode('cache', { x: 1420, y: 180 }, 'Redis Cache');
      store.addNode('database', { x: 1420, y: 380 }, 'PostgreSQL');
      store.addNode('queue', { x: 1180, y: 560 }, 'Kafka');
      store.addNode('worker', { x: 1420, y: 560 }, 'Workers');
      store.addNode('storage', { x: 1650, y: 380 }, 'S3 Storage');
      store.addNode('monitor', { x: 950, y: 460 }, 'Monitoring');

      // Get nodes to get their IDs
      setTimeout(() => {
        const { nodes } = get();
        const getNode = (type: string, idx = 0) => nodes.filter(n => n.type === type)[idx];

        const client = getNode('client');
        const dns = getNode('dns');
        const cdn = getNode('cdn');
        const waf = getNode('waf');
        const lb = getNode('loadbalancer');
        const gw = getNode('apigateway');
        const auth = getNode('auth');
        const app1 = getNode('appserver', 0);
        const app2 = getNode('appserver', 1);
        const cache = getNode('cache');
        const db = getNode('database');
        const queue = getNode('queue');
        const worker = getNode('worker');
        const storage = getNode('storage');
        const monitor = getNode('monitor');

        if (!client || !dns || !lb || !gw) return;

        const edges: Omit<ArchEdge, 'id'>[] = [
          { source: client.id, target: dns.id, protocol: 'https', encrypted: true },
          { source: client.id, target: cdn.id, protocol: 'https', encrypted: true },
          { source: dns.id, target: waf.id, protocol: 'https', encrypted: true },
          { source: cdn.id, target: lb.id, protocol: 'https', encrypted: true },
          { source: waf.id, target: lb.id, protocol: 'https', encrypted: true },
          { source: lb.id, target: gw.id, protocol: 'http' },
          { source: gw.id, target: auth.id, protocol: 'grpc' },
          { source: gw.id, target: app1.id, protocol: 'http' },
          { source: gw.id, target: app2.id, protocol: 'http' },
          { source: app1.id, target: cache.id, protocol: 'redis' },
          { source: app2.id, target: cache.id, protocol: 'redis' },
          { source: app1.id, target: db.id, protocol: 'tcp' },
          { source: app2.id, target: db.id, protocol: 'tcp' },
          { source: app1.id, target: queue.id, protocol: 'amqp' },
          { source: app2.id, target: queue.id, protocol: 'amqp' },
          { source: queue.id, target: worker.id, protocol: 'amqp' },
          { source: worker.id, target: storage.id, protocol: 'https' },
          { source: monitor.id, target: gw.id, protocol: 'http' },
        ];

        edges.forEach(e => get().addEdge(e));
      }, 50);
    }, 10);
  },
}));
