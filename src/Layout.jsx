import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { Terminal, Search, Clock, User } from 'lucide-react';
import { Input } from "@/components/ui/input";
import ActivityBar from "@/components/layout/ActivityBar";
import NetworkStatusIndicator from "@/components/layout/NetworkStatusIndicator";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    base44.auth.me().then(setUser).catch(() => {});
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
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between z-50 relative">

        {/* Logo Section */}
        <div className="flex items-center gap-4 w-64">
          <a href={createPageUrl('NomadOpsDashboard')} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 bg-[#ea580c] flex items-center justify-center group-hover:bg-[#c2410c] transition-colors">
              <Terminal className="w-5 h-5 text-black" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-black uppercase tracking-widest text-white leading-none group-hover:text-[#ea580c] transition-colors">REDSCAR</h1>
              <span className="text-[9px] font-mono text-zinc-500 tracking-[0.2em]">NOMAD OPS</span>
            </div>
          </a>
        </div>

        {/* Command Palette / Universal Search - Centered & Enhanced */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4 pointer-events-none">
          <div className="relative group pointer-events-auto">
             {/* Glow Effect */}
             <div className="absolute inset-0 bg-[#ea580c] blur-[40px] opacity-0 group-focus-within:opacity-10 transition-opacity duration-500" />

             {/* Border Accents */}
             <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-zinc-700 group-hover:border-[#ea580c] transition-colors duration-300" />
             <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-zinc-700 group-hover:border-[#ea580c] transition-colors duration-300" />
             <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-zinc-700 group-hover:border-[#ea580c] transition-colors duration-300" />
             <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-zinc-700 group-hover:border-[#ea580c] transition-colors duration-300" />

             <div className="relative flex items-center bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 group-focus-within:border-[#ea580c]/50 transition-all duration-300 group-focus-within:shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                <div className="pl-4 pr-3 text-zinc-600 group-focus-within:text-[#ea580c] transition-colors">
                   <Search className="w-4 h-4" />
                </div>
                <Input 
                    className="h-10 border-none bg-transparent text-xs font-mono text-[#ea580c] placeholder:text-zinc-600 uppercase tracking-[0.15em] focus-visible:ring-0 p-0" 
                    placeholder="INITIALIZE_SEARCH_PROTOCOL // ..." 
                />
                <div className="pr-3 flex gap-1.5">
                   <div className="w-1 h-1 bg-zinc-800 rounded-full group-focus-within:bg-[#ea580c] animate-pulse" />
                   <div className="w-1 h-1 bg-zinc-800 rounded-full group-focus-within:bg-[#ea580c] animate-pulse delay-75" />
                   <div className="w-1 h-1 bg-zinc-800 rounded-full group-focus-within:bg-[#ea580c] animate-pulse delay-150" />
                </div>
             </div>
          </div>
        </div>

        {/* Time Tracker & Profile */}
        <div className="flex items-center gap-6 justify-end min-w-fit">
           <NetworkStatusIndicator />
           
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                 <Clock className="w-3 h-3 text-[#ea580c]" />
                 {time.toLocaleTimeString([], { hour12: false })} <span className="text-[10px] text-zinc-600">LCL</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                 {time.toISOString().split('T')[1].split('.')[0]} <span className="text-zinc-700">UTC</span>
              </div>
           </div>

           <div className="h-8 w-[1px] bg-zinc-800" />

           <a href={createPageUrl('Profile')} className="group flex items-center gap-3 cursor-pointer hover:bg-zinc-900 px-2 py-1 -mr-2 rounded transition-colors">
              <div className="text-right hidden md:block">
                 <div className="text-xs font-bold text-zinc-300 group-hover:text-white">
                    {user ? (user.callsign || user.rsi_handle || user.full_name || "OPERATIVE") : "GUEST"}
                 </div>
                 <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider group-hover:text-[#ea580c]">
                    {user?.rank || "VAGRANT"}
                 </div>
              </div>
              <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-[#ea580c] transition-colors">
                 <User className="w-4 h-4 text-zinc-500 group-hover:text-[#ea580c]" />
              </div>
           </a>
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