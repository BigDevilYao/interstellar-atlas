import { branch } from './branch';

/**
 * Optional entrance shown on the journey's end card (after chapter 14). It sits below the end card's
 * own actions and does nothing until chosen; the original ending is unchanged.
 */
export function StudioBranchEntry() {
  return (
    <button type="button" className="sb-entry" onClick={() => branch.enter('journey-end')} title="An optional side branch: printer → UCLA studio → Murph's Room">
      <span className="sb-entry__k">Optional branch</span>
      <span className="sb-entry__t">Studio Threshold · UCLA Studio → Murph’s Room</span>
      <span className="sb-entry__a" aria-hidden="true">
        →
      </span>
    </button>
  );
}
