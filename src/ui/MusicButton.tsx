import { MUSIC_ARTIST, MUSIC_TITLE, music, useMusic } from '../lib/music';

/**
 * On/off switch for the background music. Animated bars while playing.
 * `variant="hud"` matches the cinema transport bar; the default matches the map controls.
 */
export function MusicButton({ variant = 'map' }: { variant?: 'map' | 'hud' }) {
  const m = useMusic();
  const needsFile = m.source === 'none';
  const on = m.enabled && !needsFile;
  const label = needsFile ? 'Add music' : on ? 'Music on' : 'Music off';
  const title = needsFile
    ? `Choose your copy of “${MUSIC_TITLE}” — it stays in this browser`
    : `${MUSIC_TITLE} · ${MUSIC_ARTIST} — ${on ? 'click to turn off' : 'click to turn on'} (M)${m.waiting ? ' · starts on your first click' : ''}`;
  return (
    <button
      type="button"
      data-music-toggle=""
      className={`music-btn music-btn--${variant} ${on ? 'is-on' : ''} ${m.playing ? 'is-playing' : ''} ${needsFile ? 'is-empty' : ''}`}
      onClick={() => music.toggle()}
      aria-pressed={on}
      aria-label={`${label}: ${MUSIC_TITLE}`}
      title={title}
    >
      <span className="music-btn__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="music-btn__label">{label}</span>
    </button>
  );
}
