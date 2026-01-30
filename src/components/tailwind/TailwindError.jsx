import React, { useState } from 'react';

/**
 * TailwindError - Inline-styled error screen (no Tailwind classes)
 * Shown if Tailwind CDN fails to load after timeout
 */
export default function TailwindError({ elapsed, error }) {
  const [copied, setCopied] = useState(false);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleCopyDiagnostics = async () => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        timeWaited: `${elapsed}ms`,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        stylesheets: Array.from(document.styleSheets).map((s) => ({
          href: s.href || 'inline',
          rules: s.cssRules?.length || 0,
          crossOrigin: s.ownerNode?.getAttribute('crossorigin') || 'none',
        })),
        tailwindScriptPresent: !!document.querySelector(
          'script[src*="cdn.tailwindcss.com"]'
        ),
        styleTagCount: document.querySelectorAll('style').length,
        linkTagCount: document.querySelectorAll('link[rel="stylesheet"]').length,
      };

      const text = JSON.stringify(diagnostics, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy diagnostics:', err);
    }
  };

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
        padding: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          textAlign: 'center',
        }}
      >
        {/* Error icon */}
        <div
          style={{
            fontSize: '48px',
            marginBottom: '24px',
            opacity: 0.7,
          }}
        >
          ⚠
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            letterSpacing: '0.025em',
          }}
        >
          Styles Not Loading
        </h1>

        {/* Error message */}
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '24px',
            lineHeight: '1.5',
          }}
        >
          {error}
        </p>

        {/* Diagnostics box */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            textAlign: 'left',
            color: 'rgba(255, 255, 255, 0.6)',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        >
          <div>
            <strong>Waited:</strong> {(elapsed / 1000).toFixed(1)}s
          </div>
          <div>
            <strong>Stylesheets:</strong> {document.styleSheets.length}
          </div>
          <div>
            <strong>Script tags:</strong>{' '}
            {document.querySelectorAll('script').length}
          </div>
          <div>
            <strong>Tailwind CDN:</strong>{' '}
            {document.querySelector('script[src*="cdn.tailwindcss.com"]')
              ? '✓ Present'
              : '✗ Missing'}
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleRetry}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 200ms',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#b91c1c')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#dc2626')}
          >
            Retry
          </button>

          <button
            onClick={handleCopyDiagnostics}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 200ms',
            }}
            onMouseOver={(e) => (
              (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')
            )}
            onMouseOut={(e) => (
              (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
            )}
          >
            {copied ? '✓ Copied' : 'Copy Diagnostics'}
          </button>
        </div>

        {/* Help text */}
        <div
          style={{
            marginTop: '24px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            lineHeight: '1.5',
          }}
        >
          <p>
            If this persists, check your internet connection or contact support
            with the diagnostics above.
          </p>
        </div>
      </div>
    </div>
  );
}