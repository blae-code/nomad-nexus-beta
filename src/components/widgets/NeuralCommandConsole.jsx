import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, X, Zap, Sparkles, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function NeuralCommandConsole({ widgetId, onRemove, isDragging }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const generateSuggestions = async (query) => {
    if (!query.trim()) return setSuggestions([]);
    const common = [
      'Show active operations',
      'List online members',
      'Fleet status report',
      'Voice net roster',
      'Create new mission',
    ];
    setSuggestions(common.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 3));
  };

  const handleSubmit = async (command = input) => {
    if (!command.trim()) return;
    
    setHistory(prev => [...prev, { type: 'user', text: command, time: new Date() }]);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a tactical AI assistant for NexusOS. User command: "${command}". Respond with a brief, actionable tactical response.`,
        add_context_from_internet: false,
      });

      setHistory(prev => [...prev, { 
        type: 'ai', 
        text: response || 'Command processed.', 
        time: new Date() 
      }]);
    } catch (err) {
      setHistory(prev => [...prev, { 
        type: 'error', 
        text: 'Neural link degraded. Retry command.', 
        time: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.03)_0px,rgba(220,38,38,0.03)_1px,transparent_1px,transparent_2px)] pointer-events-none" />
      
      {/* Header */}
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Neural Console</span>
          <Sparkles className="w-3 h-3 text-orange-500 animate-pulse" />
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Console Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs relative z-10" style={{ scrollbarWidth: 'thin' }}>
        {history.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Terminal className="w-8 h-8 text-red-700/40 mx-auto" />
            <p className="text-[10px] text-red-700/60 uppercase tracking-[0.2em]">Neural Link Active</p>
          </div>
        )}
        
        {history.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-2.5 py-1.5 rounded border ${
              msg.type === 'user' 
                ? 'bg-red-950/40 border-red-700/40 text-red-200' 
                : msg.type === 'error'
                ? 'bg-orange-950/40 border-orange-700/40 text-orange-300'
                : 'bg-zinc-900/60 border-zinc-700/40 text-zinc-300'
            }`}>
              <p className="font-mono leading-relaxed">{msg.text}</p>
              <span className="text-[9px] text-zinc-600 mt-1 block">
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex items-center gap-2 text-red-500 animate-pulse">
            <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" />
            <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="text-[10px] uppercase tracking-wider">Processing</span>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex-shrink-0 px-3 py-1.5 border-t border-red-700/30 bg-zinc-900/40 space-y-1 relative z-10">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(sug)}
              className="block w-full text-left px-2 py-1 rounded text-[10px] text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <Zap className="w-2.5 h-2.5 inline mr-1" /> {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); generateSuggestions(e.target.value); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Neural command input..."
            className="flex-1 bg-zinc-900/60 border border-zinc-700/60 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-700/60 font-mono"
          />
          <Button
            size="icon"
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="h-7 w-7 bg-red-600 hover:bg-red-500 disabled:opacity-40"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}