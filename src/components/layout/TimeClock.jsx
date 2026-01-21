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
    <div className="hidden sm:flex items-center gap-3 px-2.5 py-2 border border-transparent bg-transparent text-[9px] font-mono">
      <Clock className="w-3 h-3 text-zinc-600" />
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-col items-center">
          <span className="text-zinc-600 uppercase text-[8px]">LOCAL</span>
          <span className="text-zinc-300 font-bold tracking-wide">{localTime}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-zinc-600 uppercase text-[8px]">UTC</span>
          <span className="text-cyan-400 font-bold tracking-wide">{utcTime}</span>
        </div>
      </div>
    </div>
  );
}