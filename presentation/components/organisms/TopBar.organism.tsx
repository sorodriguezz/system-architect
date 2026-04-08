'use client';
import React from 'react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { useSimulationControls } from '@/presentation/hooks/useSimulationControls.hook';
import { MetricChip } from '@/presentation/components/molecules/MetricChip.molecule';
import * as Icons from 'lucide-react';

const SPEED_OPTIONS = [0.5, 1, 2, 5] as const;

function rpsLabel(rps: number) {
  if (rps >= 1_000_000) return `${(rps / 1_000_000).toFixed(1)}M`;
  if (rps >= 1_000)     return `${(rps / 1_000).toFixed(1)}K`;
  return Math.round(rps).toString();
}

const latencyColor  = (ms: number) => ms > 500 ? '#f87171' : ms > 200 ? '#fbbf24' : '#4ade80';
const errorColor    = (r: number)  => r  > 5   ? '#f87171' : r  > 1   ? '#fbbf24' : '#4ade80';

// ── Styled primitives ────────────────────────────────────────────────────────

function GlassButton({
  onClick, title, children, variant = 'default', active = false, disabled = false, className = '',
}: {
  onClick: () => void; title?: string; children: React.ReactNode;
  variant?: 'default' | 'danger' | 'primary' | 'chaos'; active?: boolean; disabled?: boolean; className?: string;
}) {
  const base   = 'flex items-center justify-center gap-1.5 rounded-lg border transition-all duration-150 text-xs font-medium px-2.5 py-1.5 cursor-pointer select-none';
  const styles: Record<string, string> = {
    default: active
      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
      : 'bg-white/4 border-white/10 text-white/55 hover:bg-white/8 hover:border-white/20 hover:text-white/80',
    danger:  'bg-red-500/10 border-red-500/20 text-red-400/70 hover:bg-red-500/18 hover:text-red-400',
    primary: 'border-indigo-500/60 text-white font-semibold hover:brightness-110',
    chaos:   active
      ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse'
      : 'bg-white/4 border-white/10 text-white/55 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300',
  };
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

function SpeedPill({ current, onSelect }: { current: number; onSelect: (s: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {SPEED_OPTIONS.map(s => (
        <button key={s} onClick={() => onSelect(s)}
          className={`px-2 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
            current === s
              ? 'text-white'
              : 'text-white/35 hover:text-white/65'
          }`}
          style={current === s ? {
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            boxShadow: '0 1px 8px rgba(99,102,241,0.5)',
          } : {}}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}

function TrafficSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color = value > 80 ? '#ef4444' : value > 60 ? '#f59e0b' : '#6366f1';
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <Icons.Waves size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Traffic</span>
      <div className="relative flex items-center" style={{ width: 80 }}>
        <input type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: color }}
        />
      </div>
      <span
        className="font-mono font-bold text-xs w-8 text-right"
        style={{ color }}
      >
        {value}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function TopBar() {
  const nodeCount           = useArchitectureStore(s => s.nodes.length);
  const autoLayout          = useArchitectureStore(s => s.autoLayout);
  const clearAll            = useArchitectureStore(s => s.clearAll);
  const loadDefault         = useArchitectureStore(s => s.loadDefaultArchitecture);
  const {
    globalMetrics: m, simulationConfig, isRunning,
    startSimulation, stopSimulation, resetSimulation,
    setSpeed, setTrafficLevel, toggleChaosMode,
  } = useSimulationControls();

  return (
    <header
      className="flex items-center justify-between gap-3 px-4 py-2"
      style={{
        flexShrink: 0,
        background: 'rgba(9,9,18,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        minHeight: 52,
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 2px 12px rgba(99,102,241,0.5)' }}>
          <Icons.Network size={15} color="white" />
        </div>
        <div>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>SysArchitect</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>Visual System Designer</p>
        </div>
      </div>

      {/* Live metrics strip */}
      {nodeCount > 0 && isRunning && (
        <div className="hidden lg:flex items-center gap-2">
          <MetricChip label="RPS"     value={rpsLabel(m.totalRps)}          color="#818cf8" icon={<Icons.Activity size={11}     color="#818cf8" />} />
          <MetricChip label="p50"     value={`${Math.round(m.avgLatency)}ms`} color={latencyColor(m.avgLatency)} icon={<Icons.Timer size={11} color="#67e8f9" />} />
          <MetricChip label="p99"     value={`${Math.round(m.p99Latency)}ms`} color={latencyColor(m.p99Latency)} icon={<Icons.TimerReset size={11} color="#a78bfa" />} />
          <MetricChip label="Errors"  value={`${m.errorRate.toFixed(2)}%`}   color={errorColor(m.errorRate)}  icon={<Icons.AlertCircle size={11} color="#f87171" />} />
          <MetricChip label="Cost"    value={`$${m.costPerHour.toFixed(2)}/hr`} color="#4ade80"               icon={<Icons.DollarSign  size={11} color="#4ade80" />} />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Traffic slider */}
        <div className="hidden sm:block">
          <TrafficSlider value={simulationConfig.trafficLevel} onChange={setTrafficLevel} />
        </div>

        {/* Speed selector */}
        <SpeedPill current={simulationConfig.speed} onSelect={setSpeed} />

        {/* Chaos */}
        <GlassButton onClick={toggleChaosMode} title="Chaos Engineering" variant="chaos" active={simulationConfig.isChaosMode}>
          <Icons.Zap size={12} />
          <span className="hidden sm:inline">Chaos</span>
        </GlassButton>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />

        {/* Layout */}
        <GlassButton onClick={autoLayout} title="Auto Layout">
          <Icons.LayoutTemplate size={12} />
          <span className="hidden md:inline">Layout</span>
        </GlassButton>

        {/* Example */}
        <GlassButton onClick={loadDefault} title="Load Example Architecture">
          <Icons.BookOpen size={12} />
          <span className="hidden md:inline">Example</span>
        </GlassButton>

        {/* Clear */}
        <GlassButton onClick={clearAll} title="Clear Canvas" variant="danger">
          <Icons.Trash2 size={12} />
        </GlassButton>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />

        {/* Simulate / Stop */}
        {isRunning ? (
          <GlassButton onClick={stopSimulation} variant="danger" className="px-3">
            <Icons.StopCircle size={13} />
            <span>Stop</span>
          </GlassButton>
        ) : (
          <button
            onClick={startSimulation}
            disabled={nodeCount === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
              nodeCount === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-110 hover:scale-105 active:scale-95'
            }`}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              boxShadow: nodeCount > 0 ? '0 2px 16px rgba(99,102,241,0.5)' : undefined,
            }}
          >
            <Icons.Play size={12} />
            Simulate
          </button>
        )}

        {/* Reset */}
        <GlassButton onClick={resetSimulation} title="Reset Simulation">
          <Icons.RotateCcw size={12} />
        </GlassButton>
      </div>
    </header>
  );
}
