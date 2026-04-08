'use client';
import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { NodeEntity } from '@/domain/entities/Node.entity';
import { NodeStatus } from '@/domain/constants/NodeTypes.constant';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';
import { MetricBar } from '@/presentation/components/atoms/MetricBar.atom';
import { formatNumber, formatLatency } from '@/lib/formatNumber';
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
  const { metrics, config, status, type } = entity;
  if (status === NodeStatus.DOWN) return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-center gap-1.5">
        <Icons.Skull size={14} style={{ color: '#ef4444', opacity: 0.8 }} />
        <span className="text-xs font-bold font-mono" style={{ color: '#ef4444' }}>CRASHED</span>
      </div>
      <div className="text-center text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
        Service unavailable
      </div>
    </div>
  );

  const isClient = type === 'client';

  const safe = (v: number) => Number.isFinite(v) ? v : 0;

  const latencyColor = metrics.latency > 500 ? '#ef4444'
    : metrics.latency > 100 ? '#f59e0b'
    : '#22c55e';

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex justify-between text-xs">
        <span className="text-white/40">{isClient ? 'Sending' : 'RPS'}</span>
        <span className="text-white/80 font-mono">{formatNumber(safe(metrics.rps))}</span>
      </div>
      <MetricBar value={metrics.rps} max={config.maxRps * config.replicas} color={color} />

      {!isClient && (
        <>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">CPU</span>
            <span
              className="font-mono"
              style={{ color: metrics.cpuLoad > 80 ? '#ef4444' : metrics.cpuLoad > 60 ? '#f59e0b' : '#22c55e' }}
            >
              {Math.round(safe(metrics.cpuLoad))}%
            </span>
          </div>
          <MetricBar
            value={metrics.cpuLoad}
            color={metrics.cpuLoad > 80 ? '#ef4444' : metrics.cpuLoad > 60 ? '#f59e0b' : '#22c55e'}
          />

          <div className="flex justify-between text-xs">
            <span className="text-white/40">Latency</span>
            <span className="font-mono" style={{ color: latencyColor }}>
              {formatLatency(safe(metrics.latency))}
            </span>
          </div>
        </>
      )}

      {isClient && (
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Connections</span>
          <span className="text-white/80 font-mono">{formatNumber(safe(metrics.connections))}</span>
        </div>
      )}

      {metrics.errorRate > 0.5 && (
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Errors</span>
          <span className="text-red-400 font-mono">{Number.isFinite(metrics.errorRate) ? metrics.errorRate.toFixed(1) : '0'}%</span>
        </div>
      )}

      {config.autoscaling && config.replicas > 1 && (
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Replicas</span>
          <span className="text-blue-400 font-mono">×{config.replicas}</span>
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
        className={`relative rounded-xl border transition-all duration-200 overflow-hidden ${
          entity.status === NodeStatus.DOWN ? 'animate-pulse' : ''
        }`}
        style={{
          background: entity.status === NodeStatus.DOWN
            ? 'linear-gradient(135deg, rgba(30,10,10,0.97) 0%, rgba(20,10,15,0.97) 100%)'
            : entity.status === NodeStatus.OVERLOADED
              ? 'linear-gradient(135deg, rgba(25,12,12,0.97) 0%, rgba(20,20,40,0.97) 100%)'
              : 'linear-gradient(135deg, rgba(15,15,30,0.97) 0%, rgba(20,20,40,0.97) 100%)',
          borderColor: entity.status === NodeStatus.DOWN
            ? 'rgba(239,68,68,0.4)'
            : entity.status === NodeStatus.OVERLOADED
              ? 'rgba(239,68,68,0.3)'
              : selected ? color : 'rgba(255,255,255,0.1)',
          boxShadow: entity.status === NodeStatus.DOWN
            ? '0 0 20px rgba(239,68,68,0.25), 0 0 60px rgba(239,68,68,0.08)'
            : entity.status === NodeStatus.OVERLOADED
              ? `0 0 16px rgba(239,68,68,0.15), 0 4px 16px rgba(0,0,0,0.4)`
              : selected
                ? `0 0 0 2px ${color}, 0 8px 32px ${STATUS_GLOW[entity.status]}`
                : `0 4px 16px rgba(0,0,0,0.4), 0 0 8px ${STATUS_GLOW[entity.status]}`,
        }}
      >
        <div className="h-0.5 w-full" style={{
          background: entity.status === NodeStatus.DOWN
            ? 'linear-gradient(90deg, #ef4444, #991b1b, transparent)'
            : entity.status === NodeStatus.OVERLOADED
              ? 'linear-gradient(90deg, #ef4444, #f59e0b, transparent)'
              : `linear-gradient(90deg, ${color}, transparent)`,
        }} />

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
