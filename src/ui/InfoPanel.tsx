import { CONNECTION_MAP, connectionsOf, isConnectionVisible, LAYER_META } from '../data/connections';
import { NODE_MAP } from '../data/nodes';
import { THRESHOLD_MAP } from '../data/thresholds';
import type { AtlasConnection, Layer, NodeId } from '../data/types';
import { Icon } from '../icons/Icons';
import { actions, useAtlas } from '../state/store';

const LAYER_CLASS: Record<Layer, string> = {
  physical: 'ln-physical',
  spacetime: 'ln-spacetime',
  information: 'ln-information',
};

function LayerTick({ layer }: { layer: Layer }) {
  return <span className={`layer-tick ${LAYER_CLASS[layer]}`} aria-hidden="true" />;
}

function ConnectionRow({ c, from }: { c: AtlasConnection; from: NodeId }) {
  const other = c.from === from ? c.to : c.from;
  const dir = c.bidirectional ? '↔' : c.from === from ? '→' : '←';
  return (
    <li>
      <button
        type="button"
        className="conn-row"
        onClick={() => actions.selectConnection(c.id)}
        onPointerEnter={() => actions.hoverConnection(c.id)}
        onPointerLeave={() => actions.hoverConnection(null)}
      >
        <LayerTick layer={c.layer} />
        <span className="conn-row__dir">{dir}</span>
        <span className="conn-row__name">{NODE_MAP[other].name}</span>
        <span className="conn-row__label">{c.label}</span>
      </button>
    </li>
  );
}

function NodePanel({ id }: { id: NodeId }) {
  const n = NODE_MAP[id];
  const layers = useAtlas((s) => s.layers);
  const conns = connectionsOf(id).filter((c) => isConnectionVisible(c, layers));
  return (
    <>
      <div className="panel__head">
        <span className="panel__icon">
          <Icon id={n.icon} size={40} />
        </span>
        <div>
          <p className="micro">{n.category} · {n.spaceType}</p>
          <h2 className="panel__title">{n.name}</h2>
        </div>
      </div>
      <p className="panel__lede">{n.tagline}</p>
      <p className="panel__text">{n.description}</p>

      <dl className="meta">
        <div>
          <dt>Scale</dt>
          <dd>{n.scale}</dd>
        </div>
        {n.timeNote && (
          <div>
            <dt>Time</dt>
            <dd>{n.timeNote}</dd>
          </div>
        )}
      </dl>

      <details className="panel__reading">
        <summary className="micro">Spatial reading</summary>
        <p>{n.analysis}</p>
        <p className="panel__prod">
          <span className="micro">Production</span> {n.production}
        </p>
      </details>

      {conns.length > 0 && (
        <section>
          <h3 className="micro panel__sub">Connections</h3>
          <ul className="conn-list">
            {conns.map((c) => (
              <ConnectionRow key={c.id} c={c} from={id} />
            ))}
          </ul>
        </section>
      )}

      {n.thresholds.length > 0 && (
        <section>
          <h3 className="micro panel__sub">Thresholds</h3>
          <ul className="th-list">
            {n.thresholds.map((t) => {
              const th = THRESHOLD_MAP[t];
              const reverse = t === 'bedroom-tesseract' && id === 'tesseract';
              return (
                <li key={t}>
                  <button type="button" className="th-row" onClick={() => actions.openThreshold(t, reverse)}>
                    <span className="th-row__code">{th.code}</span>
                    <span className="th-row__title">{reverse ? 'Tesseract ↔ Murph’s Bedroom' : th.title}</span>
                    <span className="th-row__play" aria-hidden="true">▸</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="panel__actions">
        {n.hasScene && (
          <button type="button" className="btn btn--primary" onClick={() => actions.openScene(id)}>
            Enter scene
          </button>
        )}
        <button type="button" className="btn" onClick={() => actions.clearSelection()}>
          Back to map
        </button>
      </div>
    </>
  );
}

function ConnectionPanel({ id }: { id: string }) {
  const c = CONNECTION_MAP[id];
  const th = c.thresholdId ? THRESHOLD_MAP[c.thresholdId] : null;
  return (
    <>
      <p className="micro">
        <LayerTick layer={c.layer} /> {LAYER_META[c.layer].name}
        {c.alsoLayer ? ` + ${LAYER_META[c.alsoLayer].name}` : ''} · {c.carrier}
      </p>
      <h2 className="panel__title panel__title--route">
        <button type="button" className="linklike" onClick={() => actions.selectNode(c.from)}>
          {NODE_MAP[c.from].name}
        </button>
        <span className="route-arrow">{c.bidirectional ? '↔' : '→'}</span>
        <button type="button" className="linklike" onClick={() => actions.selectNode(c.to)}>
          {NODE_MAP[c.to].name}
        </button>
      </h2>
      <p className="panel__lede">{c.label}</p>
      <ul className="chips" aria-label="Threshold type">
        {c.types.map((t) => (
          <li key={t} className="tchip">
            {t}
          </li>
        ))}
      </ul>
      <p className="panel__text">{c.summary}</p>
      {c.style === 'axis' && (
        <p className="panel__note">
          This line is <em>symbolic</em>, not a route: no one travels between the bedroom and the Tesseract. It marks
          gravitational communication across time.
        </p>
      )}
      {c.style === 'branch-brand' && <p className="panel__note">Brand’s trajectory does not enter the Tesseract.</p>}
      {th && (
        <div className="panel__th">
          <p className="micro">
            {th.code} · {th.techniques.slice(0, 3).join(' · ')}
          </p>
          <button type="button" className="btn btn--primary" onClick={() => actions.openThreshold(th.id, false)}>
            ▸ Experience transition
          </button>
        </div>
      )}
      <div className="panel__actions">
        <button type="button" className="btn" onClick={() => actions.clearSelection()}>
          Back to map
        </button>
      </div>
    </>
  );
}

export function InfoPanel() {
  const selectedNode = useAtlas((s) => s.selectedNode);
  const selectedConnection = useAtlas((s) => s.selectedConnection);
  const view = useAtlas((s) => s.view);
  const mode = useAtlas((s) => s.mode);
  if (view !== 'map' || mode === 'analysis') return null;
  if (!selectedNode && !selectedConnection) return null;
  return (
    <aside className="panel" aria-live="polite" key={selectedNode ?? selectedConnection ?? ''}>
      <button type="button" className="panel__close" aria-label="Close" onClick={() => actions.clearSelection()}>
        ×
      </button>
      {selectedNode ? <NodePanel id={selectedNode} /> : selectedConnection ? <ConnectionPanel id={selectedConnection} /> : null}
    </aside>
  );
}
