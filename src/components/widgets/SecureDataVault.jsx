import React, { useState } from 'react';
import { Lock, X, File, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SecureDataVault({ widgetId, onRemove, isDragging }) {
  const [files, setFiles] = useState([
    { id: 1, name: 'Mission_Alpha.encrypted', size: '1.2 MB', classified: true },
    { id: 2, name: 'Fleet_Inventory.log', size: '456 KB', classified: false }
  ]);

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.03),transparent_70%)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Data Vault</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {files.map(file => (
          <div key={file.id} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-center gap-2 mb-1">
              <File className="w-3 h-3 text-zinc-500" />
              <span className="text-xs text-zinc-300 font-mono flex-1 truncate">{file.name}</span>
              {file.classified && <Lock className="w-2.5 h-2.5 text-red-500" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-600">{file.size}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-4 w-4 text-zinc-600 hover:text-red-400">
                  <Eye className="w-2.5 h-2.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-4 w-4 text-zinc-600 hover:text-red-400">
                  <Download className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm text-center text-[9px] text-zinc-600 uppercase tracking-wider relative z-10">
        {files.length} Files • Encrypted
      </div>
    </div>
  );
}