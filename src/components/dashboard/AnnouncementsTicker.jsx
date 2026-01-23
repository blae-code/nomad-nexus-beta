import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AnnouncementsTicker = ({ announcements = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Default announcements if none provided
  const displayAnnouncements = announcements.length > 0 ? announcements : [
    {
      id: 1,
      title: 'System Online',
      message: 'All systems nominal. Ready for operations.',
      author: 'System Admin',
      severity: 'info'
    },
    {
      id: 2,
      title: 'Welcome to NomadNexus',
      message: 'This is your operational command center. Check the training modules to get started.',
      author: 'Pioneer',
      severity: 'info'
    }
  ];

  useEffect(() => {
    if (displayAnnouncements.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayAnnouncements.length);
    }, 6000);
    
    return () => clearInterval(timer);
  }, [displayAnnouncements.length]);

  if (displayAnnouncements.length === 0) return null;

  const current = displayAnnouncements[currentIndex];
  const isAdmin = current.author === 'System Admin';

  return (
    <div className="border border-zinc-800/60 bg-zinc-950/40 overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/60 border-b border-zinc-800/40">
        <Megaphone className={`w-2.5 h-2.5 ${isAdmin ? 'text-cyan-500' : 'text-amber-500'} animate-pulse`} />
        <span className="text-[6px] uppercase text-zinc-400 tracking-widest font-bold">ANNOUNCEMENTS</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {displayAnnouncements.map((_, idx) => (
            <div
              key={idx}
              className={`w-1 h-1 rounded-full transition-all ${
                idx === currentIndex ? 'bg-[#ea580c] w-2' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.3 }}
          className="p-2 space-y-1"
        >
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`text-[5px] font-mono font-bold ${
                isAdmin
                  ? 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50'
                  : 'bg-amber-900/40 text-amber-300 border-amber-700/50'
              }`}>
                {current.author}
              </Badge>
              <span className="text-[8px] font-bold text-zinc-200">{current.title}</span>
            </div>
            {current.severity === 'urgent' && (
              <AlertCircle className="w-2.5 h-2.5 text-red-500 animate-pulse" />
            )}
          </div>
          <p className="text-[7px] text-zinc-400 leading-tight">{current.message}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementsTicker;