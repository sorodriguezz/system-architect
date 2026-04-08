'use client';
import React, { useState } from 'react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { useSelectedNode } from '@/presentation/hooks/useSelectedNode.hook';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';
import { COMPONENT_REGISTRY } from '@/domain/constants/ComponentRegistry.constant';
import {
  LbAlgorithm, DatabaseEngine, QueueBroker,
  StorageProvider, CloudRegion, ServiceTier, NodeType, EdgeProtocol,
} from '@/domain/constants/NodeTypes.constant';
import { Toggle } from '@/presentation/components/atoms/Toggle.atom';
import { Select } from '@/presentation/components/atoms/Select.atom';
import { NumberInput } from '@/presentation/components/atoms/NumberInput.atom';
import { FormRow } from '@/presentation/components/molecules/FormRow.molecule';
import { formatNumber, formatLatency } from '@/lib/formatNumber';
import * as Icons from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────

const SPOF_INFO = {
  title: '⚡ Single Point of Failure',
  what: 'This node has no redundancy. If it fails, the entire system goes down.',
  how: [
    'Increase replicas to ≥ 2',
    'Enable Auto-Scaling',
    'Add a second instance in a different availability zone',
    'Put a Load Balancer in front of it',
  ],
};

const CHAOS_INFO = {
  title: '🔥 Chaos Engineering Active',
  what: 'Artificial failure is being injected into this node to test resilience.',
  actions: ['Kill: simulates a complete node crash', 'Stress: injects high CPU/memory pressure', 'Restore: returns node to normal operation'],
};

const STATUS_INFO: Record<string, { color: string; label: string; description: string }> = {
  healthy:    { color: '#4ade80', label: 'Healthy',    description: 'Node is operating normally within expected parameters.' },
  degraded:   { color: '#fbbf24', label: 'Degraded',   description: 'Performance is reduced. High CPU or elevated error rate detected.' },
  overloaded: { color: '#f87171', label: 'Overloaded', description: 'CPU >95%. Requests are being dropped or significantly delayed.' },
  down:       { color: '#6b7280', label: 'Offline',    description: 'Node is not accepting traffic. Simulate a failure or kill event.' },
  starting:   { color: '#60a5fa', label: 'Starting',   description: 'Node is warming up. Not yet accepting full traffic.' },
};

// ── UI primitives ─────────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12, marginBottom: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-1.5 group"
      >
        <h4 style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </h4>
        <Icons.ChevronDown
          size={12}
          style={{
            color: 'rgba(255,255,255,0.25)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>
      {open && <div className="space-y-2.5 mt-1">{children}</div>}
    </div>
  );
}

function InfoBox({ variant, title, children }: {
  variant: 'warning' | 'error' | 'info'; title: string; children: React.ReactNode;
}) {
  const colors = {
    warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', icon: '#fbbf24' },
    error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  icon: '#f87171' },
    info:    { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)', icon: '#818cf8' },
  };
  const c = colors[variant];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 4 }}>
      <div style={{ color: c.icon, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function MetricBadge({ label, value, color = 'rgba(255,255,255,0.7)' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg p-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', flex: 1 }}>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

function ActionChip({ icon, label, onClick, color = '#818cf8' }: {
  icon: React.ReactNode; label: string; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg transition-all text-xs py-1.5"
      style={{
        background: `${color}12`,
        border: `1px solid ${color}28`,
        color,
        fontWeight: 600,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as any).style.background = `${color}22`; }}
      onMouseLeave={e => { (e.currentTarget as any).style.background = `${color}12`; }}
    >
      {icon} {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function ConfigPanel() {
  const selection    = useSelectedNode();
  const updateNode   = useArchitectureStore(s => s.updateNode);
  const updateConfig = useArchitectureStore(s => s.updateNodeConfig);
  const removeNode   = useArchitectureStore(s => s.removeNode);
  const removeEdge   = useArchitectureStore(s => s.removeEdge);
  const updateEdge   = useArchitectureStore(s => s.updateEdge);
  const killNode     = useArchitectureStore(s => s.killNode);
  const restoreNode  = useArchitectureStore(s => s.restoreNode);
  const overloadNode = useArchitectureStore(s => s.overloadNode);
  const duplicateNode= useArchitectureStore(s => s.duplicateNode);
  const selectNode   = useArchitectureStore(s => s.selectNode);

  if (selection.kind === 'none') return <EmptyState />;
  if (selection.kind === 'edge') {
    return <EdgeConfigPanel entity={selection.entity}
      onUpdate={(p: any) => updateEdge(selection.entity.id, p)}
      onRemove={() => removeEdge(selection.entity.id)}
    />;
  }

  const { entity } = selection;
  const cfg = entity.config;
  const set = (key: string, value: any) => updateConfig(entity.id, { [key]: value });

  const statusInfo = STATUS_INFO[entity.status] ?? STATUS_INFO.healthy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Node header ────────────────────────────────────────────────── */}
      <NodeHeader entity={entity}
        onLabelChange={(label: string) => updateNode(entity.id, { label })}
        onKill={() => killNode(entity.id)}
        onRestore={() => restoreNode(entity.id)}
        onStress={() => overloadNode(entity.id)}
        onClone={() => duplicateNode(entity.id)}
        onDelete={() => { removeNode(entity.id); selectNode(null); }}
      />

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>

        {/* Per-type info card (collapsed by default) */}
        <NodeInfoCard type={entity.type} />

        {/* Status banner */}
        {entity.status !== 'healthy' && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3"
            style={{ background: `${statusInfo.color}10`, border: `1px solid ${statusInfo.color}30` }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: statusInfo.color }} />
            <div>
              <div style={{ color: statusInfo.color, fontSize: 11, fontWeight: 700 }}>{statusInfo.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{statusInfo.description}</div>
            </div>
          </div>
        )}

        {/* SPOF warning */}
        {entity.isSpof && (
          <InfoBox variant="warning" title={SPOF_INFO.title}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 6 }}>{SPOF_INFO.what}</p>
            <ul style={{ paddingLeft: 12, margin: 0 }}>
              {SPOF_INFO.how.map(h => (
                <li key={h} style={{ color: '#fbbf24', fontSize: 10, marginBottom: 2 }}>→ {h}</li>
              ))}
            </ul>
          </InfoBox>
        )}

        {/* Chaos warning */}
        {entity.isChaosActive && (
          <InfoBox variant="error" title={CHAOS_INFO.title}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 4 }}>{CHAOS_INFO.what}</p>
            {CHAOS_INFO.actions.map(a => (
              <div key={a} style={{ color: '#f87171', fontSize: 10, marginBottom: 2 }}>• {a}</div>
            ))}
          </InfoBox>
        )}

        {/* Live metrics row */}
        {entity.metrics.rps > 0 && (() => {
          const isClient = entity.type === 'client';
          const safeErr = Number.isFinite(entity.metrics.errorRate) ? entity.metrics.errorRate : 0;
          return (
            <div className="flex gap-1.5 mb-3">
              <MetricBadge label="RPS" value={formatNumber(entity.metrics.rps)} color="#818cf8" />
              {!isClient && <MetricBadge label="Latency" value={formatLatency(entity.metrics.latency)} color={entity.metrics.latency > 500 ? '#f87171' : entity.metrics.latency > 100 ? '#fbbf24' : '#4ade80'} />}
              <MetricBadge label="CPU" value={`${Math.round(Number.isFinite(entity.metrics.cpuLoad) ? entity.metrics.cpuLoad : 0)}%`} color={entity.metrics.cpuLoad > 80 ? '#f87171' : entity.metrics.cpuLoad > 60 ? '#fbbf24' : '#4ade80'} />
              <MetricBadge label="Errors" value={`${safeErr.toFixed(1)}%`} color={safeErr > 5 ? '#f87171' : safeErr > 1 ? '#fbbf24' : '#4ade80'} />
            </div>
          );
        })()}

        {/* ── General config ─────────────────────────────────────────── */}
        <Section title="Capacity & Scaling">
          <FormRow label="Replicas">
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={20} value={cfg.replicas}
                onChange={e => set('replicas', +e.target.value)}
                className="flex-1 h-1.5 rounded-full cursor-pointer"
                style={{ accentColor: '#6366f1' }}
              />
              <span className="text-xs font-mono font-bold w-5 text-center"
                style={{ color: '#818cf8' }}>{cfg.replicas}</span>
            </div>
          </FormRow>
          <FormRow label="Max RPS per replica">
            <NumberInput value={cfg.maxRps} onChange={v => set('maxRps', v)} min={10} max={1000000} step={100} />
          </FormRow>
          <div className="flex items-center justify-between">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Auto-Scaling</span>
            <Toggle value={cfg.autoscaling} onChange={v => set('autoscaling', v)} />
          </div>
          {cfg.autoscaling && (
            <div className="flex gap-2">
              <FormRow label="Min">
                <NumberInput value={cfg.minReplicas} onChange={v => set('minReplicas', v)} min={1} max={10} />
              </FormRow>
              <FormRow label="Max">
                <NumberInput value={cfg.maxReplicas} onChange={v => set('maxReplicas', v)} min={1} max={100} />
              </FormRow>
            </div>
          )}
        </Section>

        <Section title="Reliability">
          <FormRow label="Timeout (ms)">
            <NumberInput value={cfg.timeoutMs} onChange={v => set('timeoutMs', v)} min={100} max={300000} step={500} />
          </FormRow>
          <FormRow label="Retries on failure">
            <NumberInput value={cfg.retries} onChange={v => set('retries', v)} min={0} max={10} />
          </FormRow>
          <div className="flex items-center justify-between">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>SSL / TLS</span>
            <Toggle value={cfg.sslEnabled} onChange={v => set('sslEnabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Auth Required</span>
            <Toggle value={cfg.authEnabled} onChange={v => set('authEnabled', v)} />
          </div>
        </Section>

        <Section title="Deployment">
          <FormRow label="Region">
            <Select value={cfg.region} onChange={v => set('region', v)} options={Object.values(CloudRegion)} />
          </FormRow>
          <FormRow label="Service Tier">
            <Select value={cfg.tier} onChange={v => set('tier', v)} options={Object.values(ServiceTier)} />
          </FormRow>
        </Section>

        {/* ── Type-specific configs ───────────────────────────────────── */}
        <TypeSpecificConfig entity={entity} set={set} />

        {/* Notes */}
        <Section title="Notes" defaultOpen={false}>
          <textarea
            value={entity.notes}
            onChange={e => updateNode(entity.id, { notes: e.target.value })}
            placeholder="Document assumptions, trade-offs, links..."
            rows={4}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 11,
              color: 'rgba(255,255,255,0.65)',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </Section>
      </div>
    </div>
  );
}

// ── Type-specific panels ───────────────────────────────────────────────────────

function TypeSpecificConfig({ entity, set }: { entity: any; set: (k: string, v: any) => void }) {
  const cfg = entity.config;
  const t   = entity.type;

  if (t === NodeType.LOAD_BALANCER) return (
    <Section title="Load Balancer Strategy">
      <FormRow label="Algorithm">
        <Select value={cfg.lbAlgorithm ?? 'round-robin'} onChange={v => set('lbAlgorithm', v)} options={Object.values(LbAlgorithm)} />
      </FormRow>
      <AlgorithmExplainer algorithm={cfg.lbAlgorithm ?? 'round-robin'} />
    </Section>
  );

  if (t === NodeType.DATABASE) return (
    <Section title="Database Engine">
      <FormRow label="Engine">
        <Select value={cfg.dbEngine ?? 'postgres'} onChange={v => set('dbEngine', v)} options={Object.values(DatabaseEngine)} />
      </FormRow>
      <DbExplainer engine={cfg.dbEngine ?? 'postgres'} />
      <FormRow label="Max connections">
        <NumberInput value={cfg.maxRps} onChange={v => set('maxRps', v)} min={5} max={5000} step={5} />
      </FormRow>
    </Section>
  );

  if (t === NodeType.CACHE) return (
    <Section title="Cache Configuration">
      <FormRow label="Target hit rate (%)">
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={cfg.cacheHitRate ?? 85}
            onChange={e => set('cacheHitRate', +e.target.value)}
            className="flex-1 cursor-pointer" style={{ accentColor: '#f97316' }} />
          <span className="font-mono font-bold text-xs" style={{ color: '#fb923c', width: 32, textAlign: 'right' }}>
            {cfg.cacheHitRate ?? 85}%
          </span>
        </div>
      </FormRow>
      <CacheImpactNote hitRate={cfg.cacheHitRate ?? 85} />
    </Section>
  );

  if (t === NodeType.QUEUE) return (
    <Section title="Message Broker">
      <FormRow label="Broker">
        <Select value={cfg.queueBroker ?? 'kafka'} onChange={v => set('queueBroker', v)} options={Object.values(QueueBroker)} />
      </FormRow>
      <BrokerExplainer broker={cfg.queueBroker ?? 'kafka'} />
    </Section>
  );

  if (t === NodeType.STORAGE) return (
    <Section title="Object Storage">
      <FormRow label="Provider">
        <Select value={cfg.storageProvider ?? 's3'} onChange={v => set('storageProvider', v)} options={Object.values(StorageProvider)} />
      </FormRow>
    </Section>
  );

  if (t === NodeType.CDN) return (
    <Section title="CDN Configuration">
      <FormRow label="Cache hit rate (%)">
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={cfg.cacheHitRate ?? 90}
            onChange={e => set('cacheHitRate', +e.target.value)}
            className="flex-1 cursor-pointer" style={{ accentColor: '#3b82f6' }} />
          <span className="font-mono font-bold text-xs" style={{ color: '#60a5fa', width: 32, textAlign: 'right' }}>
            {cfg.cacheHitRate ?? 90}%
          </span>
        </div>
      </FormRow>
      <InfoNote text={`At ${cfg.cacheHitRate ?? 90}% hit rate, only ${100 - (cfg.cacheHitRate ?? 90)}% of requests reach your origin servers.`} />
    </Section>
  );

  if (t === NodeType.CIRCUIT_BREAKER) return (
    <Section title="Circuit Breaker">
      <InfoBox variant="info" title="ℹ️ Circuit Breaker Pattern">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
          When downstream services fail, the circuit opens and returns cached/fallback responses immediately,
          preventing cascading failures. Closes again after a cool-down period.
        </p>
      </InfoBox>
      <FormRow label="Error threshold (%)">
        <NumberInput value={cfg.maxRps} onChange={v => set('maxRps', v)} min={10} max={100} step={5} />
      </FormRow>
    </Section>
  );

  if (t === NodeType.SERVICE_MESH) return (
    <Section title="Service Mesh">
      <InfoBox variant="info" title="ℹ️ Service Mesh">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
          Adds mTLS, observability, traffic shaping and retry logic between services.
          Istio / Linkerd run as sidecar proxies with ~1–2ms overhead per hop.
        </p>
      </InfoBox>
      <div className="flex items-center justify-between">
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>mTLS between services</span>
        <Toggle value={cfg.sslEnabled} onChange={v => set('sslEnabled', v)} />
      </div>
    </Section>
  );

  if (t === NodeType.API_GATEWAY) return (
    <Section title="API Gateway">
      <div className="flex items-center justify-between">
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Rate Limiting</span>
        <Toggle value={cfg.authEnabled} onChange={v => set('authEnabled', v)} />
      </div>
      <FormRow label="Max RPS limit">
        <NumberInput value={cfg.maxRps} onChange={v => set('maxRps', v)} min={10} max={1000000} step={100} />
      </FormRow>
    </Section>
  );

  if (t === NodeType.MONITOR) return (
    <Section title="Monitoring & Observability">
      <InfoBox variant="info" title="ℹ️ Observability Stack">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
          Collects metrics (Prometheus), logs (Loki/ELK), and traces (Jaeger/Zipkin).
          Alert rules trigger when error rate or latency exceeds thresholds.
        </p>
      </InfoBox>
    </Section>
  );

  if (t === NodeType.AUTH) return (
    <Section title="Auth Service">
      <InfoBox variant="info" title="ℹ️ Auth Patterns">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
          JWT tokens validated in-process (~1ms) vs OAuth introspection calls (~20ms).
          Cache verified tokens to reduce Auth Service load by up to 95%.
        </p>
      </InfoBox>
    </Section>
  );

  if (t === NodeType.PAYMENT) return (
    <Section title="Payment Gateway">
      <InfoBox variant="warning" title="⚠️ PCI DSS Compliance">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
          Payment processing requires PCI DSS compliance. Never store raw card data.
          Use hosted payment pages or tokenization (Stripe, Adyen).
          Add WAF + DDoS protection upstream.
        </p>
      </InfoBox>
    </Section>
  );

  return null;
}

// ── Explainer sub-components ───────────────────────────────────────────────────

const LB_ALGO_INFO: Record<string, string> = {
  'round-robin':       'Distributes requests evenly. Best when servers have equal capacity.',
  'least-connections': 'Routes to the server with fewest active connections. Ideal for variable request durations.',
  'ip-hash':           'Same client IP always hits the same server. Useful for stateful sessions (not recommended for stateless APIs).',
  'random':            'Picks a server at random. Simplest, works well when all servers are equally healthy.',
  'weighted':          'Assigns different proportions of traffic. Use when servers have different capacity.',
};

function AlgorithmExplainer({ algorithm }: { algorithm: string }) {
  return <InfoNote text={LB_ALGO_INFO[algorithm] ?? ''} />;
}

const DB_INFO: Record<string, string> = {
  postgres:  'ACID transactions, JSON support, excellent for relational data. Max ~3–5K concurrent connections.',
  mysql:     'Widely supported, high read throughput. Use read replicas for scaling reads.',
  mongodb:   'Document model, horizontal sharding, flexible schema. High write throughput.',
  redis:     'In-memory, <1ms latency. Use for sessions, caches, leaderboards. Not for primary data store.',
  cassandra: 'Multi-region write, linearly scalable. Eventual consistency. Best for time-series / IoT.',
  dynamodb:  'Fully managed, serverless scaling. Best for key-value patterns at AWS scale.',
};

function DbExplainer({ engine }: { engine: string }) {
  return <InfoNote text={DB_INFO[engine] ?? ''} />;
}

const BROKER_INFO: Record<string, string> = {
  kafka:     'High-throughput, ordered, durable. Millions of events/sec. Best for event sourcing, audit logs.',
  rabbitmq:  'Flexible routing (fanout, topic, direct). Good for task queues, RPC patterns.',
  sqs:       'AWS managed, serverless, at-least-once delivery. Best for decoupled AWS workloads.',
  pubsub:    'GCP managed, global scale, push/pull. Good for fan-out notification patterns.',
  nats:      'Ultra-low latency (<1ms). Lightweight, great for microservice meshes.',
};

function BrokerExplainer({ broker }: { broker: string }) {
  return <InfoNote text={BROKER_INFO[broker] ?? ''} />;
}

function CacheImpactNote({ hitRate }: { hitRate: number }) {
  const originLoad = 100 - hitRate;
  const latSaving  = Math.round(hitRate * 0.4);
  return (
    <InfoNote text={`${hitRate}% hit rate → ${originLoad}% of requests reach the database. Estimated ~${latSaving}% latency reduction on cached paths.`} />
  );
}

function InfoNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px', margin: '4px 0 0' }}>
      {text}
    </p>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icons.MousePointerClick size={22} color="rgba(99,102,241,0.6)" />
      </div>
      <div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600 }}>Select a component</p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>Click any node or edge on the canvas to configure it</p>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 8, width: '100%' }}>
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { dot: '#4ade80', label: 'Healthy',    desc: 'Operating normally' },
    { dot: '#fbbf24', label: 'Degraded',   desc: 'High CPU or errors' },
    { dot: '#f87171', label: 'Overloaded', desc: 'CPU >95%, dropping reqs' },
    { dot: '#6b7280', label: 'Down',       desc: 'Node crashed / killed' },
    { dot: '#fbbf24', label: 'SPOF',       desc: 'Single Point of Failure', badge: true },
    { dot: '#f87171', label: 'Chaos',      desc: 'Artificial failure injected', badge: true },
  ];
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Legend</p>
      <div className="space-y-1.5">
        {items.map(it => (
          <div key={it.label} className="flex items-center gap-2">
            {it.badge
              ? <span style={{ fontSize: 9, fontWeight: 700, background: it.dot, color: it.dot === '#fbbf24' ? '#000' : '#fff', borderRadius: 4, padding: '1px 5px' }}>{it.label.toUpperCase()}</span>
              : <div style={{ width: 8, height: 8, borderRadius: '50%', background: it.dot, boxShadow: `0 0 6px ${it.dot}` }} />
            }
            {!it.badge && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, minWidth: 70 }}>{it.label}</span>}
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{it.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Node header ───────────────────────────────────────────────────────────────

function NodeHeader({ entity, onLabelChange, onKill, onRestore, onStress, onClone, onDelete }: any) {
  const color      = SimulationConstants.COLOR_BY_TYPE[entity.type] || '#6366f1';
  const iconName   = SimulationConstants.ICON_BY_TYPE[entity.type]  || 'Server';
  const IconComp   = (Icons as any)[iconName];
  const desc       = COMPONENT_REGISTRY.find(c => c.type === entity.type)?.description ?? '';
  const costPerHr  = SimulationConstants.COST_PER_HOUR_BY_TYPE[entity.type] ?? 0;
  const costSource = SimulationConstants.COST_SOURCE_BY_TYPE[entity.type] ?? '';
  const replicas   = entity.config?.replicas ?? 1;
  const totalCost  = (costPerHr * replicas).toFixed(3);

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px', background: `linear-gradient(135deg, ${color}10, transparent)` }}>
      {/* Icon + label row */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20`, border: `1px solid ${color}40`, boxShadow: `0 0 14px ${color}30` }}>
          {IconComp && <IconComp size={16} style={{ color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <input type="text" value={entity.label} onChange={e => onLabelChange(e.target.value)}
            style={{ background: 'transparent', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', borderBottom: '1px solid transparent', outline: 'none', width: '100%', padding: 0 }}
            onFocus={e => { (e.target as any).style.borderBottomColor = 'rgba(255,255,255,0.2)'; }}
            onBlur ={e => { (e.target as any).style.borderBottomColor = 'transparent'; }}
          />
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }} className="truncate">{desc}</div>
        </div>
      </div>

      {/* Cost chip */}
      {costPerHr > 0 && (
        <div className="flex items-center gap-1.5 mb-2.5"
          title={`Based on ${costSource} pricing (us-east-1, Apr 2025)`}>
          <Icons.DollarSign size={10} color="#34d399" />
          <span style={{ color: '#34d399', fontSize: 10, fontWeight: 700 }}>${totalCost}/hr</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>× {replicas} replica{replicas !== 1 ? 's' : ''}</span>
          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9, marginLeft: 2 }}>· {costSource}</span>
        </div>
      )}

      {/* Action row */}
      <div className="flex gap-1.5">
        <ActionChip icon={<Icons.Copy size={10} />}       label="Clone"   onClick={onClone}  color="#818cf8" />
        {entity.status === 'down'
          ? <ActionChip icon={<Icons.PlayCircle size={10} />} label="Restore" onClick={onRestore} color="#4ade80" />
          : <ActionChip icon={<Icons.XCircle size={10} />}    label="Kill"    onClick={onKill}    color="#f87171" />
        }
        <ActionChip icon={<Icons.Flame size={10} />}     label="Stress"  onClick={onStress} color="#fb923c" />
        <button onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <Icons.Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Edge config panel ─────────────────────────────────────────────────────────

function EdgeConfigPanel({ entity, onUpdate, onRemove }: any) {
  return (
    <div style={{ padding: 12 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 13 }}>Connection Config</h3>
        <button onClick={onRemove} style={{ color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <Icons.Trash2 size={14} />
        </button>
      </div>
      <div className="space-y-3">
        <FormRow label="Protocol">
          <Select value={entity.protocol} onChange={v => onUpdate({ protocol: v })} options={Object.values(EdgeProtocol)} />
        </FormRow>
        <FormRow label="Encrypted (TLS)">
          <Toggle value={entity.isEncrypted} onChange={v => onUpdate({ isEncrypted: v })} />
        </FormRow>
        <InfoBox variant="info" title="ℹ️ Protocol Guide">
          <ProtocolExplainer protocol={entity.protocol} />
        </InfoBox>
      </div>
    </div>
  );
}

const PROTO_INFO: Record<string, string> = {
  https:     'Encrypted HTTP/1.1 or HTTP/2. Standard for external-facing APIs. ~0.5ms TLS overhead.',
  http:      'Unencrypted. Acceptable only for internal service-to-service on a trusted network.',
  grpc:      'HTTP/2 + Protocol Buffers. ~30% less bandwidth, supports streaming. Best for microservice RPC.',
  tcp:       'Raw TCP. Used by databases (Postgres, MySQL), Redis, Kafka. Very low overhead.',
  websocket: 'Persistent bidirectional connection over HTTP. Best for real-time features (chat, live updates).',
  amqp:      'AMQP 0-9-1 used by RabbitMQ. Flexible routing, acknowledgements, dead-letter queues.',
  redis:     'Redis Serialization Protocol (RESP). Ultra-fast binary protocol, <1ms round-trip in LAN.',
};

function ProtocolExplainer({ protocol }: { protocol: string }) {
  return <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{PROTO_INFO[protocol] ?? ''}</p>;
}

// ── Per-node info knowledge base ─────────────────────────────────────────────

interface NodeInfoEntry {
  what:      string;           // 1-sentence summary
  purpose:   string;          // what problem it solves
  examples:  string[];        // real-world services
  tips:      string[];        // configuration / best-practice tips
  costBasis: string;          // where the $$/hr number comes from
  perf:      string;          // performance characteristic
}

const NODE_INFO: Partial<Record<string, NodeInfoEntry>> = {
  [NodeType.CLIENT]: {
    what:      'Represents end-users accessing your system via browser or mobile app.',
    purpose:   'The origin of all traffic. Not a deployable service — a traffic source.',
    examples:  ['Web browser', 'iOS / Android app', 'Desktop client', 'Partner API consumer'],
    tips:      ['Increase Users count to simulate load', 'Connect to DNS, CDN or API Gateway as first hop'],
    costBasis: 'No cloud cost — this node represents user devices.',
    perf:      'No latency — traffic originates here.',
  },
  [NodeType.DNS]: {
    what:      'Translates domain names to IP addresses before any HTTP connection is made.',
    purpose:   'Single global resolver that routes traffic to the correct region or load balancer.',
    examples:  ['AWS Route 53 (~$0.50/zone/month + $0.40/M queries)', 'Cloudflare DNS (free)', 'Google Cloud DNS'],
    tips:      ['Use low TTLs (60s) for fast failover', 'Enable health checks for latency-based routing', 'GeoDNS routes users to nearest region'],
    costBasis: '~AWS Route 53: $0.50/hosted zone + $0.40/million queries ≈ $0.01/hr for moderate traffic.',
    perf:      'Adds 10–50 ms on first connection; cached by OS/browser for subsequent requests.',
  },
  [NodeType.CDN]: {
    what:      'Serves static assets (JS, CSS, images, video) from edge nodes close to users.',
    purpose:   'Reduces origin server load and cuts latency for users globally.',
    examples:  ['Cloudflare ($0.01–0.08/GB)', 'AWS CloudFront ($0.0085–0.12/GB)', 'Fastly', 'Akamai'],
    tips:      ['Set long Cache-Control headers (1 year) for immutable assets', 'Use cache-busting filenames instead of short TTLs', 'Enable Brotli/gzip compression at the edge'],
    costBasis: '~Cloudflare Pro/Business: $0.01–0.08/GB egress. Simulated at ~$0.08/hr per PoP equivalent.',
    perf:      '5–30ms latency from edge (vs 80–200ms from origin). Handles 50K+ RPS per edge node.',
  },
  [NodeType.WAF]: {
    what:      'Inspects HTTP traffic and blocks malicious requests before they reach your app.',
    purpose:   'Stops SQLi, XSS, DDoS L7 attacks, bot traffic and OWASP Top 10 threats.',
    examples:  ['AWS WAF ($5/WebACL/month + $1/M requests)', 'Cloudflare WAF', 'Imperva', 'ModSecurity'],
    tips:      ['Enable OWASP core rule set', 'Rate-limit by IP to block credential stuffing', 'Review false positives in audit mode before blocking mode'],
    costBasis: '~AWS WAF: $5/WebACL/month + $1/million requests ≈ $0.05/hr for high-traffic sites.',
    perf:      'Adds 1–5ms overhead per request. Worth the cost for public-facing services.',
  },
  [NodeType.LOAD_BALANCER]: {
    what:      'Distributes incoming requests evenly across multiple backend instances.',
    purpose:   'Prevents single-server overload, enables zero-downtime deploys and horizontal scaling.',
    examples:  ['AWS ALB (~$0.018/hr + $0.008/LCU)', 'AWS NLB (~$0.006/LCU)', 'NGINX', 'HAProxy', 'GCP Cloud LB'],
    tips:      ['Use health checks to remove unhealthy nodes instantly', 'Enable sticky sessions only if truly stateful', 'Prefer Layer 7 (ALB) for HTTP; Layer 4 (NLB) for TCP/UDP'],
    costBasis: '~AWS ALB: $0.018/hr base + $0.008/LCU. Estimated $0.02–0.05/hr for typical API traffic.',
    perf:      '<1ms added latency. Scales to millions of requests/sec with multiple LCU.',
  },
  [NodeType.API_GATEWAY]: {
    what:      'Central entry point for all API calls — handles routing, auth, rate limiting and transforms.',
    purpose:   'Decouples clients from backend services; enforces policies in one place.',
    examples:  ['AWS API Gateway (~$3.50/million calls)', 'Kong ($0.04/hr + usage)', 'Apigee', 'Traefik'],
    tips:      ['Enable caching at the Gateway layer to cut downstream load by 80%+', 'Use JWT validation at the Gateway, not inside every microservice', 'Implement circuit breakers per route'],
    costBasis: '~AWS API GW HTTP API: $1/million requests. REST API: $3.50/million. Estimated $0.04/hr.',
    perf:      '5–15ms added latency. Cacheable responses can be <1ms.',
  },
  [NodeType.APP_SERVER]: {
    what:      'Runs your core application logic — handles business rules and orchestrates services.',
    purpose:   'The heart of your system. Processes requests, calls databases and downstream APIs.',
    examples:  ['AWS EC2 t3.medium ($0.0416/hr)', 'ECS Fargate (vCPU $0.04/hr)', 'GCP e2-medium ($0.033/hr)', 'Node.js / Go / Java / Python'],
    tips:      ['Keep stateless — store sessions in Redis, not in-memory', 'Run ≥2 replicas for HA', 'Profile under load: 70% CPU is the knee of the latency curve'],
    costBasis: '~AWS EC2 t3.medium: $0.0416/hr (on-demand). Savings Plans reduce by ~30%.',
    perf:      '20–80ms typical response time. Scales linearly with replicas up to database bottleneck.',
  },
  [NodeType.MICROSERVICE]: {
    what:      'Small, independently deployable service owning a single bounded context.',
    purpose:   'Enables teams to deploy independently, scale per-service and choose different tech stacks.',
    examples:  ['User Service', 'Order Service', 'Notification Service', 'AWS Lambda ($0.0000166667/GB-second)'],
    tips:      ['Define clear API contracts (OpenAPI/Protobuf) between services', 'Avoid synchronous chains >3 hops — use events/queues instead', 'Each service should own its own database (no shared DB)'],
    costBasis: '~AWS ECS Fargate 0.25vCPU/0.5GB: ~$0.0127/hr. Similar to App Server at smaller compute.',
    perf:      '15–50ms typical. Network hops between services add 1–5ms each on same VPC.',
  },
  [NodeType.CACHE]: {
    what:      'In-memory key-value store for frequently read data — eliminates redundant DB queries.',
    purpose:   'Reduces database load by 80–95%, cuts latency from 50ms to <1ms for cached data.',
    examples:  ['AWS ElastiCache Redis (cache.t3.micro $0.017/hr)', 'Upstash Redis ($0.20/100K commands)', 'Memcached', 'Valkey'],
    tips:      ['Target 85–95% hit rate — below 70% means your key strategy needs work', 'Set appropriate TTLs — too long = stale data; too short = low hit rate', 'Use cache-aside pattern; write-through for critical data'],
    costBasis: '~AWS ElastiCache cache.r6g.large: $0.166/hr. cache.t3.micro: $0.017/hr for dev/test.',
    perf:      '<0.5ms read latency in LAN. 100K+ ops/sec per node. Dramatically reduces P99.',
  },
  [NodeType.DATABASE]: {
    what:      'Persistent structured data store — source of truth for all application state.',
    purpose:   'Durable, ACID-compliant storage with query capabilities and indexing.',
    examples:  ['AWS RDS PostgreSQL db.t3.medium ($0.068/hr)', 'PlanetScale', 'Neon', 'MongoDB Atlas ($0.09/hr M10)'],
    tips:      ['Add read replicas to scale reads independently from writes', 'Index all foreign keys and columns used in WHERE/ORDER BY', 'Connection pooling (PgBouncer) is essential beyond 100 concurrent users'],
    costBasis: '~AWS RDS db.t3.medium PostgreSQL: $0.068/hr. Multi-AZ doubles cost. Aurora is ~10% more.',
    perf:      '5–20ms simple queries, 50–500ms complex joins. Max ~3K–5K concurrent connections.',
  },
  [NodeType.QUEUE]: {
    what:      'Async message broker that decouples producers from consumers.',
    purpose:   'Absorbs traffic spikes, enables reliable background processing and event-driven patterns.',
    examples:  ['AWS SQS ($0.40/million messages)', 'Apache Kafka ($0.04/hr self-hosted)', 'RabbitMQ', 'GCP Pub/Sub'],
    tips:      ['Use dead-letter queues (DLQ) to handle poison messages', 'Set message visibility timeout > max processing time', 'Kafka is best for ordered, replayable event logs; SQS for simple task queues'],
    costBasis: '~AWS SQS: $0.40/million messages. MSK (managed Kafka): ~$0.21/broker/hr.',
    perf:      'Publish: <5ms. Consume: <10ms. Kafka handles 1M+ events/sec per broker.',
  },
  [NodeType.WORKER]: {
    what:      'Background job processor that consumes tasks from a queue asynchronously.',
    purpose:   'Handles CPU-intensive or slow work (emails, image processing, reports) off the request path.',
    examples:  ['AWS Lambda ($0.0000166667/GB-second)', 'ECS Fargate worker', 'Celery + Redis', 'BullMQ + Node.js'],
    tips:      ['Scale workers based on queue depth, not CPU/memory', 'Implement idempotency — workers may process the same message twice', 'Set concurrency limits per worker to avoid DB connection exhaustion'],
    costBasis: '~AWS Lambda: $0.20/million invocations + $0.0000166667/GB-second. EC2 t3.small ~$0.021/hr.',
    perf:      '30–300ms typical job. Scale-out is linear — double workers = double throughput.',
  },
  [NodeType.STORAGE]: {
    what:      'Object storage for unstructured files — images, videos, backups, logs.',
    purpose:   'Infinitely scalable, durable (11 nines) storage separate from compute.',
    examples:  ['AWS S3 ($0.023/GB-month + $0.0004/1K GET)', 'GCS ($0.020/GB)', 'Cloudflare R2 (no egress fees)', 'Azure Blob'],
    tips:      ['Always serve user-facing files through a CDN, never directly from S3', 'Use S3 lifecycle rules to move cold data to Glacier (~$0.004/GB)', 'Enable versioning for user-uploaded content'],
    costBasis: '~AWS S3: $0.023/GB-month storage + $0.09/GB egress. Simulated at ~$0.02/hr for typical usage.',
    perf:      'First byte: 50–200ms. Throughput: up to 5500 GET/sec per prefix with no configuration.',
  },
  [NodeType.SERVICE_MESH]: {
    what:      'Infrastructure layer that manages all service-to-service communication.',
    purpose:   'Adds mTLS, distributed tracing, traffic policies and observability without app code changes.',
    examples:  ['Istio (sidecar Envoy proxy)', 'Linkerd (~$0.03/hr compute overhead)', 'AWS App Mesh', 'Consul Connect'],
    tips:      ['Start with observability-only mode before enabling mTLS to avoid breaking changes', 'Sidecar proxies add ~1-2ms per hop and ~50MB RAM per pod', 'Use traffic splitting for canary deployments (e.g. 5% → new version)'],
    costBasis: '~Istio control plane: ~0.5 vCPU / 2GB RAM. Sidecar overhead ≈ $0.03/hr across cluster.',
    perf:      '1–2ms added per service hop. Enables zero-trust networking without application changes.',
  },
  [NodeType.CIRCUIT_BREAKER]: {
    what:      'Detects downstream failures and stops sending traffic to prevent cascading crashes.',
    purpose:   'When error rate exceeds a threshold, the circuit "opens" and returns fallback responses.',
    examples:  ['Hystrix (Netflix OSS)', 'Resilience4j (Java)', 'Polly (.NET)', 'Built-in in Istio/Linkerd'],
    tips:      ['Set error threshold at 50%+ over a 10-second window to avoid false trips', 'Half-open state: allow 1 test request before fully closing the circuit', 'Define fallback responses — cache, default value or friendly error'],
    costBasis: 'No direct cloud cost — runs as library code inside your services or as a sidecar.',
    perf:      '<1ms overhead when circuit is closed. Returns instantly (0ms) when open (fallback path).',
  },
  [NodeType.SEARCH]: {
    what:      'Full-text search and analytics engine with inverted index for sub-second queries.',
    purpose:   'Powers search bars, log analytics, recommendation engines and faceted filtering.',
    examples:  ['AWS OpenSearch ($0.12/hr m5.large.search)', 'Elastic Cloud ($0.12+/hr)', 'Meilisearch ($0.07/hr)', 'Typesense'],
    tips:      ['Use write-through indexing — index on every DB write, not batch jobs', 'Tune replicas/shards for your document count (1 shard per 20–50GB)', 'Avoid wildcard-prefix queries — they disable index usage'],
    costBasis: '~AWS OpenSearch m5.large: $0.12/hr. Elastic Cloud 4GB RAM cluster: ~$0.12/hr on GCP.',
    perf:      '5–30ms full-text queries. Handles millions of documents. Scales writes with replica count.',
  },
  [NodeType.MONITOR]: {
    what:      'Observability stack collecting metrics, logs and distributed traces.',
    purpose:   'Without monitoring you are flying blind — needed to detect, diagnose and alert on issues.',
    examples:  ['Datadog (~$15/host/month ≈ $0.02/hr)', 'Grafana + Prometheus (self-hosted)', 'New Relic', 'AWS CloudWatch'],
    tips:      ['Define SLOs (99.9% availability, P99 <500ms) before setting alerts', 'Alert on symptoms (error rate, latency) not causes (CPU %)', 'Retain raw metrics for 15 days; downsampled for 1 year'],
    costBasis: '~Datadog Infrastructure: $15/host/month ≈ $0.02/hr. Prometheus self-hosted: compute only.',
    perf:      'Scrape interval 15–60s. Alerting latency 30–90s. Near-zero impact on observed services.',
  },
  [NodeType.AUTH]: {
    what:      'Handles authentication (who are you?) and authorization (what can you do?).',
    purpose:   'Centralizes identity management, token issuance and access policies.',
    examples:  ['Auth0 ($0.0055/MAU free up to 7K)', 'AWS Cognito ($0.0055/MAU)', 'Keycloak (self-hosted)', 'Supabase Auth (free up to 50K MAU)'],
    tips:      ['Validate JWTs locally (~0.1ms) instead of introspection calls (~20ms) — cache public keys', 'Use short-lived access tokens (15min) + long refresh tokens (7 days)', 'Add MFA for admin routes; skip for low-risk reads'],
    costBasis: '~Auth0/Cognito: $0.0055/MAU beyond free tier. For high-MAU, self-hosted Keycloak is cheaper.',
    perf:      'JWT validation: <1ms. Token issuance (login): 50–150ms. Cache tokens on client to avoid re-auth.',
  },
  [NodeType.EMAIL]: {
    what:      'Transactional email delivery service for notifications, receipts and alerts.',
    purpose:   'Reliable email requires dedicated infrastructure — ISP reputation and deliverability matter.',
    examples:  ['AWS SES ($0.10/1K emails)', 'SendGrid ($0.0006/email on Pro)', 'Postmark ($1.25/1K)', 'Resend ($0.80/1K)'],
    tips:      ['Always send from a verified domain with SPF + DKIM + DMARC records', 'Use separate IP pools for transactional vs marketing emails', 'Bounce rate >5% will get your domain blacklisted'],
    costBasis: '~AWS SES: $0.10/1,000 emails + $0.12/GB attachments. Simulated at ~$0.02/hr for active systems.',
    perf:      '50–200ms to send via API. Delivery to inbox: 1–30 seconds. Bulk sending is rate-limited.',
  },
  [NodeType.PAYMENT]: {
    what:      'Payment processing integration for card charges, subscriptions and payouts.',
    purpose:   'Handles PCI DSS compliance, fraud detection, 3DS authentication and currency conversion.',
    examples:  ['Stripe (2.9% + $0.30/charge)', 'Adyen (0.3% + €0.13/charge)', 'Braintree (2.59% + $0.49)', 'PayPal'],
    tips:      ['Never store raw card data — use hosted fields or Stripe Elements only', 'Implement idempotency keys to prevent duplicate charges on retries', 'Use Stripe Radar or similar for ML fraud scoring'],
    costBasis: '~Stripe: 2.9% + $0.30/transaction — no monthly fee. Infrastructure cost ~$0.05/hr for gateway proxy.',
    perf:      '120–800ms per charge (includes fraud scoring + 3DS). Webhook delivery: 1–10 seconds.',
  },
};

// ── NodeInfoCard — collapsible per-type description ───────────────────────────

function NodeInfoCard({ type }: { type: string }) {
  const [open, setOpen] = useState(false);
  const info = NODE_INFO[type];
  if (!info) return null;

  return (
    <div style={{
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          background: open ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)',
          padding: '7px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          border: 'none',
          transition: 'background 0.15s',
        }}
      >
        <Icons.BookOpen size={11} color="#818cf8" />
        <span style={{ color: '#818cf8', fontSize: 11, fontWeight: 600, flex: 1, textAlign: 'left' }}>
          What is this? How to configure it
        </span>
        <Icons.ChevronDown
          size={11}
          style={{
            color: 'rgba(129,140,248,0.6)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {/* Content */}
      {open && (
        <div style={{ padding: '10px 12px', background: 'rgba(7,7,20,0.6)', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* What it is */}
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 1.6, margin: 0 }}>
            {info.what}
          </p>

          {/* Purpose */}
          <div>
            <span style={{ color: 'rgba(99,102,241,0.8)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why use it</span>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 1.5, margin: '3px 0 0' }}>{info.purpose}</p>
          </div>

          {/* Performance */}
          <div>
            <span style={{ color: 'rgba(99,102,241,0.8)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance</span>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 1.5, margin: '3px 0 0' }}>{info.perf}</p>
          </div>

          {/* Real services */}
          <div>
            <span style={{ color: 'rgba(99,102,241,0.8)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Real-world services</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginTop: 4 }}>
              {info.examples.map(ex => (
                <span key={ex} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {ex}
                </span>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div>
            <span style={{ color: 'rgba(99,102,241,0.8)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Config tips</span>
            <ul style={{ margin: '4px 0 0', paddingLeft: 0, listStyle: 'none' }}>
              {info.tips.map(tip => (
                <li key={tip} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, lineHeight: 1.5, display: 'flex', gap: 5, marginBottom: 2 }}>
                  <span style={{ color: '#818cf8', flexShrink: 0 }}>›</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Cost basis */}
          <div style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 6,
            padding: '6px 8px',
            display: 'flex',
            gap: 6,
            alignItems: 'flex-start',
          }}>
            <Icons.DollarSign size={11} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <span style={{ color: '#34d399', fontSize: 10, fontWeight: 700 }}>Cost basis</span>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '2px 0 0', lineHeight: 1.4 }}>{info.costBasis}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
