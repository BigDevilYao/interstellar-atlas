import { CONNECTIONS } from '../data/connections';
import { NODES, NODE_MAP } from '../data/nodes';
import type { AtlasConnection, Layer, NodeId } from '../data/types';
import { Icon } from '../icons/Icons';

/**
 * A flat SVG projection of the World Map, generated from the same data.
 * Used as small multiples in Analysis mode and as a graceful fallback when WebGL is unavailable.
 */

const LAYER_STROKE: Record<Layer, { stroke: string; dash?: string; width: number }> = {
  physical: { stroke: '#ece8e0', width: 1.1 },
  spacetime: { stroke: '#f0c98f', dash: '5 4', width: 1.1 },
  information: { stroke: '#a9c3e6', dash: '1 4', width: 1.6 },
};

function pt(id: NodeId, size: number): [number, number] {
  const [x, y] = NODE_MAP[id].position;
  return [size / 2 + x * size * 0.42, size / 2 - y * size * 0.42];
}

function pathFor(c: AtlasConnection, size: number): string {
  const a = pt(c.from, size);
  const b = pt(c.to, size);
  if (c.via?.length) {
    const pts = [a, ...c.via.map(([x, y]) => [size / 2 + x * size * 0.42, size / 2 - y * size * 0.42] as [number, number]), b];
    // Catmull-Rom → cubic Bézier.
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
  }
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  let nx = -(b[1] - a[1]);
  let ny = b[0] - a[0];
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  if (nx * (mx - size / 2) + ny * (my - size / 2) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const bend = (c.bend ?? 0.2) * Math.hypot(b[0] - a[0], b[1] - a[1]);
  return `M${a[0]},${a[1]} Q${mx + nx * bend},${my + ny * bend} ${b[0]},${b[1]}`;
}

export function FlatMap({
  size = 360,
  layers,
  showIcons = false,
  showLabels = true,
  onNode,
  title,
}: {
  size?: number;
  layers: Layer[];
  showIcons?: boolean;
  showLabels?: boolean;
  onNode?: (id: NodeId) => void;
  title?: string;
}) {
  const conns = CONNECTIONS.filter((c) => layers.includes(c.layer));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="flatmap" role="img" aria-label={title ?? 'Flat World Map'}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.42} fill="none" stroke="#ece8e0" strokeOpacity={0.5} />
      <line x1={size / 2} y1={size * 0.06} x2={size / 2} y2={size * 0.94} stroke="#ece8e0" strokeOpacity={0.15} strokeDasharray="3 4" />
      <line x1={size * 0.05} y1={size / 2} x2={size * 0.95} y2={size / 2} stroke="#ece8e0" strokeOpacity={0.15} />
      {[0.82, 0.62, 0.4].map((k) => (
        <ellipse key={k} cx={size / 2} cy={size / 2} rx={size * 0.42 * k * 0.28} ry={size * 0.42 * k} fill="none" stroke="#ece8e0" strokeOpacity={0.07} />
      ))}
      {conns.map((c) => {
        const st = LAYER_STROKE[c.layer];
        return (
          <path
            key={c.id}
            d={pathFor(c, size)}
            fill="none"
            stroke={c.style === 'axis' ? '#ffffff' : st.stroke}
            strokeWidth={c.style === 'axis' ? 1.6 : st.width}
            strokeDasharray={c.style === 'axis' ? '6 4' : st.dash}
            strokeLinecap="round"
            opacity={0.85}
          >
            <title>{`${NODE_MAP[c.from].name} → ${NODE_MAP[c.to].name}: ${c.label}`}</title>
          </path>
        );
      })}
      <circle cx={size / 2} cy={size / 2 + 0.04 * size * 0.42} r={size * 0.055} fill="#000" stroke="#f0c98f" strokeWidth={1.2} />
      <ellipse cx={size / 2} cy={size / 2 + 0.04 * size * 0.42} rx={size * 0.18} ry={size * 0.018} fill="none" stroke="#f0c98f" strokeOpacity={0.7} />
      {NODES.filter((n) => n.marker !== 'core').map((n) => {
        const [x, y] = pt(n.id, size);
        return (
          <g key={n.id} transform={`translate(${x},${y})`} className={onNode ? 'flatmap__node is-click' : 'flatmap__node'} onClick={() => onNode?.(n.id)}>
            {showIcons ? (
              <g transform="translate(-14,-14)" color="#ece8e0">
                <rect x={-2} y={-2} width={32} height={32} rx={4} fill="#000" stroke="#ece8e0" strokeOpacity={0.6} />
                <foreignObject width={28} height={28}>
                  <Icon id={n.icon} size={28} />
                </foreignObject>
              </g>
            ) : (
              <circle r={3.2} fill="#000" stroke="#ece8e0" strokeWidth={1.1} />
            )}
            {showLabels && (
              <text x={showIcons ? 20 : 7} y={3} className="flatmap__label">
                {n.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
