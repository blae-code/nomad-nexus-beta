import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const categoryColors = {
  discussion: 'bg-blue-900/40 text-blue-300 border-blue-700',
  announcement: 'bg-amber-900/40 text-amber-300 border-amber-700',
  question: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  feedback: 'bg-purple-900/40 text-purple-300 border-purple-700',
  'off-topic': 'bg-zinc-800 text-zinc-400 border-zinc-700'
};

export default function MessageCategoryTag({ messageContent, showTags = true }) {
  const [category, setCategory] = useState(null);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    categorizeMessage();
  }, [messageContent]);

  const categorizeMessage = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('channelAIAssistant', {
        action: 'categorizeMessage',
        messageContent
      });

      if (response.data?.result) {
        const { category: cat, tags: tgs, confidence } = response.data.result;
        if (confidence > 0.6) {
          setCategory(cat);
          setTags(tgs || []);
        }
      }
    } catch (error) {
      console.error('Error categorizing message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader2 className="w-2.5 h-2.5 animate-spin text-zinc-500" />;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {category && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Badge className={`text-[7px] ${categoryColors[category] || categoryColors['off-topic']}`}>
            {category}
          </Badge>
        </motion.div>
      )}
      {showTags && tags.length > 0 && (
        <div className="flex gap-1">
          {tags.slice(0, 2).map((tag, idx) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Badge variant="outline" className="text-[7px] text-zinc-500 border-zinc-700">
                #{tag}
              </Badge>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}