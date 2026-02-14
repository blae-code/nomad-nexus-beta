import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Palette, RotateCcw } from 'lucide-react';

const THEME_PRESETS = {
  nexus_default: { name: 'Nexus Default', accent: 'orange', bg: 'zinc' },
  deep_red: { name: 'Deep Red', accent: 'red', bg: 'slate' },
  amber_glow: { name: 'Amber Glow', accent: 'amber', bg: 'neutral' },
  cyan_tech: { name: 'Cyan Tech', accent: 'cyan', bg: 'stone' },
  purple_neon: { name: 'Purple Neon', accent: 'purple', bg: 'gray' },
};

export default function ThemeCustomizer() {
  const [currentTheme, setCurrentTheme] = useState('nexus_default');
  const [customAccent, setCustomAccent] = useState('orange');

  useEffect(() => {
    const saved = localStorage.getItem('nexus.theme.current');
    if (saved) setCurrentTheme(saved);
    const savedAccent = localStorage.getItem('nexus.theme.accent');
    if (savedAccent) setCustomAccent(savedAccent);
  }, []);

  const applyTheme = (themeId) => {
    const theme = THEME_PRESETS[themeId];
    if (!theme) return;
    
    localStorage.setItem('nexus.theme.current', themeId);
    localStorage.setItem('nexus.theme.accent', theme.accent);
    setCurrentTheme(themeId);
    setCustomAccent(theme.accent);
    
    document.documentElement.style.setProperty('--color-accent', theme.accent);
    document.documentElement.style.setProperty('--color-bg', theme.bg);
  };

  const resetTheme = () => {
    localStorage.removeItem('nexus.theme.current');
    localStorage.removeItem('nexus.theme.accent');
    applyTheme('nexus_default');
  };

  return (
    <div className="space-y-4 p-4 bg-zinc-900 rounded-lg border border-orange-500/20">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-semibold text-zinc-200">Theme Customization</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(THEME_PRESETS).map(([id, theme]) => (
          <button
            key={id}
            onClick={() => applyTheme(id)}
            className={`p-2 rounded text-xs font-medium transition ${
              currentTheme === id
                ? 'bg-orange-600 text-white border border-orange-400'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-orange-500/50'
            }`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={resetTheme}
        className="w-full gap-2"
      >
        <RotateCcw className="w-3 h-3" />
        Reset to Default
      </Button>
    </div>
  );
}