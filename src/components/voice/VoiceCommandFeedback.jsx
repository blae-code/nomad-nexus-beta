import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VoiceCommandFeedback() {
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const handleVoiceCommand = (event) => {
      const { command, success, confidence } = event.detail || {};
      setFeedback({ command, success, confidence: confidence || 0 });
      setTimeout(() => setFeedback(null), 3000);
    };

    window.addEventListener('nexus:voice-feedback', handleVoiceCommand);
    return () => window.removeEventListener('nexus:voice-feedback', handleVoiceCommand);
  }, []);

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-24 right-6 z-[999] bg-zinc-900 border border-orange-500/40 rounded-lg p-4 max-w-xs"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {feedback.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-100">
                {feedback.success ? 'Command Recognized' : 'Command Unclear'}
              </div>
              <div className="text-xs text-zinc-400 mt-1">"{feedback.command}"</div>
              <div className="text-xs text-orange-500/70 mt-1">
                Confidence: {(feedback.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}