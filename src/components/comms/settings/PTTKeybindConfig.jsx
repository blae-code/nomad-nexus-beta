import React, { useState } from 'react';
import { KeySquare, Keyboard, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const VALID_KEYS = [
  'Space', 'Enter', 'Tab', 'Shift', 'Control', 'Alt',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
];

export default function PTTKeybindConfig({ preferences, setPreferences }) {
  const [isListening, setIsListening] = useState(false);
  const [displayKey, setDisplayKey] = useState(preferences.pttKey);

  const handleKeyCapture = (e) => {
    e.preventDefault();
    const key = e.key;
    const keyName = key === ' ' ? 'Space' : key.charAt(0).toUpperCase() + key.slice(1);

    if (VALID_KEYS.includes(keyName) || VALID_KEYS.includes(key.toUpperCase())) {
      setDisplayKey(keyName);
      setPreferences(prev => ({
        ...prev,
        pttKey: keyName
      }));
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-[#ea580c]" />
            <div>
              <CardTitle>Push-to-Talk Keybind</CardTitle>
              <CardDescription>Configure the key to hold for voice transmission</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-zinc-400 mb-2">Current Keybind</p>
              <Badge className="bg-[#ea580c]/20 border border-[#ea580c]/50 text-[#ea580c] text-base py-2 px-4 font-mono">
                <KeySquare className="w-4 h-4 mr-2 inline" />
                {displayKey}
              </Badge>
            </div>
            <Button
              onClick={() => setIsListening(!isListening)}
              variant={isListening ? 'default' : 'outline'}
              className={isListening ? 'bg-[#ea580c]' : ''}
            >
              {isListening ? 'Listening...' : 'Change Keybind'}
            </Button>
          </div>

          {isListening && (
            <div 
              className="p-4 rounded bg-blue-500/20 border border-blue-500/50 text-blue-300 text-sm"
              onKeyDown={handleKeyCapture}
              tabIndex={0}
              autoFocus
            >
              Press any key to set as PTT keybind...
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-400 mb-2">Supported Keys</p>
            <div className="flex flex-wrap gap-2">
              {VALID_KEYS.slice(0, 12).map(key => (
                <Badge 
                  key={key}
                  variant="outline"
                  className={`${key === displayKey ? 'bg-[#ea580c]/30 border-[#ea580c]' : 'border-zinc-700'}`}
                >
                  {key}
                </Badge>
              ))}
              <Badge variant="outline" className="border-zinc-700">+more...</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#ea580c]" />
            <div>
              <CardTitle>PTT Toggle Mode</CardTitle>
              <CardDescription>Switch between push-to-talk (hold) and toggle mode (press to switch)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded bg-zinc-800/50 border border-zinc-700">
            <div>
              <p className="font-medium text-sm">{preferences.pttToggle ? 'Toggle Mode' : 'Push-to-Talk Mode'}</p>
              <p className="text-xs text-zinc-400 mt-1">
                {preferences.pttToggle 
                  ? 'Press to enable/disable transmission' 
                  : 'Hold key to transmit, release to mute'}
              </p>
            </div>
            <Switch
              checked={preferences.pttToggle}
              onCheckedChange={(checked) => setPreferences(prev => ({
                ...prev,
                pttToggle: checked
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}