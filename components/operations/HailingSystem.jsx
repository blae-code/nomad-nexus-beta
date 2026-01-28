import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';

/**
 * Hailing System
 * Create temporary nets for ad-hoc communication between specific users
 */
export default function HailingSystem({ eventId, currentUser }) {
  const queryClient = useQueryClient();
  const [showHailForm, setShowHailForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [activeHails, setActiveHails] = useState([]);

  const { data: participants } = useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      const event = await base44.entities.Event.get(eventId);
      return event.assigned_user_ids || [];
    },
    enabled: !!eventId,
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const createHailMutation = useMutation({
    mutationFn: async () => {
      // Create temporary voice net for hail
      const hailNet = await base44.entities.VoiceNet.create({
        event_id: eventId,
        code: `HAIL-${Date.now()}`,
        label: `Hail: ${selectedUsers.map(id => users.find(u => u.id === id)?.full_name).join(', ')}`,
        type: 'support',
        discipline: 'focused',
        status: 'active'
      });

      // Create hail record
      const newHail = {
        net_id: hailNet.id,
        initiator_id: currentUser.id,
        participants: selectedUsers,
        created_at: new Date().toISOString(),
        status: 'active'
      };

      setActiveHails([...activeHails, newHail]);
      setSelectedUsers([]);
      setShowHailForm(false);

      return hailNet;
    }
  });

  const endHailMutation = useMutation({
    mutationFn: async (hailNetId) => {
      // Archive the temporary net
      await base44.entities.VoiceNet.update(hailNetId, { status: 'inactive' });
      
      // Remove from active hails
      setActiveHails(activeHails.filter(h => h.net_id !== hailNetId));
    }
  });

  const participantList = users.filter(u => participants?.includes(u.id));

  return (
    <div className="space-y-2">
      {/* Active Hails */}
      <AnimatePresence>
        {activeHails.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-[#ea580c]/50 bg-[#ea580c]/10 rounded p-2 space-y-1"
          >
            <div className="text-[8px] font-bold text-[#ea580c] flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              ACTIVE HAILS
            </div>

            {activeHails.map((hail) => (
              <motion.div
                key={hail.net_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-zinc-900 border border-[#ea580c]/30 rounded p-1.5 space-y-1"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="text-[7px] flex-1">
                    <div className="font-bold text-[#ea580c]">{hail.net_id.slice(0, 8)}</div>
                    <div className="text-zinc-400">{hail.participants.length} OPERATIVES</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => endHailMutation.mutate(hail.net_id)}
                    className="h-4 text-[6px] bg-red-900 hover:bg-red-800 text-red-200"
                  >
                    END HAIL
                  </Button>
                </div>

                {/* Participant avatars */}
                <div className="flex gap-0.5 flex-wrap">
                  {hail.participants.map(userId => {
                    const user = users.find(u => u.id === userId);
                    return (
                      <Badge
                        key={userId}
                        className="text-[6px] bg-zinc-800 text-zinc-300 px-1 py-0"
                      >
                        {user?.full_name.split(' ')[0] || 'User'}
                      </Badge>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hail Form */}
      <AnimatePresence>
        {showHailForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-[#ea580c]/50 bg-zinc-950/80 rounded p-2 space-y-1.5"
          >
            <div className="text-[8px] font-bold text-[#ea580c]">INITIATE HAIL</div>

            {/* User Selection */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {participantList.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-1.5 p-1 hover:bg-zinc-900 rounded cursor-pointer text-[7px]"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                      }
                    }}
                    className="w-2.5 h-2.5"
                  />
                  <span className="text-zinc-300">{user.full_name}</span>
                </label>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => createHailMutation.mutate()}
                disabled={selectedUsers.length === 0}
                className="flex-1 h-4 text-[6px] bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-50"
              >
                HAIL
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowHailForm(false)}
                className="h-4 text-[6px]"
              >
                CANCEL
              </Button>
            </div>
          </motion.div>
        ) : (
          <Button
            size="sm"
            onClick={() => setShowHailForm(true)}
            className="w-full h-5 text-[6px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
          >
            <Radio className="w-2 h-2 mr-0.5" />
            INITIATE HAIL
          </Button>
        )}
      </AnimatePresence>
    </div>
  );
}