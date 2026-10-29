import { music, useMusic } from '../lib/music';

/**
 * The sound switch: background music on / off. Animated bars while playing.
 * `variant="hud"` matches the cinema transport bar; the default matches the map controls.
 */
export function MusicButton({ variant = 'map' }: { variant?: 'map' | 'hud' }) {
  const m = useMusic();
  const on = m.enabled;
  const label = on ? 'Sound on' : 'Sound off';
  const title = `${m.title ? `${m.title} — ` : ''}${on ? 'click to turn the sound off' : 'click to turn the sound on'} (M)${on && m.waiting ? ' · starts on your first click' : ''}`;
  return (
    <button
      type="button"
      data-music-toggle=""
      className={`music-btn music-btn--${variant} ${on ? 'is-on' : ''} ${m.playing ? 'is-playing' : ''}`}
      onClick={() => music.toggle()}
      aria-pressed={on}
      aria-label={`Sound ${on ? 'on' : 'off'}`}
      title={title}
    >
      <svg className="music-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {on ? <path className="music-btn__wave" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
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
