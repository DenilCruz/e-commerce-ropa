import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  // Rendered in <body>: an ancestor with backdrop-filter (like the sticky header) would otherwise become
  // the containing block of this fixed overlay and clip it.
  return createPortal(
    <div className="aura-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="aura-dialog max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-xl text-stone-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="aura-dialog__close">&times;</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};
