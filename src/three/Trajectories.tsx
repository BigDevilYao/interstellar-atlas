import { Line } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CONNECTIONS, isConnectionVisible } from '../data/connections';
import type { AtlasConnection, Layer } from '../data/types';
import { actions, getState, useAtlas } from '../state/store';
import { getCurve, samplePoints } from './geometry/space';
import { glowPointsMaterial } from './materials';

type VisualState = 'base' | 'active' | 'dim';

interface Style {
  color: string;
  width: number;
  opacity: number;
  dashed: boolean;
  dashSize?: number;
  gapSize?: number;
  flow: number; // dash offset speed
}

const LAYER_COLOR: Record<Layer, string> = {
  physical: '#ece8e0',
  spacetime: '#f0c98f',
  information: '#a9c3e6',
};

function styleOf(c: AtlasConnection): Style {
  if (c.style === 'axis') return { color: '#ffffff', width: 1.7, opacity: 0.8, dashed: true, dashSize: 0.42, gapSize: 0.26, flow: 0.25 };
  if (c.style === 'branch-cooper')
    return { color: '#f0c98f', width: 1.45, opacity: 0.72, dashed: true, dashSize: 0.3, gapSize: 0.18, flow: 0.5 };
  if (c.style === 'branch-brand') return { color: '#ece8e0', width: 1.45, opacity: 0.72, dashed: false, flow: 0 };
  switch (c.layer) {
    case 'physical':
      return { color: LAYER_COLOR.physical, width: 1.1, opacity: 0.42, dashed: false, flow: 0 };
    case 'spacetime':
      return { color: LAYER_COLOR.spacetime, width: 1.1, opacity: 0.5, dashed: true, dashSize: 0.32, gapSize: 0.22, flow: 0.2 };
    case 'information':
      return { color: LAYER_COLOR.information, width: 1.15, opacity: 0.6, dashed: true, dashSize: 0.06, gapSize: 0.2, flow: 0.9 };
  }
}

interface LineLike {
  material: THREE.Material & { opacity: number; linewidth: number; dashOffset: number };
}

function Trajectory({ c, state, visible }: { c: AtlasConnection; state: VisualState; visible: boolean }) {
  const points = useMemo(() => samplePoints(getCurve(c.id), 140), [c.id]);
  const style = useMemo(() => styleOf(c), [c]);
  const ref = useRef<LineLike>(null);
  const cur = useRef({ o: 0, w: style.width });

  useFrame((_, delta) => {
    const line = ref.current;
    if (!line) return;
    const reduced = getState().reducedMotion;
    const targetO = !visible ? 0 : state === 'active' ? 1 : state === 'dim' ? style.opacity * 0.16 : style.opacity;
    const targetW = state === 'active' ? style.width * 1.9 : style.width;
    const k = Math.min(1, delta * 7);
    cur.current.o += (targetO - cur.current.o) * k;
    cur.current.w += (targetW - cur.current.w) * k;
    line.material.opacity = cur.current.o;
    line.material.linewidth = cur.current.w;
    if (style.dashed && !reduced) {
      const speed = style.flow * (state === 'active' ? 2.2 : 1);
      line.material.dashOffset -= delta * speed;
    }
  });

  return (
    <group>
      <Line
        ref={ref as never}
        points={points}
        color={style.color}
        lineWidth={style.width}
        transparent
        opacity={0}
        depthWrite={false}
        dashed={style.dashed}
        dashSize={style.dashSize}
        gapSize={style.gapSize}
        renderOrder={4}
      />
      {visible && (
        <Line
          points={points}
          lineWidth={14}
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            actions.hoverConnection(c.id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            actions.hoverConnection(null);
            document.body.style.cursor = '';
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            actions.selectConnection(c.id);
          }}
        />
      )}
    </group>
  );
}

/** Glowing points travelling along visible routes. */
function Travellers({ states, visibility }: { states: VisualState[]; visibility: boolean[] }) {
  const n = CONNECTIONS.length * 2;
  const curves = useMemo(() => CONNECTIONS.map((c) => getCurve(c.id)), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    CONNECTIONS.forEach((c, i) => {
      const color = new THREE.Color(c.style === 'axis' ? '#ffffff' : LAYER_COLOR[c.layer]);
      for (let k = 0; k < 2; k++) {
        col.set([color.r, color.g, color.b], (i * 2 + k) * 3);
        seed[i * 2 + k] = (i * 0.37 + k * 0.5) % 1;
      }
    });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, [n]);
  const material = useMemo(() => glowPointsMaterial(0), []);
  const clock = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (!getState().reducedMotion) clock.current += delta;
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const size = geometry.getAttribute('aSize') as THREE.BufferAttribute;
    CONNECTIONS.forEach((c, i) => {
      const st = states[i];
      const vis = visibility[i];
      const speed = c.layer === 'information' ? 0.11 : 0.05;
      for (let k = 0; k < 2; k++) {
        const idx = i * 2 + k;
        let t = (clock.current * speed * (st === 'active' ? 1.8 : 1) + (idx * 0.618) % 1) % 1;
        if (k === 1 && c.bidirectional) t = 1 - t;
        curves[i].getPointAt(t, tmp);
        pos.setXYZ(idx, tmp.x, tmp.y, tmp.z);
        const fade = Math.sin(t * Math.PI); // fade in/out at the ends
        let s = 0;
        if (vis) {
          if (st === 'active') s = 9 * fade;
          else if (st === 'base' && k === 0) s = 5 * fade;
          else if (st === 'dim' && k === 0) s = 2.5 * fade;
        }
        size.setX(idx, s);
      }
    });
    pos.needsUpdate = true;
    size.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} renderOrder={6} frustumCulled={false} />;
}

export function Trajectories() {
  const layers = useAtlas((s) => s.layers);
  const hoveredNode = useAtlas((s) => s.hoveredNode);
  const selectedNode = useAtlas((s) => s.selectedNode);
  const hoveredConnection = useAtlas((s) => s.hoveredConnection);
  const selectedConnection = useAtlas((s) => s.selectedConnection);

  const focusNode = hoveredNode ?? (hoveredConnection ? null : selectedNode);
  const focusConn = hoveredConnection ?? (hoveredNode ? null : selectedConnection);
  const anyFocus = !!(focusNode || focusConn);

  const visibility = CONNECTIONS.map((c) => isConnectionVisible(c, layers));
  const states: VisualState[] = CONNECTIONS.map((c) => {
    const related = focusConn === c.id || (!!focusNode && (c.from === focusNode || c.to === focusNode));
    return related ? 'active' : anyFocus ? 'dim' : 'base';
  });

  return (
    <group>
      {CONNECTIONS.map((c, i) => (
        <Trajectory key={c.id} c={c} state={states[i]} visible={visibility[i]} />
      ))}
      <Travellers states={states} visibility={visibility} />
    </group>
  );
}
