'use client';
import React, { useCallback } from 'react';
import { useArchitectureStore } from '@/store/architectureStore';
import { COMPONENT_COLORS } from '@/lib/simulation';
import { COMPONENT_TEMPLATES } from '@/lib/componentTemplates';
import * as Icons from 'lucide-react';
import type { NodeConfig } from '@/types';

const PROTOCOLS = ['http', 'https', 'grpc', 'tcp', 'websocket', 'amqp', 'redis'];
const LB_ALGORITHMS = ['round-robin', 'least-connections', 'ip-hash', 'random', 'weighted'];
const DB_TYPES = ['postgres', 'mysql', 'mongodb', 'redis', 'cassandra', 'dynamodb'];
const QUEUE_TYPES = ['kafka', 'rabbitmq', 'sqs', 'pubsub', 'nats'];
const STORAGE_TYPES = ['s3', 'gcs', 'azure-blob', 'minio'];
const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];
const TIERS = ['free', 'standard', 'premium', 'enterprise'];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-white/50 text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange, min = 0, max = 100000, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors"
    />
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        value ? 'bg-indigo-500' : 'bg-white/10'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
        value ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
  );
}

export default function ConfigPanel() {
  const { selectedNodeId, selectedEdgeId, nodes, edges, updateNode, updateNodeConfig, updateEdge, removeNode, removeEdge, killNode, restoreNode, overloadNode, duplicateNode, selectNode } = useArchitectureStore();

  const node = nodes.find(n => n.id === selectedNodeId);
  const edge = edges.find(e => e.id === selectedEdgeId);

  if (!node && !edge) {
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

  if (edge) {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white/80 font-semibold text-sm">Edge Config</h3>
          <button onClick={() => removeEdge(edge.id)} className="text-red-400/70 hover:text-red-400 transition-colors">
            <Icons.Trash2 size={14} />
          </button>
        </div>
        <Row label="Protocol">
          <Select value={edge.protocol || 'http'} onChange={v => updateEdge(edge.id, { protocol: v as any })} options={PROTOCOLS} />
        </Row>
        <Row label="Encrypted">
          <Toggle value={!!edge.encrypted} onChange={v => updateEdge(edge.id, { encrypted: v })} />
        </Row>
        <div className="mt-2 p-2 rounded-lg bg-white/3 border border-white/5 text-xs text-white/40">
          <div>Source: {nodes.find(n => n.id === edge.source)?.label}</div>
          <div>Target: {nodes.find(n => n.id === edge.target)?.label}</div>
          <div>Traffic: {Math.round(edge.traffic || 0)}%</div>
        </div>
      </div>
    );
  }

  if (!node) return null;

  const template = COMPONENT_TEMPLATES.find(t => t.type === node.type);
  const color = COMPONENT_COLORS[node.type] || '#6366f1';
  const IconComp = (Icons as any)[template?.icon || 'Server'];

  const updateConfig = (key: keyof NodeConfig, value: any) => {
    updateNodeConfig(node.id, { [key]: value });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="p-3 border-b border-white/5"
        style={{ background: `linear-gradient(135deg, ${color}15, transparent)` }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}22`, border: `1px solid ${color}44` }}
          >
            {IconComp && <IconComp size={15} style={{ color }} />}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={node.label}
              onChange={e => updateNode(node.id, { label: e.target.value })}
              className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-white/20"
            />
            <div className="text-white/40 text-xs">{template?.description}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => duplicateNode(node.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors"
          >
            <Icons.Copy size={10} /> Clone
          </button>
          {node.status === 'down' ? (
            <button
              onClick={() => restoreNode(node.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs transition-colors"
            >
              <Icons.PlayCircle size={10} /> Restore
            </button>
          ) : (
            <button
              onClick={() => killNode(node.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
            >
              <Icons.XCircle size={10} /> Kill
            </button>
          )}
          <button
            onClick={() => overloadNode(node.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs transition-colors"
          >
            <Icons.Flame size={10} /> Stress
          </button>
          <button
            onClick={() => { removeNode(node.id); selectNode(null); }}
            className="flex items-center justify-center p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
          >
            <Icons.Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Config sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">

        {/* Status & Metrics */}
        {node.metrics.rps > 0 && (
          <section>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Live Metrics</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'RPS', value: Math.round(node.metrics.rps).toLocaleString() },
                { label: 'Latency', value: `${Math.round(node.metrics.latency)}ms` },
                { label: 'CPU', value: `${Math.round(node.metrics.cpuLoad)}%` },
                { label: 'Memory', value: `${Math.round(node.metrics.memoryLoad)}%` },
                { label: 'Errors', value: `${node.metrics.errorRate.toFixed(1)}%` },
                { label: 'Conns', value: node.metrics.connections.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/3 rounded-lg p-2 border border-white/5">
                  <div className="text-white/40 text-xs">{label}</div>
                  <div className="text-white/80 text-xs font-mono font-bold">{value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* General Config */}
        <section>
          <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Configuration</h4>
          <div className="space-y-3">
            <Row label="Label">
              <input
                type="text"
                value={node.label}
                onChange={e => updateNode(node.id, { label: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500/50"
              />
            </Row>

            <Row label="Replicas">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={node.config.replicas}
                  onChange={e => updateConfig('replicas', Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-white/70 text-xs w-6 text-center font-mono">{node.config.replicas}</span>
              </div>
            </Row>

            <Row label="Max RPS">
              <NumberInput value={node.config.maxRps} onChange={v => updateConfig('maxRps', v)} min={10} max={1000000} step={100} />
            </Row>

            <Row label="Timeout (ms)">
              <NumberInput value={node.config.timeout} onChange={v => updateConfig('timeout', v)} min={100} max={300000} step={500} />
            </Row>

            <Row label="Retries">
              <NumberInput value={node.config.retries} onChange={v => updateConfig('retries', v)} min={0} max={10} />
            </Row>

            <Row label="Region">
              <Select value={node.config.region || 'us-east-1'} onChange={v => updateConfig('region', v)} options={REGIONS} />
            </Row>

            <Row label="Tier">
              <Select value={node.config.tier || 'standard'} onChange={v => updateConfig('tier', v)} options={TIERS} />
            </Row>
          </div>
        </section>

        {/* Type-specific config */}
        {node.type === 'loadbalancer' && (
          <section>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Load Balancer</h4>
            <Row label="Algorithm">
              <Select value={node.config.algorithm || 'round-robin'} onChange={v => updateConfig('algorithm', v)} options={LB_ALGORITHMS} />
            </Row>
          </section>
        )}

        {node.type === 'database' && (
          <section>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Database</h4>
            <Row label="Engine">
              <Select value={node.config.dbType || 'postgres'} onChange={v => updateConfig('dbType', v)} options={DB_TYPES} />
            </Row>
          </section>
        )}

        {node.type === 'cache' && (
          <section>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Cache</h4>
            <Row label="Hit Rate (%)">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={node.config.cacheHitRate || 85}
                  onChange={e => updateConfig('cacheHitRate', Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-white/70 text-xs w-8 text-right font-mono">{node.config.cacheHitRate || 85}%</span>
              </div>
            </Row>
          </section>
        )}

        {node.type === 'queue' && (
          <section>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Message Queue</h4>
            <Row label="Broker">
              <Select value={node.config.queueType || 'kafka'} onChange={v => updateConfig('queueType', v)} options={QUEUE_TYPES} />
            </Row>
          </section>
        )}

        {node.type === 'storage' && (
          <section>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Object Storage</h4>
            <Row label="Provider">
              <Select value={node.config.storageType || 's3'} onChange={v => updateConfig('storageType', v)} options={STORAGE_TYPES} />
            </Row>
          </section>
        )}

        {/* Features */}
        <section>
          <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Features</h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">SSL/TLS</span>
              <Toggle value={node.config.sslEnabled} onChange={v => updateConfig('sslEnabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">Auth Required</span>
              <Toggle value={node.config.authEnabled} onChange={v => updateConfig('authEnabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">Auto-Scaling</span>
              <Toggle value={node.config.autoscaling} onChange={v => updateConfig('autoscaling', v)} />
            </div>
            {node.config.autoscaling && (
              <>
                <Row label="Min Replicas">
                  <NumberInput value={node.config.minReplicas} onChange={v => updateConfig('minReplicas', v)} min={1} max={10} />
                </Row>
                <Row label="Max Replicas">
                  <NumberInput value={node.config.maxReplicas} onChange={v => updateConfig('maxReplicas', v)} min={1} max={50} />
                </Row>
              </>
            )}
          </div>
        </section>

        {/* Notes */}
        <section>
          <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Notes</h4>
          <textarea
            value={node.notes || ''}
            onChange={e => updateNode(node.id, { notes: e.target.value })}
            placeholder="Add notes..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
        </section>
      </div>
    </div>
  );
}
