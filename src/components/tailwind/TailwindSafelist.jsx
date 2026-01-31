import React from 'react';

/**
 * TailwindSafelist - Forces Tailwind CDN JIT to generate classes used by critical pages
 * Renders a hidden div containing all Tailwind utilities needed by:
 * - AccessGate
 * - Disclaimers
 * - Onboarding
 * 
 * This ensures first-time visitors (incognito) see fully styled pages.
 */
export default function TailwindSafelist() {
  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      {/* ========== ACCESSGATE PAGE ========== */}
      <div className="w-screen h-screen min-h-screen bg-zinc-950 bg-black bg-gradient-to-br from-black via-black to-black">
        <div className="flex items-center justify-center px-4 overflow-hidden relative">
          <div className="fixed inset-0 absolute top-0 left-0 right-0 bottom-0 z-10" />
          <div className="w-full max-w-md relative">
            <div className="border-2 border-red-700/70 bg-black/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl shadow-red-700/30">
              <div className="border-b border-red-700/50 bg-gradient-to-r from-red-700/15 via-transparent to-transparent p-8 relative overflow-hidden">
                <div className="flex items-center justify-center mb-6">
                  <img className="w-20 h-20 drop-shadow-lg" alt="" />
                </div>
                <div className="text-center space-y-2.5">
                  <h1 className="text-5xl font-black uppercase tracking-[0.2em] text-white drop-shadow-lg">
                    <span className="text-red-600" />
                  </h1>
                  <div className="h-px bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold" />
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2.5 group">
                  <label className="text-[10px] font-bold text-amber-300 uppercase tracking-[0.15em] block" />
                  <div className="relative">
                    <input className="font-mono uppercase tracking-widest text-center h-12 bg-slate-900/60 border-2 border-yellow-500/30 group-focus-within:border-yellow-500/60 group-focus-within:bg-slate-900 focus:border-yellow-500/60 focus:bg-slate-900 text-yellow-300 placeholder:text-slate-600 transition-all duration-200" />
                    <div className="absolute -inset-1 border border-yellow-500/0 group-focus-within:border-yellow-500/20 rounded transition-all duration-200 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2.5 group">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-[0.15em] block" />
                  <div className="relative">
                    <input className="uppercase tracking-wider text-center h-12 bg-slate-900/60 border-2 border-white/30 group-focus-within:border-white/60 group-focus-within:bg-slate-900 focus:border-white/60 focus:bg-slate-900 text-white placeholder:text-slate-600 transition-all duration-200" />
                    <div className="absolute -inset-1 border border-white/0 group-focus-within:border-white/20 rounded transition-all duration-200 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 pb-1">
                  <div className="border-2 border-cyan-500/40 bg-slate-900 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-500" />
                  <label className="text-xs text-cyan-300 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/30 rounded px-3 py-2">
                  <span className="text-[10px] text-cyan-300" />
                  <button className="h-6 px-2 text-cyan-400 hover:text-red-400 hover:bg-red-950/30">
                    <span className="w-3 h-3" />
                  </button>
                </div>
                <button className="w-full h-12 mt-8 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:-translate-x-full transition-transform duration-500" />
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </span>
                </button>
                <div className="p-4 rounded border-2 text-center whitespace-pre-line font-mono text-xs animate-in fade-in duration-300 bg-green-950/40 border-green-500/50 text-green-300 shadow-lg shadow-green-500/20 bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/20 bg-red-950/40 border-red-500/50 text-red-300 shadow-lg shadow-red-500/20" />
              </div>
              <div className="border-t border-red-700/40 bg-gradient-to-r from-red-700/5 to-transparent px-8 py-5">
                <p className="text-[10px] text-red-700/70 text-center uppercase tracking-[0.2em] font-bold" />
              </div>
            </div>
            <div className="mt-6 text-center text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500/70 rounded-full animate-pulse" />
              </span>
            </div>
          </div>
        </div>
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-red-500/40 opacity-50" />
        <div className="absolute top-0 right-0 w-40 h-40 border-t-2 border-r-2 border-red-500/40 opacity-50" />
        <div className="absolute bottom-0 left-0 w-40 h-40 border-b-2 border-l-2 border-red-500/40 opacity-50" />
        <div className="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-red-500/40 opacity-50" />
        {/* Background elements */}
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />
        <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,68,50,0.05)_1px,transparent_1px),linear-gradient(rgba(200,68,50,0.05)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30" />
        {/* Debug marker */}
        <div className="fixed bottom-3 left-3 text-[9px] px-2 py-1 bg-green-900/40 border border-green-500/30 text-green-400 rounded opacity-60 hover:opacity-100 transition-opacity font-mono z-50" />
      </div>

      {/* ========== DISCLAIMERS PAGE ========== */}
      <div className="w-screen h-screen min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900">
        <div className="flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
          <div className="w-full max-w-4xl">
            <div className="border-2 border-red-700/60 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-red-800/20 via-transparent to-transparent border-b border-red-700/50 px-8 py-6">
                <h1 className="text-3xl font-black uppercase tracking-wider text-white">
                  <span className="text-red-600" />
                </h1>
                <p className="text-sm text-slate-300 mt-2 tracking-wide" />
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                      <span className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-white mb-2" />
                      <p className="text-sm text-slate-400 leading-relaxed" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
                  <input type="checkbox" className="w-5 h-5 rounded border-2 border-red-500/50 bg-slate-900 checked:bg-red-600 checked:border-red-500 cursor-pointer" />
                  <label className="text-sm text-slate-300 cursor-pointer" />
                </div>
              </div>
              <div className="border-t border-slate-700/50 bg-slate-900/20 px-8 py-6 flex justify-between items-center">
                <button className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg font-semibold transition-all">
                  <span className="w-4 h-4" />
                </button>
                <button className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  <span className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <div className="w-2 h-2 rounded-full bg-slate-700" />
            </div>
          </div>
        </div>
      </div>

      {/* ========== ONBOARDING PAGE ========== */}
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black uppercase tracking-widest text-white mb-4">
              <span className="text-red-600" />
            </h1>
            <p className="text-slate-400 text-lg" />
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900/40 border-2 border-slate-700/50 rounded-xl p-6 hover:border-red-500/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center group-hover:bg-red-600/20 transition-all">
                  <span className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed" />
            </div>
          </div>
          <div className="bg-black/50 border border-slate-700/40 rounded-xl p-8">
            <label className="block text-sm font-semibold text-slate-300 mb-3" />
            <input className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all" />
            <textarea className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all resize-none h-32" />
            <select className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all" />
          </div>
          <div className="flex justify-between items-center mt-8">
            <button className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg font-bold transition-all" />
            <button className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-bold shadow-xl shadow-red-500/30 disabled:opacity-50 transition-all" />
          </div>
        </div>
      </div>

      {/* ========== SHARED UTILITIES ========== */}
      <div className="hidden visible">
        <div className="z-50 z-[600] z-[750] z-[900] z-[9999]" />
        <div className="pt-16 pb-0 pb-12 pb-96" />
        <div className="right-0 right-12 right-80" />
        <div className="w-12 w-32 w-80 w-96" />
        <div className="min-w-0 flex-1 flex-shrink-0" />
        <div className="gap-0 gap-1 gap-2 gap-3 gap-4 gap-6 gap-12 gap-24" />
        <div className="space-y-1 space-y-2 space-y-3 space-y-4 space-y-6" />
        <div className="text-xs text-sm text-base text-lg text-xl text-2xl text-3xl text-4xl" />
        <div className="font-normal font-medium font-semibold font-bold font-black" />
        <div className="leading-relaxed leading-loose" />
        <div className="rounded rounded-md rounded-lg rounded-xl rounded-full rounded-2xl" />
        <div className="shadow shadow-md shadow-lg shadow-xl shadow-2xl" />
        <div className="blur-sm blur-md blur-lg blur-xl blur-2xl blur-3xl" />
        <div className="duration-100 duration-200 duration-300 duration-500 duration-1000" />
        <div className="animate-in fade-in slide-in-from-bottom-4" />
        <div className="md:grid-cols-2 md:flex-row md:space-x-4" />
        <div className="focus:outline-none focus:ring-1 focus:ring-2 focus:ring-red-500/20" />
        <div className="hover:scale-105 hover:shadow-red-500/40" />
        <div className="disabled:pointer-events-none" />
        <div className="data-[state=checked]:bg-red-600" />
        <div className="placeholder:text-slate-500" />
        <div className="resize-none" />
      </div>
    </div>
  );
}