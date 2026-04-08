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

// ── ReactFlow registries ────────────────────────────────────────────────────

const NODE_TYPES = Object.values(NodeType).reduce((acc, type) => {
  acc[type] = FlowNode as any;
  return acc;
}, {} as Record<string, any>);

const EDGE_TYPES = { animated: TrafficEdge as any };

function miniMapColor(node: any) {
  const entity = node.data as any;
  if (!entity) return '#374151';
  const STATUS_MAP: Record<string, string> = {
    healthy:    SimulationConstants.COLOR_BY_TYPE[entity.type] ?? '#6366f1',
    degraded:   '#f59e0b',
    overloaded: '#ef4444',
    down:       '#374151',
    starting:   '#3b82f6',
  };
  return STATUS_MAP[entity.status ?? 'healthy'] ?? '#6366f1';
}

// ─────────────────────────────────────────────────────────────────────────────

export function ArchitectureCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes           = useArchitectureStore(s => s.nodes);
  const edges           = useArchitectureStore(s => s.edges);
  const simulationConfig= useArchitectureStore(s => s.simulationConfig);
  const selectedNodeId  = useArchitectureStore(s => s.selectedNodeId);
  const selectedEdgeId  = useArchitectureStore(s => s.selectedEdgeId);
  const addNode         = useArchitectureStore(s => s.addNode);
  const addEdge         = useArchitectureStore(s => s.addEdge);
  const removeNode      = useArchitectureStore(s => s.removeNode);
  const removeEdge      = useArchitectureStore(s => s.removeEdge);
  const updateNode      = useArchitectureStore(s => s.updateNode);
  const selectNode      = useArchitectureStore(s => s.selectNode);
  const selectEdge      = useArchitectureStore(s => s.selectEdge);

  const [leftOpen,  setLeftOpen]  = useState(true);
  const [rightTab,  setRightTab]  = useState<'config' | 'metrics'>('config');

  const onDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;
    addNode(type as NodeType, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }, [screenToFlowPosition, addNode]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    addEdge({ sourceId: c.source, targetId: c.target });
  }, [addEdge]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type === 'position' && c.position) updateNode(c.id, { position: c.position });
      if (c.type === 'select'   && c.selected)  selectNode(c.id);
      if (c.type === 'remove')                   removeNode(c.id);
    }
  }, [updateNode, selectNode, removeNode]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const c of changes) {
      if (c.type === 'select' && c.selected) selectEdge(c.id);
      if (c.type === 'remove')               removeEdge(c.id);
    }
  }, [selectEdge, removeEdge]);

  const onPaneClick = useCallback(() => { selectNode(null); selectEdge(null); }, [selectNode, selectEdge]);

  const rfNodes = nodesToRFNodes(nodes);
  const rfEdges = edgesToRFEdges(edges);
  const hasSelection = Boolean(selectedNodeId || selectedEdgeId);

  const LEFT_W  = leftOpen ? 240 : 0;
  const RIGHT_W = 292;

  return (
    /*
     * Use fixed positioning so the app always fills the viewport
     * regardless of any wrapper elements injected by GitHub Pages or Next.js.
     */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#07070e',
        overflow: 'hidden',
      }}
    >
      <TopBar />

      {/* Body row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div
          style={{
            width: LEFT_W,
            flexShrink: 0,
            overflow: 'hidden',
            background: '#0b0b17',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            transition: 'width 0.2s ease',
          }}
        >
          {leftOpen && <ComponentLibrary onDragStart={onDragStart} />}
        </div>

        {/* Panel toggle button */}
        <button
          onClick={() => setLeftOpen(v => !v)}
          style={{
            position: 'absolute',
            left: LEFT_W,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: 16,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer',
            transition: 'left 0.2s ease',
          }}
          className="hover:bg-white/10"
        >
          {leftOpen
            ? <Icons.ChevronLeft  size={10} color="rgba(255,255,255,0.4)" />
            : <Icons.ChevronRight size={10} color="rgba(255,255,255,0.4)" />
          }
        </button>

        {/* ── Canvas ─────────────────────────────────────────────────────── */}
        <div
          ref={wrapperRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}
        >
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
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.08}
            maxZoom={2.5}
            deleteKeyCode="Delete"
            panOnDrag={[1, 2]}
            snapToGrid
            snapGrid={[10, 10]}
            style={{ width: '100%', height: '100%', background: '#07070e' }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={28}
              size={1.2}
              color="rgba(255,255,255,0.07)"
              style={{ background: '#07070e' }}
            />

            <Controls style={{ bottom: 16, left: 16 }} showInteractive={false} />

            {/* Minimap — bottom-right of the canvas area (NOT overlapping the right panel) */}
            <MiniMap
              nodeColor={miniMapColor}
              maskColor="rgba(7,7,14,0.55)"
              style={{ bottom: 16, right: 16, width: 160, height: 100 }}
              pannable
              zoomable
            />

            {/* ── Empty state ───────────────────────────────────────────── */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="text-center pointer-events-none select-none" style={{ marginTop: '20vh' }}>
                  <div
                    className="mx-auto mb-5 flex items-center justify-center rounded-2xl w-20 h-20"
                    style={{
                      background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      boxShadow: '0 0 40px rgba(99,102,241,0.15)',
                    }}
                  >
                    <Icons.Network size={36} style={{ color: '#818cf8' }} />
                  </div>
                  <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                    Start Building Your Architecture
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                    Drag components from the left panel, or click <strong style={{ color: 'rgba(99,102,241,0.9)' }}>Example</strong> to load a reference architecture
                  </p>
                  <div className="flex items-center justify-center gap-6 mt-6">
                    {[
                      { icon: '🖱️', text: 'Drag nodes to canvas' },
                      { icon: '🔗', text: 'Connect to draw edges' },
                      { icon: '▶️', text: 'Simulate traffic flow' },
                    ].map(hint => (
                      <div key={hint.text} style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center' }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{hint.icon}</div>
                        {hint.text}
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}

            {/* ── Chaos banner ───────────────────────────────────────────── */}
            {simulationConfig.isChaosMode && (
              <Panel position="top-right">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-pulse"
                  style={{ marginTop: 12, marginRight: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}
                >
                  <ChaosChip />
                </div>
              </Panel>
            )}

            {/* ── Simulation ticker ──────────────────────────────────────── */}
            {simulationConfig.isRunning && (
              <Panel position="bottom-center">
                <div
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl mb-4"
                  style={{ background: 'rgba(7,7,14,0.85)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    Simulating · {simulationConfig.speed}× speed · {simulationConfig.trafficLevel}% traffic
                  </span>
                  {simulationConfig.isChaosMode && (
                    <span className="text-red-400 text-xs font-bold animate-pulse">⚡ CHAOS</span>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div
          style={{
            width: RIGHT_W,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#0b0b17',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <RightPanelTabs
            activeTab={rightTab}
            hasSelection={hasSelection}
            isRunning={simulationConfig.isRunning}
            onChange={setRightTab}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {rightTab === 'config' ? <ConfigPanel /> : <MetricsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ChaosChip() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-pulse"
      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', marginTop: 12 }}
    >
      <Icons.Zap size={12} color="#f87171" />
      <span style={{ color: '#f87171', fontSize: 12, fontWeight: 700 }}>CHAOS MODE ACTIVE</span>
    </div>
  );
}

function RightPanelTabs({ activeTab, hasSelection, isRunning, onChange }: {
  activeTab: 'config' | 'metrics';
  hasSelection: boolean;
  isRunning: boolean;
  onChange: (t: 'config' | 'metrics') => void;
}) {
  return (
    <div
      className="flex flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <TabButton
        label="Config"
        icon={<Icons.SlidersHorizontal size={11} />}
        active={activeTab === 'config'}
        dot={hasSelection ? '#818cf8' : undefined}
        onClick={() => onChange('config')}
      />
      <TabButton
        label="Metrics"
        icon={<Icons.BarChart3 size={11} />}
        active={activeTab === 'metrics'}
        dot={isRunning ? '#4ade80' : undefined}
        pulse={isRunning}
        onClick={() => onChange('metrics')}
      />
    </div>
  );
}

function TabButton({ label, icon, active, dot, pulse, onClick }: {
  label: string; icon: React.ReactNode; active: boolean;
  dot?: string; pulse?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors"
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: active ? 'white' : 'rgba(255,255,255,0.4)',
        borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
      {dot && (
        <div
          className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`}
          style={{ background: dot }}
        />
      )}
    </button>
  );
}
