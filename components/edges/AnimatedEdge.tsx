'use client';
import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import type { ArchEdge } from '@/types';

const PROTOCOL_COLORS: Record<string, string> = {
  https: '#6366f1',
  http:  '#3b82f6',
  grpc:  '#10b981',
  tcp:   '#64748b',
  websocket: '#8b5cf6',
  amqp:  '#f59e0b',
  redis: '#ef4444',
};

const PROTOCOL_LABELS: Record<string, string> = {
  https: 'HTTPS',
  http: 'HTTP',
  grpc: 'gRPC',
  tcp: 'TCP',
  websocket: 'WS',
  amqp: 'AMQP',
  redis: 'Redis',
};

interface AnimatedEdgeProps extends EdgeProps {
  data?: Partial<ArchEdge>;
}

function AnimatedEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
  selected,
  markerEnd,
}: AnimatedEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const protocol = data?.protocol || 'http';
  const traffic = data?.traffic ?? 0;
  const color = PROTOCOL_COLORS[protocol] || '#6366f1';
  const isActive = traffic > 5;
  const isHeavy = traffic > 70;

  // Stroke width based on traffic
  const strokeWidth = 1.5 + (traffic / 100) * 2;
  const opacity = 0.3 + (traffic / 100) * 0.7;

  return (
    <>
      {/* Glow layer for high traffic */}
      {isHeavy && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.15}
          style={{ filter: `blur(3px)` }}
        />
      )}

      {/* Main edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth,
          strokeOpacity: opacity,
          filter: selected ? `drop-shadow(0 0 4px ${color})` : undefined,
          strokeDasharray: isActive ? '6 3' : undefined,
          animation: isActive ? 'dashFlow 1.2s linear infinite' : undefined,
        }}
      />

      {/* Animated flow particles */}
      {isActive && (
        <>
          <circle r="3" fill={color} opacity={0.9}>
            <animateMotion
              dur={`${Math.max(0.5, 2 - (traffic / 100) * 1.5)}s`}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
          {traffic > 40 && (
            <circle r="2.5" fill={color} opacity={0.7}>
              <animateMotion
                dur={`${Math.max(0.5, 2 - (traffic / 100) * 1.5)}s`}
                begin="0.4s"
                repeatCount="indefinite"
                path={edgePath}
              />
            </circle>
          )}
          {traffic > 70 && (
            <circle r="2" fill="#ef4444" opacity={0.8}>
              <animateMotion
                dur={`${Math.max(0.5, 2 - (traffic / 100) * 1.5)}s`}
                begin="0.8s"
                repeatCount="indefinite"
                path={edgePath}
              />
            </circle>
          )}
        </>
      )}

      {/* Edge label */}
      <EdgeLabelRenderer>
        {(selected || isHeavy) && (
          <div
            className="absolute pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              zIndex: 1000,
            }}
          >
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
              style={{
                background: 'rgba(10,10,20,0.9)',
                border: `1px solid ${color}44`,
                color,
              }}
            >
              <span>{PROTOCOL_LABELS[protocol]}</span>
              {traffic > 0 && (
                <span className="text-white/40 text-xs">{Math.round(traffic)}%</span>
              )}
              {data?.encrypted && (
                <span style={{ color: '#22c55e' }}>🔒</span>
              )}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(AnimatedEdge);
