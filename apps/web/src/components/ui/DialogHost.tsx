import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" paints the confirm action red: use it for deletions and cancellations. */
  tone?: 'default' | 'danger';
};

type TextOptions = ConfirmOptions & {
  placeholder?: string;
  initialValue?: string;
  inputLabel?: string;
};

type Request =
  | ({ kind: 'confirm'; resolve: (ok: boolean) => void } & ConfirmOptions)
  | ({ kind: 'text'; resolve: (value: string | null) => void } & TextOptions);

const useDialogStore = create<{ current: Request | null; open: (r: Request) => void; close: () => void }>((set) => ({
  current: null,
  open: (current) => set({ current }),
  close: () => set({ current: null }),
}));

/** Styled replacement for window.confirm. Resolves true when the user confirms. */
export const askConfirm = (options: ConfirmOptions): Promise<boolean> =>
  new Promise((resolve) => useDialogStore.getState().open({ kind: 'confirm', resolve, ...options }));

/** Styled replacement for window.prompt. Resolves the text, or null when the user cancels. */
export const askText = (options: TextOptions): Promise<string | null> =>
  new Promise((resolve) => useDialogStore.getState().open({ kind: 'text', resolve, ...options }));

/** Mount once near the app root: renders whichever dialog askConfirm/askText requested. */
export const DialogHost: React.FC = () => {
  const { current, close } = useDialogStore();
  const [value, setValue] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!current) return;
    setValue(current.kind === 'text' ? current.initialValue ?? '' : '');
    // Focus the field when there is one, otherwise the primary action.
    requestAnimationFrame(() => (current.kind === 'text' ? inputRef.current : confirmRef.current)?.focus());
  }, [current]);

  if (!current) return null;

  const cancel = () => {
    current.kind === 'confirm' ? current.resolve(false) : current.resolve(null);
    close();
  };
  const accept = () => {
    current.kind === 'confirm' ? current.resolve(true) : current.resolve(value.trim());
    close();
  };
  const danger = current.tone === 'danger';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4"
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel();
        if (e.key === 'Enter' && current.kind === 'text' && !e.shiftKey) accept();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={current.message ? 'dialog-message' : undefined}
        className="w-full max-w-md rounded-[26px] border border-[rgb(197_168_128/35%)] bg-[#efe7d8] p-7 shadow-2xl"
      >
        <h2 id="dialog-title" className="font-serif text-2xl font-normal text-stone-900">{current.title}</h2>
        {current.message && <p id="dialog-message" className="mt-2 text-sm font-light leading-relaxed text-stone-600">{current.message}</p>}

        {current.kind === 'text' && (
          <label className="mt-5 block">
            {current.inputLabel && <span className="mb-1.5 block text-[11px] uppercase tracking-widest text-stone-500">{current.inputLabel}</span>}
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={current.placeholder}
              className="w-full rounded-full border border-stone-300 bg-white/70 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-900"
            />
          </label>
        )}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cancel}
            className="rounded-full border border-stone-300 px-6 py-2.5 text-xs uppercase tracking-widest text-stone-800 transition-colors hover:border-stone-900"
          >
            {current.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={accept}
            className={`rounded-full px-6 py-2.5 text-xs uppercase tracking-widest text-white transition-colors ${danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-stone-900 hover:bg-stone-800'}`}
          >
            {current.confirmLabel ?? 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};
