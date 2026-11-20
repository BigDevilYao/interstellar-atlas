import { lazy, Suspense, useEffect } from 'react';
import { useAtlas } from '../../state/store';
import { branch, useBranch } from './branch';
import { getViewHandle } from './viewHandle';
import './studio-branch.css';

// The branch's scenes (printer, studio, its own renderer) load only when the branch is entered.
const StudioBranchView = lazy(() => import('./StudioBranchView'));

/**
 * Mounted once by App. Renders nothing until the branch is entered; owns the branch's browser
 * history and Esc handling while it is open; shows a discreet way back into the branch after
 * crossing from Murph's room into the Atlas.
 */
export function StudioBranchLayer() {
  const open = useBranch((s) => s.open);
  const session = useBranch((s) => s.session);
  const handedOff = useBranch((s) => s.handedOff);
  const view = useAtlas((s) => s.view);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => branch.onPop(e.state, getViewHandle());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // While the branch is on screen, Esc steps back through its thresholds (and is kept from the
  // Atlas's own Esc handler, which would otherwise drop straight to the map).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      getViewHandle()?.back();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  if (open) {
    return (
      <Suspense fallback={<div className="cine-loading sb-loading micro">Loading the studio…</div>}>
        <StudioBranchView key={session} />
      </Suspense>
    );
  }
  if (handedOff && (view === 'cinema' || view === 'threshold')) {
    return (
      <button
        type="button"
        className="sb-return"
        onClick={() => branch.reopen('murph')}
        title="Back into the Studio branch, at Murph's Room (the bookshelf leads back to the studio)"
      >
        ↩ Studio branch
      </button>
    );
  }
  return null;
}
