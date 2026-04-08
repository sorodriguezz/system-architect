'use client';
import React from 'react';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { useSelectedNode } from '@/presentation/hooks/useSelectedNode.hook';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';
import { COMPONENT_REGISTRY } from '@/domain/constants/ComponentRegistry.constant';
import {
  LbAlgorithm, DatabaseEngine, QueueBroker,
  StorageProvider, CloudRegion, ServiceTier,
} from '@/domain/constants/NodeTypes.constant';
import { Toggle } from '@/presentation/components/atoms/Toggle.atom';
import { Select } from '@/presentation/components/atoms/Select.atom';
import { NumberInput } from '@/presentation/components/atoms/NumberInput.atom';
import { FormRow } from '@/presentation/components/molecules/FormRow.molecule';
import { StatCard } from '@/presentation/components/molecules/StatCard.molecule';
import * as Icons from 'lucide-react';

// ── Option lists (derived from domain constants) ──────────────────────────────
const LB_ALGORITHMS   = Object.values(LbAlgorithm);
const DB_ENGINES      = Object.values(DatabaseEngine);
const QUEUE_BROKERS   = Object.values(QueueBroker);
const STORAGE_PROVS   = Object.values(StorageProvider);
const CLOUD_REGIONS   = Object.values(CloudRegion);
const SERVICE_TIERS   = Object.values(ServiceTier);

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
    return (
      <EdgeConfig
        entity={selection.entity}
        onUpdate={(partial: any) => updateEdge(selection.entity.id, partial)}
        onRemove={() => removeEdge(selection.entity.id)}
      />
    );
  }

  const { entity } = selection;
  const cfg = entity.config;
  const update = (key: string, value: any) => updateConfig(entity.id, { [key]: value });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <NodeHeader entity={entity}
        onLabelChange={(label: string) => updateNode(entity.id, { label })}
        onKill={() => killNode(entity.id)}
        onRestore={() => restoreNode(entity.id)}
        onOverload={() => overloadNode(entity.id)}
        onDuplicate={() => duplicateNode(entity.id)}
        onDelete={() => { removeNode(entity.id); selectNode(null); }}
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <LiveMetricsSection entity={entity} />

        <ConfigSection title="General">
          <FormRow label="Replicas">
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={20} value={cfg.replicas}
                onChange={e => update('replicas', +e.target.value)}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-white/70 text-xs w-5 font-mono">{cfg.replicas}</span>
            </div>
          </FormRow>
          <FormRow label="Max RPS">
            <NumberInput value={cfg.maxRps} onChange={v => update('maxRps', v)} min={10} max={1000000} step={100} />
          </FormRow>
          <FormRow label="Timeout (ms)">
            <NumberInput value={cfg.timeoutMs} onChange={v => update('timeoutMs', v)} min={100} max={300000} step={500} />
          </FormRow>
          <FormRow label="Retries">
            <NumberInput value={cfg.retries} onChange={v => update('retries', v)} min={0} max={10} />
          </FormRow>
          <FormRow label="Region">
            <Select value={cfg.region} onChange={v => update('region', v)} options={CLOUD_REGIONS} />
          </FormRow>
          <FormRow label="Tier">
            <Select value={cfg.tier} onChange={v => update('tier', v)} options={SERVICE_TIERS} />
          </FormRow>
        </ConfigSection>

        {entity.type === 'loadbalancer' && (
          <ConfigSection title="Load Balancer">
            <FormRow label="Algorithm">
              <Select value={cfg.lbAlgorithm ?? 'round-robin'} onChange={v => update('lbAlgorithm', v)} options={LB_ALGORITHMS} />
            </FormRow>
          </ConfigSection>
        )}

        {entity.type === 'database' && (
          <ConfigSection title="Database">
            <FormRow label="Engine">
              <Select value={cfg.dbEngine ?? 'postgres'} onChange={v => update('dbEngine', v)} options={DB_ENGINES} />
            </FormRow>
          </ConfigSection>
        )}

        {entity.type === 'cache' && (
          <ConfigSection title="Cache">
            <FormRow label="Hit Rate (%)">
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={cfg.cacheHitRate ?? 85}
                  onChange={e => update('cacheHitRate', +e.target.value)}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-white/70 text-xs w-8 text-right font-mono">{cfg.cacheHitRate ?? 85}%</span>
              </div>
            </FormRow>
          </ConfigSection>
        )}

        {entity.type === 'queue' && (
          <ConfigSection title="Message Queue">
            <FormRow label="Broker">
              <Select value={cfg.queueBroker ?? 'kafka'} onChange={v => update('queueBroker', v)} options={QUEUE_BROKERS} />
            </FormRow>
          </ConfigSection>
        )}

        {entity.type === 'storage' && (
          <ConfigSection title="Object Storage">
            <FormRow label="Provider">
              <Select value={cfg.storageProvider ?? 's3'} onChange={v => update('storageProvider', v)} options={STORAGE_PROVS} />
            </FormRow>
          </ConfigSection>
        )}

        <ConfigSection title="Features">
          <ToggleRow label="SSL / TLS"      value={cfg.sslEnabled}    onChange={v => update('sslEnabled', v)}    />
          <ToggleRow label="Auth Required"  value={cfg.authEnabled}   onChange={v => update('authEnabled', v)}   />
          <ToggleRow label="Auto-Scaling"   value={cfg.autoscaling}   onChange={v => update('autoscaling', v)}   />
          {cfg.autoscaling && (
            <>
              <FormRow label="Min Replicas">
                <NumberInput value={cfg.minReplicas} onChange={v => update('minReplicas', v)} min={1} max={10} />
              </FormRow>
              <FormRow label="Max Replicas">
                <NumberInput value={cfg.maxReplicas} onChange={v => update('maxReplicas', v)} min={1} max={50} />
              </FormRow>
            </>
          )}
        </ConfigSection>

        <ConfigSection title="Notes">
          <textarea
            value={entity.notes}
            onChange={e => updateNode(entity.id, { notes: e.target.value })}
            placeholder="Add notes..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
        </ConfigSection>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white/25 p-6 text-center gap-3">
      <Icons.MousePointerClick size={32} className="text-white/15" />
      <div>
        <p className="text-sm font-medium text-white/40">Select a component</p>
        <p className="text-xs mt-1">Click any node or edge to configure it</p>
      </div>
    </div>
  );
}

function NodeHeader({ entity, onLabelChange, onKill, onRestore, onOverload, onDuplicate, onDelete }: any) {
  const color    = SimulationConstants.COLOR_BY_TYPE[entity.type] || '#6366f1';
  const iconName = SimulationConstants.ICON_BY_TYPE[entity.type]  || 'Server';
  const IconComp = (Icons as any)[iconName];
  const desc     = COMPONENT_REGISTRY.find(c => c.type === entity.type)?.description ?? '';

  return (
    <div className="p-3 border-b border-white/5" style={{ background: `linear-gradient(135deg, ${color}12, transparent)` }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          {IconComp && <IconComp size={15} style={{ color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <input type="text" value={entity.label} onChange={e => onLabelChange(e.target.value)}
            className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-white/20" />
          <div className="text-white/40 text-xs truncate">{desc}</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        <ActionButton icon={<Icons.Copy size={10} />} label="Clone" onClick={onDuplicate} />
        {entity.status === 'down'
          ? <ActionButton icon={<Icons.PlayCircle size={10} />} label="Restore" onClick={onRestore} color="green" />
          : <ActionButton icon={<Icons.XCircle size={10} />}    label="Kill"    onClick={onKill}    color="red"   />
        }
        <ActionButton icon={<Icons.Flame size={10} />} label="Stress" onClick={onOverload} color="orange" />
        <button onClick={onDelete} className="flex items-center justify-center p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors">
          <Icons.Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }: any) {
  const COLOR_MAP: Record<string, string> = {
    green:  'bg-green-500/20 hover:bg-green-500/30 text-green-400',
    red:    'bg-red-500/20 hover:bg-red-500/30 text-red-400',
    orange: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400',
  };
  const style = color ? COLOR_MAP[color] : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white';
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs transition-colors ${style}`}>
      {icon} {label}
    </button>
  );
}

function LiveMetricsSection({ entity }: any) {
  if (entity.metrics.rps === 0) return null;
  const stats = [
    { label: 'RPS',     value: Math.round(entity.metrics.rps).toLocaleString() },
    { label: 'Latency', value: `${Math.round(entity.metrics.latency)}ms`       },
    { label: 'CPU',     value: `${Math.round(entity.metrics.cpuLoad)}%`        },
    { label: 'Memory',  value: `${Math.round(entity.metrics.memoryLoad)}%`     },
    { label: 'Errors',  value: `${entity.metrics.errorRate.toFixed(1)}%`       },
    { label: 'Conns',   value: entity.metrics.connections.toLocaleString()     },
  ];
  return (
    <section>
      <SectionTitle>Live Metrics</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map(s => <StatCard key={s.label} label={s.label} value={s.value} />)}
      </div>
    </section>
  );
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">{children}</h4>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/60 text-xs">{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function EdgeConfig({ entity, onUpdate, onRemove }: any) {
  const PROTOCOLS = ['http', 'https', 'grpc', 'tcp', 'websocket', 'amqp', 'redis'];
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white/80 font-semibold text-sm">Edge Config</h3>
        <button onClick={onRemove} className="text-red-400/70 hover:text-red-400 transition-colors">
          <Icons.Trash2 size={14} />
        </button>
      </div>
      <FormRow label="Protocol">
        <Select value={entity.protocol} onChange={v => onUpdate({ protocol: v })} options={PROTOCOLS} />
      </FormRow>
      <FormRow label="Encrypted">
        <Toggle value={entity.isEncrypted} onChange={v => onUpdate({ isEncrypted: v })} />
      </FormRow>
    </div>
  );
}
