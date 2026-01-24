// src/pages/Hub.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function Hub() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [micOn, setMicOn] = useState(false);
  const streamRef = useRef(null);

  // Cmd/Ctrl + K command palette
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = useMemo(
    () => [
      { label: 'Start group voice test', run: () => alert('Group voice test (stub)') },
      { label: 'Create onboarding link', run: () => alert('Onboarding link (stub)') },
      { label: 'Open registration checklist', run: () => alert('Registration checklist (stub)') },
      { label: micOn ? 'Turn mic off' : 'Turn mic on', run: () => toggleMic(setMicOn, streamRef) },
      { label: 'Reset demo state', run: () => window.location.reload() },
    ],
    [micOn]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header V3 (restored) */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="font-semibold tracking-tight">Nomad Nexus</div>
          <div className="text-xs opacity-70">Hub</div>

          <div className="flex-1" />

          <button
            className="h-9 px-3 rounded-lg border text-sm hover:bg-muted"
            onClick={() => setPaletteOpen(true)}
            title="Cmd/Ctrl + K"
          >
            Command Palette <span className="opacity-60">⌘/Ctrl K</span>
          </button>

          <button
            className={`h-9 px-3 rounded-lg text-sm border hover:bg-muted ${micOn ? 'font-semibold' : ''}`}
            onClick={() => toggleMic(setMicOn, streamRef)}
          >
            {micOn ? 'Mic: On' : 'Mic: Off'}
          </button>

          <button className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90">
            Invite
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left: rooms / onboarding */}
          <section className="col-span-12 lg:col-span-3 border rounded-2xl p-4">
            <div className="font-semibold mb-2">Onboarding</div>
            <ol className="text-sm space-y-2 opacity-90">
              <li>1) Generate invite link</li>
              <li>2) User registers (Discord screenshare)</li>
              <li>3) Join group voice test</li>
            </ol>
            <div className="mt-4 text-xs opacity-70">
              Note: backend endpoints may be down; this hub shell keeps demo UI functional.
            </div>
          </section>

          {/* Center: stage */}
          <section className="col-span-12 lg:col-span-6 border rounded-2xl p-4 min-h-[420px]">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Stage</div>
              <div className="text-xs opacity-70">Group testing area</div>
            </div>

            <div className="mt-4 border rounded-xl p-4 bg-muted/30">
              <div className="text-sm font-medium">Voice Test Controls</div>
              <div className="mt-2 text-sm opacity-90">
                Use the dock below to toggle mic, simulate push-to-talk, and run a round-robin test.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="h-9 px-3 rounded-lg border hover:bg-muted"
                  onClick={() => alert('Round-robin test (stub)')}
                >
                  Round-robin Test
                </button>
                <button
                  className="h-9 px-3 rounded-lg border hover:bg-muted"
                  onClick={() => alert('Latency check (stub)')}
                >
                  Latency Check
                </button>
                <button
                  className="h-9 px-3 rounded-lg border hover:bg-muted"
                  onClick={() => alert('Noise suppression toggle (stub)')}
                >
                  Noise Suppression
                </button>
              </div>
            </div>
          </section>

          {/* Right: voice toolkit panel (restored) */}
          <aside className="col-span-12 lg:col-span-3 border rounded-2xl p-4">
            <div className="font-semibold mb-2">Voice Toolkit</div>

            <div className="space-y-3 text-sm">
              <div className="border rounded-xl p-3">
                <div className="font-medium">Input</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="opacity-80">Microphone</span>
                  <button
                    className="h-8 px-3 rounded-lg border hover:bg-muted"
                    onClick={() => toggleMic(setMicOn, streamRef)}
                  >
                    {micOn ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              <div className="border rounded-xl p-3">
                <div className="font-medium">Session</div>
                <div className="mt-2 flex flex-col gap-2">
                  <button className="h-9 px-3 rounded-lg border hover:bg-muted" onClick={() => alert('Create room (stub)')}>
                    Create Room
                  </button>
                  <button className="h-9 px-3 rounded-lg border hover:bg-muted" onClick={() => alert('Join room (stub)')}>
                    Join Room
                  </button>
                </div>
              </div>

              <div className="border rounded-xl p-3">
                <div className="font-medium">Diagnostics</div>
                <div className="mt-2 text-xs opacity-80">
                  If you still see API 500s, keep demo moving using UI stubs and report endpoints to Base44 support.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Communications Dock Footer (restored) */}
      <footer className="sticky bottom-0 border-t bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-2">
          <div className="text-sm font-medium">Comms Dock</div>
          <div className="flex-1" />

          <button className="h-9 px-3 rounded-lg border hover:bg-muted" onClick={() => toggleMic(setMicOn, streamRef)}>
            {micOn ? 'Mic On' : 'Mic Off'}
          </button>
          <button className="h-9 px-3 rounded-lg border hover:bg-muted" onClick={() => alert('Push-to-talk (stub)')}>
            Push-to-talk
          </button>
          <button className="h-9 px-3 rounded-lg border hover:bg-muted" onClick={() => alert('Open chat (stub)')}>
            Chat
          </button>
          <button className="h-9 px-3 rounded-lg border hover:bg-muted" onClick={() => alert('Screen share (stub)')}>
            Screen
          </button>
        </div>
      </footer>

      {/* Command Palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40" onMouseDown={() => setPaletteOpen(false)}>
          <div
            className="w-full max-w-xl rounded-2xl border bg-background p-3 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="w-full h-10 px-3 rounded-xl border bg-background"
                placeholder="Type a command…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="h-10 px-3 rounded-xl border hover:bg-muted" onClick={() => setPaletteOpen(false)}>
                Esc
              </button>
            </div>

            <div className="mt-3 border rounded-xl overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm opacity-70">No matches</div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.label}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setPaletteOpen(false);
                      setQuery('');
                      c.run();
                    }}
                  >
                    {c.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function toggleMic(setMicOn, streamRef) {
  try {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setMicOn(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    setMicOn(true);
  } catch (e) {
    console.error(e);
    alert('Mic permission failed. Check browser permissions and try again.');
    setMicOn(false);
  }
}
