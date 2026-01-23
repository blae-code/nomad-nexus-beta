import React, { useState } from 'react';
import { Zap, AlertTriangle, Radio, Calendar, Send, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function QuickActions({ user, onActionComplete }) {
  const [isExecuting, setIsExecuting] = useState(null);
  const navigate = useNavigate();

  const executeAction = async (actionId, actionFn) => {
    setIsExecuting(actionId);
    try {
      await actionFn();
      onActionComplete?.(actionId, 'success');
    } catch (error) {
      console.error(`Action ${actionId} failed:`, error);
      onActionComplete?.(actionId, 'error');
    } finally {
      setIsExecuting(null);
    }
  };

  const actions = [
    {
      id: 'emergency_alert',
      label: 'EMERGENCY ALERT',
      icon: AlertTriangle,
      color: 'red',
      action: async () => {
        await base44.functions.invoke('sendWhisper', {
          recipientIds: ['all'],
          message: '[EMERGENCY BROADCAST] All personnel report status immediately',
          classification_level: 'confidential'
        });
      }
    },
    {
      id: 'create_event',
      label: 'NEW OPERATION',
      icon: Calendar,
      color: 'blue',
      action: () => navigate(createPageUrl('Events'))
    },
    {
      id: 'distress_beacon',
      label: 'DISTRESS BEACON',
      icon: Radio,
      color: 'orange',
      action: () => navigate(createPageUrl('Rescue'))
    },
    {
      id: 'rally_point',
      label: 'SET RALLY POINT',
      icon: Users,
      color: 'cyan',
      action: async () => {
        await base44.functions.invoke('sendWhisper', {
          recipientIds: ['all'],
          message: '[RALLY POINT] All units rally at designated coordinates',
          classification_level: 'confidential'
        });
      }
    }
  ];

  const colorMap = {
    red: 'bg-red-950/30 border-red-500/50 text-red-300 hover:bg-red-950/50',
    blue: 'bg-blue-950/30 border-blue-500/50 text-blue-300 hover:bg-blue-950/50',
    orange: 'bg-orange-950/30 border-orange-500/50 text-orange-300 hover:bg-orange-950/50',
    cyan: 'bg-cyan-950/30 border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/50',
  };

  return (
    <div className="space-y-2">
      <h3 className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">QUICK ACTIONS</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => executeAction(action.id, action.action)}
              disabled={isExecuting === action.id}
              className={cn(
                'border p-2 transition-all flex flex-col items-center gap-1 relative overflow-hidden',
                colorMap[action.color],
                isExecuting === action.id && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[7px] font-mono font-bold">{action.label}</span>
              {isExecuting === action.id && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}