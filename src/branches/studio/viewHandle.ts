import type { Stage } from './controller';

/** The mounted branch view's controls, for browser Back/Forward and Esc (set by StudioBranchView). */
export interface ViewHandle {
  readonly stage: Stage;
  /** Returns false when a crossing is running (the step is refused). */
  goTo(s: Stage): boolean;
  /** One step back through the previous threshold; from the printer, leave the branch. */
  back(): void;
}

let handle: ViewHandle | null = null;

export function setViewHandle(h: ViewHandle | null) {
  handle = h;
}

export function getViewHandle(): ViewHandle | null {
  return handle;
}
