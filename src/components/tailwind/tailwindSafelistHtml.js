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
  </div>
</div>
`;

export function getTailwindSafelistHtml() {
  return TAILWIND_SAFELIST_HTML;
}
