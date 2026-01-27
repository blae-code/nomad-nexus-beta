import { useState } from 'react';
import { AlertTriangle, Zap, RefreshCw, Trash2, Plus, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function DevToolsPanel() {
  const [isWiping, setIsWiping] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [wipingConfirm, setWipingConfirm] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleWipeData = async () => {
    if (!wipingConfirm) {
      setWipingConfirm(true);
      return;
    }

    setIsWiping(true);
    setLoadingMessage('Wiping application data...');
    
    try {
      const response = await base44.functions.invoke('wipeAppData', {});
      
      setLastAction({
        type: 'wipe',
        timestamp: new Date(),
        results: response.data.results
      });
      
      toast.success(`Data wiped: ${Object.values(response.data.results).reduce((a, b) => a + (b.deleted || 0), 0)} records deleted`);
      setWipingConfirm(false);
    } catch (error) {
      toast.error(`Failed to wipe data: ${error.message}`);
    } finally {
      setIsWiping(false);
      setLoadingMessage('');
    }
  };

  const handlePopulateSampleData = async () => {
    setIsPopulating(true);
    setLoadingMessage('Generating sample data...');
    
    try {
      const response = await base44.functions.invoke('populateSampleData', {});
      
      setLastAction({
        type: 'populate',
        timestamp: new Date(),
        results: response.data.results,
        summary: response.data.summary
      });
      
      toast.success(`Sample data created: ${response.data.summary}`);
    } catch (error) {
      toast.error(`Failed to populate data: ${error.message}`);
    } finally {
      setIsPopulating(false);
      setLoadingMessage('');
    }
  };

  const isLoading = isWiping || isPopulating;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-[#ea580c]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Development Tools</h3>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Wipe Data Action */}
        <div className="relative">
          <motion.button
            onClick={handleWipeData}
            disabled={isLoading}
            className={cn(
              'w-full px-4 py-3 border transition-all duration-200 relative overflow-hidden group',
              wipingConfirm
                ? 'bg-red-900/40 border-red-600 hover:border-red-500'
                : 'bg-zinc-900/50 border-zinc-700 hover:border-red-600/50'
            )}
          >
            <div className="flex items-center justify-center gap-2 relative z-10">
              <Trash2 className={cn('w-3.5 h-3.5', wipingConfirm ? 'text-red-400' : 'text-zinc-400')} />
              <span className={cn('text-xs font-bold uppercase tracking-wider', wipingConfirm ? 'text-red-300' : 'text-zinc-300')}>
                {wipingConfirm ? 'CONFIRM WIPE' : 'Wipe All Data'}
              </span>
            </div>
            
            {wipingConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-colors"
              />
            )}
          </motion.button>

          <AnimatePresence>
            {wipingConfirm && !isWiping && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute -bottom-16 left-0 right-0 z-20 bg-zinc-950 border border-red-700 p-2"
              >
                <p className="text-[8px] text-red-300 font-bold mb-2 text-center">DELETE ALL APP DATA?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWipingConfirm(false)}
                    className="flex-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[8px] font-bold text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWipeData}
                    disabled={isWiping}
                    className="flex-1 px-2 py-1 bg-red-900 hover:bg-red-800 text-[8px] font-bold text-red-100 transition-colors disabled:opacity-50"
                  >
                    {isWiping ? 'Wiping...' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Populate Sample Data Action */}
        <motion.button
          onClick={handlePopulateSampleData}
          disabled={isLoading}
          className={cn(
            'w-full px-4 py-3 border transition-all duration-200 relative overflow-hidden group',
            'bg-zinc-900/50 border-zinc-700 hover:border-emerald-600/50'
          )}
        >
          <div className="flex items-center justify-center gap-2 relative z-10">
            <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 group-hover:text-emerald-300 transition-colors">
              {isPopulating ? 'Populating...' : 'Add Sample Data'}
            </span>
          </div>
          
          <motion.div
            animate={{ backgroundPosition: isPopulating ? ['0% 0%', '100% 0%'] : '0% 0%' }}
            transition={{ duration: 2, repeat: isPopulating ? Infinity : 0 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundSize: '200% 100%' }}
          />
        </motion.button>
      </div>

      {/* Loading Indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900/30 border border-zinc-800 p-3 flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, easing: 'linear' }}
              >
                <RefreshCw className="w-3 h-3 text-[#ea580c]" />
              </motion.div>
              <span className="text-[9px] text-zinc-400">{loadingMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last Action Summary */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              'border p-3 text-[8px] space-y-1.5',
              lastAction.type === 'wipe'
                ? 'border-red-700 bg-red-950/20'
                : 'border-emerald-700 bg-emerald-950/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                'font-bold uppercase',
                lastAction.type === 'wipe' ? 'text-red-400' : 'text-emerald-400'
              )}>
                {lastAction.type === 'wipe' ? 'Data Wiped' : 'Sample Data Created'}
              </span>
              <span className="text-zinc-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {lastAction.timestamp.toLocaleTimeString()}
              </span>
            </div>
            
            {lastAction.type === 'wipe' ? (
              <div className="space-y-0.5 pt-1 border-t border-zinc-700">
                {Object.entries(lastAction.results)
                  .filter(([_, result]) => result.deleted > 0)
                  .slice(0, 5)
                  .map(([entity, result]) => (
                    <div key={entity} className="flex items-center justify-between text-zinc-400">
                      <span>{entity}</span>
                      <span className="text-red-400 font-mono">{result.deleted} deleted</span>
                    </div>
                  ))}
                {Object.values(lastAction.results).filter(r => r.deleted > 0).length > 5 && (
                  <div className="text-zinc-500 italic pt-1">
                    ...and {Object.values(lastAction.results).filter(r => r.deleted > 0).length - 5} more entities
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-0.5 pt-1 border-t border-zinc-700">
                <div className="text-zinc-300 font-mono">{lastAction.summary}</div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {Object.entries(lastAction.results)
                    .filter(([_, count]) => typeof count === 'number' && count > 0)
                    .slice(0, 4)
                    .map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between text-zinc-400">
                        <span>{key}</span>
                        <span className="text-emerald-400 font-mono font-bold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Notice */}
      <div className="border border-yellow-700/50 bg-yellow-950/20 p-2.5 flex gap-2">
        <AlertTriangle className="w-3 h-3 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-[8px] text-yellow-700">
          <strong>Dev Tools Only:</strong> These operations affect your entire database. Use only in development environments.
        </p>
      </div>
    </div>
  );
}