import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Ticket Detail Modal with in-app fix tools and Base44 prompt generation
 */
export default function TicketDetailModal({ open, onOpenChange, ticket, onUpdate }) {
  const [isCopying, setIsCopying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showBase44Prompt, setShowBase44Prompt] = useState(false);

  if (!open || !ticket) return null;

  const generateBase44Prompt = () => {
    const prompt = `
[FEEDBACK TICKET CONTEXT]
ID: ${ticket.id}
Type: ${ticket.type === 'bug_report' ? 'Bug Report' : 'Feature Request'}
Status: ${ticket.status}
Priority: ${ticket.priority}
Reported by: ${ticket.created_by || 'User'}
Date: ${new Date(ticket.created_date).toLocaleString()}

[ISSUE SUMMARY]
Title: ${ticket.title}
Description: ${ticket.description}

[SYSTEM CONTEXT]
Page: ${ticket.page_context}
URL: ${ticket.browser_info?.url}
Browser: ${ticket.browser_info?.userAgent}

[CAPTURED ERRORS]
${ticket.error_logs?.length > 0 ? ticket.error_logs.map(e => `- ${e.type}: ${e.message}`).join('\n') : 'No errors captured'}

[AI ANALYSIS]
Summary: ${ticket.ai_summary || 'Pending analysis'}
Tags: ${ticket.ai_tags?.join(', ') || 'None'}

[REQUEST]
Please investigate and provide guidance or a fix for this ${ticket.type === 'bug_report' ? 'bug' : 'feature request'}.
    `.trim();

    return prompt;
  };

  const handleCopyPrompt = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(generateBase44Prompt());
      setTimeout(() => setIsCopying(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
      setIsCopying(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      await base44.entities.Feedback.update(ticket.id, {
        status: newStatus,
        ...(newStatus === 'resolved' && resolutionNotes && { resolution_notes: resolutionNotes })
      });
      onUpdate?.();
      onOpenChange(false);
    } catch (e) {
      console.error('Failed to update:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const priorityColor = (priority) => {
    switch(priority) {
      case 'critical': return 'bg-red-950/60 border-red-700/60 text-red-300';
      case 'high': return 'bg-orange-950/60 border-orange-700/60 text-orange-300';
      case 'medium': return 'bg-yellow-950/60 border-yellow-700/60 text-yellow-300';
      case 'low': return 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300';
      default: return 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300';
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case 'new': return 'bg-zinc-800/60';
      case 'investigating': return 'bg-blue-900/40';
      case 'in_progress': return 'bg-purple-900/40';
      case 'resolved': return 'bg-emerald-900/40';
      case 'closed': return 'bg-zinc-700/40';
      default: return 'bg-zinc-800/60';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60"
        onClick={() => onOpenChange(false)}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-zinc-800/60 flex flex-col"
        style={{
          backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)',
          backgroundSize: '100% 2px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/40 bg-zinc-900/50 flex items-start justify-between shrink-0">
          <div className="space-y-2 flex-1">
            <div className="flex items-start gap-2">
              <h2 className="text-sm font-bold text-white flex-1">{ticket.title}</h2>
              <span className="text-[7px] font-mono text-zinc-600">{ticket.id.slice(0, 8)}</span>
            </div>
            <div className="flex gap-1">
              <Badge className={cn('text-[7px]', priorityColor(ticket.priority))}>
                {ticket.priority}
              </Badge>
              <Badge className={cn('text-[7px]', statusColor(ticket.status))}>
                {ticket.status}
              </Badge>
              <Badge variant="outline" className="text-[7px] bg-zinc-900/40">
                {ticket.type === 'bug_report' ? '🐛 Bug' : '💡 Feature'}
              </Badge>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-zinc-600 hover:text-zinc-400 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3 p-4">
          {/* Description */}
          <div>
            <h3 className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">Description</h3>
            <p className="text-[9px] text-zinc-300 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* AI Summary */}
          {ticket.ai_summary && (
            <div className="bg-blue-950/20 border border-blue-800/40 p-2 rounded">
              <h3 className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider mb-1">AI Summary</h3>
              <p className="text-[9px] text-blue-300">{ticket.ai_summary}</p>
              {ticket.ai_tags?.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {ticket.ai_tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[7px] bg-blue-900/30 border-blue-700/50 text-blue-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Context */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-2 rounded">
            <h3 className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">Context</h3>
            <div className="space-y-0.5 text-[8px] font-mono text-zinc-500">
              <div>Page: <span className="text-zinc-400">{ticket.page_context}</span></div>
              <div>URL: <span className="text-zinc-400 truncate">{ticket.browser_info?.url}</span></div>
              <div>Reported: <span className="text-zinc-400">{new Date(ticket.created_date).toLocaleString()}</span></div>
            </div>
          </div>

          {/* Error Logs */}
          {ticket.error_logs?.length > 0 && (
            <div className="bg-red-950/20 border border-red-800/40 p-2 rounded">
              <h3 className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider mb-1">
                Captured Errors ({ticket.error_logs.length})
              </h3>
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {ticket.error_logs.map((err, i) => (
                  <div key={i} className="text-[8px] text-red-300 p-1 bg-red-950/40 rounded">
                    <div className="font-bold">{err.type}: {err.message}</div>
                    {err.source && <div className="text-zinc-600 text-[7px]">{err.source}:{err.line}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Notes */}
          {ticket.status === 'in_progress' || ticket.status === 'resolved' ? (
            <div>
              <h3 className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">Resolution Notes</h3>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Document how this was fixed or addressed..."
                className="w-full bg-zinc-900/50 border border-zinc-800/60 text-white text-[9px] px-2 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]/60 transition-colors resize-none"
                rows="3"
              />
            </div>
          ) : null}
        </div>

        {/* Footer - Actions */}
        <div className="px-4 py-3 border-t border-zinc-800/40 bg-zinc-900/50 shrink-0 space-y-2">
          {/* Base44 Support Prompt */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBase44Prompt(!showBase44Prompt)}
              className="flex items-center gap-1.5 px-2 py-1 text-[8px] font-mono font-bold uppercase bg-purple-950/40 border border-purple-700/50 text-purple-400 hover:bg-purple-900/40 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Base44 Prompt
            </button>
          </div>

          {/* Base44 Prompt Display */}
          {showBase44Prompt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-purple-950/20 border border-purple-800/40 p-2 rounded space-y-1"
            >
              <div className="text-[8px] font-mono text-purple-300 whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                {generateBase44Prompt()}
              </div>
              <button
                onClick={handleCopyPrompt}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[8px] font-mono font-bold uppercase bg-purple-900/60 border border-purple-700/60 text-purple-300 hover:bg-purple-800/60 transition-colors"
              >
                <Copy className="w-3 h-3" />
                {isCopying ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </motion.div>
          )}

          {/* Status Update Buttons */}
          <div className="flex gap-1">
            <Button
              onClick={() => handleUpdateStatus('investigating')}
              disabled={isUpdating || ticket.status === 'investigating'}
              variant="outline"
              size="sm"
              className="flex-1 text-[8px] h-7 font-bold uppercase"
            >
              Investigate
            </Button>
            <Button
              onClick={() => handleUpdateStatus('in_progress')}
              disabled={isUpdating || ticket.status === 'in_progress'}
              variant="outline"
              size="sm"
              className="flex-1 text-[8px] h-7 font-bold uppercase"
            >
              Start Work
            </Button>
            <Button
              onClick={() => handleUpdateStatus('resolved')}
              disabled={isUpdating || ticket.status === 'resolved'}
              variant="outline"
              size="sm"
              className="flex-1 text-[8px] h-7 font-bold uppercase"
            >
              Mark Resolved
            </Button>
            <Button
              onClick={() => handleUpdateStatus('closed')}
              disabled={isUpdating}
              size="sm"
              className="flex-1 bg-[#ea580c] hover:bg-[#c2410c] text-white text-[8px] h-7 font-bold uppercase"
            >
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}