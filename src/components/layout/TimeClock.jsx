import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TimeClock() {
  const [localTime, setLocalTime] = useState('--:--:--');
  const [utcTime, setUtcTime] = useState('--:--:--');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Local time
      const local = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // UTC time
      const utc = now.toUTCString().split(' ')[4]; // HH:MM:SS from UTC string
      
      setLocalTime(local);
      setUtcTime(utc);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-4 px-3 py-2 border border-transparent bg-transparent text-xs font-mono">
      <Clock className="w-4 h-4 text-zinc-600" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 uppercase text-[9px] font-semibold">LOCAL</span>
          <span className="text-zinc-200 font-bold tracking-wide">{localTime}</span>
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 uppercase text-[9px] font-semibold">UTC</span>
          <span className="text-cyan-400 font-bold tracking-wide">{utcTime}</span>
        </div>
      </div>
    </div>
  );
}