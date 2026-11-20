import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getState, useAtlas } from '../../../state/store';
import { CONNECTOR_STYLE, studioConnectorPoints } from './geometry';
import { StudioMapMarker } from './StudioMapMarker';

interface LineLike {
  material: THREE.Material & { opacity: number; dashOffset: number };
}

/** Edmunds' Planet → UCLA Studio connector, styled and animated like the map's information routes. */
function Connector() {
  const points = useMemo(() => studioConnectorPoints(80), []);
  const ref = useRef<LineLike>(null);
  const visible = useAtlas((s) => s.layers.information);
  const dim = useAtlas((s) => !!(s.hoveredNode || s.selectedNode || s.hoveredConnection || s.selectedConnection));
  useFrame((_, delta) => {
    const line = ref.current;
    if (!line) return;
    const target = !visible ? 0 : dim ? CONNECTOR_STYLE.opacity * 0.16 : CONNECTOR_STYLE.opacity;
    line.material.opacity += (target - line.material.opacity) * Math.min(1, delta * 7);
    if (!getState().reducedMotion) line.material.dashOffset -= delta * CONNECTOR_STYLE.flow;
  });
  return (
    <Line
      ref={ref as never}
      points={points}
      color={CONNECTOR_STYLE.color}
      lineWidth={CONNECTOR_STYLE.width}
      transparent
      opacity={CONNECTOR_STYLE.opacity}
      dashed
      dashSize={CONNECTOR_STYLE.dashSize}
      gapSize={CONNECTOR_STYLE.gapSize}
      depthWrite={false}
      renderOrder={4}
    />
  );
}

/** The Studio branch on the World Map: one connector and one ring marker (added inside WorldMap's Parallax group). */
export default function StudioMapBranch() {
  return (
    <>
      <Connector />
      <StudioMapMarker />
    </>
  );
}
