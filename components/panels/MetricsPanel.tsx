'use client';
import React from 'react';
import { useArchitectureStore } from '@/store/architectureStore';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import * as Icons from 'lucide-react';

function Stat({
  label,
  value,
  unit,
  color = '#6366f1',
  icon: Icon,
  sublabel,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  icon?: React.FC<any>;
  sublabel?: string;
}) {
  return (
    <div
      className="relative p-3 rounded-xl border border-white/5 overflow-hidden"
      style={{ background: 'rgba(15,15,28,0.8)' }}
    >
      <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${color}, transparent)` }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/40 text-xs">{label}</span>
          {Icon && <Icon size={12} style={{ color }} />}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-lg font-mono leading-none">{value}</span>
          {unit && <span className="text-white/40 text-xs">{unit}</span>}
        </div>
        {sublabel && <div className="text-white/30 text-xs mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f1a] border border-white/10 rounded-lg p-2 text-xs text-white/80 shadow-xl">
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/50">{p.name}:</span>
          <span className="font-mono font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function MetricsPanel() {
  const { globalMetrics, history, simulation, nodes } = useArchitectureStore();
  const m = globalMetrics;

  const healthPct = m.totalNodes > 0 ? Math.round((m.healthyNodes / m.totalNodes) * 100) : 100;
  const degradedCount = nodes.filter(n => n.status === 'degraded').length;
  const downCount = nodes.filter(n => n.status === 'down').length;
  const overloadedCount = nodes.filter(n => n.status === 'overloaded').length;
  const spofCount = nodes.filter(n => n.spof).length;

  const chartData = history.map((h, i) => ({
    t: i,
    RPS: Math.round(h.rps),
    Latency: Math.round(h.latency),
    Errors: parseFloat(h.errorRate.toFixed(1)),
  }));

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full">
      {/* System Health Bar */}
      <div
        className="p-3 rounded-xl border"
        style={{
          background: 'rgba(10,10,20,0.8)',
          borderColor: downCount > 0 ? 'rgba(239,68,68,0.3)' : overloadedCount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-xs font-medium">System Health</span>
          <span
            className="text-xs font-bold font-mono"
            style={{ color: healthPct > 80 ? '#22c55e' : healthPct > 50 ? '#f59e0b' : '#ef4444' }}
          >
            {healthPct}%
          </span>
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${healthPct}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
          />
        </div>
        <div className="flex gap-3 mt-2 text-xs">
          <span className="text-green-400">↑ {m.healthyNodes} healthy</span>
          {degradedCount > 0 && <span className="text-amber-400">⚠ {degradedCount} degraded</span>}
          {overloadedCount > 0 && <span className="text-red-400">🔥 {overloadedCount} overloaded</span>}
          {downCount > 0 && <span className="text-gray-400">✗ {downCount} down</span>}
          {spofCount > 0 && <span className="text-amber-400">⚡ {spofCount} SPOF</span>}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Total RPS"
          value={m.totalRps >= 1000 ? `${(m.totalRps / 1000).toFixed(1)}K` : Math.round(m.totalRps)}
          icon={Icons.Activity}
          color="#6366f1"
        />
        <Stat
          label="Avg Latency"
          value={Math.round(m.avgLatency)}
          unit="ms"
          icon={Icons.Timer}
          color="#06b6d4"
        />
        <Stat
          label="P95 Latency"
          value={Math.round(m.p95Latency)}
          unit="ms"
          color="#8b5cf6"
          sublabel="95th percentile"
        />
        <Stat
          label="Error Rate"
          value={m.errorRate.toFixed(2)}
          unit="%"
          color={m.errorRate > 5 ? '#ef4444' : m.errorRate > 1 ? '#f59e0b' : '#22c55e'}
          icon={Icons.AlertTriangle}
        />
        <Stat
          label="Cost/Hour"
          value={`$${m.costPerHour.toFixed(2)}`}
          icon={Icons.DollarSign}
          color="#4ade80"
          sublabel={`$${(m.costPerHour * 24 * 30).toFixed(0)}/mo`}
        />
        <Stat
          label="Throughput"
          value={m.totalThroughput.toFixed(1)}
          unit="MB/s"
          icon={Icons.Waves}
          color="#f97316"
        />
      </div>

      {/* Connections */}
      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Active Conns"
          value={m.activeConnections.toLocaleString()}
          icon={Icons.Network}
          color="#22d3ee"
        />
        <Stat
          label="Sim Time"
          value={Math.floor(simulation.time / 60)}
          unit="min"
          icon={Icons.Clock}
          color="#94a3b8"
          sublabel={`${simulation.speed}x speed`}
        />
      </div>

      {/* Charts */}
      {chartData.length > 2 && (
        <>
          <div>
            <div className="text-white/40 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <Icons.TrendingUp size={10} className="text-indigo-400" />
              Requests / Second
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="RPS" stroke="#6366f1" fill="url(#rpsGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="text-white/40 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <Icons.Timer size={10} className="text-cyan-400" />
              Latency (ms)
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Latency" stroke="#06b6d4" fill="url(#latGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="text-white/40 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <Icons.AlertTriangle size={10} className="text-red-400" />
              Error Rate (%)
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Errors" stroke="#ef4444" fill="url(#errGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {chartData.length <= 2 && simulation.running && (
        <div className="flex items-center justify-center h-20 text-white/25 text-xs">
          <Icons.BarChart2 size={16} className="mr-1.5 animate-pulse" />
          Collecting data...
        </div>
      )}
    </div>
  );
}
