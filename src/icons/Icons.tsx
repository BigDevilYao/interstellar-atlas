import { useId, type ReactNode } from 'react';
import type { IconId } from '../data/types';

/**
 * ORIGINAL ARCHITECTURAL LINE ICONS
 * Drawn on a 48 × 48 grid with hairline strokes, as technical / isometric line drawings.
 */

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function Svg({ size = 40, strokeWidth = 1.1, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function Bedroom(p: IconProps) {
  return (
    <Svg {...p}>
      {/* isometric cut-away room */}
      <path d="M24 40 L40 31 L24 22 L8 31 Z" />
      <path d="M8 31 V13 L24 4 V22" />
      <path d="M24 4 L40 13 V31" />
      {/* window on the right wall */}
      <path d="M28 10.3 L35 14.2 V21.2 L28 17.3 Z" />
      <path d="M31.5 12.2 V19.2" opacity={0.7} />
      {/* bookshelf on the left wall */}
      <path d="M11 29.3 V16.3 L19 11.8 V24.8" />
      <path d="M11 19.6 L19 15.1 M11 22.9 L19 18.4 M11 26.2 L19 21.7" opacity={0.75} />
      <path d="M12.6 18.4 V15.8 M14.2 17.5 V15 M16.8 16 V13.4 M13.4 21.5 V19.1 M15.6 20.3 V17.8 M17.6 19.1 V16.6" opacity={0.6} />
      {/* bed */}
      <path d="M28 23.05 L36.8 28 L31.2 31.15 L22.4 26.2 Z" />
      <path d="M36.8 28 V31 L31.2 34.15 L22.4 29.2 V26.2 M31.2 31.15 V34.15" />
      <path d="M29.1 23.7 L23.5 26.8" opacity={0.7} />
    </Svg>
  );
}

function Tesseract(p: IconProps) {
  const hex = (s: number) => {
    const c = 24;
    const h = 0.866 * s;
    return `M${c} ${c - s} L${c + h} ${c - s / 2} L${c + h} ${c + s / 2} L${c} ${c + s} L${c - h} ${c + s / 2} L${c - h} ${c - s / 2} Z`;
  };
  const inner = (s: number) => {
    const c = 24;
    const h = 0.866 * s;
    return `M${c} ${c} L${c} ${c - s} M${c} ${c} L${c + h} ${c + s / 2} M${c} ${c} L${c - h} ${c + s / 2}`;
  };
  const s1 = 19;
  const s2 = 9.5;
  const v = (s: number) => {
    const h = 0.866 * s;
    return [
      [24, 24 - s],
      [24 + h, 24 - s / 2],
      [24 + h, 24 + s / 2],
      [24, 24 + s],
      [24 - h, 24 + s / 2],
      [24 - h, 24 - s / 2],
    ];
  };
  const a = v(s1);
  const b = v(s2);
  return (
    <Svg {...p}>
      <path d={hex(s1)} />
      <path d={inner(s1)} opacity={0.35} />
      <path d={hex(s2)} />
      <path d={inner(s2)} />
      <path d={a.map((pt, i) => `M${pt[0]} ${pt[1]} L${b[i][0]} ${b[i][1]}`).join(' ')} opacity={0.75} />
      {/* repeated shelf strata */}
      <path d="M10.3 21 L18 16.6 M10.3 25 L18 20.6 M30 16.6 L37.7 21 M30 20.6 L37.7 25" opacity={0.55} />
      <path d="M17 33.5 L24 37.5 L31 33.5" opacity={0.45} />
    </Svg>
  );
}

function Endurance(p: IconProps) {
  const n = 12;
  const rx = 15;
  const ry = 10.5;
  const mods = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = 24 + Math.cos(t) * rx;
    const y = 24 + Math.sin(t) * ry;
    const ang = (Math.atan2(Math.cos(t) * ry, -Math.sin(t) * rx) * 180) / Math.PI;
    return { x, y, ang };
  });
  return (
    <Svg {...p}>
      <ellipse cx={24} cy={24} rx={rx} ry={ry} opacity={0.5} />
      {mods.map((m, i) => (
        <rect key={i} x={m.x - 3} y={m.y - 1.9} width={6} height={3.8} transform={`rotate(${m.ang} ${m.x} ${m.y})`} />
      ))}
      <ellipse cx={24} cy={24} rx={3.4} ry={2.4} />
      <path d={`M24 21.6 V${24 - ry} M24 26.4 V${24 + ry} M20.6 24 H${24 - rx} M27.4 24 H${24 + rx}`} opacity={0.7} />
    </Svg>
  );
}

function Saturn(p: IconProps) {
  return (
    <Svg {...p}>
      <g transform="rotate(-18 24 24)">
        <path d="M5 24 A19 5.4 0 0 1 43 24" opacity={0.85} />
        <path d="M10 24 A14 3.6 0 0 1 38 24" opacity={0.5} />
        <circle cx={24} cy={24} r={8.6} fill="#000" />
        <path d="M16.2 21.2 Q24 23 31.8 21.2 M15.6 25.4 Q24 27.4 32.4 25.4" opacity={0.5} />
        <path d="M5 24 A19 5.4 0 0 0 43 24" />
        <path d="M10 24 A14 3.6 0 0 0 38 24" opacity={0.6} />
      </g>
    </Svg>
  );
}

function Wormhole(p: IconProps) {
  return (
    <Svg {...p}>
      {/* embedding diagram: a folded throat between two sheets */}
      <ellipse cx={24} cy={10} rx={17} ry={4.4} />
      <ellipse cx={24} cy={38} rx={17} ry={4.4} />
      <ellipse cx={24} cy={24} rx={3.6} ry={1.1} />
      <path d="M7 10 C 19 16, 20.4 20, 20.4 24 C 20.4 28, 19 32, 7 38" />
      <path d="M41 10 C 29 16, 27.6 20, 27.6 24 C 27.6 28, 29 32, 41 38" />
      <ellipse cx={24} cy={15.4} rx={9.8} ry={2.6} opacity={0.5} />
      <ellipse cx={24} cy={32.6} rx={9.8} ry={2.6} opacity={0.5} />
      <path d="M24 5.6 V14 M24 34 V42.4" opacity={0.4} strokeDasharray="1.4 1.6" />
    </Svg>
  );
}

function Planet({ children, ...p }: IconProps & { children: (clip: string) => ReactNode }) {
  const id = useId().replace(/:/g, '');
  return (
    <Svg {...p}>
      <defs>
        <clipPath id={`c${id}`}>
          <circle cx={24} cy={24} r={14.4} />
        </clipPath>
      </defs>
      <circle cx={24} cy={24} r={15} />
      {children(`url(#c${id})`)}
    </Svg>
  );
}

function Miller(p: IconProps) {
  return (
    <Planet {...p}>
      {(clip) => (
        <g clipPath={clip}>
          {/* horizon and a single colossal wave */}
          <path d="M8 27 Q12 26 16 27 T24 27 T32 27 T40 27" opacity={0.7} />
          <path d="M8 31 Q12 30 16 31 T24 31 T32 31 T40 31" opacity={0.5} />
          <path d="M8 35 Q12 34 16 35 T24 35 T32 35 T40 35" opacity={0.35} />
          <path d="M14 27 C 18 25, 22 13, 28 12 C 31 11.6, 33 14, 31 15.5 C 29 17, 30 22, 36 27" />
          <path d="M20 23 C 23 19, 25 16, 28 15" opacity={0.5} />
          <path d="M9 39 H39" opacity={0.25} />
        </g>
      )}
    </Planet>
  );
}

function Mann(p: IconProps) {
  return (
    <Planet {...p}>
      {(clip) => (
        <g clipPath={clip}>
          {/* faceted ice terrain and suspended cloud deck */}
          <path d="M9 30 L15 22 L19 27 L24 17 L29 25 L33 20 L40 29" />
          <path d="M15 22 L17 31 L19 27 M24 17 L22 31 M24 17 L27 31 L29 25 M33 20 L32 31" opacity={0.55} />
          <path d="M9 33 H40" opacity={0.6} />
          <path d="M8 14 Q16 11 24 13 T40 12" opacity={0.45} strokeDasharray="2 1.6" />
          <path d="M12 37 L18 33 L24 36 L30 33 L37 37" opacity={0.4} />
        </g>
      )}
    </Planet>
  );
}

function Edmunds(p: IconProps) {
  return (
    <Planet {...p}>
      {(clip) => (
        <g clipPath={clip}>
          <path d="M9 29 C 13 27, 15 30, 19 28 S 26 23, 30 26 S 37 28, 40 26" />
          <path d="M9 33 C 15 32, 20 34, 26 32 S 36 33, 40 32" opacity={0.5} />
          <ellipse cx={18} cy={18} rx={3} ry={2} opacity={0.65} />
          <ellipse cx={30} cy={15.5} rx={2} ry={1.3} opacity={0.5} />
          <ellipse cx={27} cy={20.5} rx={1.2} ry={0.8} opacity={0.5} />
          {/* camp marker */}
          <path d="M23 28 V22.5 L26.5 24 L23 25.4" opacity={0.85} />
        </g>
      )}
    </Planet>
  );
}

function Gargantua(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 25.5 Q24 31 44 25.5" opacity={0.6} />
      <path d="M13.5 23 A11 11 0 0 1 34.5 23" opacity={0.7} />
      <circle cx={24} cy={24} r={8} fill="#000" />
      <path d="M4 25.5 Q24 21 44 25.5" />
      <path d="M15 28 A10 9 0 0 0 33 28" opacity={0.45} />
    </Svg>
  );
}

function Nasa(p: IconProps) {
  return (
    <Svg {...p}>
      {/* half-buried technical block with a circular blast door */}
      <path d="M6 33 L24 42 L42 33" opacity={0.5} />
      <path d="M10 27 L24 34 L38 27 L24 20 Z" />
      <path d="M10 27 V31 L24 38 V34 M38 27 V31 L24 38" />
      <ellipse cx={31} cy={33.2} rx={3.2} ry={2.6} transform="rotate(-27 31 33.2)" />
      <path d="M24 20 V9 M24 9 L30 12 M24 12.5 L28.5 14.7" />
      <circle cx={24} cy={9} r={1.2} />
      <path d="M14 26 L24 21 L34 26" opacity={0.4} strokeDasharray="1.2 1.4" />
    </Svg>
  );
}

function Farm(p: IconProps) {
  return (
    <Svg {...p}>
      {/* farmhouse elevation, silo and crop rows */}
      <path d="M8 24 L16 17 L24 24" />
      <path d="M10 22.3 V30 H22 V22.3" />
      <path d="M14.5 30 V26 H17.5 V30" opacity={0.75} />
      <path d="M19.5 25 H21 V26.5 H19.5 Z" opacity={0.6} />
      <path d="M29 30 V16.5 A3.5 2 0 0 1 36 16.5 V30" />
      <path d="M29 16.5 A3.5 1.4 0 0 0 36 16.5" opacity={0.6} />
      <path d="M4 30 H44" />
      <path d="M24 30 L6 42 M24 30 L14 42 M24 30 L22 42 M24 30 L30 42 M24 30 L38 42 M24 30 L44 37" opacity={0.4} />
    </Svg>
  );
}

function Station(p: IconProps) {
  return (
    <Svg {...p}>
      {/* rotating cylindrical habitat */}
      <ellipse cx={12} cy={24} rx={4.5} ry={11} />
      <path d="M12 13 H36 M12 35 H36" />
      <path d="M36 13 A4.5 11 0 0 1 36 35" />
      <path d="M36 13 A4.5 11 0 0 0 36 35" opacity={0.35} strokeDasharray="1.5 1.5" />
      <path d="M14 18 Q24 16.4 34 18 M14.6 30 Q24 31.6 34 30" opacity={0.5} />
      <path d="M17 22 H20 M23 26 H27 M29 21 H32" opacity={0.6} />
      <ellipse cx={12} cy={24} rx={1.8} ry={4.4} opacity={0.6} />
      <path d="M2 24 H7.5" opacity={0.5} />
    </Svg>
  );
}

function Ranger(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 30 L22 22 L44 17 L30 27 L10 33 Z" />
      <path d="M22 22 L26 29 M30 27 L36 31 L28 31" opacity={0.75} />
      <path d="M13 28.5 L28 24" opacity={0.5} />
      <path d="M4 30 L1 32.5 M10 33 L7 36" opacity={0.5} />
    </Svg>
  );
}

function Truck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 30 V24 H20 L24 18 H33 L36 24 H44 V30 H40" />
      <path d="M33 18 V24 H24" opacity={0.6} />
      <path d="M14 30 H30" />
      <circle cx={10} cy={30.5} r={3.4} />
      <circle cx={35} cy={30.5} r={3.4} />
      <path d="M4 24 H20 V30" opacity={0.6} />
      <path d="M2 36 H46" opacity={0.3} strokeDasharray="2 2" />
    </Svg>
  );
}

function Watch(p: IconProps) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const t = (i / 12) * Math.PI * 2;
    return `M${24 + Math.cos(t) * 12} ${24 + Math.sin(t) * 12} L${24 + Math.cos(t) * 14} ${24 + Math.sin(t) * 14}`;
  }).join(' ');
  return (
    <Svg {...p}>
      <circle cx={24} cy={24} r={16} />
      <path d={ticks} opacity={0.7} />
      <path d="M24 24 L24 12 M24 24 L31 27" />
      <path d="M20 7.5 H28 M20 40.5 H28" opacity={0.5} />
    </Svg>
  );
}

const REGISTRY: Record<IconId, (p: IconProps) => ReactNode> = {
  bedroom: Bedroom,
  tesseract: Tesseract,
  endurance: Endurance,
  saturn: Saturn,
  wormhole: Wormhole,
  miller: Miller,
  mann: Mann,
  edmunds: Edmunds,
  gargantua: Gargantua,
  nasa: Nasa,
  farm: Farm,
  station: Station,
  ranger: Ranger,
  truck: Truck,
  watch: Watch,
};

export function Icon({ id, ...p }: IconProps & { id: IconId }) {
  const C = REGISTRY[id];
  return <C {...p} />;
}
