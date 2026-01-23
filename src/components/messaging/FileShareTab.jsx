import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileUp, Download, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function FileShareTab({ user }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: sharedFiles = [] } = useQuery({
    queryKey: ['shared-files', user?.id],
    queryFn: async () => {
      const messages = await base44.entities.Message.list();
      const files = [];
      
      messages.forEach(msg => {
        if (msg.attachments?.length > 0) {
          msg.attachments.forEach(url => {
            files.push({
              id: `${msg.id}-${url}`,
              url,
              sender: msg.created_by,
              timestamp: msg.created_date,
              name: url.split('/').pop()
            });
          });
        }
      });
      
      return files.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        await base44.integrations.Core.UploadFile({ file });
        toast.success(`Uploaded ${file.name}`);
      }
      queryClient.invalidateQueries(['shared-files', user.id]);
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-2 border-b border-zinc-800 flex gap-1">
        <label className="flex-1">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button 
            type="button" 
            size="sm" 
            disabled={uploading}
            className="w-full h-7 bg-[#ea580c] hover:bg-[#c2410c] text-xs"
          >
            <FileUp className="w-3 h-3 mr-1" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </label>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {sharedFiles.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <FileUp className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-600 font-mono">No files shared yet</p>
            </div>
          ) : (
            sharedFiles.map((file) => (
              <div
                key={file.id}
                className="group p-2 rounded border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all"
              >
                <div className="flex items-center gap-2">
                  <FileUp className="w-3 h-3 text-[#ea580c] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#ea580c] hover:underline truncate block font-mono"
                    >
                      {file.name}
                    </a>
                    <div className="text-[8px] text-zinc-600">
                      {file.sender} • {getTimeAgo(file.timestamp)}
                    </div>
                  </div>
                  <a
                    href={file.url}
                    download
                    className="text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}