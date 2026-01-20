import React, { useState, useEffect } from 'react';

export default function LayoutDebugMode() {
  const [isEnabled, setIsEnabled] = useState(false);

  // Listen for Ctrl+Shift+G to toggle debug mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setIsEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isEnabled) return null;

  return (
    <>
      <div className="layout-debug-overlay" />
      <div className="layout-debug-label">
        Layout Debug Mode
        <br />
        <span className="text-[#ea580c]">Rail: var(--rail-w)</span>
        <br />
        <span className="text-green-400">Content: var(--gutter)</span>
        <br />
        Press Ctrl+Shift+G to toggle
      </div>
    </>
  );
}