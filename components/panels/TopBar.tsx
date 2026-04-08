'use client';
import React from 'react';
import { useArchitectureStore } from '@/store/architectureStore';
import * as Icons from 'lucide-react';

const SPEEDS = [0.5, 1, 2, 5];

export default function TopBar() {
  const {
    simulation,
    globalMetrics,
    nodes,
    startSimulation,
    stopSimulation,
    resetSimulation,
    setSimulationSpeed,
    setTrafficLevel,
    toggleChaosMode,
    autoLayout,
    clearAll,
    loadDefaultArchitecture,
  } = useArchitectureStore();

  const m = globalMetrics;
  const isRunning = simulation.running;

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0"
      style={{ background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(20px)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Icons.Network size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-sm leading-none">SysArchitect</h1>
          <p className="text-white/35 text-xs">Visual System Designer</p>
        </div>
      </div>

      {/* Live Metrics Strip */}
      {nodes.length > 0 && (
        <div className="hidden md:flex items-center gap-4">
          <MetricChip
            icon={<Icons.Activity size={11} className="text-indigo-400" />}
            label="RPS"
            value={m.totalRps >= 1000 ? `${(m.totalRps / 1000).toFixed(1)}K` : Math.round(m.totalRps).toString()}
            color="#6366f1"
          />
          <MetricChip
            icon={<Icons.Timer size={11} className="text-cyan-400" />}
            label="Latency"
            value={`${Math.round(m.avgLatency)}ms`}
            color={m.avgLatency > 500 ? '#ef4444' : m.avgLatency > 200 ? '#f59e0b' : '#22c55e'}
          />
          <MetricChip
            icon={<Icons.AlertCircle size={11} className="text-red-400" />}
            label="Errors"
            value={`${m.errorRate.toFixed(1)}%`}
            color={m.errorRate > 5 ? '#ef4444' : m.errorRate > 1 ? '#f59e0b' : '#22c55e'}
          />
          <MetricChip
            icon={<Icons.DollarSign size={11} className="text-green-400" />}
            label="Cost"
            value={`$${m.costPerHour.toFixed(2)}/hr`}
            color="#4ade80"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Traffic slider */}
        <div className="hidden sm:flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5">
          <Icons.Waves size={11} className="text-white/40" />
          <span className="text-white/40 text-xs">Traffic</span>
          <input
            type="range"
            min={0}
            max={100}
            value={simulation.trafficLevel}
            onChange={e => setTrafficLevel(Number(e.target.value))}
            className="w-20 accent-indigo-500 h-1"
          />
          <span className="text-white/60 text-xs w-7 font-mono">{simulation.trafficLevel}%</span>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-0.5 bg-white/3 border border-white/8 rounded-lg p-0.5">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSimulationSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                simulation.speed === s
                  ? 'bg-indigo-500 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Chaos toggle */}
        <button
          onClick={toggleChaosMode}
          title="Chaos Mode"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            simulation.chaosMode
              ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
              : 'bg-white/3 border-white/8 text-white/50 hover:border-white/20 hover:text-white/80'
          }`}
        >
          <Icons.Zap size={11} />
          <span className="hidden sm:inline">Chaos</span>
        </button>

        {/* Auto Layout */}
        <button
          onClick={autoLayout}
          title="Auto Layout"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/3 text-white/50 hover:text-white/80 hover:border-white/20 text-xs transition-all"
        >
          <Icons.LayoutTemplate size={11} />
          <span className="hidden sm:inline">Layout</span>
        </button>

        {/* Load Default */}
        <button
          onClick={loadDefaultArchitecture}
          title="Load Example"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/3 text-white/50 hover:text-white/80 hover:border-white/20 text-xs transition-all"
        >
          <Icons.BookOpen size={11} />
          <span className="hidden sm:inline">Example</span>
        </button>

        {/* Clear */}
        <button
          onClick={clearAll}
          title="Clear All"
          className="flex items-center gap-1.5 p-1.5 rounded-lg border border-white/8 bg-white/3 text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
        >
          <Icons.Trash2 size={13} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Play/Stop */}
        {isRunning ? (
          <button
            onClick={stopSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs font-medium transition-all"
          >
            <Icons.Square size={11} />
            Stop
          </button>
        ) : (
          <button
            onClick={startSimulation}
            disabled={nodes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
            }}
          >
            <Icons.Play size={11} />
            Simulate
          </button>
        )}

        {/* Reset */}
        <button
          onClick={resetSimulation}
          title="Reset"
          className="p-1.5 rounded-lg border border-white/8 bg-white/3 text-white/40 hover:text-white/70 transition-all"
        >
          <Icons.RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}

function MetricChip({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5">
      {icon}
      <span className="text-white/40 text-xs">{label}</span>
      <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
