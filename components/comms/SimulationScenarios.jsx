import { Activity, AlertTriangle, Zap, Radio, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const SCENARIOS = [
  {
    id: 'routine',
    label: 'Routine Operations',
    icon: Radio,
    description: 'Normal conditions with minimal latency',
    color: 'emerald',
    conditions: {
      simulated_latency_ms: 30,
      packet_loss_percent: 0,
      jitter_ms: 5
    }
  },
  {
    id: 'high_stress',
    label: 'High Stress',
    icon: Zap,
    description: 'Increased latency, minor packet loss',
    color: 'yellow',
    conditions: {
      simulated_latency_ms: 120,
      packet_loss_percent: 2,
      jitter_ms: 30
    }
  },
  {
    id: 'degraded_network',
    label: 'Degraded Network',
    icon: AlertTriangle,
    description: 'Significant latency and packet loss',
    color: 'orange',
    conditions: {
      simulated_latency_ms: 250,
      packet_loss_percent: 8,
      jitter_ms: 60
    }
  },
  {
    id: 'equipment_failure',
    label: 'Equipment Failure',
    icon: Activity,
    description: 'Intermittent connection loss',
    color: 'red',
    conditions: {
      simulated_latency_ms: 400,
      packet_loss_percent: 15,
      jitter_ms: 100
    }
  },
  {
    id: 'critical_incident',
    label: 'Critical Incident',
    icon: Flame,
    description: 'Severe degradation with random failures',
    color: 'red',
    conditions: {
      simulated_latency_ms: 500,
      packet_loss_percent: 25,
      jitter_ms: 150
    }
  }
];

export default function SimulationScenarios({ selectedScenario, onSelectScenario, isSimulating }) {
  return (
    <div className="border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <h3 className="text-sm font-bold uppercase text-white">Training Scenarios</h3>
        {isSimulating && (
          <span className="text-[8px] font-mono bg-[#ea580c]/20 text-[#ea580c] px-2 py-1">
            IN PROGRESS
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const isSelected = selectedScenario.id === scenario.id;
          const colorMap = {
            emerald: 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300 hover:border-emerald-600',
            yellow: 'bg-yellow-950/30 border-yellow-700/50 text-yellow-300 hover:border-yellow-600',
            orange: 'bg-orange-950/30 border-orange-700/50 text-orange-300 hover:border-orange-600',
            red: 'bg-red-950/30 border-red-700/50 text-red-300 hover:border-red-600'
          };

          return (
            <motion.button
              key={scenario.id}
              onClick={() => onSelectScenario(scenario)}
              disabled={isSimulating}
              whileHover={!isSimulating ? { scale: 1.02 } : {}}
              className={cn(
                'relative p-3 border text-left transition-all duration-200 overflow-hidden',
                isSelected
                  ? `${colorMap[scenario.color]} border-[#ea580c] bg-[#ea580c]/20`
                  : `${colorMap[scenario.color]} ${isSimulating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`,
                'group'
              )}
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-1.5">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {isSelected && (
                    <span className="text-[7px] font-bold bg-[#ea580c] text-white px-1.5 py-0.5">
                      SELECTED
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold">{scenario.label}</h4>
                <p className="text-[9px] text-zinc-400 mt-1">{scenario.description}</p>
              </div>

              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          );
        })}
      </div>

      {/* Scenario Details */}
      {selectedScenario && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-3 border-t border-zinc-800 space-y-2"
        >
          <div className="text-xs font-bold text-zinc-500 uppercase">Network Parameters</div>
          <div className="grid grid-cols-3 gap-2 text-[9px]">
            <div className="bg-zinc-900/50 p-2 border border-zinc-800">
              <div className="text-zinc-600">Latency</div>
              <div className="text-white font-mono">{selectedScenario.conditions.simulated_latency_ms}ms</div>
            </div>
            <div className="bg-zinc-900/50 p-2 border border-zinc-800">
              <div className="text-zinc-600">Packet Loss</div>
              <div className="text-white font-mono">{selectedScenario.conditions.packet_loss_percent}%</div>
            </div>
            <div className="bg-zinc-900/50 p-2 border border-zinc-800">
              <div className="text-zinc-600">Jitter</div>
              <div className="text-white font-mono">±{selectedScenario.conditions.jitter_ms}ms</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}