import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users, MessageSquare, Radio, Zap, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Hierarchical Comms Visualizer
 * Shows command hierarchy with lines of communication, supports whisper/hailing
 */
export default function HierarchicalCommsVisualizer({ eventId, currentUser }) {
  const svgRef = useRef(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showWhisperMenu, setShowWhisperMenu] = useState(false);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [draggedLine, setDraggedLine] = useState(null);

  const { data: event } = useQuery({
    queryKey: ['event-hierarchy', eventId],
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId
  });

  const { data: voiceNets } = useQuery({
    queryKey: ['event-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId }),
    enabled: !!eventId,
    initialData: []
  });

  const { data: participants } = useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => event?.assigned_user_ids?.includes(u.id));
    },
    enabled: !!event,
    initialData: []
  });

  // Build hierarchy structure
  useEffect(() => {
    if (!event || !voiceNets.length) return;

    const commandStaff = event.command_staff || {};
    const commanderUser = participants.find(u => u.id === commandStaff.commander_id);
    const xoUser = participants.find(u => u.id === commandStaff.xo_id);

    // Build simple hierarchy: Command -> Squad Leads -> Squad Members
    const hierarchy = {
      level: 0,
      name: 'COMMAND',
      users: commanderUser ? [commanderUser] : [],
      net: voiceNets.find(n => n.code === 'COMMAND'),
      children: []
    };

    setHierarchy(hierarchy);
  }, [event, voiceNets, participants]);

  const drawHierarchy = () => {
    if (!svgRef.current || !hierarchy) return;

    const canvas = svgRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const nodeRadius = 30;
    const levelHeight = 120;
    const levelWidth = width / (hierarchy.children?.length || 2);

    // Clear canvas
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Draw command node
    drawNode(ctx, width / 2, 40, hierarchy, nodeRadius, true);

    // Draw connections and child nodes
    if (hierarchy.children && hierarchy.children.length > 0) {
      hierarchy.children.forEach((child, idx) => {
        const x = (idx + 1) * levelWidth;
        const y = 40 + levelHeight;

        // Draw line
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, 40 + nodeRadius);
        ctx.lineTo(x, y - nodeRadius);
        ctx.stroke();

        // Draw child node
        drawNode(ctx, x, y, child, nodeRadius);
      });
    }
  };

  const drawNode = (ctx, x, y, node, radius, isCommand = false) => {
    // Draw circle
    ctx.fillStyle = isCommand ? '#ea580c' : '#0ea5e9';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isCommand ? '#ea580c' : '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.net?.code || 'NET', x, y - 5);
    ctx.font = '8px monospace';
    ctx.fillText(`${node.users?.length || 0} OPS`, x, y + 8);
  };

  useEffect(() => {
    drawHierarchy();
  }, [hierarchy]);

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden border border-[#ea580c]/30 bg-zinc-950/50 rounded">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 p-2">
        <h3 className="text-[8px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-[#ea580c]" />
          COMMS HIERARCHY
        </h3>
        <p className="text-[7px] text-zinc-500 mt-1">Lines of Communication Network</p>
      </div>

      {/* Visualization Canvas */}
      <div className="flex-1 min-h-0 bg-zinc-950/80 rounded overflow-hidden relative">
        <canvas
          ref={svgRef}
          width={400}
          height={300}
          className="w-full h-full"
        />

        {/* Legend */}
        <div className="absolute bottom-2 right-2 text-[7px] space-y-1 bg-zinc-950/90 border border-zinc-800 p-1.5 rounded">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ea580c]" />
            <span className="text-zinc-400">Command</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-zinc-400">Squad</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 border-t border-zinc-800 p-2 space-y-1">
        <Button
          size="sm"
          onClick={() => setShowWhisperMenu(true)}
          className="w-full h-5 text-[6px] bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/50 hover:bg-[#ea580c]/30"
        >
          <MessageSquare className="w-2 h-2 mr-0.5" />
          WHISPER / HAIL
        </Button>
      </div>

      {/* Whisper Menu */}
      <AnimatePresence>
        {showWhisperMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-zinc-950/95 border border-[#ea580c]/50 rounded p-2 flex flex-col gap-2 z-50"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[8px] font-bold text-[#ea580c]">WHISPER TARGET</h4>
              <button onClick={() => setShowWhisperMenu(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 text-[7px]">
              <button className="w-full text-left p-1 hover:bg-zinc-800 rounded border border-zinc-700 text-zinc-300">
                <div className="font-bold">Wing Leader</div>
                <div className="text-zinc-500">Up chain</div>
              </button>
              <button className="w-full text-left p-1 hover:bg-zinc-800 rounded border border-zinc-700 text-zinc-300">
                <div className="font-bold">Command</div>
                <div className="text-zinc-500">Direct to CO</div>
              </button>
              <button className="w-full text-left p-1 hover:bg-zinc-800 rounded border border-zinc-700 text-zinc-300">
                <div className="font-bold">Peer Squad Leads</div>
                <div className="text-zinc-500">Lateral</div>
              </button>
            </div>

            <Button size="sm" variant="outline" onClick={() => setShowWhisperMenu(false)} className="h-5 text-[6px]">
              CANCEL
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}