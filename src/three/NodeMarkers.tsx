import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { CONNECTIONS, ROUTE_GLYPHS, isConnectionVisible } from '../data/connections';
import { NODES } from '../data/nodes';
import type { AtlasNode, NodeId } from '../data/types';
import { Icon } from '../icons/Icons';
import { actions, useAtlas } from '../state/store';
import { R, getCurve, nodeWorld, toWorld } from './geometry/space';

type NodeState = 'active' | 'related' | 'dim' | 'base';

function useNodeStates(): Record<NodeId, NodeState> {
  const hoveredNode = useAtlas((s) => s.hoveredNode);
  const selectedNode = useAtlas((s) => s.selectedNode);
  const hoveredConnection = useAtlas((s) => s.hoveredConnection);
  const selectedConnection = useAtlas((s) => s.selectedConnection);
  const layers = useAtlas((s) => s.layers);

  return useMemo(() => {
    const focusNode = hoveredNode ?? (hoveredConnection ? null : selectedNode);
    const focusConn = hoveredConnection ?? (hoveredNode ? null : selectedConnection);
    const out = {} as Record<NodeId, NodeState>;
    const related = new Set<NodeId>();
    const active = new Set<NodeId>();
    if (focusNode) {
      active.add(focusNode);
      CONNECTIONS.forEach((c) => {
        if (!isConnectionVisible(c, layers)) return;
        if (c.from === focusNode) related.add(c.to);
        if (c.to === focusNode) related.add(c.from);
      });
    }
    if (focusConn) {
      const c = CONNECTIONS.find((x) => x.id === focusConn);
      if (c) {
        active.add(c.from);
        active.add(c.to);
      }
    }
    if (selectedNode) active.add(selectedNode);
    const any = !!(focusNode || focusConn);
    NODES.forEach((n) => {
      out[n.id] = active.has(n.id) ? 'active' : related.has(n.id) ? 'related' : any ? 'dim' : 'base';
    });
    return out;
  }, [hoveredNode, selectedNode, hoveredConnection, selectedConnection, layers]);
}

function handlers(id: NodeId) {
  return {
    onPointerEnter: () => actions.hoverNode(id),
    onPointerLeave: () => actions.hoverNode(null),
    onFocus: () => actions.hoverNode(id),
    onBlur: () => actions.hoverNode(null),
    onClick: () => actions.selectNode(id),
  };
}

function NodeMarker({ node, state }: { node: AtlasNode; state: NodeState }) {
  const pos = useMemo(() => nodeWorld(node.id), [node.id]);
  const hovered = useAtlas((s) => s.hoveredNode === node.id);
  if (node.marker === 'core') return null;
  const side = node.label.at ? null : node.label.side ?? 'right';
  return (
    <Html position={pos} center zIndexRange={[40, 10]} className="html-anchor">
      <div className={`node node--${node.marker} is-${state}`} data-node={node.id}>
        <button type="button" className="node__hit" aria-label={`${node.name}. ${node.tagline}`} {...handlers(node.id)}>
          {node.marker === 'card' ? (
            <span className="node__card">
              <Icon id={node.icon} size={44} />
            </span>
          ) : (
            <>
              <span className="node__ring" />
              <span className="node__mini">
                <Icon id={node.icon} size={30} />
              </span>
            </>
          )}
        </button>
        {side && <span className={`chip chip--${node.label.size} chip--${side}`}>{node.name}</span>}
        {hovered && <span className={`node__tip node__tip--${side ?? 'bottom'}`}>{node.tagline}</span>}
      </div>
    </Html>
  );
}

function FreeLabel({ node, state }: { node: AtlasNode; state: NodeState }) {
  const at = node.label.at!;
  const pos = useMemo(() => toWorld(at, 0), [at]);
  const hovered = useAtlas((s) => s.hoveredNode === node.id);
  return (
    <Html position={pos} center zIndexRange={[40, 10]} className="html-anchor">
      <button
        type="button"
        className={`chip chip--${node.label.size} chip--free is-${state}`}
        tabIndex={node.marker === 'core' ? 0 : -1}
        aria-label={node.marker === 'core' ? `${node.name}. ${node.tagline}` : undefined}
        {...handlers(node.id)}
      >
        {node.name}
      </button>
      {hovered && node.marker === 'core' && <span className="node__tip node__tip--free">{node.tagline}</span>}
    </Html>
  );
}

/** White ring markers at the poles of the Murph ↔ Tesseract axis. */
function Poles({ states }: { states: Record<NodeId, NodeState> }) {
  return (
    <>
      {(
        [
          ['bedroom', 1],
          ['tesseract', -1],
        ] as const
      ).map(([id, s]) => (
        <Html key={id} position={[0, s * R, 0]} center zIndexRange={[35, 10]} className="html-anchor">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={`pole is-${states[id]}`}
            onClick={() => actions.selectNode(id)}
            onPointerEnter={() => actions.hoverNode(id)}
            onPointerLeave={() => actions.hoverNode(null)}
          />
        </Html>
      ))}
    </>
  );
}

function RouteGlyphs() {
  const layers = useAtlas((s) => s.layers);
  const hoveredConnection = useAtlas((s) => s.hoveredConnection);
  const selectedConnection = useAtlas((s) => s.selectedConnection);
  const glyphs = useMemo(
    () => ROUTE_GLYPHS.map((g) => ({ ...g, pos: getCurve(g.connectionId).getPointAt(g.t) })),
    [],
  );
  return (
    <>
      {glyphs.map((g) => {
        const conn = CONNECTIONS.find((c) => c.id === g.connectionId)!;
        if (!isConnectionVisible(conn, layers)) return null;
        const active = hoveredConnection === conn.id || selectedConnection === conn.id;
        return (
          <Html key={g.connectionId} position={g.pos} center zIndexRange={[30, 5]} className="html-anchor">
            <button
              type="button"
              tabIndex={-1}
              className={`glyph ${active ? 'is-active' : ''}`}
              style={{ transform: `translate(${g.offset?.[0] ?? 0}px, ${g.offset?.[1] ?? 0}px)` }}
              onPointerEnter={() => actions.hoverConnection(conn.id)}
              onPointerLeave={() => actions.hoverConnection(null)}
              onClick={() => actions.selectConnection(conn.id)}
            >
              <Icon id={g.icon} size={g.icon === 'truck' ? 38 : 64} strokeWidth={g.icon === 'truck' ? 1.1 : 0.9} />
              {g.caption && <span className="glyph__caption">{g.caption}</span>}
            </button>
          </Html>
        );
      })}
    </>
  );
}

export function NodeMarkers() {
  const states = useNodeStates();
  return (
    <group>
      {NODES.map((n) => (
        <NodeMarker key={n.id} node={n} state={states[n.id]} />
      ))}
      {NODES.filter((n) => n.label.at).map((n) => (
        <FreeLabel key={`label-${n.id}`} node={n} state={states[n.id]} />
      ))}
      <Poles states={states} />
      <RouteGlyphs />
    </group>
  );
}
