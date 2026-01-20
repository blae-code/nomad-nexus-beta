import React from 'react';
import { Volume2, Mic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

export default function AudioLevelControls({ preferences, setPreferences }) {
  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-[#ea580c]" />
              <div>
                <CardTitle>Microphone Input Level</CardTitle>
                <CardDescription>Adjust sensitivity and gain for your microphone</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-lg font-mono">
              {preferences.inputLevel}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Slider
            value={[preferences.inputLevel]}
            onValueChange={(value) => setPreferences(prev => ({
              ...prev,
              inputLevel: value[0]
            }))}
            min={0}
            max={200}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-zinc-400 mt-3">
            Recommended: 100% (default). Increase if too quiet, decrease if distorted.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[#ea580c]" />
              <div>
                <CardTitle>Speaker Output Level</CardTitle>
                <CardDescription>Control volume for incoming audio from the network</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-lg font-mono">
              {preferences.outputLevel}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Slider
            value={[preferences.outputLevel]}
            onValueChange={(value) => setPreferences(prev => ({
              ...prev,
              outputLevel: value[0]
            }))}
            min={0}
            max={200}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-zinc-400 mt-3">
            Recommended: 100% (default). Adjust based on comfort and ambient noise.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}