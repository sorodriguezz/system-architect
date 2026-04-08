'use client';
import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { NodeEntity } from '@/domain/entities/Node.entity';
import { NodeStatus } from '@/domain/constants/NodeTypes.constant';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';
import { MetricBar } from '@/presentation/components/atoms/MetricBar.atom';
import * as Icons from 'lucide-react';

// ── Status styling maps ────────────────────────────────────────────────────────

const STATUS_DOT_COLOR: Record<NodeStatus, string> = {
  healthy:    '#22c55e',
  degraded:   '#f59e0b',
  overloaded: '#ef4444',
  down:       '#6b7280',
  starting:   '#3b82f6',
};

const STATUS_GLOW: Record<NodeStatus, string> = {
  healthy:    'rgba(34,197,94,0.2)',
  degraded:   'rgba(245,158,11,0.2)',
  overloaded: 'rgba(239,68,68,0.3)',
  down:       'rgba(107,114,128,0.08)',
  starting:   'rgba(59,130,246,0.2)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: NodeStatus }) {
  const color = STATUS_DOT_COLOR[status];
  return (
    <div
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
    />
  );
}

function NodeBadge({ text, variant }: { text: string; variant: 'spof' | 'chaos' }) {
  const styles = variant === 'spof'
    ? 'bg-amber-500/90 text-black'
    : 'bg-red-500/90 text-white';
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-bold animate-pulse ${styles}`}>
      {text}
    </span>
  );
}

function LiveMetrics({ entity, color }: { entity: NodeEntity; color: string }) {
  const { metrics, config, status } = entity;
  if (status === NodeStatus.DOWN) return (
    <div className="mt-2 text-center text-xs text-gray-500 font-mono">■ OFFLINE</div>
  );

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex justify-between text-xs">
        <span className="text-white/40">RPS</span>
        <span className="text-white/80 font-mono">{Math.round(metrics.rps).toLocaleString()}</span>
      </div>
      <MetricBar value={metrics.rps} max={config.maxRps * config.replicas} color={color} />

      <div className="flex justify-between text-xs">
        <span className="text-white/40">CPU</span>
        <span
          className="font-mono"
          style={{ color: metrics.cpuLoad > 80 ? '#ef4444' : metrics.cpuLoad > 60 ? '#f59e0b' : '#22c55e' }}
        >
          {Math.round(metrics.cpuLoad)}%
        </span>
      </div>
      <MetricBar
        value={metrics.cpuLoad}
        color={metrics.cpuLoad > 80 ? '#ef4444' : metrics.cpuLoad > 60 ? '#f59e0b' : '#22c55e'}
      />

      <div className="flex justify-between text-xs">
        <span className="text-white/40">Latency</span>
        <span className="text-white/80 font-mono">{Math.round(metrics.latency)}ms</span>
      </div>

      {metrics.errorRate > 0.5 && (
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Errors</span>
          <span className="text-red-400 font-mono">{metrics.errorRate.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type FlowNodeProps = NodeProps & { data: unknown };

function FlowNode({ data: rawData, selected }: FlowNodeProps) {
  const entity     = rawData as unknown as NodeEntity;
  const isRunning  = useArchitectureStore(s => s.simulationConfig.isRunning);
  const selectNode = useArchitectureStore(s => s.selectNode);
  const removeNode = useArchitectureStore(s => s.removeNode);

  const color   = SimulationConstants.COLOR_BY_TYPE[entity.type] || '#6366f1';
  const iconName= SimulationConstants.ICON_BY_TYPE[entity.type]  || 'Server';
  const IconComp= (Icons as Record<string, any>)[iconName];

  const handleClick  = useCallback(() => selectNode(entity.id), [entity.id, selectNode]);
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(entity.id);
  }, [entity.id, removeNode]);

  return (
    <div onClick={handleClick} className="relative group cursor-pointer" style={{ minWidth: 140 }}>
      <Handle type="target" position={Position.Left}
        className="!w-3 !h-3 !bg-white/30 !border-2 !border-white/50 hover:!bg-white/80"
        style={{ left: -6 }}
      />
      <Handle type="source" position={Position.Right}
        className="!w-3 !h-3 !bg-white/30 !border-2 !border-white/50 hover:!bg-white/80"
        style={{ right: -6 }}
      />

      <div
        className="relative rounded-xl border transition-all duration-200 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,30,0.97) 0%, rgba(20,20,40,0.97) 100%)',
          borderColor: selected ? color : 'rgba(255,255,255,0.1)',
          boxShadow: selected
            ? `0 0 0 2px ${color}, 0 8px 32px ${STATUS_GLOW[entity.status]}`
            : `0 4px 16px rgba(0,0,0,0.4), 0 0 8px ${STATUS_GLOW[entity.status]}`,
        }}
      >
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

        {/* Badges */}
        <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
          {entity.isSpof       && <NodeBadge text="SPOF"  variant="spof"  />}
        </div>
        <div className="absolute top-1.5 left-1.5 z-10">
          {entity.isChaosActive && <NodeBadge text="CHAOS" variant="chaos" />}
        </div>

        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="flex items-center justify-center rounded-lg w-9 h-9 flex-shrink-0"
              style={{ background: `${color}22`, border: `1px solid ${color}44`, boxShadow: `0 0 12px ${color}33` }}
            >
              {IconComp && <IconComp size={18} style={{ color, opacity: entity.status === NodeStatus.DOWN ? 0.4 : 1 }} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <StatusDot status={entity.status} />
                <span className="text-white text-xs font-semibold truncate">{entity.label}</span>
              </div>
              <div className="text-white/40 text-xs truncate mt-0.5">
                {entity.type}
                {entity.config.replicas > 1 && ` ×${entity.config.replicas}`}
              </div>
            </div>
          </div>

          {isRunning && <LiveMetrics entity={entity} color={color} />}

          {/* CPU usage bottom bar */}
          {isRunning && entity.status !== NodeStatus.DOWN && (
            <div
              className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
              style={{
                width: `${Math.min(100, entity.metrics.cpuLoad)}%`,
                background: entity.metrics.cpuLoad > 80 ? '#ef4444' : entity.metrics.cpuLoad > 60 ? '#f59e0b' : color,
              }}
            />
          )}
        </div>
      </div>

      {/* Delete on hover */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex z-20"
      >
        ×
      </button>
    </div>
  );
}

export default memo(FlowNode);
