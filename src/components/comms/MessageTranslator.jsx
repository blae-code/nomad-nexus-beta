/**
 * MessageTranslator — On-demand message translation
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export default function MessageTranslator({ message }) {
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async (targetLanguage) => {
    setTranslating(true);
    try {
      const { data } = await base44.functions.invoke('translateMessage', {
        content: message.content,
        target_language: targetLanguage,
      });

      setTranslation(data);
      setShowTranslation(true);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="inline-block">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            disabled={translating}
          >
            {translating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Languages className="w-3 h-3" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="text-xs font-semibold text-zinc-400 mb-2 px-2">
            Translate to:
          </div>
          <div className="space-y-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleTranslate(lang.name)}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
              >
                {lang.name}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {showTranslation && translation && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-blue-400 font-semibold">
              {translation.target_language} Translation
            </span>
            <button
              onClick={() => setShowTranslation(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          </div>
          <div className="text-zinc-300">{translation.translated}</div>
          {translation.source_language && (
            <div className="text-zinc-500 text-[10px] mt-1">
              Detected: {translation.source_language}
            </div>
          )}
        </div>
      )}
    </div>
  );
}