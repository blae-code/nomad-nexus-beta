import { useState, useEffect, useRef } from 'react';
import { Play, Square, Send, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import NetworkConditionsMonitor from './NetworkConditionsMonitor';
import SimulationScenarios from './SimulationScenarios';

const SCENARIOS = [
  {
    id: 'routine',
    label: 'Routine Operations',
    conditions: { simulated_latency_ms: 30, packet_loss_percent: 0, jitter_ms: 5 }
  },
  {
    id: 'high_stress',
    label: 'High Stress',
    conditions: { simulated_latency_ms: 120, packet_loss_percent: 2, jitter_ms: 30 }
  },
  {
    id: 'degraded_network',
    label: 'Degraded Network',
    conditions: { simulated_latency_ms: 250, packet_loss_percent: 8, jitter_ms: 60 }
  },
  {
    id: 'equipment_failure',
    label: 'Equipment Failure',
    conditions: { simulated_latency_ms: 400, packet_loss_percent: 15, jitter_ms: 100 }
  },
  {
    id: 'critical_incident',
    label: 'Critical Incident',
    conditions: { simulated_latency_ms: 500, packet_loss_percent: 25, jitter_ms: 150 }
  }
];

export default function CommsSimulationPanel() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [sessionId] = useState(() => `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [commsLog, setCommsLog] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [user, setUser] = useState(null);
  const logEndRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: Infinity
  });

  useEffect(() => {
    setUser(currentUser);
  }, [currentUser]);

  // Simulate message delivery with network conditions
  const simulateMessageDelivery = async (content) => {
    const latency = selectedScenario.conditions.simulated_latency_ms +
      (Math.random() - 0.5) * selectedScenario.conditions.jitter_ms;
    
    const willDrop = Math.random() * 100 < selectedScenario.conditions.packet_loss_percent;

    const logEntry = {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      message_type: 'text',
      content,
      delivered: !willDrop,
      delivery_latency_ms: Math.round(latency),
      failure_reason: willDrop ? 'Packet loss' : null
    };

    // Wait for simulated latency
    await new Promise(resolve => setTimeout(resolve, Math.min(latency, 500)));

    setCommsLog(prev => [...prev, logEntry]);
    return logEntry;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !isSimulating) return;

    setMessageInput('');
    await simulateMessageDelivery(messageInput);
  };

  const handleStartSimulation = async () => {
    setIsSimulating(true);
    setCommsLog([]);

    if (user) {
      try {
        await base44.entities.CommsSimulation.create({
          session_id: sessionId,
          user_id: user.id,
          scenario_type: selectedScenario.id,
          network_conditions: selectedScenario.conditions,
          status: 'active'
        });
      } catch (e) {
        console.error('Failed to create simulation session:', e);
      }
    }

    // Simulate random failure events
    const eventInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const events = [
          { type: 'interference', desc: 'Signal interference detected' },
          { type: 'signal_loss', desc: 'Temporary signal loss' },
          { type: 'equipment_malfunction', desc: 'Equipment malfunction' }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        
        setCommsLog(prev => [...prev, {
          id: `event_${Date.now()}`,
          timestamp: new Date().toISOString(),
          message_type: 'system',
          content: `⚠ ${event.desc}`,
          delivered: true
        }]);
      }
    }, 5000);

    return () => clearInterval(eventInterval);
  };

  const handleStopSimulation = async () => {
    setIsSimulating(false);

    if (user) {
      try {
        const metrics = {
          messages_sent: commsLog.filter(m => m.message_type === 'text').length,
          messages_delivered: commsLog.filter(m => m.message_type === 'text' && m.delivered).length,
          delivery_success_rate: commsLog.filter(m => m.message_type === 'text').length > 0
            ? (commsLog.filter(m => m.message_type === 'text' && m.delivered).length / commsLog.filter(m => m.message_type === 'text').length) * 100
            : 0,
          average_latency_ms: commsLog.filter(m => m.delivery_latency_ms).reduce((a, b) => a + (b.delivery_latency_ms || 0), 0) / Math.max(1, commsLog.filter(m => m.delivery_latency_ms).length)
        };

        await base44.entities.CommsSimulation.create({
          session_id: sessionId,
          user_id: user.id,
          scenario_type: selectedScenario.id,
          network_conditions: selectedScenario.conditions,
          comms_log: commsLog,
          performance_metrics: metrics,
          status: 'completed',
          duration_seconds: 0
        });
      } catch (e) {
        console.error('Failed to save simulation session:', e);
      }
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commsLog]);

  return (
    <div className="space-y-4">
      {/* Scenarios */}
      <SimulationScenarios
        selectedScenario={selectedScenario}
        onSelectScenario={setSelectedScenario}
        isSimulating={isSimulating}
      />

      {/* Network Monitor */}
      <NetworkConditionsMonitor
        conditions={selectedScenario.conditions}
        isSimulating={isSimulating}
      />

      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isSimulating ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={handleStartSimulation}
            className="flex-1 bg-emerald-950/30 border border-emerald-700/50 text-emerald-300 hover:border-emerald-600 p-3 font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-4 h-4" />
            Start Simulation
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={handleStopSimulation}
              className="flex-1 bg-red-950/30 border border-red-700/50 text-red-300 hover:border-red-600 p-3 font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Square className="w-4 h-4" />
              End Session
            </motion.button>
          </>
        )}
      </div>

      {/* Communication Log */}
      {isSimulating && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800 bg-zinc-950/50 p-4 space-y-3 max-h-96 flex flex-col"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <MessageSquare className="w-4 h-4 text-[#ea580c]" />
            <h3 className="text-sm font-bold uppercase text-white">Communication Log</h3>
            <span className="ml-auto text-[8px] text-zinc-600 font-mono">{commsLog.length} events</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[150px]">
            <AnimatePresence>
              {commsLog.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'p-2 border text-[9px] font-mono',
                    msg.message_type === 'system'
                      ? 'border-zinc-800 bg-zinc-900/50 text-zinc-500'
                      : msg.delivered
                      ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-300'
                      : 'border-red-800/50 bg-red-950/20 text-red-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-zinc-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <span className={cn(
                      'px-1 py-0.5',
                      msg.delivered ? 'bg-emerald-900/50' : 'bg-red-900/50'
                    )}>
                      {msg.delivered ? `✓ +${msg.delivery_latency_ms}ms` : `✗ ${msg.failure_reason}`}
                    </span>
                  </div>
                  <div className="break-words">{msg.content}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>

          {/* Message Input */}
          <div className="flex gap-2 pt-3 border-t border-zinc-800">
            <input
              type="text"
              placeholder="Send simulated message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm p-2"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="bg-[#ea580c] hover:bg-[#ea580c]/80 disabled:opacity-50 text-white p-2 font-bold"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Statistics */}
      {commsLog.length > 0 && isSimulating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-zinc-800 bg-zinc-950/50 p-3 grid grid-cols-2 gap-3 text-[9px]"
        >
          <div className="space-y-1">
            <div className="text-zinc-600 uppercase">Messages Sent</div>
            <div className="text-lg font-bold text-white">{commsLog.filter(m => m.message_type === 'text').length}</div>
          </div>
          <div className="space-y-1">
            <div className="text-zinc-600 uppercase">Delivery Rate</div>
            <div className="text-lg font-bold text-emerald-400">
              {commsLog.filter(m => m.message_type === 'text').length > 0
                ? Math.round((commsLog.filter(m => m.message_type === 'text' && m.delivered).length / commsLog.filter(m => m.message_type === 'text').length) * 100)
                : 0}%
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}