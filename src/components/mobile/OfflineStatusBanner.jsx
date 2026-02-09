import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineStatusBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="mx-3 mb-2 rounded border border-orange-500/45 bg-zinc-900/85 px-3 py-2 text-xs text-orange-200 flex items-center gap-2">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline mode active. Showing cached context when available.</span>
      <Wifi className="w-3.5 h-3.5 opacity-40" />
    </div>
  );
}

