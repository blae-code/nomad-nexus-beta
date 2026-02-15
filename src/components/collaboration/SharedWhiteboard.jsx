import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Pen, Eraser, Square, Circle, Type, Move, Trash2, Download, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

/**
 * SharedWhiteboard - Real-time collaborative canvas for visual planning
 * Supports drawing, shapes, text, and cursor tracking
 */
export default function SharedWhiteboard({ sessionId, operationId }) {
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [elements, setElements] = useState([]);
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#f97316');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [participants, setParticipants] = useState([]);
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const heartbeatTimerRef = useRef(null);

  const memberId = user?.member_profile_id || user?.id;

  // Load session
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        const data = await base44.entities.WhiteboardSession.get(sessionId);
        setSession(data);
        setParticipants(data.active_participants || []);
      } catch (error) {
        console.error('Failed to load whiteboard session:', error);
      }
    };

    loadSession();
  }, [sessionId]);

  // Load elements
  useEffect(() => {
    if (!sessionId) return;

    const loadElements = async () => {
      try {
        const data = await base44.entities.WhiteboardElement.filter({ session_id: sessionId });
        setElements(data.sort((a, b) => a.layer - b.layer));
      } catch (error) {
        console.error('Failed to load elements:', error);
      }
    };

    loadElements();
  }, [sessionId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const unsubSession = base44.entities.WhiteboardSession.subscribe((event) => {
      if (event.id !== sessionId) return;
      if (event.type === 'update') {
        setSession(event.data);
        setParticipants(event.data.active_participants || []);
      }
    });

    const unsubElements = base44.entities.WhiteboardElement.subscribe((event) => {
      if (event.data?.session_id !== sessionId) return;
      
      if (event.type === 'create') {
        setElements((prev) => [...prev, event.data].sort((a, b) => a.layer - b.layer));
      } else if (event.type === 'update') {
        setElements((prev) => prev.map((e) => (e.id === event.id ? event.data : e)));
      } else if (event.type === 'delete') {
        setElements((prev) => prev.filter((e) => e.id !== event.id));
      }
    });

    return () => {
      unsubSession();
      unsubElements();
    };
  }, [sessionId]);

  // Setup canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = session?.canvas_width || 1920;
    canvas.height = session?.canvas_height || 1080;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, [session]);

  // Redraw canvas
  useEffect(() => {
    if (!ctxRef.current || !canvasRef.current) return;

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background if exists
    if (session?.background_image) {
      const img = new Image();
      img.src = session.background_image;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawElements();
      };
    } else {
      drawElements();
    }

    function drawElements() {
      elements.forEach((element) => {
        if (element.element_type === 'path') {
          drawPath(ctx, element.data);
        } else if (element.element_type === 'rect') {
          drawRect(ctx, element.data);
        } else if (element.element_type === 'circle') {
          drawCircle(ctx, element.data);
        } else if (element.element_type === 'text') {
          drawText(ctx, element.data);
        } else if (element.element_type === 'arrow') {
          drawArrow(ctx, element.data);
        }
      });
    }
  }, [elements, session]);

  // Presence heartbeat
  useEffect(() => {
    if (!sessionId || !memberId) return;

    const updatePresence = async (x, y) => {
      try {
        const currentParticipants = session?.active_participants || [];
        const updatedParticipants = currentParticipants.filter(
          (p) => p.member_profile_id !== memberId || Date.now() - new Date(p.last_active).getTime() < 30000
        );

        updatedParticipants.push({
          member_profile_id: memberId,
          cursor_x: x || 0,
          cursor_y: y || 0,
          color: activeColor,
          last_active: new Date().toISOString(),
        });

        await base44.entities.WhiteboardSession.update(sessionId, {
          active_participants: updatedParticipants,
        });
      } catch (error) {
        console.error('Presence update error:', error);
      }
    };

    heartbeatTimerRef.current = setInterval(() => updatePresence(), 10000);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [sessionId, memberId, activeColor, session?.active_participants]);

  const startDrawing = (e) => {
    if (session?.locked) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing || session?.locked) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPath((prev) => [...prev, { x, y }]);

    // Draw current path
    if (ctxRef.current && currentPath.length > 0) {
      const ctx = ctxRef.current;
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDrawing = async () => {
    if (!isDrawing || currentPath.length === 0) return;

    setIsDrawing(false);

    try {
      await base44.entities.WhiteboardElement.create({
        session_id: sessionId,
        element_type: 'path',
        data: {
          points: currentPath,
          color: activeColor,
          width: strokeWidth,
        },
        layer: elements.length,
        author_member_profile_id: memberId,
      });
      
      setCurrentPath([]);
    } catch (error) {
      toast.error('Failed to save drawing');
      console.error('Save drawing error:', error);
    }
  };

  const clearCanvas = async () => {
    if (!sessionId) return;

    try {
      const deletePromises = elements.map((e) => base44.entities.WhiteboardElement.delete(e.id));
      await Promise.all(deletePromises);
      toast.success('Canvas cleared');
    } catch (error) {
      toast.error('Failed to clear canvas');
    }
  };

  const drawPath = (ctx, data) => {
    if (!data.points || data.points.length === 0) return;
    
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.beginPath();
    ctx.moveTo(data.points[0].x, data.points[0].y);
    data.points.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
  };

  const drawRect = (ctx, data) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.strokeRect(data.x, data.y, data.width, data.height);
  };

  const drawCircle = (ctx, data) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.beginPath();
    ctx.arc(data.x, data.y, data.radius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawText = (ctx, data) => {
    ctx.fillStyle = data.color;
    ctx.font = `${data.size}px sans-serif`;
    ctx.fillText(data.text, data.x, data.y);
  };

  const drawArrow = (ctx, data) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    ctx.stroke();

    // Arrow head
    const angle = Math.atan2(data.y2 - data.y1, data.x2 - data.x1);
    ctx.beginPath();
    ctx.moveTo(data.x2, data.y2);
    ctx.lineTo(data.x2 - 10 * Math.cos(angle - Math.PI / 6), data.y2 - 10 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(data.x2 - 10 * Math.cos(angle + Math.PI / 6), data.y2 - 10 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = data.color;
    ctx.fill();
  };

  const activeParticipants = participants.filter(
    (p) => p.member_profile_id !== memberId && Date.now() - new Date(p.last_active).getTime() < 30000
  );

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-200">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTool === 'pen' ? 'default' : 'outline'}
              onClick={() => setActiveTool('pen')}
            >
              <Pen className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'eraser' ? 'default' : 'outline'}
              onClick={() => setActiveTool('eraser')}
            >
              <Eraser className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-zinc-700" />
            <div className="flex items-center gap-2">
              {['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#000000'].map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 ${activeColor === color ? 'border-white' : 'border-zinc-700'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>
            <div className="w-px h-6 bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Width:</span>
              <Slider
                value={[strokeWidth]}
                onValueChange={([value]) => setStrokeWidth(value)}
                min={1}
                max={20}
                step={1}
                className="w-24"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeParticipants.length > 0 && (
              <Badge variant="outline">
                <Users className="w-3 h-3 mr-1" />
                {activeParticipants.length} active
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={clearCanvas}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-zinc-900/20 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          className="cursor-crosshair"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
        
        {/* Other participants' cursors */}
        {activeParticipants.map((p) => (
          <div
            key={p.member_profile_id}
            className="absolute w-4 h-4 rounded-full pointer-events-none"
            style={{
              backgroundColor: p.color,
              left: p.cursor_x,
              top: p.cursor_y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
    </div>
  );
}