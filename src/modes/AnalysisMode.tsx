import { useState } from 'react';
import { CONNECTIONS } from '../data/connections';
import { NODES, NODE_MAP } from '../data/nodes';
import { THRESHOLDS } from '../data/thresholds';
import type { NodeId, ThresholdType } from '../data/types';
import { Icon } from '../icons/Icons';
import { CHAPTERS, chapterIndexForNode } from '../cinema/chapters';
import { actions, useAtlas } from '../state/store';
import { FlatMap } from './FlatMap';
import { TemporalChart } from './TemporalChart';

type Tab = 'thresholds' | 'layers' | 'time' | 'scale' | 'space' | 'trajectories';

const TABS: { id: Tab; label: string }[] = [
  { id: 'thresholds', label: 'Threshold classification' },
  { id: 'layers', label: 'Physical vs informational' },
  { id: 'time', label: 'Temporal discontinuity' },
  { id: 'scale', label: 'Architectural scale' },
  { id: 'space', label: 'Set, space & camera' },
  { id: 'trajectories', label: 'Character trajectories' },
];

const TYPES: ThresholdType[] = [
  'Physical',
  'Information',
  'Dimensional',
  'Temporal',
  'Topological',
  'Scale',
  'Mechanical',
  'Spatial',
  'Gravitational',
  'Narrative',
];

function ThresholdMatrix() {
  return (
    <div className="analysis__block">
      <p className="analysis__intro">
        Eight thresholds, each with its own transformation. A threshold here is any cinematic passage that connects two otherwise
        disconnected environments — by movement, by gravity, by time, or by information.
      </p>
      <div className="matrix" role="table" aria-label="Threshold classification matrix">
        <div className="matrix__row matrix__row--head" role="row">
          <span role="columnheader" />
          {TYPES.map((t) => (
            <span key={t} role="columnheader" className="matrix__col">
              {t}
            </span>
          ))}
        </div>
        {THRESHOLDS.map((th) => (
          <div key={th.id} className="matrix__row" role="row">
            <button type="button" role="rowheader" className="matrix__name" onClick={() => actions.openThreshold(th.id)}>
              <span className="th-row__code">{th.code}</span> {th.title}
            </button>
            {TYPES.map((t) => (
              <span key={t} role="cell" className="matrix__cell">
                {th.types.includes(t) ? <span className={`dot ${th.types[0] === t ? 'dot--primary' : ''}`} aria-label={t} /> : null}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="micro">Filled gold = primary type · click a row to experience the threshold</p>
    </div>
  );
}

function LayerMultiples() {
  const count = (l: string) => CONNECTIONS.filter((c) => c.layer === l).length;
  return (
    <div className="analysis__block">
      <p className="analysis__intro">
        The same world, decomposed. Physical travel draws a long chain through the Endurance; space-time relations radiate from Gargantua;
        information collapses the map onto the vertical axis between the bedroom and the Tesseract.
      </p>
      <div className="multiples">
        <figure>
          <FlatMap size={300} layers={['physical']} showLabels={false} title="Physical journeys" />
          <figcaption>
            <span className="micro">Physical · {count('physical')} routes</span>
            <span>Hub: Endurance. A chain, not a network.</span>
          </figcaption>
        </figure>
        <figure>
          <FlatMap size={300} layers={['spacetime']} showLabels={false} title="Space-time relations" />
          <figcaption>
            <span className="micro">Space-time · {count('spacetime')} relations</span>
            <span>Centre: Gargantua. Topology, dilation, dimension.</span>
          </figcaption>
        </figure>
        <figure>
          <FlatMap size={300} layers={['information']} showLabels={false} title="Information connections" />
          <figcaption>
            <span className="micro">Information · {count('information')} links</span>
            <span>Axis: bedroom ↔ Tesseract. Signal without travel.</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

const SCALE_STEPS: { id: NodeId; label: string; log: number }[] = [
  { id: 'bedroom', label: 'Room · 4 m', log: 0.6 },
  { id: 'nasa', label: 'Facility · 100s m', log: 2.5 },
  { id: 'farm', label: 'Fields · 1 km', log: 3 },
  { id: 'miller', label: 'Wave · 1.2 km', log: 3.1 },
  { id: 'station', label: 'Habitat · kms', log: 3.8 },
  { id: 'endurance', label: 'Spacecraft · ring', log: 1.8 },
  { id: 'wormhole', label: 'Throat · 2 km', log: 3.3 },
  { id: 'saturn', label: 'Rings · 10⁸ m', log: 8.4 },
  { id: 'gargantua', label: 'Horizon · 10¹¹ m+', log: 11.5 },
];

function ScaleBar() {
  const W = 760;
  const AX = 196;
  const x = (l: number) => 30 + (l / 12) * (W - 60);
  const sorted = [...SCALE_STEPS].sort((a, b) => a.log - b.log);
  const levels = [34, 70, 106, 142];
  return (
    <div className="analysis__block">
      <p className="analysis__intro">
        Architecture usually works within one order of magnitude. Interstellar cuts across twelve. Its thresholds are often scale jumps:
        the same human body moves from a 4-metre room to the orbit of a black hole.
      </p>
      <svg viewBox={`0 0 ${W} 240`} className="scalebar" role="img" aria-label="Logarithmic scale of the spaces">
        <line x1={30} y1={AX} x2={W - 30} y2={AX} stroke="#ece8e0" strokeOpacity={0.6} />
        {Array.from({ length: 13 }, (_, i) => (
          <g key={i}>
            <line x1={x(i)} y1={AX - 6} x2={x(i)} y2={AX + 6} stroke="#ece8e0" strokeOpacity={0.5} />
            <text x={x(i)} y={AX + 24} textAnchor="middle" className="tchart__tick">
              10{String(i).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d])} m
            </text>
          </g>
        ))}
        {sorted.map((s, i) => {
          const lift = AX - levels[i % levels.length];
          return (
            <g key={s.id} transform={`translate(${x(s.log)},0)`}>
              <line x1={0} y1={AX} x2={0} y2={lift + 6} stroke="#f0c98f" strokeOpacity={0.5} />
              <circle cy={AX} r={3} fill="#f0c98f" />
              <text x={4} y={lift - 10} className="tchart__ev">
                {NODE_MAP[s.id].name}
              </text>
              <text x={4} y={lift + 2} className="tchart__note">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="micro">Approximate orders of magnitude · logarithmic</p>
    </div>
  );
}

function SpaceTable() {
  return (
    <div className="analysis__block">
      <p className="analysis__intro">
        Each environment balances constructed set and fictional space. Practical construction anchors the body; effects extend the frame.
        The camera language shifts with the type of space.
      </p>
      <div className="stable" role="table" aria-label="Spaces, production and camera">
        <div className="stable__row stable__row--head" role="row">
          <span role="columnheader">Location</span>
          <span role="columnheader">Spatial type</span>
          <span role="columnheader">Set vs fictional space</span>
          <span role="columnheader">Camera language (this atlas)</span>
        </div>
        {NODES.map((n) => (
          <div key={n.id} className="stable__row" role="row">
            <button type="button" role="rowheader" className="stable__name" onClick={() => actions.openScene(n.id)}>
              <Icon id={n.icon} size={22} /> {n.name}
            </button>
            <span role="cell">{n.spaceType}</span>
            <span role="cell">{n.production}</span>
            <span role="cell">{CHAPTERS[chapterIndexForNode(n.id)].view}</span>
          </div>
        ))}
      </div>
      <p className="micro">Production notes are general and paraphrased · click a location to enter its scene</p>
    </div>
  );
}

const TRAJ: { who: string; color: string; dash?: string; path: NodeId[] }[] = [
  {
    who: 'Cooper',
    color: '#ece8e0',
    path: ['farm', 'nasa', 'endurance', 'saturn', 'wormhole', 'miller', 'endurance', 'mann', 'endurance', 'gargantua', 'tesseract', 'station', 'edmunds'],
  },
  {
    who: 'Brand',
    color: '#f0c98f',
    path: ['nasa', 'endurance', 'saturn', 'wormhole', 'miller', 'endurance', 'mann', 'endurance', 'gargantua', 'edmunds'],
  },
  { who: 'Murph', color: '#a9c3e6', dash: '2 4', path: ['bedroom', 'farm', 'nasa', 'farm', 'bedroom', 'station'] },
];

const ORDER: NodeId[] = ['bedroom', 'farm', 'nasa', 'endurance', 'saturn', 'wormhole', 'miller', 'mann', 'gargantua', 'tesseract', 'edmunds', 'station'];

function Trajectories() {
  const W = 760;
  const H = 360;
  const TOP = 96;
  const col = (id: NodeId) => 60 + (ORDER.indexOf(id) / (ORDER.length - 1)) * (W - 120);
  return (
    <div className="analysis__block">
      <p className="analysis__intro">
        Three bodies, three kinds of route. Cooper’s path is the only one to pass through every kind of threshold. Brand’s never enters the
        Tesseract. Murph barely travels — the world comes to her room.
      </p>
      <ul className="traj__legend">
        {TRAJ.map((t) => (
          <li key={t.who}>
            <svg width="28" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="27" y2="4" stroke={t.color} strokeWidth="1.4" strokeDasharray={t.dash} />
            </svg>
            {t.who}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="traj" role="img" aria-label="Character trajectories through the atlas">
        {ORDER.map((id) => (
          <g key={id}>
            <line x1={col(id)} y1={TOP} x2={col(id)} y2={H - 16} stroke="#ece8e0" strokeOpacity={0.08} />
            <text x={col(id)} y={TOP - 12} transform={`rotate(-38 ${col(id)} ${TOP - 12})`} className="tchart__ev">
              {NODE_MAP[id].name}
            </text>
          </g>
        ))}
        {TRAJ.map((t, ti) => {
          const step = (H - TOP - 30) / (t.path.length + 1);
          const pts = t.path.map((id, i) => [col(id), TOP + 14 + i * step + ti * 4] as [number, number]);
          return (
            <g key={t.who}>
              <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={t.color} strokeWidth={1.4} strokeDasharray={t.dash} opacity={0.9} />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill="#000" stroke={t.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <p className="micro">Vertical = narrative order · horizontal = location · Murph’s route is mostly informational</p>
    </div>
  );
}

export function AnalysisMode() {
  const mode = useAtlas((s) => s.mode);
  const view = useAtlas((s) => s.view);
  const [tab, setTab] = useState<Tab>('thresholds');
  if (mode !== 'analysis' || view !== 'map') return null;
  return (
    <section className="analysis" aria-label="Analysis mode">
      <header className="analysis__head">
        <div>
          <p className="micro">Analysis · architectural & cinematic reading</p>
          <h2 className="analysis__title">How disconnected spaces become one world</h2>
        </div>
        <button type="button" className="btn" onClick={() => actions.setMode('explore')}>
          ← Back to map
        </button>
      </header>
      <nav className="analysis__tabs" aria-label="Analysis topics">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`tab ${tab === t.id ? 'is-on' : ''}`} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="analysis__body">
        {tab === 'thresholds' && <ThresholdMatrix />}
        {tab === 'layers' && <LayerMultiples />}
        {tab === 'time' && (
          <div className="analysis__block">
            <p className="analysis__intro">
              Space in Interstellar is continuous; time is not. The same journey is measured by two clocks that drift apart — and the
              Tesseract reaches back across the Earth timeline without travelling along it.
            </p>
            <TemporalChart />
          </div>
        )}
        {tab === 'scale' && <ScaleBar />}
        {tab === 'space' && <SpaceTable />}
        {tab === 'trajectories' && <Trajectories />}
      </div>
    </section>
  );
}
