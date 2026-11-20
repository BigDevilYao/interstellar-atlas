/**
 * Studio branch asset paths. Files live in `public/branches/studio/`, separate from the Atlas's own
 * assets, and resolve relative to the page (like the Atlas's other public files). A single-file build
 * can inline them by defining `window.__ST_ASSETS__` (name → data URL).
 */
export const ASSET_DIR = 'branches/studio/';

/**
 * Reference photographs shown in the branch's "Photos" panel. The public release ships none (by the
 * owner's choice, the studio photos are not published); the panel and its button only appear when
 * this list has entries. The 3D studio itself needs only `window-view.jpg`.
 */
export const REFERENCE_PHOTOS: { file: string; caption: string }[] = [];

declare global {
  interface Window {
    __ST_ASSETS__?: Record<string, string>;
  }
}

export function assetUrl(name: string): string {
  const inline = typeof window !== 'undefined' ? window.__ST_ASSETS__?.[name] : undefined;
  return inline ?? ASSET_DIR + name;
}
