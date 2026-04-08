'use client';
import React, { useRef, useEffect, useMemo } from 'react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { SimulationEvent, EventSeverity, EventType } from '@/domain/entities/SimulationEvent.entity';
import * as Icons from 'lucide-react';

// ── Icon resolver ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ size: number; style?: React.CSSProperties }>> = {
  Skull:           Icons.Skull,
  AlertTriangle:   Icons.AlertTriangle,
  Flame:           Icons.Flame,
  HeartPulse:      Icons.HeartPulse,
  Bomb:            Icons.Bomb,
  RefreshCw:       Icons.RefreshCw,
  ArrowUpCircle:   Icons.ArrowUpCircle,
  ArrowDownCircle: Icons.ArrowDownCircle,
  Zap:             Icons.Zap,
  Shield:          Icons.Shield,
  GitBranch:       Icons.GitBranch,
  Timer:           Icons.Timer,
  XCircle:         Icons.XCircle,
  Play:            Icons.Play,
  Square:          Icons.Square,
};

function getEventIcon(type: EventType): React.ReactNode {
  const iconName = SimulationEvent.TYPE_ICONS[type];
  const Comp = ICON_MAP[iconName];
  if (!Comp) return <Icons.Circle size={12} />;
  return <Comp size={12} />;
}

// ── Severity styling ─────────────────────────────────────────────────────────

const SEVERITY_BG: Record<EventSeverity, string> = {
  info:     'rgba(96,165,250,0.08)',
  warning:  'rgba(251,191,36,0.08)',
  critical: 'rgba(239,68,68,0.10)',
  success:  'rgba(74,222,128,0.08)',
};

const SEVERITY_BORDER: Record<EventSeverity, string> = {
  info:     'rgba(96,165,250,0.15)',
  warning:  'rgba(251,191,36,0.18)',
  critical: 'rgba(239,68,68,0.25)',
  success:  'rgba(74,222,128,0.15)',
};

// ── Time formatter ───────────────────────────────────────────────────────────

function formatSimTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Filter chips ─────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'critical' | 'warning' | 'info' | 'success';

function FilterChip({ mode, active, count, onClick }: {
  mode: FilterMode; active: boolean; count: number; onClick: () => void;
}) {
  const colors: Record<FilterMode, string> = {
    all:      '#818cf8',
    critical: '#ef4444',
    warning:  '#fbbf24',
    info:     '#60a5fa',
    success:  '#4ade80',
  };
  const color = colors[mode];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all"
      style={{
        background: active ? `${color}22` : 'transparent',
        border: `1px solid ${active ? `${color}55` : 'rgba(255,255,255,0.06)'}`,
        color: active ? color : 'rgba(255,255,255,0.35)',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {mode === 'all' ? 'All' : mode.charAt(0).toUpperCase() + mode.slice(1)}
      {count > 0 && (
        <span
          className="rounded-full text-xs font-bold leading-none"
          style={{
            fontSize: 9,
            padding: '1px 4px',
            background: active ? `${color}33` : 'rgba(255,255,255,0.06)',
            color: active ? color : 'rgba(255,255,255,0.3)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event, isNew }: { event: SimulationEvent; isNew: boolean }) {
  const color = SimulationEvent.SEVERITY_COLORS[event.severity];

  return (
    <div
      className={`flex gap-2.5 px-3 py-2 rounded-lg transition-all ${isNew ? 'animate-pulse' : ''}`}
      style={{
        background: SEVERITY_BG[event.severity],
        border: `1px solid ${SEVERITY_BORDER[event.severity]}`,
        marginBottom: 4,
      }}
    >
      {/* Timeline dot + icon */}
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          {getEventIcon(event.type)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {formatSimTime(event.timestamp)}
          </span>
          {event.nodeLabel && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: `${color}15`, color }}
            >
              {event.nodeLabel}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
          {event.message}
        </p>
        {event.details && (
          <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
            {event.details}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function EventLogPanel() {
  const events = useArchitectureStore(s => s.events);
  const isRunning = useArchitectureStore(s => s.simulationConfig.isRunning);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = React.useState<FilterMode>('all');

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const counts = useMemo(() => ({
    all:      events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    warning:  events.filter(e => e.severity === 'warning').length,
    info:     events.filter(e => e.severity === 'info').length,
    success:  events.filter(e => e.severity === 'success').length,
  }), [events]);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter(e => e.severity === filter);
  }, [events, filter]);

  const recentThreshold = events.length > 0
    ? events[events.length - 1]?.timestamp ?? 0
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Icons.ScrollText size={12} style={{ color: '#818cf8' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>
              Event Log
            </span>
            {isRunning && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
            {events.length} events
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {(['all', 'critical', 'warning', 'info', 'success'] as FilterMode[]).map(mode => (
            <FilterChip
              key={mode}
              mode={mode}
              active={filter === mode}
              count={counts[mode]}
              onClick={() => setFilter(mode)}
            />
          ))}
        </div>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pb-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Icons.Radio size={24} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
              {isRunning ? 'Monitoring system events...' : 'Start simulation to see events'}
            </p>
          </div>
        ) : (
          filtered.map((event, i) => (
            <EventRow
              key={event.id}
              event={event}
              isNew={event.timestamp === recentThreshold && i >= filtered.length - 3}
            />
          ))
        )}
      </div>

      {/* Summary bar */}
      {events.length > 0 && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-3 py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,7,14,0.5)' }}
        >
          <div className="flex items-center gap-3 text-xs">
            {counts.critical > 0 && (
              <span className="flex items-center gap-1" style={{ color: '#ef4444' }}>
                <Icons.Skull size={10} /> {counts.critical} crashes
              </span>
            )}
            {counts.warning > 0 && (
              <span className="flex items-center gap-1" style={{ color: '#fbbf24' }}>
                <Icons.AlertTriangle size={10} /> {counts.warning} warnings
              </span>
            )}
            {counts.success > 0 && (
              <span className="flex items-center gap-1" style={{ color: '#4ade80' }}>
                <Icons.HeartPulse size={10} /> {counts.success} recovered
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
