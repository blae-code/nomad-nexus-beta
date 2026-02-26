export const TAILWIND_SAFELIST_HTML = `
<div data-nexus-tailwind-safelist="true" style="display:none" aria-hidden="true">
  <!-- ========== ACCESSGATE PAGE ========== -->
  <div class="w-screen h-screen min-h-screen bg-zinc-950 bg-black bg-gradient-to-br from-black via-black to-black">
    <div class="flex items-center justify-center px-4 overflow-hidden relative">
      <div class="fixed inset-0 absolute top-0 left-0 right-0 bottom-0 z-10"></div>
      <div class="w-full max-w-md relative">
        <div class="border-2 border-red-700/70 bg-black/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl shadow-red-700/30">
          <div class="border-b border-red-700/50 bg-gradient-to-r from-red-700/15 via-transparent to-transparent p-8 relative overflow-hidden">
            <div class="flex items-center justify-center mb-6">
              <img class="w-20 h-20 drop-shadow-lg" alt="" />
            </div>
            <div class="text-center space-y-2.5">
              <h1 class="text-5xl font-black uppercase tracking-[0.2em] text-white drop-shadow-lg">
                <span class="text-red-600"></span>
              </h1>
              <div class="h-px bg-gradient-to-r from-transparent via-red-700/40 to-transparent"></div>
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold"></p>
            </div>
          </div>
          <div class="p-8 space-y-6">
            <div class="space-y-2.5 group">
              <label class="text-[10px] font-bold text-amber-300 uppercase tracking-[0.15em] block"></label>
              <div class="relative">
                <input class="font-mono uppercase tracking-widest text-center h-12 bg-slate-900/60 border-2 border-yellow-500/30 group-focus-within:border-yellow-500/60 group-focus-within:bg-slate-900 focus:border-yellow-500/60 focus:bg-slate-900 text-yellow-300 placeholder:text-slate-600 transition-all duration-200" />
                <div class="absolute -inset-1 border border-yellow-500/0 group-focus-within:border-yellow-500/20 rounded transition-all duration-200 pointer-events-none"></div>
              </div>
            </div>
            <div class="space-y-2.5 group">
              <label class="text-[10px] font-bold text-emerald-300 uppercase tracking-[0.15em] block"></label>
              <div class="relative">
                <input class="uppercase tracking-wider text-center h-12 bg-slate-900/60 border-2 border-white/30 group-focus-within:border-white/60 group-focus-within:bg-slate-900 focus:border-white/60 focus:bg-slate-900 text-white placeholder:text-slate-600 transition-all duration-200" />
                <div class="absolute -inset-1 border border-white/0 group-focus-within:border-white/20 rounded transition-all duration-200 pointer-events-none"></div>
              </div>
            </div>
            <div class="flex items-center gap-3 pt-2 pb-1">
              <div class="border-2 border-cyan-500/40 bg-slate-900 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-500"></div>
              <label class="text-xs text-cyan-300 cursor-pointer"></label>
            </div>
            <div class="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/30 rounded px-3 py-2">
              <span class="text-[10px] text-cyan-300"></span>
              <button class="h-6 px-2 text-cyan-400 hover:text-red-400 hover:bg-red-950/30">
                <span class="w-3 h-3"></span>
              </button>
            </div>
            <button class="w-full h-12 mt-8 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 relative overflow-hidden group">
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:-translate-x-full transition-transform duration-500"></div>
              <span class="flex items-center justify-center gap-2 relative z-10">
                <div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
              </span>
            </button>
            <div class="p-4 rounded border-2 text-center whitespace-pre-line font-mono text-xs animate-in fade-in duration-300 bg-green-950/40 border-green-500/50 text-green-300 shadow-lg shadow-green-500/20 bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/20 bg-red-950/40 border-red-500/50 text-red-300 shadow-lg shadow-red-500/20"></div>
          </div>
          <div class="border-t border-red-700/40 bg-gradient-to-r from-red-700/5 to-transparent px-8 py-5">
            <p class="text-[10px] text-red-700/70 text-center uppercase tracking-[0.2em] font-bold"></p>
          </div>
        </div>
        <div class="mt-6 text-center text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          <span class="inline-flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-green-500/70 rounded-full animate-pulse"></span>
          </span>
        </div>
      </div>
    </div>
    <div class="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-red-500/40 opacity-50"></div>
    <div class="absolute top-0 right-0 w-40 h-40 border-t-2 border-r-2 border-red-500/40 opacity-50"></div>
    <div class="absolute bottom-0 left-0 w-40 h-40 border-b-2 border-l-2 border-red-500/40 opacity-50"></div>
    <div class="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-red-500/40 opacity-50"></div>
    <div class="absolute top-1/3 -left-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15"></div>
    <div class="absolute bottom-1/3 -right-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15"></div>
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,68,50,0.05)_1px,transparent_1px),linear-gradient(rgba(200,68,50,0.05)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30"></div>
    <div class="fixed bottom-3 left-3 text-[9px] px-2 py-1 bg-green-900/40 border border-green-500/30 text-green-400 rounded opacity-60 hover:opacity-100 transition-opacity font-mono z-50"></div>
  </div>

  <!-- ========== DISCLAIMERS PAGE ========== -->
  <div class="w-screen h-screen min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900">
    <div class="flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
      <div class="w-full max-w-4xl">
        <div class="border-2 border-red-700/60 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl">
          <div class="bg-gradient-to-r from-red-800/20 via-transparent to-transparent border-b border-red-700/50 px-8 py-6">
            <h1 class="text-3xl font-black uppercase tracking-wider text-white">
              <span class="text-red-600"></span>
            </h1>
            <p class="text-sm text-slate-300 mt-2 tracking-wide"></p>
          </div>
          <div class="p-8 space-y-6">
            <div class="bg-slate-900/40 border border-slate-700/50 rounded-lg p-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                  <span class="w-6 h-6 text-red-400"></span>
                </div>
                <div class="flex-1">
                  <h2 class="text-lg font-bold text-white mb-2"></h2>
                  <p class="text-sm text-slate-400 leading-relaxed"></p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <input type="checkbox" class="w-5 h-5 rounded border-2 border-red-500/50 bg-slate-900 checked:bg-red-600 checked:border-red-500 cursor-pointer" />
              <label class="text-sm text-slate-300 cursor-pointer"></label>
            </div>
          </div>
          <div class="border-t border-slate-700/50 bg-slate-900/20 px-8 py-6 flex justify-between items-center">
            <button class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg font-semibold transition-all">
              <span class="w-4 h-4"></span>
            </button>
            <button class="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <span class="w-5 h-5"></span>
            </button>
          </div>
        </div>
        <div class="mt-8 flex justify-center gap-2">
          <div class="w-2 h-2 rounded-full bg-red-600"></div>
          <div class="w-2 h-2 rounded-full bg-slate-700"></div>
          <div class="w-2 h-2 rounded-full bg-slate-700"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ========== ONBOARDING PAGE ========== -->
  <div class="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
    <div class="max-w-5xl mx-auto px-6 py-12">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-black uppercase tracking-widest text-white mb-4">
          <span class="text-red-600"></span>
        </h1>
        <p class="text-slate-400 text-lg"></p>
      </div>
      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div class="bg-slate-900/40 border-2 border-slate-700/50 rounded-xl p-6 hover:border-red-500/50 transition-all cursor-pointer group">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-14 h-14 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center group-hover:bg-red-600/20 transition-all">
              <span class="w-7 h-7 text-red-400"></span>
            </div>
            <h3 class="text-xl font-bold text-white group-hover:text-red-400 transition-colors"></h3>
          </div>
          <p class="text-sm text-slate-400 leading-relaxed"></p>
        </div>
      </div>
      <div class="bg-black/50 border border-slate-700/40 rounded-xl p-8">
        <label class="block text-sm font-semibold text-slate-300 mb-3"></label>
        <input class="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all" />
        <textarea class="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all resize-none h-32"></textarea>
        <select class="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"></select>
      </div>
      <div class="flex justify-between items-center mt-8">
        <button class="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg font-bold transition-all"></button>
        <button class="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-bold shadow-xl shadow-red-500/30 disabled:opacity-50 transition-all"></button>
      </div>
    </div>
  </div>

  <!-- ========== SHARED UTILITIES ========== -->
  <div class="hidden visible">
    <div class="z-50 z-[600] z-[750] z-[900] z-[9999]"></div>
    <div class="pt-16 pb-0 pb-12 pb-96"></div>
    <div class="right-0 right-12 right-80"></div>
    <div class="w-12 w-32 w-80 w-96"></div>
    <div class="min-w-0 flex-1 flex-shrink-0"></div>
    <div class="gap-0 gap-1 gap-2 gap-3 gap-4 gap-6 gap-12 gap-24"></div>
    <div class="space-y-1 space-y-2 space-y-3 space-y-4 space-y-6"></div>
    <div class="text-xs text-sm text-base text-lg text-xl text-2xl text-3xl text-4xl"></div>
    <div class="font-normal font-medium font-semibold font-bold font-black"></div>
    <div class="leading-relaxed leading-loose"></div>
    <div class="rounded rounded-md rounded-lg rounded-xl rounded-full rounded-2xl"></div>
    <div class="shadow shadow-md shadow-lg shadow-xl shadow-2xl"></div>
    <div class="blur-sm blur-md blur-lg blur-xl blur-2xl blur-3xl"></div>
    <div class="duration-100 duration-200 duration-300 duration-500 duration-1000"></div>
    <div class="animate-in fade-in slide-in-from-bottom-4"></div>
    <div class="md:grid-cols-2 md:flex-row md:space-x-4"></div>
    <div class="focus:outline-none focus:ring-1 focus:ring-2 focus:ring-red-500/20"></div>
    <div class="hover:scale-105 hover:shadow-red-500/40"></div>
    <div class="disabled:pointer-events-none"></div>
    <div class="data-[state=checked]:bg-red-600"></div>
    <div class="placeholder:text-slate-500"></div>
    <div class="resize-none"></div>
    <!-- NexusOS Design System Classes -->
    <!-- Typography: All valid font sizes, weights, tracking, transforms -->
    <div class="text-[8px] text-[9px] text-[10px] text-[11px] tracking-[0.12em] tracking-[0.14em] tracking-[0.15em] tracking-[0.2em] tracking-[0.25em] tracking-wide tracking-wider tracking-widest font-black font-extrabold font-semibold font-bold font-mono uppercase lowercase capitalize leading-none leading-tight leading-relaxed leading-loose"></div>
    
    <!-- Spacing: All valid padding, gap, margin combinations -->
    <div class="p-0.5 p-1 p-1.5 p-2 p-2.5 p-3 p-4 px-1 py-0.5 px-1.5 py-1 px-2 py-1.5 px-2.5 py-2 px-3 py-2.5 px-4 py-3"></div>
    <div class="gap-0.5 gap-1 gap-1.5 gap-2 gap-3 gap-4 gap-6 gap-8 space-y-0.5 space-y-1 space-y-1.5 space-y-2 space-y-3 space-y-4"></div>
    <div class="m-0.5 m-1 m-2 mt-0.5 mt-1 mt-2 mb-0.5 mb-1 mb-2 ml-1 ml-2 ml-3 mr-1 mr-2 mr-3"></div>
    
    <!-- Backgrounds: All zinc variations with opacity + backdrop-blur -->
    <div class="bg-zinc-950 bg-zinc-950/80 bg-zinc-950/90 bg-zinc-950/95 bg-zinc-900 bg-zinc-900/20 bg-zinc-900/40 bg-zinc-900/45 bg-zinc-900/55 bg-zinc-900/60 bg-zinc-900/75 bg-zinc-900/80 bg-zinc-900/90 bg-zinc-900/95 bg-zinc-800 bg-zinc-800/60 bg-black bg-black/50 bg-black/90 bg-black/95 backdrop-blur-sm"></div>
    
    <!-- Borders: All zinc variations with opacity standards -->
    <div class="border border-zinc-700 border-zinc-700/24 border-zinc-700/40 border-zinc-700/50 border-zinc-700/60 border-zinc-800 border-zinc-800/60 border-zinc-800/70 border-zinc-600 divide-x divide-y divide-zinc-800/60"></div>
    
    <!-- Sizing: Icon sizes, token sizes, panel widths -->
    <div class="w-1 h-1 w-1.5 h-1.5 w-2 h-2 w-2.5 h-2.5 w-3 h-3 w-3.5 h-3.5 w-4 h-4 w-5 h-5 w-6 h-6 w-7 h-7 w-8 h-8 w-10 h-10 w-12 h-12 w-14 h-14 w-16 h-16 w-20 h-20 w-24 h-24 w-32 h-32 w-40 h-40 w-52 w-64 w-80 w-96"></div>
    
    <!-- Semantic State Colors: Green (OK) -->
    <div class="bg-green-400 bg-green-500 bg-green-600 bg-green-500/30 bg-emerald-600 bg-emerald-600/60 bg-emerald-950/45 text-green-200 text-green-300 text-green-400 text-emerald-200 border-green-500/40 border-green-600/60 border-emerald-600/60"></div>
    
    <!-- Semantic State Colors: Amber (Warning) -->
    <div class="bg-amber-400 bg-amber-500 bg-amber-600 bg-amber-600/60 bg-amber-900/50 bg-amber-950/20 bg-amber-950/25 bg-amber-950/45 text-amber-200 text-amber-300 border-amber-500/50 border-amber-600/60 border-amber-900/50 border-amber-900/60"></div>
    
    <!-- Semantic State Colors: Red (Danger) -->
    <div class="bg-red-400 bg-red-500 bg-red-600 bg-red-700 bg-red-800 bg-red-900 bg-red-500/30 bg-red-600/60 bg-red-900/70 bg-red-950/20 bg-red-950/35 bg-red-950/45 text-red-200 text-red-300 text-red-500 border-red-500/40 border-red-500/50 border-red-500/60 border-red-600/60 border-red-700/40 border-red-700/50 border-red-700/60 border-red-800/70 border-red-900/50 border-red-900/60"></div>
    
    <!-- Semantic State Colors: Orange (Active/Accent) -->
    <div class="bg-orange-400 bg-orange-500 bg-orange-500/10 bg-orange-500/14 bg-orange-500/34 text-orange-200 text-orange-300 text-orange-400 text-orange-500 border-orange-500/40 border-orange-500/45 border-orange-500/50 border-orange-500/64"></div>
    
    <!-- Semantic State Colors: Blue/Cyan (Info/Support) -->
    <div class="bg-blue-400 bg-blue-500 bg-blue-600 bg-blue-950/20 bg-cyan-400 bg-cyan-500 bg-cyan-600 bg-cyan-950/30 bg-sky-600/60 bg-sky-800/60 bg-sky-900/50 bg-sky-950/20 bg-sky-950/25 text-blue-200 text-blue-300 text-cyan-200 text-cyan-300 text-cyan-400 text-sky-200 border-blue-500/40 border-cyan-500/30 border-cyan-500/40 border-sky-600/60 border-sky-800/60 border-sky-900/40 border-sky-900/50"></div>
    
    <!-- Semantic State Colors: Purple (Experimental/Special) -->
    <div class="bg-purple-500/14 bg-purple-950/20 text-purple-100 text-purple-200 border-purple-500/45"></div>
    
    <!-- Zinc Neutrals: Full spectrum -->
    <div class="bg-zinc-600 bg-zinc-700 bg-zinc-800 text-zinc-50 text-zinc-100 text-zinc-200 text-zinc-300 text-zinc-400 text-zinc-500 text-zinc-600 border-zinc-600 border-zinc-700 border-zinc-700/24 border-zinc-800"></div>
    
    <!-- Slate variants (legacy/onboarding) -->
    <div class="bg-slate-700 bg-slate-800 bg-slate-900 bg-slate-900/40 bg-slate-900/60 text-slate-300 text-slate-400 text-slate-500 text-slate-600 border-slate-600 border-slate-700/30 border-slate-700/40 border-slate-700/50"></div>
    
    <!-- Yellow variants (access gate) -->
    <div class="bg-yellow-500/30 text-yellow-300 border-yellow-500/30 border-yellow-500/60"></div>
    
    <!-- Effects: Transitions, hovers, brightness -->
    <div class="brightness-100 brightness-105 hover:brightness-105 active:brightness-100 hover:opacity-70 hover:opacity-80 hover:scale-105"></div>
    <div class="transition-all transition-colors transition-opacity transition-transform duration-100 duration-150 duration-200 duration-300 duration-500"></div>
    <div class="hover:bg-zinc-800 hover:bg-zinc-800/60 hover:bg-red-500/10 hover:text-orange-400 hover:text-red-400 hover:border-orange-500/40 hover:border-red-500/80 hover:border-zinc-700"></div>
    
    <!-- Focus states -->
    <div class="focus:outline-none focus:ring-1 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 focus:border-red-500/50 focus:border-yellow-500/60 focus:bg-slate-900 focus:bg-zinc-900"></div>
    
    <!-- Rounded variants -->
    <div class="rounded rounded-sm rounded-md rounded-lg rounded-xl rounded-2xl rounded-full"></div>
    
    <!-- Ring effects -->
    <div class="ring-1 ring-2 ring-sky-500/50 ring-orange-500/40"></div>
    
    <!-- Dividers -->
    <div class="divide-x divide-y divide-zinc-800/60"></div>
    
    <!-- Truncate and overflow -->
    <div class="truncate overflow-hidden overflow-auto overflow-y-auto max-h-24 max-h-28 max-h-32 max-h-40 max-h-44 max-h-56 max-h-64 max-h-72 max-h-80"></div>
    
    <!-- Z-index layers -->
    <div class="z-10 z-20 z-30 z-40 z-50 z-[600] z-[750] z-[900] z-[1200] z-[9999]"></div>
    
    <!-- Data attributes -->
    <div class="data-[state=checked]:bg-red-600 data-[state=checked]:bg-cyan-600 data-[open=true]:border-orange-500"></div>
    
    <!-- Animations -->
    <div class="animate-pulse animate-spin animate-in fade-in slide-in-from-bottom-4"></div>
    
    <!-- Grid/Flex layouts -->
    <div class="grid grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-6 grid-cols-12 md:grid-cols-2 xl:grid-cols-3 xl:grid-cols-4 xl:grid-cols-6"></div>
    <div class="flex flex-col flex-row items-center items-start items-end justify-between justify-center justify-end flex-wrap flex-1 flex-shrink-0 min-w-0 min-h-0"></div>
    
    <!-- Responsive variants -->
    <div class="hidden md:flex md:block lg:grid xl:col-span-2 xl:col-span-3"></div>
    
    <!-- Misc utilities -->
    <div class="cursor-pointer cursor-col-resize pointer-events-none resize-none line-clamp-4 break-words whitespace-pre-wrap"></div>
  </div>
</div>
`;

export function getTailwindSafelistHtml() {
  return TAILWIND_SAFELIST_HTML;
}