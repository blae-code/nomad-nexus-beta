import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AuditLogger } from "@/components/utils/auditLogger";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";

export default function MessageActions({ message, channelId, currentUser }) {
  const queryClient = useQueryClient();

  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ['pinned-messages', channelId],
    queryFn: () => base44.entities.PinnedMessage.filter({ channel_id: channelId }),
    enabled: !!channelId
  });

  const isPinned = pinnedMessages.some(pm => pm.message_id === message.id);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.entities.Message.update(message.id, {
        is_deleted: true,
        deleted_by: currentUser.id,
        deleted_at: new Date().toISOString()
      });
      
      // Log message deletion
      await AuditLogger.logMessageDelete(
        currentUser.id,
        currentUser.full_name || currentUser.email,
        message.id,
        'Channel',
        'Deleted by moderator'
      );
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success("Message deleted");
    }
  });

  const pinMutation = useMutation({
    mutationFn: () => base44.entities.PinnedMessage.create({
      channel_id: channelId,
      message_id: message.id,
      pinned_by: currentUser.id,
      pin_order: pinnedMessages.length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages'] });
      toast.success("Message pinned");
    }
  });

  const unpinMutation = useMutation({
    mutationFn: async () => {
      const pinned = pinnedMessages.find(pm => pm.message_id === message.id);
      if (pinned) {
        await base44.entities.PinnedMessage.delete(pinned.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages'] });
      toast.success("Message unpinned");
    }
  });

  // Only show for admins or message author
  if (currentUser.role !== 'admin' && message.user_id !== currentUser.id) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
        {currentUser.role === 'admin' && (
          <>
            {isPinned ? (
              <DropdownMenuItem 
                onClick={() => unpinMutation.mutate()}
                className="text-xs cursor-pointer"
              >
                <PinOff className="w-3 h-3 mr-2" />
                Unpin Message
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={() => pinMutation.mutate()}
                className="text-xs cursor-pointer"
              >
                <Pin className="w-3 h-3 mr-2" />
                Pin Message
              </DropdownMenuItem>
            )}
          </>
        )}
        {(currentUser.role === 'admin' || message.user_id === currentUser.id) && (
          <DropdownMenuItem 
            onClick={() => deleteMutation.mutate()}
            className="text-xs text-red-400 cursor-pointer"
          >
            <Trash2 className="w-3 h-3 mr-2" />
            Delete Message
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}