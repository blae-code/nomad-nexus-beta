import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NexusButton, NexusBadge } from '../primitives';
import { Copy, Download, Upload } from 'lucide-react';

export default function MapShareDialog({ open, onOpenChange, layoutCode, onImport, elementCount }) {
  const [importCode, setImportCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = () => {
    if (layoutCode) {
      navigator.clipboard.writeText(layoutCode).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  const handleImport = () => {
    if (importCode.trim()) {
      onImport(importCode.trim());
      setImportCode('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Share Map Layout</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Export or import tactical map layouts with drawn zones, markers, and paths.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Section */}
          <section className="rounded border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wide text-zinc-300">Export Layout</h3>
              <NexusBadge tone="neutral">{elementCount} elements</NexusBadge>
            </div>
            
            {layoutCode ? (
              <>
                <textarea
                  value={layoutCode}
                  readOnly
                  className="h-24 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 font-mono"
                />
                <NexusButton
                  size="sm"
                  intent="primary"
                  onClick={handleCopy}
                  className="w-full"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  {copySuccess ? 'Copied!' : 'Copy Layout Code'}
                </NexusButton>
              </>
            ) : (
              <div className="text-xs text-zinc-500 p-2 rounded bg-zinc-900/50">
                No layout to export. Draw some zones or markers first.
              </div>
            )}
          </section>

          {/* Import Section */}
          <section className="rounded border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-zinc-300">Import Layout</h3>
            
            <textarea
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="Paste map layout code here..."
              className="h-24 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 font-mono"
            />
            
            <NexusButton
              size="sm"
              intent="primary"
              onClick={handleImport}
              disabled={!importCode.trim()}
              className="w-full"
            >
              <Upload className="w-3.5 h-3.5 mr-2" />
              Import Layout
            </NexusButton>

            <div className="text-[10px] text-zinc-500">
              Warning: Importing will replace all current drawn elements.
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}