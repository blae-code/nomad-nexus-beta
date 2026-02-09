import React from 'react';
import { getNexusCssVars } from '../tokens';

/**
 * RustPulseIndicator
 * - `active=true`: subtle pulse used only for live activity.
 * - `active=false`: calm idle dot with no pulse animation.
 */
export default function RustPulseIndicator({ active = false, label, className = '' }) {
  const vars = getNexusCssVars();
  return (
    <div className={`inline-flex items-center gap-2 ${className}`.trim()} style={vars}>
      <span
        className={active ? 'nx-rust-dot-active' : 'nx-rust-dot-idle'}
        aria-hidden="true"
      />
      {label ? <span className="text-xs text-zinc-400">{label}</span> : null}
      <style>{`
        .nx-rust-dot-idle {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--nx-rust-soft);
          opacity: 0.65;
          box-shadow: 0 0 0 1px rgba(179,90,47,0.2);
        }
        .nx-rust-dot-active {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--nx-rust);
          box-shadow: var(--nx-shadow-pulse);
          animation: nx-rust-pulse 1.8s ease-in-out infinite;
        }
        @keyframes nx-rust-pulse {
          0% { transform: scale(0.96); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(0.96); opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

