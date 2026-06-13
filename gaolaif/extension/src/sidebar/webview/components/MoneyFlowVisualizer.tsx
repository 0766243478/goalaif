import React from 'react';
import type { MoneyFlowData } from '../types';

interface Props {
  data: MoneyFlowData;
}

export function MoneyFlowVisualizer({ data }: Props) {
  if (!data?.nodes?.length) return null;

  const w = 320;
  const h = 200;
  const nodeW = 70;
  const nodeH = 40;

  const nodeColors: Record<string, string> = {
    victim: '#EF4444',
    attacker: '#22C55E',
    intermediary: '#F59E0B',
    pool: '#3B82F6',
  };

  return (
    <div style={{
      marginTop: 12, background: '#0F1623', border: '1px solid #1E293B',
      borderRadius: 4, padding: 12,
    }}>
      <div style={{
        fontSize: 10, color: '#EF4444', fontWeight: 700, marginBottom: 8,
        letterSpacing: '0.1em',
      }}>
        MONEY FLOW \u2014 HOW FUNDS MOVED
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#F59E0B" />
          </marker>
        </defs>

        {data.nodes.map((node, i) => {
          const x = data.nodes.length > 1
            ? (i / (data.nodes.length - 1)) * (w - nodeW - 40) + 20
            : w / 2 - nodeW / 2;
          const y = 30 + (i % 2) * 90;
          const color = nodeColors[node.type] || '#64748B';

          return (
            <g key={node.id}>
              <rect
                x={x} y={y} width={nodeW} height={nodeH} rx={4}
                fill="#0D1117" stroke={color} strokeWidth={1.5}
              />
              <text
                x={x + nodeW / 2} y={y + 16}
                textAnchor="middle" fill={color} fontSize={9}
                fontFamily="JetBrains Mono, monospace"
              >
                {node.label}
              </text>
              <text
                x={x + nodeW / 2} y={y + 30}
                textAnchor="middle" fill="#475569" fontSize={8}
                fontFamily="JetBrains Mono, monospace"
              >
                {node.balance_after}
              </text>
            </g>
          );
        })}

        {data.edges.map((edge, i) => {
          const fromIdx = data.nodes.findIndex(n => n.id === edge.from);
          const toIdx = data.nodes.findIndex(n => n.id === edge.to);
          if (fromIdx < 0 || toIdx < 0) return null;

          const x1 = fromIdx === 0 ? 20 + nodeW : w - nodeW - 20;
          const y1 = 30 + (fromIdx % 2) * 90 + nodeH / 2;
          const x2 = toIdx === 0 ? 20 : w - nodeW - 20;
          const y2 = 30 + (toIdx % 2) * 90 + nodeH / 2;

          return (
            <g key={i}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#F59E0B" strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
              <text
                x={(x1 + x2) / 2} y={Math.min(y1, y2) - 6}
                textAnchor="middle" fill="#F59E0B" fontSize={8}
                fontFamily="JetBrains Mono, monospace"
              >
                {edge.step}. {edge.amount} {edge.token}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
