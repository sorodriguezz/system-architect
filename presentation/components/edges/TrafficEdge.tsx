'use client';
import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { EdgeEntity } from '@/domain/entities/Edge.entity';
import { EdgeProtocol } from '@/domain/constants/NodeTypes.constant';
import { formatNumber, formatLatency } from '@/lib/formatNumber';

// ── Protocol styling ──────────────────────────────────────────────────────────

const PROTOCOL_COLOR: Record<EdgeProtocol, string> = {
  https:     '#6366f1',
  http:      '#3b82f6',
  grpc:      '#10b981',
  tcp:       '#64748b',
  websocket: '#8b5cf6',
  amqp:      '#f59e0b',
  redis:     '#ef4444',
};

const PROTOCOL_LABEL: Record<EdgeProtocol, string> = {
  https:     'HTTPS',
  http:      'HTTP',
  grpc:      'gRPC',
  tcp:       'TCP',
  websocket: 'WS',
  amqp:      'AMQP',
  redis:     'Redis',
};

// ── Job packet shapes per protocol ───────────────────────────────────────────
// Visual differentiation: each protocol has a distinct particle appearance

const PROTOCOL_PARTICLE: Record<EdgeProtocol, { shape: 'circle' | 'square' | 'diamond'; label: string }> = {
  https:     { shape: 'circle',  label: 'REQ' },
  http:      { shape: 'circle',  label: 'GET' },
  grpc:      { shape: 'diamond', label: 'RPC' },
  tcp:       { shape: 'square',  label: 'PKT' },
  websocket: { shape: 'circle',  label: 'MSG' },
  amqp:      { shape: 'square',  label: 'JOB' },
  redis:     { shape: 'diamond', label: 'CMD' },
};

// ── Latency → animation duration mapping ─────────────────────────────────────
//
// Maps real target node latency (ms) to SVG animation duration (seconds).
// Uses a logarithmic scale so the visual range is perceptible:
//   1ms   (Redis) → ~0.4s  (fast packet)
//   38ms  (App Server healthy) → ~0.9s
//   200ms (DB degraded) → ~1.4s
//   1000ms (Worker overloaded) → ~2.0s
//   5000ms (extreme) → ~3.0s
//
function latencyToAnimDuration(latencyMs: number): number {
  if (latencyMs <= 0) return 1.2;
  const clamped = Math.max(1, Math.min(latencyMs, 8000));
  // log10(1)=0, log10(8000)≈3.9 → map to [0.35, 3.0]
  const t = Math.log10(clamped) / Math.log10(8000);
  return 0.35 + t * 2.65;
}

// ── Thresholds ────────────────────────────────────────────────────────────────

const HIGH_TRAFFIC_THRESHOLD   = 70;
const ACTIVE_TRAFFIC_THRESHOLD = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

type TrafficEdgeProps = EdgeProps & { data?: unknown };

// ── Main component ─────────────────────────────────────────────────────────────

function TrafficEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data: rawData, selected, markerEnd,
}: TrafficEdgeProps) {
  const entity = rawData as unknown as EdgeEntity | undefined;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const protocol    = entity?.protocol          ?? EdgeProtocol.HTTP;
  const traffic     = entity?.trafficPercentage ?? 0;
  const rps         = entity?.rpsOnEdge         ?? 0;
  const latencyMs   = entity?.targetLatencyMs   ?? 0;
  const color       = PROTOCOL_COLOR[protocol]  ?? '#6366f1';
  const particleInfo= PROTOCOL_PARTICLE[protocol];

  const isActive    = traffic > ACTIVE_TRAFFIC_THRESHOLD;
  const isHeavy     = traffic > HIGH_TRAFFIC_THRESHOLD;
  const strokeWidth = 1.5 + (traffic / 100) * 2.5;
  const opacity     = 0.25 + (traffic / 100) * 0.75;

  // Real latency-driven particle animation duration
  const particleDur = latencyToAnimDuration(latencyMs);

  // Particle count scales with RPS (more traffic = more visible jobs)
  const showSecondParticle = rps > 50   || traffic > 30;
  const showThirdParticle  = rps > 200  || traffic > 60;
  const showFourthParticle = rps > 1000 || traffic > 85;

  // Format RPS display
  const rpsLabel = rps > 0 ? formatNumber(rps) : '';
  const latencyLabel = latencyMs > 0 ? formatLatency(latencyMs) : '';

  return (
    <>
      {/* Glow layer for heavy traffic */}
      {isHeavy && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 5}
          strokeOpacity={0.08}
          style={{ filter: 'blur(4px)' }}
        />
      )}

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke:          color,
          strokeWidth,
          strokeOpacity:   opacity,
          filter:          selected ? `drop-shadow(0 0 5px ${color})` : undefined,
          strokeDasharray: isActive ? '7 4' : undefined,
          animation:       isActive ? 'dashFlow 1.4s linear infinite' : undefined,
        }}
      />

      {/* ── Animated job packets ──────────────────────────────────────── */}
      {isActive && (
        <>
          <JobParticle
            path={edgePath}
            color={color}
            shape={particleInfo.shape}
            size={3.5}
            begin="0s"
            dur={particleDur}
          />
          {showSecondParticle && (
            <JobParticle
              path={edgePath}
              color={color}
              shape={particleInfo.shape}
              size={3}
              begin={`${(particleDur * 0.4).toFixed(2)}s`}
              dur={particleDur}
            />
          )}
          {showThirdParticle && (
            <JobParticle
              path={edgePath}
              color={color}
              shape={particleInfo.shape}
              size={2.5}
              begin={`${(particleDur * 0.7).toFixed(2)}s`}
              dur={particleDur}
            />
          )}
          {showFourthParticle && (
            <JobParticle
              path={edgePath}
              color={isHeavy ? '#ef4444' : color}
              shape={particleInfo.shape}
              size={2}
              begin={`${(particleDur * 0.15).toFixed(2)}s`}
              dur={particleDur * 0.85}
            />
          )}
        </>
      )}

      {/* ── Edge label: protocol + RPS + latency ──────────────────────── */}
      <EdgeLabelRenderer>
        {(selected || isHeavy || isActive) && (
          <div
            className="absolute pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              zIndex: 1000,
            }}
          >
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-mono"
              style={{
                background:  'rgba(7,7,14,0.92)',
                border:      `1px solid ${color}55`,
                color,
                backdropFilter: 'blur(4px)',
                boxShadow:   `0 0 8px ${color}22`,
                whiteSpace:  'nowrap',
              }}
            >
              <span style={{ opacity: 0.9 }}>{PROTOCOL_LABEL[protocol]}</span>

              {rpsLabel && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>·</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>
                    {rpsLabel} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>rps</span>
                  </span>
                </>
              )}

              {latencyLabel && (selected || isHeavy) && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>·</span>
                  <span
                    style={{
                      color: latencyMs > 500 ? '#ef4444' : latencyMs > 100 ? '#f59e0b' : '#4ade80',
                      fontSize: 10,
                    }}
                  >
                    {latencyLabel}
                  </span>
                </>
              )}

              {entity?.isEncrypted && (
                <span style={{ color: '#22c55e', fontSize: 9 }}>🔒</span>
              )}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

// ── Job Particle component ────────────────────────────────────────────────────
//
// Renders a moving shape along the edge path.
// shape='circle'  → filled dot (HTTP/HTTPS)
// shape='square'  → rounded rect (TCP/AMQP — represents packets/messages)
// shape='diamond' → rotated square (gRPC/Redis — represents RPC commands)

function JobParticle({
  path, color, shape, size, begin, dur,
}: {
  path:   string;
  color:  string;
  shape:  'circle' | 'square' | 'diamond';
  size:   number;
  begin:  string;
  dur:    number;
}) {
  const motionProps = {
    dur:         `${dur}s`,
    begin,
    repeatCount: 'indefinite' as const,
    path,
  };

  if (shape === 'circle') {
    return (
      <circle r={size} fill={color} opacity={0.92}>
        <animateMotion {...motionProps} />
      </circle>
    );
  }

  if (shape === 'square') {
    // Rounded rect — represents a message/packet
    return (
      <rect
        x={-size}
        y={-size}
        width={size * 2}
        height={size * 2}
        rx={1.5}
        fill={color}
        opacity={0.88}
      >
        <animateMotion {...motionProps} />
      </rect>
    );
  }

  // Diamond — rotated square for gRPC/Redis commands
  return (
    <rect
      x={-size * 0.85}
      y={-size * 0.85}
      width={size * 1.7}
      height={size * 1.7}
      fill={color}
      opacity={0.88}
      transform="rotate(45)"
    >
      <animateMotion {...motionProps} />
    </rect>
  );
}

export default memo(TrafficEdge);
