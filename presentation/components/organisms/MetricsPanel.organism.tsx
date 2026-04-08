'use client';
import React from 'react';
import { useSimulationControls } from '@/presentation/hooks/useSimulationControls.hook';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { StatCard } from '@/presentation/components/molecules/StatCard.molecule';
import { NodeStatus } from '@/domain/constants/NodeTypes.constant';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatNumber, formatLatency } from '@/lib/formatNumber';
import * as Icons from 'lucide-react';

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f1a] border border-white/10 rounded-lg p-2 text-xs shadow-xl">
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/50">{p.name}:</span>
          <span className="font-mono font-bold text-white/80">
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function MiniChart({ dataKey, data, color, label, icon }: {
  dataKey: string; data: any[]; color: string; label: string; icon: React.ReactNode;
}) {
  if (data.length < 2) return null;
  const gradientId = `grad-${dataKey}`;
  return (
    <div>
      <div className="text-white/40 text-xs font-medium mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" hide />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey={dataKey} stroke={color}
              fill={`url(#${gradientId})`} strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MetricsPanel() {
  const { globalMetrics: m, simulationConfig, history } = useSimulationControls();
  const nodes = useArchitectureStore(s => s.nodes);

  const statusCounts = {
    healthy:    nodes.filter(n => n.status === NodeStatus.HEALTHY).length,
    degraded:   nodes.filter(n => n.status === NodeStatus.DEGRADED).length,
    overloaded: nodes.filter(n => n.status === NodeStatus.OVERLOADED).length,
    down:       nodes.filter(n => n.status === NodeStatus.DOWN).length,
    spof:       nodes.filter(n => n.isSpof).length,
  };

  const healthPct = m.totalNodes > 0
    ? Math.round((statusCounts.healthy / m.totalNodes) * 100)
    : 100;

  const chartData = history.map((h, i) => ({
    t:       i,
    RPS:     Math.round(h.rps),
    Latency: Math.round(h.latency),
    Errors:  parseFloat(h.errorRate.toFixed(1)),
  }));

  const healthBorderColor = statusCounts.down > 0
    ? 'rgba(239,68,68,0.3)'
    : statusCounts.overloaded > 0
    ? 'rgba(245,158,11,0.3)'
    : 'rgba(34,197,94,0.2)';

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full">
      {/* System health */}
      <div className="p-3 rounded-xl border" style={{ background: 'rgba(10,10,20,0.8)', borderColor: healthBorderColor }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-xs font-medium">System Health</span>
          <span className="text-xs font-bold font-mono"
            style={{ color: healthPct > 80 ? '#22c55e' : healthPct > 50 ? '#f59e0b' : '#ef4444' }}>
            {healthPct}%
          </span>
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${healthPct}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
          />
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-xs">
          <span className="text-green-400">↑ {statusCounts.healthy} healthy</span>
          {statusCounts.degraded   > 0 && <span className="text-amber-400">⚠ {statusCounts.degraded} degraded</span>}
          {statusCounts.overloaded > 0 && <span className="text-red-400">🔥 {statusCounts.overloaded} overloaded</span>}
          {statusCounts.down       > 0 && <span className="text-gray-400">✗ {statusCounts.down} down</span>}
          {statusCounts.spof       > 0 && <span className="text-amber-400">⚡ {statusCounts.spof} SPOF</span>}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total RPS"    value={formatNumber(m.totalRps)}
          color="#6366f1" icon={<Icons.Activity size={12} />} />
        <StatCard label="Avg Latency"  value={formatLatency(m.avgLatency)}
          color="#06b6d4" icon={<Icons.Timer size={12} />} />
        <StatCard label="P95 Latency"  value={formatLatency(m.p95Latency)} sublabel="95th percentile"
          color="#8b5cf6" />
        <StatCard label="Error Rate"   value={`${(Number.isFinite(m.errorRate) ? m.errorRate : 0).toFixed(2)}%`}
          color={m.errorRate > 5 ? '#ef4444' : m.errorRate > 1 ? '#f59e0b' : '#22c55e'}
          icon={<Icons.AlertTriangle size={12} />} />
        <StatCard label="Cost / Hour"  value={`$${(Number.isFinite(m.costPerHour) ? m.costPerHour : 0).toFixed(2)}`} color="#4ade80"
          sublabel={`$${(Number.isFinite(m.costPerHour) ? m.costPerHour * 24 * 30 : 0).toFixed(0)}/mo`} icon={<Icons.DollarSign size={12} />} />
        <StatCard label="Throughput"   value={`${(Number.isFinite(m.totalThroughput) ? m.totalThroughput : 0).toFixed(1)} MB/s`} color="#f97316" icon={<Icons.Waves size={12} />} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Connections" value={formatNumber(m.activeConnections)} color="#22d3ee" icon={<Icons.Network size={12} />} />
        <StatCard label="Sim Time"    value={Math.floor(simulationConfig.time / 60)} unit="min"
          color="#94a3b8" sublabel={`${simulationConfig.speed}× speed`} icon={<Icons.Clock size={12} />} />
      </div>

      {/* Charts */}
      <MiniChart dataKey="RPS"     data={chartData} color="#6366f1" label="Requests / Second"
        icon={<Icons.TrendingUp size={10} className="text-indigo-400" />} />
      <MiniChart dataKey="Latency" data={chartData} color="#06b6d4" label="Latency (ms)"
        icon={<Icons.Timer size={10} className="text-cyan-400" />} />
      <MiniChart dataKey="Errors"  data={chartData} color="#ef4444" label="Error Rate (%)"
        icon={<Icons.AlertTriangle size={10} className="text-red-400" />} />

      {chartData.length <= 2 && simulationConfig.isRunning && (
        <div className="flex items-center justify-center h-20 text-white/25 text-xs">
          <Icons.BarChart2 size={16} className="mr-1.5 animate-pulse" />
          Collecting data...
        </div>
      )}
    </div>
  );
}
