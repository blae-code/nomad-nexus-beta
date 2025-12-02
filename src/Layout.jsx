import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { Terminal, Search, Clock } from 'lucide-react';
import { Input } from "@/components/ui/input";
import ActivityBar from "@/components/layout/ActivityBar";
import VoiceCommandInterface from "@/components/layout/VoiceCommandInterface";

export default function Layout({ children, currentPageName }) {
  const [time, setTime] = useState(new Date());
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("INITIALIZING SECURE UPLINK...");

  useEffect(() => {
    // Simulate technical boot sequence
    const bootSequence = async () => {
       // Check persistent state
       const lastPath = localStorage.getItem('redscar_last_path');
       const currentPath = window.location.pathname;
       
       // Redirect if at root and we have a saved path
       if (lastPath && lastPath !== currentPath && (currentPath === '/' || currentPath.endsWith('Home'))) {
          // Only redirect if it's a valid internal path to prevent loops
          if (lastPath.startsWith('/')) {
             // Use native navigation to ensure fresh load state
             window.location.href = lastPath;
             return; 
          }
       }

       // Loading text animation
       setTimeout(() => setLoadingText("AUTHENTICATING NEURAL LINK..."), 800);
       setTimeout(() => setLoadingText("SYNCING OPS DATA..."), 1600);
       setTimeout(() => setLoadingText("ESTABLISHING ENCRYPTED TUNNEL..."), 2400);
       setTimeout(() => {
          setIsAppLoading(false);
          localStorage.setItem('redscar_last_path', currentPath);
       }, 3000);
    };

    bootSequence();

    const timer = setInterval(() => setTime(new Date()), 1000);

    // PWA Manifest & Theme Configuration
    const configurePWA = () => {
      // Technical Hex Compass Icon
      const iconSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='%2309090b'/><path d='M256 32 L480 144 L480 368 L256 480 L32 368 L32 144 Z' fill='none' stroke='%23ea580c' stroke-width='20'/><path d='M256 120 L290 220 L390 256 L290 292 L256 392 L222 292 L122 256 L222 220 Z' fill='%23ea580c'/><circle cx='256' cy='256' r='30' fill='%2309090b' stroke='%23ea580c' stroke-width='5'/></svg>`;
      const iconUrl = `data:image/svg+xml;utf8,${iconSvg}`;

      const manifest = {
        name: "Redscar Nomad Ops",
        short_name: "Redscar",
        start_url: "/",
        display: "standalone",
        background_color: "#09090b",
        theme_color: "#09090b",
        orientation: "landscape",
        icons: [{ src: iconUrl, sizes: "512x512", type: "image/svg+xml" }]
      };

      const stringManifest = JSON.stringify(manifest);
      const blob = new Blob([stringManifest], {type: 'application/json'});
      const manifestURL = URL.createObjectURL(blob);
      
      // Inject Manifest
      let link = document.querySelector('link[rel="manifest"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = manifestURL;

      // Inject Theme Color
      let themeMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = '#09090b';

      // Inject Apple Touch Icon
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = iconUrl;
    };

    configurePWA();

    return () => clearInterval(timer);
  }, []);

  // Save current path on change
  useEffect(() => {
     if (!isAppLoading && typeof window !== 'undefined') {
        localStorage.setItem('redscar_last_path', window.location.pathname);
     }
  }, [children, isAppLoading]); // Dependencies could be better but this catches page changes via children rerender

  if (isAppLoading) {
     return (
        <div className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center z-[100]">
           <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400&display=swap');
              .tech-loader {
                 width: 200px;
                 height: 2px;
                 background: #18181b;
                 position: relative;
                 overflow: hidden;
              }
              .tech-loader::after {
                 content: '';
                 position: absolute;
                 top: 0;
                 left: 0;
                 height: 100%;
                 width: 50%;
                 background: #ea580c;
                 animation: loading 1.5s infinite ease-in-out;
              }
              @keyframes loading {
                 0% { transform: translateX(-100%); }
                 100% { transform: translateX(200%); }
              }
           `}</style>
           <div className="relative mb-8 animate-pulse">
              <svg xmlns='http://www.w3.org/2000/svg' width="64" height="64" viewBox='0 0 512 512'>
                 <path d='M256 32 L480 144 L480 368 L256 480 L32 368 L32 144 Z' fill='none' stroke='#ea580c' strokeWidth='20'/>
                 <path d='M256 120 L290 220 L390 256 L290 292 L256 392 L222 292 L122 256 L222 220 Z' fill='#ea580c'/>
              </svg>
           </div>
           <div className="tech-loader mb-4"></div>
           <div className="text-[#ea580c] font-mono text-xs tracking-[0.3em] animate-pulse">
              {loadingText}
           </div>
        </div>
     );
  }

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
      <VoiceCommandInterface />
    </div>
  );
}