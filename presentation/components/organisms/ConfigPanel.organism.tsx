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
        {entity.metrics.rps > 0 && (
          <div className="flex gap-1.5 mb-3">
            <MetricBadge label="RPS"     value={entity.metrics.rps >= 1000 ? `${(entity.metrics.rps/1000).toFixed(1)}K` : Math.round(entity.metrics.rps).toString()} color="#818cf8" />
            <MetricBadge label="Latency" value={`${Math.round(entity.metrics.latency)}ms`} color={entity.metrics.latency > 500 ? '#f87171' : entity.metrics.latency > 100 ? '#fbbf24' : '#4ade80'} />
            <MetricBadge label="CPU"     value={`${Math.round(entity.metrics.cpuLoad)}%`}  color={entity.metrics.cpuLoad > 80 ? '#f87171' : entity.metrics.cpuLoad > 60 ? '#fbbf24' : '#4ade80'} />
            <MetricBadge label="Errors"  value={`${entity.metrics.errorRate.toFixed(1)}%`} color={entity.metrics.errorRate > 5 ? '#f87171' : entity.metrics.errorRate > 1 ? '#fbbf24' : '#4ade80'} />
          </div>
        )}

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
  const color    = SimulationConstants.COLOR_BY_TYPE[entity.type] || '#6366f1';
  const iconName = SimulationConstants.ICON_BY_TYPE[entity.type]  || 'Server';
  const IconComp = (Icons as any)[iconName];
  const desc     = COMPONENT_REGISTRY.find(c => c.type === entity.type)?.description ?? '';

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px', background: `linear-gradient(135deg, ${color}10, transparent)` }}>
      <div className="flex items-center gap-2.5 mb-3">
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
