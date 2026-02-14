import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Wifi, WifiOff, Clock } from 'lucide-react';

export default function SyncIndicator() {
  const [syncStatus, setSyncStatus] = useState('synced');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      setTimeout(() => setSyncStatus('synced'), 1500);
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs"
    >
      {isOnline ? (
        <>
          {syncStatus === 'synced' ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-zinc-400">Synced</span>
            </>
          ) : (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                <Clock className="w-3 h-3 text-orange-500" />
              </motion.div>
              <span className="text-zinc-400">Syncing...</span>
            </>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-red-500" />
          <span className="text-red-400">Offline</span>
        </>
      )}
    </motion.div>
  );
}