export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-orange-500 text-2xl font-black uppercase tracking-wider mb-4 animate-pulse">
          LOADING...
        </div>
        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 animate-[loading_1.5s_ease-in-out_infinite]" style={{
            animation: 'loading 1.5s ease-in-out infinite',
            width: '40%',
          }} />
        </div>
      </div>
    </div>
  );
}