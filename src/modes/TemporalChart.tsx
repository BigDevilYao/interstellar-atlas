/**
 * TEMPORAL VISUALISATION (conceptual)
 * Two clocks that do not agree: Earth / Murph time vs. mission proper time.
 * Connector lines shear where gravity or speed stretches time. Figures follow
 * the film's own dialogue and are approximate; this is not a universal clock.
 */

interface Event {
  label: string;
  earth: number; // years since launch (Earth frame), approximate
  mission: number; // position on the compressed mission axis (0..1)
  note?: string;
  gold?: boolean;
  /** Label row below the mission axis (0 or 1) to avoid collisions. */
  row?: number;
  /** Note placement relative to the Earth axis. */
  noteAt?: { dx: number; dy: number; anchor?: 'start' | 'end' };
}

const EVENTS: Event[] = [
  { label: 'Launch', earth: 0, mission: 0.02 },
  { label: 'Saturn', earth: 2, mission: 0.2, note: '≈ 2 years (hypersleep)', noteAt: { dx: 0, dy: -30, anchor: 'start' } },
  { label: 'Miller landing', earth: 2.1, mission: 0.38 },
  {
    label: 'Return to Endurance',
    earth: 25.4,
    mission: 0.47,
    row: 1,
    note: '+23 y 4 m 8 d, for a few hours',
    gold: true,
    noteAt: { dx: 0, dy: -30, anchor: 'start' },
  },
  { label: 'Mann’s Planet', earth: 25.6, mission: 0.62 },
  { label: 'Gargantua slingshot', earth: 77, mission: 0.8, row: 1, note: '≈ 51 more years (in film)', gold: true, noteAt: { dx: 0, dy: -30, anchor: 'end' } },
];

const EARTH_MAX = 90;

export function TemporalChart() {
  const W = 760;
  const H = 330;
  const x0 = 150;
  const x1 = W - 40;
  const yE = 92;
  const yM = 240;
  const ex = (y: number) => x0 + (y / EARTH_MAX) * (x1 - x0);
  const mx = (m: number) => x0 + m * (x1 - x0);

  return (
    <figure className="tchart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Conceptual comparison of Earth time and mission time">
        {/* axes */}
        <text x={20} y={yE + 4} className="tchart__axis">EARTH · MURPH</text>
        <text x={20} y={yE + 18} className="tchart__sub">years since launch</text>
        <text x={20} y={yM + 4} className="tchart__axis">MISSION · COOPER</text>
        <text x={20} y={yM + 18} className="tchart__sub">proper time (compressed)</text>
        <line x1={x0} y1={yE} x2={x1} y2={yE} stroke="#ece8e0" strokeOpacity={0.7} />
        <line x1={x0} y1={yM} x2={x1} y2={yM} stroke="#ece8e0" strokeOpacity={0.7} />
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => (
          <g key={y}>
            <line x1={ex(y)} y1={yE - 4} x2={ex(y)} y2={yE + 4} stroke="#ece8e0" strokeOpacity={0.5} />
            <text x={ex(y)} y={yE + 18} className="tchart__tick" textAnchor="middle">
              {y}
            </text>
          </g>
        ))}
        {/* connectors (shear = dilation) */}
        {EVENTS.map((e) => (
          <g key={e.label}>
            <line
              x1={mx(e.mission)}
              y1={yM}
              x2={ex(e.earth)}
              y2={yE}
              stroke={e.gold ? '#f0c98f' : '#ece8e0'}
              strokeOpacity={e.gold ? 0.9 : 0.35}
              strokeDasharray={e.gold ? undefined : '3 4'}
            />
            <circle cx={mx(e.mission)} cy={yM} r={3} fill="#000" stroke="#ece8e0" />
            <circle cx={ex(e.earth)} cy={yE} r={3} fill={e.gold ? '#f0c98f' : '#000'} stroke="#ece8e0" />
            <text x={mx(e.mission)} y={yM + 22 + (e.row ?? 0) * 16} className="tchart__ev" textAnchor="middle">
              {e.label}
            </text>
            {e.note && e.noteAt && (
              <g>
                <line
                  x1={ex(e.earth)}
                  y1={yE - 5}
                  x2={ex(e.earth)}
                  y2={yE + e.noteAt.dy + 4}
                  stroke={e.gold ? '#f0c98f' : '#ece8e0'}
                  strokeOpacity={0.4}
                />
                <text x={ex(e.earth) + e.noteAt.dx} y={yE + e.noteAt.dy} className="tchart__note" textAnchor={e.noteAt.anchor ?? 'start'}>
                  {e.note}
                </text>
              </g>
            )}
          </g>
        ))}
        {/* Miller: 1 h ≈ 7 y */}
        <path d={`M${mx(0.4)},${yM} L${mx(0.46)},${yM}`} stroke="#f0c98f" strokeWidth={3} />
        <text x={mx(0.425)} y={yM - 10} className="tchart__note" textAnchor="middle">1 h ≈ 7 y</text>
        {/* Tesseract: outside the timeline, looping into the bedroom at two moments */}
        <g>
          <rect x={mx(0.9) - 30} y={yM - 34} width={60} height={26} fill="#000" stroke="#ece8e0" strokeDasharray="2 3" />
          <text x={mx(0.9)} y={yM - 17} className="tchart__ev" textAnchor="middle">Tesseract</text>
          <path d={`M${mx(0.9) - 30},${yM - 30} C ${mx(0.5)},${yE + 80} ${ex(-2) + 40},${yE + 60} ${ex(0)},${yE}`} fill="none" stroke="#a9c3e6" strokeDasharray="1 4" strokeWidth={1.6} />
          <path d={`M${mx(0.9)},${yM - 34} C ${mx(0.9)},${yE + 70} ${ex(26) + 40},${yE + 50} ${ex(26)},${yE}`} fill="none" stroke="#a9c3e6" strokeDasharray="1 4" strokeWidth={1.6} />
          <text x={ex(0) - 6} y={yE - 14} className="tchart__note tchart__note--blue" textAnchor="end">child Murph</text>
          <text x={ex(26) + 8} y={yE + 46} className="tchart__note tchart__note--blue">adult Murph · the watch</text>
        </g>
      </svg>
      <figcaption className="micro">
        Conceptual diagram · approximate values from the film’s dialogue · gold = gravitational / relativistic time cost · blue = nonlinear
        information from the Tesseract
      </figcaption>
    </figure>
  );
}
