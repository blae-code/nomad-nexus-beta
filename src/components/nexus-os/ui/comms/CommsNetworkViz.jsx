import React, { useEffect, useRef, useState, useMemo } from 'react';

/**
 * CommsNetworkViz — Interactive force-directed network of channels.
 * Nodes are draggable, hover reveals channel info, click to select.
 */
export default function CommsNetworkViz({ channels = {}, selectedChannel, onSelectChannel, unreadByChannel = {} }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [velocities, setVelocities] = useState({});

  // Flatten channels into node list
  const allChannels = useMemo(
    () => Object.values(channels).flat(),
    [channels]
  );

  // Initialize nodes with random positions
  useEffect(() => {
    const width = canvasRef.current?.width || 800;
    const height = canvasRef.current?.height || 600;
    const newNodes = allChannels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      category: ch.category,
      unread: unreadByChannel[ch.id] || 0,
      x: Math.random() * width,
      y: Math.random() * height,
    }));
    setNodes(newNodes);
    const newVels = {};
    newNodes.forEach((n) => {
      newVels[n.id] = { vx: 0, vy: 0 };
    });
    setVelocities(newVels);
  }, [allChannels, unreadByChannel]);

  // Force-directed simulation
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const REPULSION = 150;
    const ATTRACTION = 0.05;
    const DAMPING = 0.95;
    const CENTER_PULL = 0.02;
    const NODE_RADIUS = 20;

    let currentNodes = [...nodes];
    let currentVels = { ...velocities };

    const simulate = () => {
      // Reset forces
      currentNodes.forEach((n) => {
        currentVels[n.id] = { vx: currentVels[n.id]?.vx || 0, vy: currentVels[n.id]?.vy || 0 };
      });

      // Apply forces
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n1 = currentNodes[i];
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const angle = Math.atan2(dy, dx);

          // Repulsion (avoid overlap)
          const repulsion = REPULSION / (dist * dist);
          currentVels[n1.id].vx -= Math.cos(angle) * repulsion;
          currentVels[n1.id].vy -= Math.sin(angle) * repulsion;
          currentVels[n2.id].vx += Math.cos(angle) * repulsion;
          currentVels[n2.id].vy += Math.sin(angle) * repulsion;

          // Attraction to center (loose gravity)
          currentVels[n1.id].vx += (width / 2 - n1.x) * CENTER_PULL;
          currentVels[n1.id].vy += (height / 2 - n1.y) * CENTER_PULL;
        }
      }

      // Update positions
      currentNodes = currentNodes.map((n) => {
        if (draggedNodeId === n.id) return n; // Frozen while dragging

        const vel = currentVels[n.id];
        vel.vx *= DAMPING;
        vel.vy *= DAMPING;

        let x = n.x + vel.vx;
        let y = n.y + vel.vy;

        // Boundary wrap
        if (x < NODE_RADIUS) x = NODE_RADIUS;
        if (x > width - NODE_RADIUS) x = width - NODE_RADIUS;
        if (y < NODE_RADIUS) y = NODE_RADIUS;
        if (y > height - NODE_RADIUS) y = height - NODE_RADIUS;

        return { ...n, x, y };
      });

      setNodes(currentNodes);
      setVelocities(currentVels);
    };

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
      ctx.fillRect(0, 0, width, height);

      // Draw edges first
      ctx.strokeStyle = 'rgba(113, 113, 122, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < Math.min(i + 3, currentNodes.length); j++) {
          const n1 = currentNodes[i];
          const n2 = currentNodes[j];
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }

      // Draw nodes
      currentNodes.forEach((n) => {
        const isSelected = selectedChannel === n.id;
        const isHovered = hoveredNodeId === n.id;
        const radius = isSelected ? 28 : isHovered ? 25 : NODE_RADIUS;

        // Node circle
        const categoryColor = {
          tactical: '#f97316',
          operations: '#3b82f6',
          social: '#a855f7',
          direct: '#10b981',
        }[n.category] || '#6b7280';

        ctx.fillStyle = isSelected ? categoryColor + '40' : categoryColor + '20';
        ctx.strokeStyle = isSelected ? categoryColor : 'rgba(113, 113, 122, 0.5)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Unread badge
        if (n.unread > 0) {
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(n.unread), n.x, n.y);
        }
      });

      simulate();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, velocities, selectedChannel, hoveredNodeId, draggedNodeId]);

  // Mouse interactions
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find hovered node
    let hovered = null;
    for (const n of nodes) {
      const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (dist < 30) {
        hovered = n.id;
        break;
      }
    }
    setHoveredNodeId(hovered);

    // Handle dragging
    if (draggedNodeId) {
      const node = nodes.find((n) => n.id === draggedNodeId);
      if (node) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === draggedNodeId ? { ...n, x: Math.max(20, Math.min(rect.width - 20, x)), y: Math.max(20, Math.min(rect.height - 20, y)) } : n
          )
        );
      }
    }

    canvasRef.current.style.cursor = hovered ? 'grab' : 'default';
  };

  const handleMouseDown = (e) => {
    if (hoveredNodeId) {
      setDraggedNodeId(hoveredNodeId);
    }
  };

  const handleMouseUp = (e) => {
    if (draggedNodeId) {
      setDraggedNodeId(null);
    } else if (hoveredNodeId) {
      onSelectChannel?.(hoveredNodeId);
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="text-[9px] uppercase tracking-wide text-zinc-500">Channel Network</div>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredNodeId(null);
          setDraggedNodeId(null);
        }}
        className="flex-1 rounded border border-zinc-700/40 bg-black/50 cursor-default"
      />
      {hoveredNodeId && (
        <div className="px-2 py-1 rounded border border-orange-500/40 bg-orange-500/10 text-[9px] text-orange-300">
          {nodes.find((n) => n.id === hoveredNodeId)?.name} • Click to select, drag to explore
        </div>
      )}
    </div>
  );
}