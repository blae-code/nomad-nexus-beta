import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChannelAISuggestions({ messageContent, onSelectChannel }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('channelAIAssistant', {
        action: 'suggestChannels',
        messageContent
      });

      if (response.data?.result?.suggestions) {
        setSuggestions(response.data.result.suggestions);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleGetSuggestions}
        disabled={isLoading}
        className="w-full gap-2 text-[10px] text-zinc-500 hover:text-cyan-400 justify-start"
      >
        <Lightbulb className="w-3 h-3" />
        {isLoading ? 'Analyzing...' : 'Suggest Channels'}
      </Button>

      <AnimatePresence>
        {suggestions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 ml-2"
          >
            {suggestions.map((suggestion, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border border-cyan-800/30 bg-cyan-950/20 p-2 rounded text-[9px] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300">#{suggestion.channelName}</span>
                  <Badge className="text-[7px] bg-cyan-900/50 text-cyan-200 border-cyan-700">
                    {Math.round(suggestion.relevance * 100)}%
                  </Badge>
                </div>
                <p className="text-zinc-400">{suggestion.reason}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectChannel(suggestion.channelName)}
                  className="w-full text-[8px] h-6"
                >
                  Go to Channel
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}