import { useState } from 'react';
import { CURRENT, REVISIONS, REVISIONS_URL } from '../version';

/** Small version chip under the title; opens what changed and links to earlier revisions. */
export function VersionBadge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="version">
      <button type="button" className="version__chip" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {CURRENT.id} · {CURRENT.title}
      </button>
      {open && (
        <div className="version__pop" role="dialog" aria-label="Revision notes">
          <p className="micro">What’s new in {CURRENT.id}</p>
          <ul>
            {CURRENT.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="micro">Earlier revisions</p>
          <ul className="version__list">
            {REVISIONS.slice(1).map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.id} · {r.title}
                </a>
              </li>
            ))}
          </ul>
          <a className="version__all" href={REVISIONS_URL} target="_blank" rel="noreferrer">
            All revisions →
          </a>
        </div>
      )}
    </div>
  );
}
