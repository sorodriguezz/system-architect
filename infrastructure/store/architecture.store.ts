'use client';
import { create } from 'zustand';

import { createNodesSlice, NodesSlice } from './slices/nodes.slice';
import { createEdgesSlice, EdgesSlice } from './slices/edges.slice';
import { createSimulationSlice, SimulationSlice } from './slices/simulation.slice';

import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeEntity, Position } from '@/domain/entities/Node.entity';
import { EdgeEntity, CreateEdgeParams } from '@/domain/entities/Edge.entity';
import { NodeType } from '@/domain/constants/NodeTypes.constant';
import { NodeConfig } from '@/domain/value-objects/NodeConfig.vo';
import { GlobalMetrics } from '@/domain/value-objects/GlobalMetrics.vo';
import { NodeMetrics } from '@/domain/value-objects/NodeMetrics.vo';

// ── Use-case imports ──────────────────────────────────────────────────────────
import { addNode as addNodeUseCase }               from '@/application/use-cases/node/AddNode.usecase';
import { removeNode as removeNodeUseCase }         from '@/application/use-cases/node/RemoveNode.usecase';
import { killNode, restoreNode, overloadNode, duplicateNode } from '@/application/use-cases/node/ChaosNode.usecase';
import { tickSimulation }                          from '@/application/use-cases/simulation/TickSimulation.usecase';
import { autoLayout as autoLayoutUseCase }         from '@/application/use-cases/layout/AutoLayout.usecase';
import { loadDefaultArchitecture as loadDefaultUseCase } from '@/application/use-cases/layout/LoadDefaultArchitecture.usecase';

// ─────────────────────────────────────────────────────────────────────────────

export type ArchitectureStore =
  NodesSlice &
  EdgesSlice &
  SimulationSlice & {
    // High-level commands (delegate to use cases)
    addNode(type: NodeType, position: Position, label?: string): void;
    removeNode(id: string): void;
    updateNode(id: string, partial: Partial<Omit<NodeEntity, 'id' | 'type'>>): void;
    updateNodeConfig(id: string, partial: Partial<NodeConfig>): void;
    duplicateNode(id: string): void;
    selectNode(id: string | null): void;

    addEdge(params: CreateEdgeParams): void;
    removeEdge(id: string): void;
    updateEdge(id: string, partial: Partial<Omit<EdgeEntity, 'id' | 'sourceId' | 'targetId'>>): void;
    selectEdge(id: string | null): void;

    startSimulation(): void;
    stopSimulation(): void;
    resetSimulation(): void;
    setSpeed(speed: number): void;
    setTrafficLevel(level: number): void;
    toggleChaosMode(): void;

    killNode(id: string): void;
    restoreNode(id: string): void;
    overloadNode(id: string): void;

    autoLayout(): void;
    clearAll(): void;
    loadDefaultArchitecture(): void;
  };

// ── Simulation ticker (side-effect singleton) ─────────────────────────────────
let _tickerInterval: ReturnType<typeof setInterval> | null = null;

function stopTicker(): void {
  if (_tickerInterval !== null) {
    clearInterval(_tickerInterval);
    _tickerInterval = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const useArchitectureStore = create<ArchitectureStore>((set, get) => {

  // ── Repository adapter ──────────────────────────────────────────────────────
  // Bridges the IArchitectureRepository interface to the Zustand slice methods.
  // This is the Adapter pattern — the domain doesn't know about Zustand.
  const repository: IArchitectureRepository = {
    getAllNodes:        () => get().nodes,
    getNodeById:       (id) => get().nodes.find(n => n.id === id),
    addNode:           (type, label, position) => get()._addNode(type, label, position),
    updateNode:        (id, partial) => get()._updateNode(id, partial),
    updateNodeConfig:  (id, partial) => get()._updateNodeConfig(id, partial),
    removeNode:        (id) => get()._removeNode(id),
    replaceAllNodes:   (nodes) => get()._replaceAllNodes(nodes),

    getAllEdges:        () => get().edges,
    addEdge:           (params) => get()._addEdge(params),
    updateEdge:        (id, partial) => get()._updateEdge(id, partial),
    removeEdge:        (id) => get()._removeEdge(id),
    replaceAllEdges:   (edges) => get()._replaceAllEdges(edges),

    getSelectedNodeId: () => get().selectedNodeId,
    getSelectedEdgeId: () => get().selectedEdgeId,
    setSelectedNodeId: (id) => get()._setSelectedNodeId(id),
    setSelectedEdgeId: (id) => get()._setSelectedEdgeId(id),
  };

  return {
    // Merge slices
    ...createNodesSlice(set),
    ...createEdgesSlice(set),
    ...createSimulationSlice(set),

    // ── Node commands ───────────────────────────────────────────────────────────
    addNode(type, position, label) {
      addNodeUseCase(repository, type, position, label);
    },
    removeNode(id) {
      removeNodeUseCase(repository, id);
    },
    updateNode(id, partial) {
      repository.updateNode(id, partial);
    },
    updateNodeConfig(id, partial) {
      repository.updateNodeConfig(id, partial);
    },
    duplicateNode(id) {
      duplicateNode(repository, id);
    },
    selectNode(id) {
      repository.setSelectedNodeId(id);
    },

    // ── Edge commands ───────────────────────────────────────────────────────────
    addEdge(params) {
      repository.addEdge(params);
    },
    removeEdge(id) {
      repository.removeEdge(id);
    },
    updateEdge(id, partial) {
      repository.updateEdge(id, partial);
    },
    selectEdge(id) {
      repository.setSelectedEdgeId(id);
    },

    // ── Simulation commands ─────────────────────────────────────────────────────
    startSimulation() {
      stopTicker();
      get()._setSimulationConfig({ isRunning: true });

      _tickerInterval = setInterval(() => {
        const { simulationConfig } = get();
        if (!simulationConfig.isRunning) return;

        const result = tickSimulation(repository, {
          trafficLevel: simulationConfig.trafficLevel,
          speed:        simulationConfig.speed,
          isChaosMode:  simulationConfig.isChaosMode,
          currentTime:  simulationConfig.time,
        });

        get()._setGlobalMetrics(result.globalMetrics);
        get()._appendHistory(result.historyPoint);
        get()._setSimulationConfig({ time: result.nextTime });
      }, 500);
    },

    stopSimulation() {
      stopTicker();
      get()._setSimulationConfig({ isRunning: false });
    },

    resetSimulation() {
      stopTicker();
      get()._setSimulationConfig({ isRunning: false, time: 0 });
      get()._clearHistory();
      get()._setGlobalMetrics(GlobalMetrics.zero());

      const resetNodes = repository.getAllNodes().map(n =>
        NodeEntity.update(n, {
          metrics:      NodeMetrics.zero(),
          status:       'healthy',
          isChaosActive:false,
          isSpof:       false,
        })
      );
      repository.replaceAllNodes(resetNodes);
    },

    setSpeed(speed) {
      get()._setSimulationConfig({ speed });
    },

    setTrafficLevel(level) {
      get()._setSimulationConfig({ trafficLevel: level });
    },

    toggleChaosMode() {
      const { isChaosMode } = get().simulationConfig;
      get()._setSimulationConfig({ isChaosMode: !isChaosMode });
    },

    // ── Chaos commands ──────────────────────────────────────────────────────────
    killNode(id)     { killNode(repository, id); },
    restoreNode(id)  { restoreNode(repository, id); },
    overloadNode(id) { overloadNode(repository, id); },

    // ── Layout commands ─────────────────────────────────────────────────────────
    autoLayout() {
      autoLayoutUseCase(repository);
    },

    clearAll() {
      stopTicker();
      repository.replaceAllNodes([]);
      repository.replaceAllEdges([]);
      repository.setSelectedNodeId(null);
      repository.setSelectedEdgeId(null);
      get()._setSimulationConfig({ isRunning: false, time: 0 });
      get()._clearHistory();
      get()._setGlobalMetrics(GlobalMetrics.zero());
    },

    loadDefaultArchitecture() {
      stopTicker();
      get()._setSimulationConfig({ isRunning: false, time: 0 });
      get()._clearHistory();
      loadDefaultUseCase(repository);
    },
  };
});
