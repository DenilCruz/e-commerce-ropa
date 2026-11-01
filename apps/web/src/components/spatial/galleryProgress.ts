import { MathUtils } from 'three';
import { coutureState } from './coutureState';

export const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Reads where the page is and publishes three numbers for the 3D stage:
 *  - hero: 0 at the top, 1 once the hero has scrolled away (the gallery moves to the centre and grows)
 *  - run:  0 to 1 across the gallery section, one panel after another
 *  - exit: 0 to 1 over the end of that section (the gallery lifts away so the plans take over)
 */
export function updateStageProgress() {
  const vh = window.innerHeight;
  coutureState.hero = MathUtils.clamp(window.scrollY / (vh * 0.75), 0, 1);
  document.documentElement.style.setProperty('--hero-progress', coutureState.hero.toFixed(3));
  const run = document.getElementById('aura-gallery-run');
  if (!run) { coutureState.run = 0; coutureState.exit = 0; return; }
  const r = run.getBoundingClientRect();
  // 0 when the section reaches the top of the screen, 1 when its end reaches the bottom: the caption then lets go.
  const span = Math.max(1, r.height - vh);
  coutureState.run = MathUtils.clamp(-r.top / span, 0, 1);
  coutureState.exit = MathUtils.clamp((coutureState.run - 0.86) / 0.14, 0, 1);
  document.documentElement.style.setProperty('--gallery-exit', String(coutureState.exit));
}
