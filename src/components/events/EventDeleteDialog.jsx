import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function EventDeleteDialog({ event, open, onOpenChange, onSuccess }) {
  const queryClient = useQueryClient();
  const [action, setAction] = React.useState('archive'); // 'archive' or 'delete'

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === 'archive') {
        return base44.entities.Event.update(event.id, { status: 'archived' });
      } else {
        return base44.entities.Event.delete(event.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events-list']);
      queryClient.invalidateQueries(['event-detail', event.id]);
      onOpenChange(false);
      setAction('archive');
      if (onSuccess) onSuccess();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {action === 'archive' ? 'Archive Operation' : 'Delete Operation'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {action === 'archive' 
              ? `Archive "${event.title}"? Archived operations can be restored.`
              : `Permanently delete "${event.title}"? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-zinc-300">Choose Action</label>
            <div className="space-y-2">
              <button
                onClick={() => setAction('archive')}
                className={`w-full px-3 py-2 border text-sm text-left transition-colors ${
                  action === 'archive'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                📦 Archive (Recommended)
              </button>
              <button
                onClick={() => setAction('delete')}
                className={`w-full px-3 py-2 border text-sm text-left transition-colors ${
                  action === 'delete'
                    ? 'bg-red-950/50 border-red-600/50 text-red-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                🗑️ Permanently Delete
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="hover:bg-zinc-900"
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={action === 'archive' 
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-red-700 hover:bg-red-800'}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === 'archive' ? 'Archive' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}