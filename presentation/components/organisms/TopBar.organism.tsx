'use client';
import React from 'react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { useSimulationControls } from '@/presentation/hooks/useSimulationControls.hook';
import { MetricChip } from '@/presentation/components/molecules/MetricChip.molecule';
import { IconButton } from '@/presentation/components/atoms/IconButton.atom';
import * as Icons from 'lucide-react';

const SPEED_OPTIONS = [0.5, 1, 2, 5] as const;

function formatRps(rps: number): string {
  return rps >= 1000 ? `${(rps / 1000).toFixed(1)}K` : Math.round(rps).toString();
}

function latencyColor(ms: number): string {
  if (ms > 500) return '#ef4444';
  if (ms > 200) return '#f59e0b';
  return '#22c55e';
}

function errorColor(rate: number): string {
  if (rate > 5) return '#ef4444';
  if (rate > 1) return '#f59e0b';
  return '#22c55e';
}

export function TopBar() {
  const nodeCount = useArchitectureStore(s => s.nodes.length);
  const { globalMetrics, simulationConfig, isRunning, startSimulation, stopSimulation,
    resetSimulation, setSpeed, setTrafficLevel, toggleChaosMode } = useSimulationControls();
  const autoLayout           = useArchitectureStore(s => s.autoLayout);
  const clearAll             = useArchitectureStore(s => s.clearAll);
  const loadDefaultArchitecture = useArchitectureStore(s => s.loadDefaultArchitecture);

  const m = globalMetrics;

  return (
    <header
      className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0"
      style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(20px)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Icons.Network size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-sm leading-none">SysArchitect</h1>
          <p className="text-white/35 text-xs">Visual System Designer</p>
        </div>
      </div>

      {/* Live metrics strip */}
      {nodeCount > 0 && (
        <div className="hidden md:flex items-center gap-3">
          <MetricChip label="RPS"     value={formatRps(m.totalRps)}       color="#6366f1"
            icon={<Icons.Activity size={11} className="text-indigo-400" />} />
          <MetricChip label="Latency" value={`${Math.round(m.avgLatency)}ms`} color={latencyColor(m.avgLatency)}
            icon={<Icons.Timer size={11} className="text-cyan-400" />} />
          <MetricChip label="Errors"  value={`${m.errorRate.toFixed(1)}%`}  color={errorColor(m.errorRate)}
            icon={<Icons.AlertCircle size={11} className="text-red-400" />} />
          <MetricChip label="Cost"    value={`$${m.costPerHour.toFixed(2)}/hr`} color="#4ade80"
            icon={<Icons.DollarSign size={11} className="text-green-400" />} />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Traffic level */}
        <div className="hidden sm:flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5">
          <Icons.Waves size={11} className="text-white/40" />
          <span className="text-white/40 text-xs">Traffic</span>
          <input type="range" min={0} max={100} value={simulationConfig.trafficLevel}
            onChange={e => setTrafficLevel(Number(e.target.value))}
            className="w-20 accent-indigo-500 h-1"
          />
          <span className="text-white/60 text-xs w-7 font-mono">{simulationConfig.trafficLevel}%</span>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-0.5 bg-white/3 border border-white/8 rounded-lg p-0.5">
          {SPEED_OPTIONS.map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                simulationConfig.speed === s ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white/70'
              }`}>
              {s}×
            </button>
          ))}
        </div>

        {/* Chaos */}
        <button onClick={toggleChaosMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            simulationConfig.isChaosMode
              ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
              : 'bg-white/3 border-white/8 text-white/50 hover:text-white/80'
          }`}>
          <Icons.Zap size={11} />
          <span className="hidden sm:inline">Chaos</span>
        </button>

        <IconButton onClick={autoLayout} title="Auto Layout">
          <Icons.LayoutTemplate size={13} />
        </IconButton>

        <button onClick={loadDefaultArchitecture}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/3 text-white/50 hover:text-white/80 text-xs transition-all">
          <Icons.BookOpen size={11} />
          <span className="hidden sm:inline">Example</span>
        </button>

        <IconButton onClick={clearAll} title="Clear All" variant="danger">
          <Icons.Trash2 size={13} />
        </IconButton>

        <div className="w-px h-6 bg-white/10" />

        {/* Play / Stop */}
        {isRunning ? (
          <button onClick={stopSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs font-medium transition-all">
            <Icons.Square size={11} /> Stop
          </button>
        ) : (
          <button onClick={startSimulation} disabled={nodeCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }}>
            <Icons.Play size={11} /> Simulate
          </button>
        )}

        <IconButton onClick={resetSimulation} title="Reset">
          <Icons.RotateCcw size={13} />
        </IconButton>
      </div>
    </header>
  );
}
