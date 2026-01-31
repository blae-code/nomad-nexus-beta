import React from 'react';

/**
 * TailwindLoader - Inline-styled loader (no Tailwind classes)
 * Shown while Tailwind CDN is loading
 */
export default function TailwindLoader({ elapsed }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Animated spinner */}
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderTop: '3px solid rgba(220, 38, 38, 0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />

      {/* Text */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Initializing Styles
      </div>

      {/* Elapsed time */}
      <div
        style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'monospace',
        }}
      >
        {(elapsed / 1000).toFixed(1)}s
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}