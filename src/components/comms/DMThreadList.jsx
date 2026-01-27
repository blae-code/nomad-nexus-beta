import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DMThreadList({ currentUser, selectedDMId, onSelectDM, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDMForm, setShowNewDMForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const queryClient = useQueryClient();

  // Fetch all DM channels for current user
  const { data: dmThreads = [] } = useQuery({
    queryKey: ['dm-threads', currentUser?.id],
    queryFn: async () => {
      const allChannels = await base44.entities.Channel.list();
      // Filter for DM channels (private channels with dm- prefix)
      return allChannels.filter(ch => 
        ch.is_private && ch.name.startsWith('dm-') &&
        ch.name.includes(currentUser.id)
      );
    },
    enabled: !!currentUser?.id
  });

  // Fetch users for recipient lookup
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000
  });

  const createDMMutation = useMutation({
    mutationFn: async (recipientId) => {
      const channelName = `dm-${[currentUser.id, recipientId].sort().join('-')}`;
      const existing = await base44.entities.Channel.filter({ name: channelName });
      
      if (existing.length > 0) return existing[0];
      
      return await base44.entities.Channel.create({
        name: channelName,
        description: `DM between ${currentUser.full_name} and ${allUsers.find(u => u.id === recipientId)?.full_name}`,
        is_private: true
      });
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries(['dm-threads', currentUser?.id]);
      onSelectDM(channel);
      setShowNewDMForm(false);
      setRecipientEmail('');
    }
  });

  const handleCreateDM = () => {
    const recipient = allUsers.find(u => u.email === recipientEmail);
    if (!recipient || recipient.id === currentUser.id) return;
    createDMMutation.mutate(recipient.id);
  };

  const filteredThreads = dmThreads.filter(thread => {
    const recipient = thread.description?.split(' and ')?.[1]?.trim();
    return !searchQuery || recipient?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Header */}
      <div className="shrink-0 p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          <MessageCircle className="w-4 h-4" />
          Direct Messages
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* New DM Form */}
      {showNewDMForm && (
        <div className="shrink-0 p-3 border-b border-zinc-800 space-y-2">
          <Input
            placeholder="Enter email..."
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateDM}
              disabled={!recipientEmail || createDMMutation.isPending}
              className="flex-1 text-xs h-7"
            >
              Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewDMForm(false)}
              className="flex-1 text-xs h-7"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="shrink-0 px-3 py-2">
        <Input
          placeholder="Search DMs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-zinc-900 border-zinc-800 text-xs h-7"
        />
      </div>

      {/* Threads List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredThreads.length === 0 && !showNewDMForm ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-600">No conversations yet</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewDMForm(true)}
                className="mt-3 text-xs h-7 w-full gap-1"
              >
                <Plus className="w-3 h-3" />
                Start DM
              </Button>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const recipient = thread.description?.split(' and ')?.[1]?.trim();
              return (
                <button
                  key={thread.id}
                  onClick={() => onSelectDM(thread)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded text-xs transition-all',
                    selectedDMId === thread.id
                      ? 'bg-[#ea580c]/20 border border-[#ea580c]/50 text-zinc-100'
                      : 'border border-zinc-800 text-zinc-400 hover:bg-zinc-900/50'
                  )}
                >
                  <div className="font-medium truncate">{recipient}</div>
                  <div className="text-[10px] text-zinc-600 truncate">{thread.name}</div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* New DM Button */}
      {!showNewDMForm && (
        <div className="shrink-0 p-2 border-t border-zinc-800">
          <Button
            size="sm"
            onClick={() => setShowNewDMForm(true)}
            className="w-full text-xs h-8 gap-1"
          >
            <Plus className="w-3 h-3" />
            New Message
          </Button>
        </div>
      )}
    </div>
  );
}