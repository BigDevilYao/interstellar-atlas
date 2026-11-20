import { Html } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { useAtlas } from '../../../state/store';
import { branch } from '../branch';
import { studioMarkerWorld } from './geometry';

/** Small printer-and-screen line icon, drawn on the Atlas icon grid (48 × 48, hairline strokes). */
function PrinterIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 16 H36 V40 H12 Z" />
      <path d="M12 16 C12 8 36 8 36 16" />
      <path d="M15 24 H33 V37 H15 Z" />
      <path d="M20 18.5 H28 V22 H20 Z" />
      <path d="M18 31 H30" />
    </svg>
  );
}

/**
 * The branch's node on the World Map, in the map's own ring-marker style (same classes as
 * NodeMarkers). Hover shows a tip; click enters the branch.
 */
export function StudioMapMarker() {
  const pos = useMemo(studioMarkerWorld, []);
  const [hovered, setHovered] = useState(false);
  const anyFocus = useAtlas((s) => !!(s.hoveredNode || s.selectedNode || s.hoveredConnection || s.selectedConnection));
  const state = hovered ? 'active' : anyFocus ? 'dim' : 'base';
  return (
    <Html position={pos} center zIndexRange={[40, 10]} className="html-anchor">
      <div className={`node node--ring sb-node is-${state}`} data-node="studio-branch">
        <button
          type="button"
          className="node__hit"
          aria-label="UCLA Studio · optional branch: printer, studio, Murph's Room"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          onClick={() => branch.enter('map')}
        >
          <span className="node__ring" />
          <span className="node__mini">
            <PrinterIcon />
          </span>
        </button>
        <span className="chip chip--sm chip--right">UCLA Studio</span>
        {hovered && <span className="node__tip node__tip--right">Optional branch · a printer’s touchscreen opens onto the UCLA studio, and the studio onto Murph’s Room.</span>}
      </div>
    </Html>
  );
}
