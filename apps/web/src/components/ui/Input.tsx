import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, showPasswordToggle = true, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    if (type === 'password' && showPasswordToggle) {
      return (
        <div className="relative w-full">
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none p-1"
            tabIndex={-1}
            title={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
