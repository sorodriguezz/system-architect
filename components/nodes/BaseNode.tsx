'use client';
import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useArchitectureStore } from '@/store/architectureStore';
import { COMPONENT_COLORS } from '@/lib/simulation';
import { COMPONENT_TEMPLATES } from '@/lib/componentTemplates';
import type { ArchNode, NodeStatus } from '@/types';
import * as Icons from 'lucide-react';

const statusColors: Record<NodeStatus, string> = {
  healthy: '#22c55e',
  degraded: '#f59e0b',
  overloaded: '#ef4444',
  down: '#6b7280',
  starting: '#3b82f6',
};

const statusGlow: Record<NodeStatus, string> = {
  healthy: 'rgba(34,197,94,0.25)',
  degraded: 'rgba(245,158,11,0.25)',
  overloaded: 'rgba(239,68,68,0.35)',
  down: 'rgba(107,114,128,0.1)',
  starting: 'rgba(59,130,246,0.25)',
};

type BaseNodeProps = NodeProps & {
  data: ArchNode;
};

function MetricBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function BaseNode({ data: rawData, selected }: BaseNodeProps) {
  const data = rawData as unknown as ArchNode;
  const { selectNode, removeNode, simulation, killNode, restoreNode } = useArchitectureStore();
  const template = COMPONENT_TEMPLATES.find(t => t.type === data.type);
  const color = COMPONENT_COLORS[data.type] || '#6366f1';
  const IconComp = (Icons as any)[template?.icon || 'Server'];
  const status = data.status;
  const statusColor = statusColors[status];
  const isDown = status === 'down';
  const isOverloaded = status === 'overloaded';

  const handleClick = useCallback(() => selectNode(data.id), [data.id, selectNode]);
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(data.id);
  }, [data.id, removeNode]);

  return (
    <div
      onClick={handleClick}
      className="relative group cursor-pointer"
      style={{ minWidth: 140 }}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-white/30 !border-2 !border-white/50 hover:!bg-white/80 transition-colors"
        style={{ left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white/30 !border-2 !border-white/50 hover:!bg-white/80 transition-colors"
        style={{ right: -6 }}
      />

      {/* Card */}
      <div
        className="relative rounded-xl border transition-all duration-200 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(15,15,30,0.95) 0%, rgba(20,20,40,0.95) 100%)`,
          borderColor: selected ? color : 'rgba(255,255,255,0.1)',
          boxShadow: selected
            ? `0 0 0 2px ${color}, 0 8px 32px ${statusGlow[status]}`
            : `0 4px 16px rgba(0,0,0,0.4), 0 0 8px ${statusGlow[status]}`,
        }}
      >
        {/* Top accent bar */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

        {/* Status indicators */}
        {data.spof && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-amber-500/90 text-black animate-pulse">
              SPOF
            </span>
          </div>
        )}
        {data.isChaos && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-red-500/90 text-white animate-pulse">
              CHAOS
            </span>
          </div>
        )}

        {/* Main content */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5 mb-2">
            {/* Icon with color glow */}
            <div
              className="flex items-center justify-center rounded-lg w-9 h-9 flex-shrink-0"
              style={{
                background: `${color}22`,
                border: `1px solid ${color}44`,
                boxShadow: `0 0 12px ${color}33`,
              }}
            >
              {IconComp && (
                <IconComp
                  size={18}
                  style={{ color, opacity: isDown ? 0.4 : 1 }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: statusColor,
                    boxShadow: `0 0 6px ${statusColor}`,
                    animation: status === 'overloaded' ? 'ping 1s cubic-bezier(0,0,0.2,1) infinite' : 'none',
                  }}
                />
                <span className="text-white text-xs font-semibold truncate leading-tight">
                  {data.label}
                </span>
              </div>
              <div className="text-white/40 text-xs truncate mt-0.5">
                {data.type.replace(/([A-Z])/g, ' $1')}
                {data.config.replicas > 1 && ` ×${data.config.replicas}`}
              </div>
            </div>
          </div>

          {/* Metrics (only when simulation running or has data) */}
          {simulation.running && !isDown && (
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">RPS</span>
                <span className="text-white/80 font-mono">{Math.round(data.metrics.rps).toLocaleString()}</span>
              </div>
              <MetricBar value={data.metrics.rps} max={data.config.maxRps * data.config.replicas} color={color} />

              <div className="flex justify-between text-xs">
                <span className="text-white/40">CPU</span>
                <span
                  className="font-mono"
                  style={{ color: data.metrics.cpuLoad > 80 ? '#ef4444' : data.metrics.cpuLoad > 60 ? '#f59e0b' : '#22c55e' }}
                >
                  {Math.round(data.metrics.cpuLoad)}%
                </span>
              </div>
              <MetricBar
                value={data.metrics.cpuLoad}
                color={data.metrics.cpuLoad > 80 ? '#ef4444' : data.metrics.cpuLoad > 60 ? '#f59e0b' : '#22c55e'}
              />

              <div className="flex justify-between text-xs">
                <span className="text-white/40">Latency</span>
                <span className="text-white/80 font-mono">{Math.round(data.metrics.latency)}ms</span>
              </div>

              {data.metrics.errorRate > 0.5 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Errors</span>
                  <span className="text-red-400 font-mono">{data.metrics.errorRate.toFixed(1)}%</span>
                </div>
              )}
            </div>
          )}

          {isDown && (
            <div className="mt-2 text-center text-xs text-gray-500 font-mono">
              ■ OFFLINE
            </div>
          )}

          {/* Load indicator bar at bottom */}
          {simulation.running && !isDown && (
            <div
              className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
              style={{
                width: `${Math.min(100, data.metrics.cpuLoad)}%`,
                background: data.metrics.cpuLoad > 80 ? '#ef4444' : data.metrics.cpuLoad > 60 ? '#f59e0b' : color,
              }}
            />
          )}
        </div>
      </div>

      {/* Delete button (on hover) */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex z-20 transition-colors"
      >
        ×
      </button>
    </div>
  );
}

export default memo(BaseNode);
