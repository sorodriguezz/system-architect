'use client';
import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { EdgeEntity } from '@/domain/entities/Edge.entity';
import { EdgeProtocol } from '@/domain/constants/NodeTypes.constant';

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

const HIGH_TRAFFIC_THRESHOLD = 70;
const ACTIVE_TRAFFIC_THRESHOLD = 5;

type TrafficEdgeProps = EdgeProps & { data?: unknown };

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

  const protocol   = entity?.protocol   ?? EdgeProtocol.HTTP;
  const traffic    = entity?.trafficPercentage ?? 0;
  const color      = PROTOCOL_COLOR[protocol] ?? '#6366f1';
  const isActive   = traffic > ACTIVE_TRAFFIC_THRESHOLD;
  const isHeavy    = traffic > HIGH_TRAFFIC_THRESHOLD;
  const strokeWidth= 1.5 + (traffic / 100) * 2;
  const opacity    = 0.3 + (traffic / 100) * 0.7;

  const particleDuration = Math.max(0.5, 2 - (traffic / 100) * 1.5);

  return (
    <>
      {/* Glow layer for heavy traffic */}
      {isHeavy && (
        <path d={edgePath} fill="none" stroke={color}
          strokeWidth={strokeWidth + 4} strokeOpacity={0.12}
          style={{ filter: 'blur(3px)' }}
        />
      )}

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth,
          strokeOpacity: opacity,
          filter:         selected ? `drop-shadow(0 0 4px ${color})` : undefined,
          strokeDasharray:isActive ? '6 3' : undefined,
          animation:      isActive ? 'dashFlow 1.2s linear infinite' : undefined,
        }}
      />

      {/* Animated flow particles */}
      {isActive && (
        <>
          <Particle path={edgePath} color={color} radius={3} begin="0s"    dur={particleDuration} />
          {traffic > 40 && <Particle path={edgePath} color={color}    radius={2.5} begin="0.4s"  dur={particleDuration} />}
          {traffic > 70 && <Particle path={edgePath} color="#ef4444"  radius={2}   begin="0.8s"  dur={particleDuration} />}
        </>
      )}

      {/* Protocol label */}
      <EdgeLabelRenderer>
        {(selected || isHeavy) && (
          <div
            className="absolute pointer-events-none"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, zIndex: 1000 }}
          >
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: 'rgba(10,10,20,0.9)', border: `1px solid ${color}44`, color }}
            >
              <span>{PROTOCOL_LABEL[protocol]}</span>
              {traffic > 0 && <span className="text-white/40">{Math.round(traffic)}%</span>}
              {entity?.isEncrypted && <span style={{ color: '#22c55e' }}>🔒</span>}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

function Particle({ path, color, radius, begin, dur }: {
  path: string; color: string; radius: number; begin: string; dur: number;
}) {
  return (
    <circle r={radius} fill={color} opacity={0.9}>
      <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" path={path} />
    </circle>
  );
}

export default memo(TrafficEdge);
