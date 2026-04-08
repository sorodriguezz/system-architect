'use client';
import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  BackgroundVariant, ConnectionLineType, useReactFlow,
  Panel, Connection, NodeChange, EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { NodeType } from '@/domain/constants/NodeTypes.constant';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';
import { nodesToRFNodes, edgesToRFEdges } from '@/presentation/mappers/ReactFlowMapper';

import FlowNode from './FlowNode.organism';
import TrafficEdge from '../edges/TrafficEdge';
import { TopBar } from './TopBar.organism';
import { ComponentLibrary } from './ComponentLibrary.organism';
import { ConfigPanel } from './ConfigPanel.organism';
import { MetricsPanel } from './MetricsPanel.organism';
import * as Icons from 'lucide-react';

// ── ReactFlow type registries ──────────────────────────────────────────────────

const NODE_TYPES = Object.values(NodeType).reduce((acc, type) => {
  acc[type] = FlowNode;
  return acc;
}, {} as Record<string, typeof FlowNode>);

const EDGE_TYPES = { animated: TrafficEdge };

const MINI_MAP_NODE_COLOR = (node: any) => {
  const entity = node.data as any;
  if (!entity) return '#374151';
  const status = entity.status ?? 'healthy';
  const STATUS_COLORS: Record<string, string> = {
    healthy:    SimulationConstants.COLOR_BY_TYPE[entity.type] ?? '#6366f1',
    degraded:   '#f59e0b',
    overloaded: '#ef4444',
    down:       '#374151',
  };
  return STATUS_COLORS[status] ?? '#6366f1';
};

// ─────────────────────────────────────────────────────────────────────────────

export function ArchitectureCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes          = useArchitectureStore(s => s.nodes);
  const edges          = useArchitectureStore(s => s.edges);
  const simulationConfig = useArchitectureStore(s => s.simulationConfig);
  const addNode        = useArchitectureStore(s => s.addNode);
  const addEdge        = useArchitectureStore(s => s.addEdge);
  const removeNode     = useArchitectureStore(s => s.removeNode);
  const removeEdge     = useArchitectureStore(s => s.removeEdge);
  const updateNode     = useArchitectureStore(s => s.updateNode);
  const selectNode     = useArchitectureStore(s => s.selectNode);
  const selectEdge     = useArchitectureStore(s => s.selectEdge);

  const [leftPanelOpen,  setLeftPanelOpen]  = useState(true);
  const [rightPanelTab,  setRightPanelTab]  = useState<'config' | 'metrics'>('config');

  const selectedNodeId = useArchitectureStore(s => s.selectedNodeId);
  const selectedEdgeId = useArchitectureStore(s => s.selectedEdgeId);

  // ── Event handlers ───────────────────────────────────────────────────────────

  const onDragStart = useCallback((event: React.DragEvent, type: string) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(type as NodeType, position);
  }, [screenToFlowPosition, addNode]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    addEdge({ sourceId: connection.source, targetId: connection.target });
  }, [addEdge]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        updateNode(change.id, { position: change.position });
      }
      if (change.type === 'select' && change.selected) selectNode(change.id);
      if (change.type === 'remove') removeNode(change.id);
    }
  }, [updateNode, selectNode, removeNode]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === 'select' && change.selected) selectEdge(change.id);
      if (change.type === 'remove') removeEdge(change.id);
    }
  }, [selectEdge, removeEdge]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // ── Data transformation ──────────────────────────────────────────────────────
  const rfNodes = nodesToRFNodes(nodes);
  const rfEdges = edgesToRFEdges(edges);

  const hasSelection = Boolean(selectedNodeId || selectedEdgeId);

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0f' }}>
      <TopBar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel */}
        <div
          className="border-r border-white/5 flex-shrink-0 overflow-hidden transition-all duration-200"
          style={{ width: leftPanelOpen ? 220 : 0, background: 'rgba(12,12,22,0.98)' }}
        >
          {leftPanelOpen && <ComponentLibrary onDragStart={onDragStart} />}
        </div>

        {/* Panel toggle */}
        <button
          onClick={() => setLeftPanelOpen(v => !v)}
          className="absolute top-1/2 -translate-y-1/2 z-10 w-4 h-12 flex items-center justify-center rounded-r bg-white/5 border border-l-0 border-white/10 hover:bg-white/10 transition-colors"
          style={{ left: leftPanelOpen ? 220 : 0 }}
        >
          {leftPanelOpen
            ? <Icons.ChevronLeft  size={10} className="text-white/40" />
            : <Icons.ChevronRight size={10} className="text-white/40" />
          }
        </button>

        {/* Canvas */}
        <div ref={wrapperRef} className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={onPaneClick}
            connectionLineType={ConnectionLineType.Bezier}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            deleteKeyCode="Delete"
            panOnDrag={[1, 2]}
            snapToGrid
            snapGrid={[10, 10]}
            style={{ background: '#0a0a0f' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.06)" />
            <Controls style={{ bottom: 20, left: 20 }} showInteractive={false} />
            <MiniMap
              style={{ bottom: 20, right: 300 }}
              nodeColor={MINI_MAP_NODE_COLOR}
              maskColor="rgba(10,10,20,0.6)"
              pannable zoomable
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center" style={{ top: '40%' }}>
                <div className="text-center pointer-events-none">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Icons.Network size={32} className="text-indigo-400" />
                  </div>
                  <h2 className="text-white/60 font-semibold text-base mb-1">Start Building Your Architecture</h2>
                  <p className="text-white/30 text-sm">Drag components from the left, or press "Example"</p>
                </div>
              </Panel>
            )}

            {/* Chaos banner */}
            {simulationConfig.isChaosMode && (
              <Panel position="top-right" style={{ top: 12, right: 12 }}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 animate-pulse">
                  <Icons.Zap size={12} className="text-red-400" />
                  <span className="text-red-400 text-xs font-bold">CHAOS MODE ACTIVE</span>
                </div>
              </Panel>
            )}

            {/* Simulation status bar */}
            {simulationConfig.isRunning && (
              <Panel position="bottom-center" style={{ bottom: 12 }}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/50 text-xs">
                    Simulating · {simulationConfig.speed}× · Traffic {simulationConfig.trafficLevel}%
                  </span>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right panel */}
        <div
          className="border-l border-white/5 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ width: 280, background: 'rgba(12,12,22,0.98)' }}
        >
          {/* Tab bar */}
          <div className="flex border-b border-white/5 flex-shrink-0">
            <PanelTab
              label="Config"
              icon={<Icons.SlidersHorizontal size={11} />}
              active={rightPanelTab === 'config'}
              badge={hasSelection}
              onClick={() => setRightPanelTab('config')}
            />
            <PanelTab
              label="Metrics"
              icon={<Icons.BarChart3 size={11} />}
              active={rightPanelTab === 'metrics'}
              badge={simulationConfig.isRunning}
              badgeColor="bg-green-400"
              onClick={() => setRightPanelTab('metrics')}
            />
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'config' ? <ConfigPanel /> : <MetricsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelTab({ label, icon, active, badge, badgeColor = 'bg-indigo-400', onClick }: {
  label: string; icon: React.ReactNode; active: boolean;
  badge?: boolean; badgeColor?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
        active ? 'text-white border-indigo-500' : 'text-white/40 border-transparent hover:text-white/60'
      }`}
    >
      {icon}
      {label}
      {badge && <div className={`w-1.5 h-1.5 rounded-full ${badgeColor} ${active ? '' : 'animate-pulse'}`} />}
    </button>
  );
}
