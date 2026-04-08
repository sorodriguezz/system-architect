'use client';
import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { runAdvisor, AdvisorAlert, AlertSeverity, AlertCategory } from '@/domain/services/ArchitectureAdvisor.service';

// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bg: string; border: string; label: string; icon: React.FC<any> }> = {
  critical: { color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   label: 'Critical', icon: Icons.AlertCircle   },
  warning:  { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  label: 'Warning',  icon: Icons.AlertTriangle },
  info:     { color: '#818cf8', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)',  label: 'Info',     icon: Icons.Info          },
  success:  { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)',  label: 'Healthy',  icon: Icons.CheckCircle2  },
};

const CATEGORY_CONFIG: Record<AlertCategory, { label: string; icon: React.FC<any> }> = {
  reliability:   { label: 'Reliability',   icon: Icons.Shield      },
  security:      { label: 'Security',      icon: Icons.Lock        },
  performance:   { label: 'Performance',   icon: Icons.Zap         },
  cost:          { label: 'Cost',          icon: Icons.DollarSign  },
  scalability:   { label: 'Scalability',   icon: Icons.TrendingUp  },
  observability: { label: 'Observability', icon: Icons.Activity    },
  data:          { label: 'Data',          icon: Icons.Database    },
  network:       { label: 'Network',       icon: Icons.Network     },
};

// ─────────────────────────────────────────────────────────────────────────────

export function InsightsPanel() {
  const nodes = useArchitectureStore(s => s.nodes);
  const edges = useArchitectureStore(s => s.edges);

  const alerts = useMemo(() => runAdvisor(nodes, edges), [nodes, edges]);

  const counts = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning:  alerts.filter(a => a.severity === 'warning').length,
    info:     alerts.filter(a => a.severity === 'info').length,
    success:  alerts.filter(a => a.severity === 'success').length,
  }), [alerts]);

  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');

  const visible = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Icons.Lightbulb size={14} color="#818cf8" />
          <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 13 }}>
            Architecture Insights
          </span>
          <span style={{
            marginLeft: 'auto',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#818cf8',
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 10,
          }}>
            {alerts.length} alerts
          </span>
        </div>

        {/* Severity summary bar */}
        <div className="flex gap-1.5">
          {(['all', 'critical', 'warning', 'info', 'success'] as const).map(sev => {
            const isAll    = sev === 'all';
            const cfg      = isAll ? null : SEVERITY_CONFIG[sev];
            const count    = isAll ? alerts.length : counts[sev];
            const active   = filter === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setFilter(sev)}
                style={{
                  flex: 1,
                  padding: '4px 4px',
                  borderRadius: 7,
                  border: active
                    ? `1px solid ${cfg?.color ?? 'rgba(255,255,255,0.3)'}`
                    : '1px solid rgba(255,255,255,0.06)',
                  background: active
                    ? (cfg?.bg ?? 'rgba(255,255,255,0.06)')
                    : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: cfg?.color ?? 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                  {count}
                </span>
                <span style={{ color: cfg?.color ?? 'rgba(255,255,255,0.3)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isAll ? 'All' : cfg!.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Alert list ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {visible.length === 0 && (
          <EmptyInsights />
        )}
        {visible.map(alert => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>

      {/* ── Footer hint ─────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, textAlign: 'center' }}>
          Insights update in real-time as you add nodes and run the simulation
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: AdvisorAlert }) {
  const [open, setOpen] = useState(false);
  const sev   = SEVERITY_CONFIG[alert.severity];
  const cat   = CATEGORY_CONFIG[alert.category];
  const SevIcon = sev.icon;
  const CatIcon = cat.icon;

  return (
    <div style={{
      border: `1px solid ${open ? sev.border : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 10,
      marginBottom: 6,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          padding: '9px 10px',
          background: open ? sev.bg : 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          cursor: 'pointer',
          border: 'none',
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
      >
        <SevIcon size={13} color={sev.color} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
            {alert.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <CatIcon size={9} color="rgba(255,255,255,0.3)" />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cat.label}
            </span>
            {alert.affectedIds.length > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>
                · {alert.affectedIds.length} node{alert.affectedIds.length !== 1 ? 's' : ''} affected
              </span>
            )}
          </div>
        </div>
        <Icons.ChevronDown
          size={11}
          style={{
            color: 'rgba(255,255,255,0.25)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s',
            flexShrink: 0,
            marginTop: 2,
          }}
        />
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: '10px 12px', background: 'rgba(7,7,20,0.6)', borderTop: `1px solid ${sev.border}` }}>

          {/* Description */}
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
            {alert.description}
          </p>

          {/* Fix steps */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icons.Wrench size={10} color={sev.color} />
              <span style={{ color: sev.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                How to fix
              </span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {alert.fix.map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <span style={{
                    flexShrink: 0,
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: `${sev.color}18`,
                    border: `1px solid ${sev.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontWeight: 700,
                    color: sev.color,
                    fontFamily: 'monospace',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, lineHeight: 1.5 }}>
                    {step}
                  </span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}

function EmptyInsights() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, textAlign: 'center' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icons.CheckCircle2 size={20} color="rgba(74,222,128,0.6)" />
      </div>
      <div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>No alerts for this filter</p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 3 }}>Try "All" to see every alert</p>
      </div>
    </div>
  );
}
