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

  const [nodeStates, setNodeStates] = useState({});
  const [transmittingNodes, setTransmittingNodes] = useState(new Set());
  const [edgeTypes, setEdgeTypes] = useState({});

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

      // Fetch voice nets with connection states
      const nets = await base44.entities.VoiceNet.filter({ event_id: eventId });

      // Fetch player statuses
      const statuses = await base44.entities.PlayerStatus.filter({ event_id: eventId });

      // Fetch whisper sessions (active)
      const whispers = await base44.entities.WhisperSession.filter({
        operation_id: eventId,
        status: 'ACTIVE'
      });

      // Fetch net patches
      const patches = await base44.entities.NetPatch.filter({ event_id: eventId });

      return {
        squads,
        commandStaff,
        nets,
        statuses,
        whispers,
        patches
      };
    },
    enabled: !!eventId,
    staleTime: 8000,
    gcTime: 30000
  });

  // Update node states and edge types when topology changes
  useEffect(() => {
    if (!topologyData) return;

    const states = {};
    const edges = {};

    // Update node states based on player statuses
    topologyData.statuses?.forEach(status => {
      states[status.user_id] = mapStatusToState(status.status);
    });

    // Track transmitting nodes from voice nets
    const transmitting = new Set();
    topologyData.nets?.forEach(net => {
      if (net.active_speaker_user_id) {
        transmitting.add(net.active_speaker_user_id);
      }
    });
    setTransmittingNodes(transmitting);

    // Map edge types
    topologyData.whispers?.forEach(whisper => {
      edges[`whisper-${whisper.id}`] = 'whisper';
    });

    topologyData.patches?.forEach(patch => {
      edges[`patch-${patch.id}`] = 'patch';
    });

    // Default to operational for squad-command links
    topologyData.squads?.forEach(squad => {
      edges[`squad-${squad.id}`] = 'operational';
    });

    setNodeStates(states);
    setEdgeTypes(edges);
  }, [topologyData]);

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
    drawNodes(ctx, nodes, nodeStates, transmittingNodes);

    // Draw edges
    const edges = buildEdges(topologyData, nodes);
    drawEdges(ctx, edges, edgeTypes);
  }, [topologyData, nodeStates, transmittingNodes, edgeTypes]);

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
      return dist < n.radius + 6; // Include glow radius
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

  // Handle ESC key to close menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuState({ isOpen: false, nodeId: null, nodeType: null, position: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWhisper = async (nodeId, scope) => {
    try {
      await startWhisper(nodeId, scope);
      onWhisperStart?.();
    } catch (err) {
      console.error('[COMMS ARRAY] Whisper start error:', err);
    }
  };

  const handleBroadcast = async (nodeId) => {
    try {
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'command',
        actor_id: currentUser?.id,
        content: `BROADCAST PING to ${nodeId}`,
        metadata: { target_node: nodeId, source: 'comms_array' }
      });
    } catch (err) {
      console.error('[COMMS ARRAY] Broadcast error:', err);
    }
  };

  const handleRequestPriority = async (nodeId) => {
    try {
      await base44.entities.PriorityState.create({
        operation_id: eventId,
        user_id: currentUser?.id || nodeId,
        state: 'REQUESTED',
        requested_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[COMMS ARRAY] Priority request error:', err);
    }
  };

  const handleGrantPriority = async (nodeId) => {
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
            participants={
              whisperSession.participant_user_ids?.map(id => ({
                id,
                name: `User ${id.substring(0, 4)}`
              })) || []
            }
            isTransmitting={transmittingNodes.has(currentUser?.id)}
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
        onWhisper={(nodeId, scope) => handleWhisper(nodeId, scope)}
        onBroadcast={handleBroadcast}
        onRequestPriority={handleRequestPriority}
        onGrantPriority={handleGrantPriority}
      />
    </motion.div>
  );
}

// Helper functions
function mapStatusToState(status) {
  const stateMap = {
    'READY': 'connected',
    'IN_QUANTUM': 'connecting',
    'ENGAGED': 'connected',
    'DOWN': 'offline',
    'RTB': 'connected',
    'OFFLINE': 'offline',
    'DISTRESS': 'offline'
  };
  return stateMap[status] || 'unknown';
}

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
  const commandNode = nodes.find(n => n.type === 'command');
  const squadNodes = nodes.filter(n => n.type === 'squad');
  const netNodes = nodes.filter(n => n.type === 'net');
  
  // Command to squads (operational)
  squadNodes.forEach(squad => {
    edges.push({
      from: commandNode,
      to: squad,
      type: 'membership',
      edgeType: 'operational'
    });
  });

  // Squads to nets (can be operational, whisper, or patch based on context)
  if (squadNodes.length > 0 && netNodes.length > 0) {
    squadNodes.slice(0, 1).forEach(squad => {
      netNodes.forEach((net, idx) => {
        edges.push({
          from: squad,
          to: net,
          type: 'membership',
          edgeType: 'operational'
        });
      });
    });
  }

  return edges;
}

function getNodeStateColor(baseColor, state) {
  const stateColors = {
    connected: '#10b981',    // Green
    connecting: '#eab308',   // Yellow
    offline: '#ef4444',      // Red
    unknown: baseColor
  };
  return stateColors[state] || baseColor;
}

function drawNodes(ctx, nodes, nodeStates = {}, transmittingNodes = new Set()) {
  const now = Date.now();
  
  nodes.forEach(node => {
    const state = nodeStates[node.id] || 'unknown';
    const nodeColor = getNodeStateColor(node.color, state);
    const isTransmitting = transmittingNodes.has(node.id);
    
    // Pulsing effect for transmitting nodes
    let pulseRadius = node.radius;
    if (isTransmitting) {
      const pulseAmount = Math.sin((now % 1000) / 1000 * Math.PI) * 6;
      pulseRadius = node.radius + pulseAmount;
    }

    // Outer glow (pulsing for transmitting, static for others)
    ctx.fillStyle = nodeColor;
    ctx.globalAlpha = isTransmitting ? 0.3 : 0.15;
    ctx.beginPath();
    ctx.arc(node.x, node.y, pulseRadius + 6, 0, 2 * Math.PI);
    ctx.fill();

    // Node circle
    ctx.globalAlpha = 1;
    ctx.fillStyle = nodeColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    ctx.fill();

    // Border (brighter for transmitting)
    ctx.strokeStyle = isTransmitting ? '#ffffff' : '#09090b';
    ctx.lineWidth = isTransmitting ? 2.5 : 2;
    ctx.stroke();

    // State indicator dot (top-right corner)
    const dotRadius = 4;
    ctx.fillStyle = nodeColor;
    ctx.beginPath();
    ctx.arc(node.x + node.radius - dotRadius, node.y - node.radius + dotRadius, dotRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);

    // Transmitting indicator text
    if (isTransmitting) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('TX', node.x, node.y + node.radius + 8);
    }
  });
}

function drawEdges(ctx, edges, edgeTypes = {}) {
  const edgeStyleMap = {
    operational: {
      color: '#3b82f6',
      dash: [4, 4],
      width: 1.5,
      alpha: 0.6
    },
    whisper: {
      color: '#8b5cf6',
      dash: [2, 2],
      width: 2,
      alpha: 0.8
    },
    patch: {
      color: '#f59e0b',
      dash: [6, 2],
      width: 1.5,
      alpha: 0.7
    }
  };

  edges.forEach((edge, idx) => {
    const edgeKey = `${edge.from.id}-${edge.to.id}`;
    const edgeType = edgeTypes[edgeKey] || 'operational';
    const style = edgeStyleMap[edgeType] || edgeStyleMap.operational;

    ctx.strokeStyle = style.color;
    ctx.globalAlpha = style.alpha;
    ctx.lineWidth = style.width;
    ctx.setLineDash(style.dash);
    ctx.beginPath();
    ctx.moveTo(edge.from.x, edge.from.y);
    ctx.lineTo(edge.to.x, edge.to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  });
}