import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Feedback Submit Form Modal
 * Captures user feedback with automatic context collection
 */
export default function FeedbackSubmitForm({ open, onOpenChange, feedbackType, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    if (open) {
      base44.auth.me().then(setUser).catch(() => {});
      setTitle('');
      setDescription('');
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Capture context from observability singleton
      const obs = window.__observability;
      const recentErrors = obs?.getRecentErrors?.(10) || [];

      // Get page context
      const pageContext = window.location.pathname;
      const browserInfo = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      // Create feedback ticket
      const feedback = await base44.entities.Feedback.create({
        type: feedbackType || 'bug_report',
        title: title.trim(),
        description: description.trim(),
        reported_by_user_id: user.id,
        page_context: pageContext,
        browser_info: browserInfo,
        error_logs: recentErrors,
        status: 'new',
        priority: 'medium'
      });

      // Generate AI summary via backend
      if (feedback) {
        try {
          await base44.functions.invoke('generateFeedbackAISummary', {
            feedbackId: feedback.id,
            title: feedback.title,
            description: feedback.description,
            type: feedback.type
          });
        } catch (e) {
          console.warn('AI summary generation failed, continuing:', e);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabel = feedbackType === 'bug_report' ? 'Bug Report' : 'Feature Request';
  const typeColor = feedbackType === 'bug_report' 
    ? 'bg-red-950/30 border-red-700/50 text-red-400'
    : 'bg-blue-950/30 border-blue-700/50 text-blue-400';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="feedback-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            key="feedback-form"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-zinc-950 border border-zinc-800/60"
            style={{
              backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)',
              backgroundSize: '100% 2px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Submit Feedback</span>
                <span className={cn('text-[8px] font-mono font-bold uppercase px-2 py-1 border', typeColor)}>
                  {typeLabel}
                </span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="text-zinc-600 hover:text-zinc-400 text-sm leading-none"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-6 space-y-2"
                >
                  <div className="text-emerald-400 font-mono text-sm font-bold">✓ Thank You!</div>
                  <p className="text-zinc-400 text-[9px]">Your feedback has been recorded and will be reviewed by our team.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {error && (
                    <div className="flex items-start gap-2 p-2 bg-red-950/30 border border-red-700/50 rounded">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-[8px] text-red-300">{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Brief summary of the issue or request"
                      className="w-full bg-zinc-900/50 border border-zinc-800/60 text-white text-[9px] px-2 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]/60 transition-colors"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={feedbackType === 'bug_report' 
                        ? 'What happened? What did you expect to happen? Steps to reproduce?'
                        : 'Describe the feature or improvement you\'d like to see...'}
                      className="w-full bg-zinc-900/50 border border-zinc-800/60 text-white text-[9px] px-2 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]/60 transition-colors resize-none"
                      rows="4"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800/50 p-2 rounded text-[8px] text-zinc-500">
                    <div className="font-mono font-bold mb-1 uppercase tracking-wider">Auto-Captured Context:</div>
                    <div className="space-y-0.5 font-mono text-zinc-600">
                      <div>• Page: {window.location.pathname}</div>
                      <div>• Browser: {navigator.userAgent.split(' ').slice(-2).join(' ')}</div>
                      <div>• Time: {new Date().toLocaleTimeString()}</div>
                      <div>• Errors captured: {window.__observability?.getRecentErrors?.(10)?.length || 0}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting || !title.trim() || !description.trim()}
                      className="flex-1 bg-[#ea580c] hover:bg-[#c2410c] text-white text-[9px] h-8 font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      variant="outline"
                      disabled={isSubmitting}
                      className="flex-1 text-[9px] h-8 font-bold uppercase"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}