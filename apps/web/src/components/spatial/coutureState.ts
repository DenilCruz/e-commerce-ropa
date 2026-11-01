/** Shared, mutable spin for the landing sculpture. The hero stage writes it while dragging; the scene reads it per frame. */
export const coutureState = { spin: 0, dragging: false, /** When true the scene jumps straight to `spin` (used for inspection and tests). */ snap: false };
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __couture: typeof coutureState }).__couture = coutureState;
