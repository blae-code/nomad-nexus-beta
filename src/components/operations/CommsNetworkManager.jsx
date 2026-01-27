import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2, Plus, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Comms Network Manager
 * Interactive drag-and-drop widget for managing lines of communication
 */
export default function CommsNetworkManager({ eventId, currentUser, canEdit }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [editingNet, setEditingNet] = useState(null);
  const [showNewNetForm, setShowNewNetForm] = useState(false);
  const containerRef = useRef(null);

  const { data: voiceNets } = useQuery({
    queryKey: ['event-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId }),
    enabled: !!eventId,
    initialData: []
  });

  const { data: event } = useQuery({
    queryKey: ['event-data', eventId],
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId
  });

  const updateNetMutation = useMutation({
    mutationFn: (data) => base44.entities.VoiceNet.update(data.id, data)
  });

  const deleteNetMutation = useMutation({
    mutationFn: (netId) => base44.entities.VoiceNet.delete(netId)
  });

  const handleDragStart = (e, net) => {
    if (!canEdit) return;
    setDraggedItem(net);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    if (!draggedItem || !canEdit) return;

    // Reorder nets based on drag
    console.log('Reordered:', draggedItem.code, 'to position of', target.code);
    setDraggedItem(null);
  };

  const netsByType = {
    command: voiceNets.filter(n => n.type === 'command'),
    squad: voiceNets.filter(n => n.type === 'squad'),
    support: voiceNets.filter(n => n.type === 'support'),
    general: voiceNets.filter(n => n.type === 'general')
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden border border-[#ea580c]/30 bg-zinc-950/50 rounded">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 p-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[8px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
            <GripVertical className="w-3 h-3 text-[#ea580c]" />
            NETWORK MANAGER
          </h3>
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewNetForm(true)}
              className="h-5 w-5 text-zinc-400 hover:text-[#ea580c]"
            >
              <Plus className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
        <p className="text-[7px] text-zinc-500">Drag to reorder comms hierarchy</p>
      </div>

      {/* Networks Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-2 p-2"
        onDragOver={handleDragOver}
      >
        {/* Command Level */}
        {netsByType.command.length > 0 && (
          <div className="space-y-1">
            <div className="text-[7px] font-bold text-red-400 uppercase tracking-wider">COMMAND LEVEL</div>
            {netsByType.command.map((net) => (
              <NetItem
                key={net.id}
                net={net}
                isDragging={draggedItem?.id === net.id}
                onDragStart={(e) => handleDragStart(e, net)}
                onDragOver={(e) => handleDragOver(e)}
                onDrop={(e) => handleDrop(e, net)}
                onEdit={() => setEditingNet(net)}
                onDelete={() => deleteNetMutation.mutate(net.id)}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}

        {/* Squad Level */}
        {netsByType.squad.length > 0 && (
          <div className="space-y-1 ml-2 border-l border-blue-900/50 pl-2">
            <div className="text-[7px] font-bold text-blue-400 uppercase tracking-wider">SQUAD LEVEL</div>
            {netsByType.squad.map((net) => (
              <NetItem
                key={net.id}
                net={net}
                isDragging={draggedItem?.id === net.id}
                onDragStart={(e) => handleDragStart(e, net)}
                onDragOver={(e) => handleDragOver(e)}
                onDrop={(e) => handleDrop(e, net)}
                onEdit={() => setEditingNet(net)}
                onDelete={() => deleteNetMutation.mutate(net.id)}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}

        {/* Support Level */}
        {netsByType.support.length > 0 && (
          <div className="space-y-1 ml-2 border-l border-green-900/50 pl-2">
            <div className="text-[7px] font-bold text-green-400 uppercase tracking-wider">SUPPORT LEVEL</div>
            {netsByType.support.map((net) => (
              <NetItem
                key={net.id}
                net={net}
                isDragging={draggedItem?.id === net.id}
                onDragStart={(e) => handleDragStart(e, net)}
                onDragOver={(e) => handleDragOver(e)}
                onDrop={(e) => handleDrop(e, net)}
                onEdit={() => setEditingNet(net)}
                onDelete={() => deleteNetMutation.mutate(net.id)}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}

        {/* General Level */}
        {netsByType.general.length > 0 && (
          <div className="space-y-1 ml-2 border-l border-zinc-700 pl-2">
            <div className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider">GENERAL</div>
            {netsByType.general.map((net) => (
              <NetItem
                key={net.id}
                net={net}
                isDragging={draggedItem?.id === net.id}
                onDragStart={(e) => handleDragStart(e, net)}
                onDragOver={(e) => handleDragOver(e)}
                onDrop={(e) => handleDrop(e, net)}
                onEdit={() => setEditingNet(net)}
                onDelete={() => deleteNetMutation.mutate(net.id)}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Net Item - Draggable
 */
function NetItem({
  net,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onEdit,
  onDelete,
  canEdit
}) {
  return (
    <motion.div
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className={cn(
        'flex items-center gap-1 p-1.5 rounded border transition-all',
        isDragging && 'bg-[#ea580c]/20 border-[#ea580c]',
        !isDragging && 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700',
        canEdit && 'cursor-move'
      )}
    >
      {canEdit && (
        <GripVertical className="w-3 h-3 text-zinc-600 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-bold text-white truncate">{net.code}</div>
        <div className="text-[6px] text-zinc-500 truncate">{net.label}</div>
      </div>

      <Badge className="text-[6px] px-1 py-0 flex-shrink-0 bg-zinc-800 text-zinc-300">
        {net.discipline}
      </Badge>

      {canEdit && (
        <div className="flex gap-0.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-[#ea580c]"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-500"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}