import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Mic, VolumeX, MicOff } from 'lucide-react';
import { getSpeechEngine } from './SpeechEngine';

export default function SpeechSettings({ settings, onUpdate }) {
  const [voices, setVoices] = useState([]);
  const [testing, setTesting] = useState(false);
  const speechEngine = getSpeechEngine();

  useEffect(() => {
    const availableVoices = speechEngine.getAvailableVoices();
    setVoices(availableVoices);
  }, []);

  const testVoice = () => {
    setTesting(true);
    speechEngine.speak('This is a voice test for Nomad Nexus communications.', {
      voice: settings.ttsVoice,
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
      volume: settings.ttsVolume,
      lang: settings.language,
      onEnd: () => setTesting(false),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase">Speech Settings</h3>
      </div>

      {/* TTS Settings */}
      <div className="space-y-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-bold text-blue-400 uppercase">Text-to-Speech</h4>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Enable TTS</span>
          <button
            onClick={() => onUpdate({ ...settings, ttsEnabled: !settings.ttsEnabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.ttsEnabled ? 'bg-orange-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.ttsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.ttsEnabled && (
          <>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Voice</label>
              <select
                value={settings.ttsVoice}
                onChange={(e) => onUpdate({ ...settings, ttsVoice: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-xs"
              >
                <option value="">Default</option>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">
                Speed: {settings.ttsRate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.ttsRate}
                onChange={(e) => onUpdate({ ...settings, ttsRate: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">
                Volume: {Math.round(settings.ttsVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.ttsVolume}
                onChange={(e) => onUpdate({ ...settings, ttsVolume: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <Button onClick={testVoice} disabled={testing} size="sm" variant="outline" className="w-full">
              <Volume2 className="w-3 h-3 mr-2" />
              {testing ? 'Playing...' : 'Test Voice'}
            </Button>
          </>
        )}
      </div>

      {/* STT Settings */}
      <div className="space-y-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
        <div className="flex items-center gap-2 mb-2">
          <Mic className="w-4 h-4 text-green-400" />
          <h4 className="text-xs font-bold text-green-400 uppercase">Speech-to-Text</h4>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Enable STT</span>
          <button
            onClick={() => onUpdate({ ...settings, sttEnabled: !settings.sttEnabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.sttEnabled ? 'bg-orange-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.sttEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Language</label>
          <select
            value={settings.language}
            onChange={(e) => onUpdate({ ...settings, language: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-xs"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="it-IT">Italian</option>
            <option value="pt-BR">Portuguese (Brazil)</option>
            <option value="ru-RU">Russian</option>
            <option value="ja-JP">Japanese</option>
            <option value="zh-CN">Chinese (Simplified)</option>
            <option value="ko-KR">Korean</option>
          </select>
        </div>

        {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
          <div className="text-xs text-yellow-400 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
            ⚠️ Speech recognition not supported in this browser
          </div>
        )}
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
        <strong>Usage:</strong> Click the speaker icon next to messages to hear them aloud. Use the mic button to dictate messages.
      </div>
    </div>
  );
}