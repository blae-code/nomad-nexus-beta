import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChannelActivitySummary({ channelId, timeWindowHours = 24 }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [channelId, timeWindowHours]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('channelAIAssistant', {
        action: 'summarizeActivity',
        channelId,
        timeWindowHours
      });

      if (response.data?.result) {
        setSummary(response.data.result);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-900/40 text-green-300 border-green-700';
      case 'negative': return 'bg-red-900/40 text-red-300 border-red-700';
      default: return 'bg-blue-900/40 text-blue-300 border-blue-700';
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/30 p-3 rounded space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[9px] font-bold uppercase text-zinc-300">Activity Summary</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={loadSummary}
          disabled={isLoading}
          className="p-0 h-5 w-5"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {summary ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            <p className="text-[8.5px] text-zinc-300 leading-tight">{summary.summary}</p>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-[7px] ${getSentimentColor(summary.sentiment)}`}>
                {summary.sentiment.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-[7px]">
                {summary.messageCount} messages
              </Badge>
            </div>

            {summary.keyTopics?.length > 0 && (
              <div className="space-y-1">
                <div className="text-[7px] text-zinc-500 uppercase font-bold">Topics</div>
                <div className="flex flex-wrap gap-1">
                  {summary.keyTopics.slice(0, 4).map((topic, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[7px] text-zinc-400 border-zinc-700"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : isLoading ? (
          <div className="text-center text-[8px] text-zinc-500 py-2">
            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}