import React, { useState, useEffect } from 'react';
import { GripVertical, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomizableWorkspace({ children, layout = 'grid' }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [savedLayout, setSavedLayout] = useState(layout);

  useEffect(() => {
    const saved = localStorage.getItem('nexus.workspace.layout');
    if (saved) setSavedLayout(saved);
  }, []);

  const saveLayout = (newLayout) => {
    localStorage.setItem('nexus.workspace.layout', newLayout);
    setSavedLayout(newLayout);
  };

  return (
    <div className="relative">
      {isEditMode && (
        <div className="absolute top-4 right-4 z-50 flex gap-2 bg-zinc-900 border border-orange-500/40 rounded-lg p-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditMode(false)}
            className="text-xs"
          >
            Done Editing
          </Button>
        </div>
      )}

      <div
        className={`${
          isEditMode ? 'opacity-75' : ''
        } transition ${savedLayout === 'grid' ? 'grid grid-cols-3 gap-4' : 'flex flex-col gap-4'}`}
      >
        {isEditMode && (
          <div className="absolute inset-0 pointer-events-none space-y-2">
            <div className="text-xs text-orange-500 font-semibold p-2">
              Drag widgets to rearrange (coming soon)
            </div>
          </div>
        )}
        {children}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditMode(!isEditMode)}
        className="fixed bottom-4 left-4 gap-2"
      >
        {isEditMode ? (
          <>
            <Settings className="w-4 h-4" />
            Customize
          </>
        ) : (
          <>
            <GripVertical className="w-4 h-4" />
            Edit Layout
          </>
        )}
      </Button>
    </div>
  );
}