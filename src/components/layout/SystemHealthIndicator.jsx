import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { observability } from '@/functions/observability';
import { cn } from '@/lib/utils';

/**
 * System Health Indicator: Green/Amber/Red status in header
 * Shows real-time health based on error rate and connectivity
 */
export default function SystemHealthIndicator() {
  const [healthStatus, setHealthStatus] = useState('green');
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const updateHealth = () => {
      if (observability?.getHealthStatus) {
        setHealthStatus(observability.getHealthStatus());
        const recentErrors = observability.getRecentErrors?.(100) || [];
        setErrorCount(recentErrors.length);
      }
    };

    updateHealth();
    
    // Update every 3 seconds
    const interval = setInterval(updateHealth, 3000);
    window.addEventListener('observability:error', updateHealth);

    return () => {
      clearInterval(interval);
      window.removeEventListener('observability:error', updateHealth);
    };
  }, []);

  const getStatus = () => {
    switch (healthStatus) {
      case 'green':
        return {
          label: 'TELEMETRY NOMINAL',
          color: 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400',
          dotColor: 'bg-emerald-500',
          icon: CheckCircle2,
          inWorldMsg: 'All systems nominal'
        };
      case 'amber':
        return {
          label: 'TELEMETRY DEGRADED',
          color: 'bg-yellow-950/30 border-yellow-700/50 text-yellow-400',
          dotColor: 'bg-yellow-500',
          icon: AlertTriangle,
          inWorldMsg: 'Minor issues detected'
        };
      case 'red':
        return {
          label: 'TELEMETRY FAILING',
          color: 'bg-red-950/30 border-red-700/50 text-red-400',
          dotColor: 'bg-red-500',
          icon: AlertCircle,
          inWorldMsg: 'Critical issues detected'
        };
      default:
        return {
          label: 'UNKNOWN',
          color: 'bg-zinc-950/30 border-zinc-700/50 text-zinc-400',
          dotColor: 'bg-zinc-500',
          icon: AlertCircle,
          inWorldMsg: 'Status unknown'
        };
    }
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-2 border text-[9px] font-mono font-bold uppercase hidden lg:flex transition-all duration-100 cursor-pointer',
              status.color
            )}
            animate={{
              opacity: healthStatus === 'red' ? [1, 0.8, 1] : 1
            }}
            transition={{
              duration: healthStatus === 'red' ? 1.5 : 0,
              repeat: healthStatus === 'red' ? Infinity : 0
            }}
          >
            <motion.div
              className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)}
              animate={{
                scale: healthStatus === 'red' ? [1, 1.2, 1] : 1
              }}
              transition={{
                duration: healthStatus === 'red' ? 1.5 : 0,
                repeat: healthStatus === 'red' ? Infinity : 0
              }}
            />
            <span>{status.label}</span>
            {errorCount > 0 && (
              <span className="text-[7px] ml-1 opacity-70">({errorCount})</span>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-bold">{status.inWorldMsg}</p>
            {errorCount > 0 && (
              <p className="text-[11px] opacity-80">
                {errorCount} issue{errorCount !== 1 ? 's' : ''} in last 5 min
              </p>
            )}
            <p className="text-[10px] opacity-70">Admins: Check diagnostics drawer for details</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}