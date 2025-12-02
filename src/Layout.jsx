import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { Terminal, Search, Clock } from 'lucide-react';
import { Input } from "@/components/ui/input";
import ActivityBar from "@/components/layout/ActivityBar";

export default function Layout({ children, currentPageName }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-[#ea580c]/30 flex flex-col overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

        :root {
          --font-sans: 'Rajdhani', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          --radius: 0px !important;
        }

        body {
          font-family: var(--font-sans);
          background-color: #09090b;
          color: #e4e4e7;
        }
        
        /* Force sharp corners on everything */
        * {
          border-radius: 0px !important;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #18181b;
        }
        ::-webkit-scrollbar-thumb {
          background: #3f3f46;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #ea580c;
        }

        /* Global button hover effect */
        button, .button-hover-effect {
          transition: all 0.1s ease-out;
        }
        button:hover, .button-hover-effect:hover {
          border-color: #ea580c !important;
          box-shadow: 0 0 8px rgba(234, 88, 12, 0.2);
        }
        
        /* Technical borders */
        .tech-border {
          border: 1px solid #27272a;
          position: relative;
        }
        .tech-border:after {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          width: 6px;
          height: 6px;
          border-top: 1px solid #ea580c;
          border-left: 1px solid #ea580c;
          opacity: 0.5;
        }
      `}</style>

      {/* Static Header (Top Control Bar) */}
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between z-50">
        
        {/* Logo Section */}
        <div className="flex items-center gap-4 w-64">
          <a href={createPageUrl('Home')} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 bg-[#ea580c] flex items-center justify-center group-hover:bg-[#c2410c] transition-colors">
              <Terminal className="w-5 h-5 text-black" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-black uppercase tracking-widest text-white leading-none group-hover:text-[#ea580c] transition-colors">REDSCAR</h1>
              <span className="text-[9px] font-mono text-zinc-500 tracking-[0.2em]">NOMAD OPS</span>
            </div>
          </a>
        </div>

        {/* Command Palette / Universal Search */}
        <div className="flex-1 max-w-xl px-4">
          <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#ea580c] transition-colors" />
             <Input 
                className="h-8 bg-zinc-900 border-zinc-800 pl-9 text-xs font-mono uppercase tracking-wider text-zinc-300 placeholder:text-zinc-700 focus-visible:ring-0 focus-visible:border-[#ea580c]" 
                placeholder="> ENTER COMMAND OR SEARCH: // SHIP ID, EVENT ID, USER TAG..."
             />
          </div>
        </div>

        {/* Time Tracker */}
        <div className="flex items-center gap-6 w-64 justify-end">
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                 <Clock className="w-3 h-3 text-[#ea580c]" />
                 {time.toLocaleTimeString([], { hour12: false })} <span className="text-[10px] text-zinc-600">LCL</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                 {time.toISOString().split('T')[1].split('.')[0]} <span className="text-zinc-700">UTC</span>
              </div>
           </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="flex-1 flex overflow-hidden relative">
         <ActivityBar />
         <div className="flex-1 relative overflow-hidden flex flex-col">
            {children}
         </div>
      </div>
    </div>
  );
}