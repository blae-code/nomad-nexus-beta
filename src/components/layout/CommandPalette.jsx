import { useState, useEffect, useRef } from "react";
import { createPageUrl } from "@/utils";
import { 
  Search, 
  Command, 
  ArrowRight, 
  Globe, 
  Shield, 
  Activity, 
  Terminal, 
  Zap,
  Users,
  LayoutGrid,
  Radio,
  Rocket
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Command Actions Definition
  const commands = [
    { 
      category: "NAVIGATION",
      items: [
        { icon: LayoutGrid, label: "Dashboard", shortcut: "D", action: () => window.location.href = createPageUrl('NomadOpsDashboard') },
        { icon: Radio, label: "Comms Console", shortcut: "C", action: () => window.location.href = createPageUrl('CommsConsole') },
        { icon: Rocket, label: "Fleet Manager", shortcut: "F", action: () => window.location.href = createPageUrl('FleetManager') },
        { icon: Shield, label: "Admin Panel", shortcut: "A", action: () => window.location.href = createPageUrl('Admin') },
        { icon: Users, label: "Personnel", shortcut: "P", action: () => window.location.href = createPageUrl('Channels') },
      ]
    },
    {
      category: "SYSTEM OPERATIONS",
      items: [
        { icon: Zap, label: "Emergency Broadcast", sub: "Global Alert", action: () => console.log("Trigger Alert") },
        { icon: Activity, label: "Network Diagnostics", sub: "Run Test", action: () => console.log("Run Diag") },
        { icon: Globe, label: "Sector Scan", sub: "Tactical Map", action: () => console.log("Scan") },
      ]
    }
  ];

  // Filter commands
  const filteredCommands = query === "" 
    ? commands 
    : commands.map(group => ({
        ...group,
        items: group.items.filter(item => 
          item.label.toLowerCase().includes(query.toLowerCase()) || 
          (item.sub && item.sub.toLowerCase().includes(query.toLowerCase()))
        )
      })).filter(group => group.items.length > 0);

  // Flatten for index calculation
  const flatItems = filteredCommands.flatMap(g => g.items);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      } else if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % flatItems.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          const item = flatItems[selectedIndex];
          if (item) {
            item.action();
            setIsOpen(false);
            setQuery("");
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Visual Logic
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = ["SEARCH PROTOCOLS...", "INITIATE COMMAND...", "LOCATE OPERATIVE...", "DEPLOY ASSET..."];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl z-50">
      {/* Main Input Bar */}
      <div className="relative group">
         {/* Animated Glow Background */}
         <div className={cn(
           "absolute inset-0 bg-gradient-to-r from-[#ea580c]/0 via-[#ea580c]/20 to-[#ea580c]/0 blur-xl transition-opacity duration-500",
           isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-50"
         )} />

         {/* Tech Borders */}
         <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
         <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
         <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
         <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-zinc-700 group-hover:border-[#ea580c] transition-colors" />

         <div className={cn(
           "relative flex items-center h-10 bg-zinc-950/90 backdrop-blur-md border transition-all duration-300 overflow-hidden",
           isOpen ? "border-[#ea580c] shadow-[0_0_30px_rgba(234,88,12,0.15)]" : "border-zinc-800 hover:border-zinc-600"
         )}>
            {/* Search Icon / Spinner */}
            <div className="pl-4 pr-3 text-zinc-500 group-hover:text-[#ea580c] transition-colors">
              {isOpen ? (
                <Terminal className="w-4 h-4 animate-pulse text-[#ea580c]" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>

            {/* Input Field */}
            <input 
               ref={inputRef}
               value={query}
               onChange={(e) => {
                 setQuery(e.target.value);
                 setIsOpen(true);
                 setSelectedIndex(0);
               }}
               onFocus={() => setIsOpen(true)}
               className="flex-1 h-full bg-transparent border-none text-xs font-mono text-[#ea580c] placeholder:text-zinc-600 focus:ring-0 focus:outline-none uppercase tracking-widest selection:bg-[#ea580c]/30"
               placeholder={placeholders[placeholderIndex]}
            />

            {/* Keyboard Badge */}
            <div className="pr-3 flex items-center gap-2">
               {!isOpen && (
                 <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500 font-mono">
                   <Command className="w-3 h-3" />
                   <span>K</span>
                 </div>
               )}
               {isOpen && (
                 <div className="flex gap-0.5">
                    {[1,2,3].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ height: [4, 12, 4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                        className="w-0.5 bg-[#ea580c]"
                      />
                    ))}
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl overflow-hidden z-50"
          >
            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-20" />

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 relative z-20">
               {flatItems.length === 0 ? (
                 <div className="p-8 text-center text-zinc-600 font-mono text-xs">
                   <div className="mb-2">NO MATCHING PROTOCOLS FOUND</div>
                   <div className="text-[10px] opacity-50">TRY A DIFFERENT QUERY</div>
                 </div>
               ) : (
                 filteredCommands.map((group, gIdx) => (
                   <div key={gIdx} className="mb-2 last:mb-0">
                     <div className="px-2 py-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] font-mono">
                       {group.category}
                     </div>
                     <div className="space-y-0.5">
                       {group.items.map((item, idx) => {
                         const globalIndex = flatItems.indexOf(item);
                         const isSelected = globalIndex === selectedIndex;
                         
                         return (
                           <button
                             key={idx}
                             onClick={() => {
                               item.action();
                               setIsOpen(false);
                             }}
                             onMouseEnter={() => setSelectedIndex(globalIndex)}
                             className={cn(
                               "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-100 relative group",
                               isSelected 
                                 ? "bg-[#ea580c]/10 text-[#ea580c]" 
                                 : "text-zinc-400 hover:bg-zinc-900/50"
                             )}
                           >
                             {isSelected && (
                               <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#ea580c] shadow-[0_0_10px_rgba(234,88,12,0.8)]" />
                             )}
                             
                             <item.icon className={cn(
                               "w-4 h-4",
                               isSelected ? "text-[#ea580c]" : "text-zinc-600"
                             )} />
                             
                             <div className="flex-1">
                               <div className={cn(
                                 "text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-2",
                                 isSelected ? "text-white" : "text-zinc-300"
                               )}>
                                 {item.label}
                                 {item.sub && (
                                   <span className="text-[9px] px-1.5 py-0.5 bg-zinc-900 rounded text-zinc-500 border border-zinc-800">
                                     {item.sub}
                                   </span>
                                 )}
                               </div>
                             </div>

                             {isSelected && (
                               <ArrowRight className="w-3 h-3 text-[#ea580c] animate-pulse mr-2" />
                             )}
                             
                             {item.shortcut && !isSelected && (
                               <span className="text-[9px] font-mono text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900/50">
                                 {item.shortcut}
                               </span>
                             )}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 ))
               )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-[9px] text-zinc-600 font-mono uppercase">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-zinc-800 rounded flex items-center justify-center text-[8px]">↵</span> SELECT</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-zinc-800 rounded flex items-center justify-center text-[8px]">↑↓</span> NAVIGATE</span>
              </div>
              <div>SYSTEM READY</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}