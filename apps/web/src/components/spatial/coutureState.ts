/** Shared, mutable state for the landing stage. The hero writes it while dragging; the scene reads it per frame. */
type Listener = (index: number) => void;
const listeners = new Set<Listener>();

export const coutureState = {
  spin: 0,
  /** Current rotation of the orbit group, in radians (read by the cards to know which one faces the viewer). */
  rotation: 0,
  dragging: false,
  /** When true the scene jumps straight to `spin` (used for inspection and tests). */
  snap: false,
  active: -1,
  setActive(index: number) {
    if (index === coutureState.active) return;
    coutureState.active = index;
    listeners.forEach((l) => l(index));
  },
  /** Subscribe to changes of the card that faces the viewer. Returns the unsubscribe function. */
  onActive(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __couture: typeof coutureState }).__couture = coutureState;
