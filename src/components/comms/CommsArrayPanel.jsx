import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommsRadialMenu from '@/components/comms/CommsRadialMenu';
import WhisperStrip from '@/components/comms/WhisperStrip';
import { useWhisper } from '@/components/comms/useWhisper';

/**
 * CommsArrayPanel: 2D network topology visualization
 * Shows squads, command, and nets as interactive nodes
 */
export default function CommsArrayPanel({
  eventId,
  currentUser,
  collapsed = true,
  onWhisperStart
}) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [menuState, setMenuState] = useState({ isOpen: false, nodeId: null, nodeType: null, position: null });
  const canvasRef = React.useRef(null);

  const { whisperSession, startWhisper, endWhisper, isMuted, setIsMuted } = useWhisper(
    eventId,
    currentUser?.id
  );

  // Fetch comms topology data
  const { data: topologyData } = useQuery({
    queryKey: ['comms-topology', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      // Fetch squads
      const squads = await base44.entities.Squad.filter({}, '', 50);
      
      // Fetch command staff
      const event = await base44.entities.Event.filter({ id: eventId });
      const commandStaff = event?.[0]?.command_staff || {};

      // Fetch voice nets
      const nets = await base44.entities.VoiceNet.filter({ event_id: eventId });

      // Fetch player statuses
      const statuses = await base44.entities.PlayerStatus.filter({ event_id: eventId });

      return {
        squads,
        commandStaff,
        nets,
        statuses
      };
    },
    enabled: !!eventId,
    staleTime: 10000,
    gcTime: 30000
  });

  // Draw canvas topology
  const drawTopology = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !topologyData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Draw nodes
    const nodes = buildNodes(topologyData, width, height);
    drawNodes(ctx, nodes);

    // Draw edges
    const edges = buildEdges(topologyData, nodes);
    drawEdges(ctx, edges);
  }, [topologyData]);

  useEffect(() => {
    drawTopology();
    window.addEventListener('resize', drawTopology);
    return () => window.removeEventListener('resize', drawTopology);
  }, [drawTopology]);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click hit a node
    const nodes = buildNodes(topologyData, canvasRef.current.width, canvasRef.current.height);
    const clickedNode = nodes.find(n => {
      const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      return dist < n.radius;
    });

    if (clickedNode) {
      setMenuState({
        isOpen: true,
        nodeId: clickedNode.id,
        nodeType: clickedNode.type,
        position: { x: e.clientX, y: e.clientY }
      });
    }
  };

  const handleWhisper = async (nodeId, scope) => {
    try {
      await startWhisper(nodeId, scope);
      onWhisperStart?.();
    } catch (err) {
      console.error('[COMMS ARRAY] Whisper start error:', err);
    }
  };

  const handleBroadcast = async (nodeId) => {
    // Post to live feed
    try {
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'command',
        actor_id: currentUser?.id,
        content: `BROADCAST PING: Target ${nodeId}`,
        metadata: { target_node: nodeId }
      });
    } catch (err) {
      console.error('[COMMS ARRAY] Broadcast error:', err);
    }
  };

  const handleRequestPriority = async (nodeId) => {
    try {
      await base44.entities.PriorityState.create({
        operation_id: eventId,
        user_id: currentUser?.id,
        state: 'REQUESTED',
        requested_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[COMMS ARRAY] Priority request error:', err);
    }
  };

  const handleGrantPriority = async (nodeId) => {
    // Command staff only
    try {
      await base44.entities.PriorityState.create({
        operation_id: eventId,
        user_id: nodeId,
        state: 'GRANTED',
        granted_by: currentUser?.id,
        granted_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[COMMS ARRAY] Priority grant error:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-zinc-800 bg-zinc-950/50 rounded overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900/50"
           onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#ea580c]" />
          <span className="text-xs font-bold uppercase">Comms Array Topology</span>
        </div>
        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </div>

      {/* Canvas */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              onClick={handleCanvasClick}
              className="w-full bg-black cursor-crosshair border-t border-zinc-800"
            />
            <div className="p-2 border-t border-zinc-800 text-[9px] text-zinc-600">
              Click nodes for comms options. Whisper creates private side-channel.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Whisper Strip */}
      <AnimatePresence>
        {whisperSession && (
          <WhisperStrip
            whisperSession={whisperSession}
            isConnected={true}
            isMuted={isMuted}
            onMuteToggle={() => setIsMuted(!isMuted)}
            onLeaveWhisper={endWhisper}
            participants={[]}
          />
        )}
      </AnimatePresence>

      {/* Radial Menu */}
      <CommsRadialMenu
        isOpen={menuState.isOpen}
        nodeId={menuState.nodeId}
        nodeType={menuState.nodeType}
        position={menuState.position}
        onClose={() => setMenuState({ isOpen: false, nodeId: null, nodeType: null, position: null })}
        onWhisper={handleWhisper}
        onBroadcast={handleBroadcast}
        onRequestPriority={handleRequestPriority}
        onGrantPriority={handleGrantPriority}
      />
    </motion.div>
  );
}

// Helper functions
function buildNodes(topologyData, width, height) {
  const nodes = [];
  if (!topologyData) return nodes;

  const centerX = width / 2;
  const centerY = height / 2;

  // Command node (center)
  nodes.push({
    id: 'command',
    type: 'command',
    label: 'Command',
    x: centerX,
    y: centerY - 60,
    radius: 24,
    color: '#ea580c'
  });

  // Squad nodes (circle around command)
  const squadCount = topologyData.squads?.length || 0;
  const squads = topologyData.squads || [];
  
  squads.forEach((squad, idx) => {
    const angle = (idx / squadCount) * 2 * Math.PI;
    const radius = 100;
    nodes.push({
      id: squad.id,
      type: 'squad',
      label: squad.name?.substring(0, 8) || 'Squad',
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      radius: 20,
      color: '#3b82f6'
    });
  });

  // Net nodes (right side)
  const nets = topologyData.nets || [];
  nets.slice(0, 3).forEach((net, idx) => {
    nodes.push({
      id: net.id,
      type: 'net',
      label: net.code || 'Net',
      x: width - 40,
      y: 40 + idx * 50,
      radius: 16,
      color: '#10b981'
    });
  });

  return nodes;
}

function buildEdges(topologyData, nodes) {
  const edges = [];
  // Command to squads
  const commandNode = nodes.find(n => n.type === 'command');
  const squadNodes = nodes.filter(n => n.type === 'squad');
  
  squadNodes.forEach(squad => {
    edges.push({
      from: commandNode,
      to: squad,
      type: 'membership'
    });
  });

  return edges;
}

function drawNodes(ctx, nodes) {
  nodes.forEach(node => {
    // Outer circle
    ctx.fillStyle = node.color;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
    ctx.fill();

    // Node circle
    ctx.globalAlpha = 1;
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);
  });
}

function drawEdges(ctx, edges) {
  edges.forEach(edge => {
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(edge.from.x, edge.from.y);
    ctx.lineTo(edge.to.x, edge.to.y);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}