import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Brain, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CommsSummaryGenerator({ event, channels }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateCommsSummary', {
        eventId: event.id,
        channelIds: channels.map(c => c.id),
        startTime: event.start_time,
        endTime: event.end_time || new Date().toISOString()
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSummary(data.summary);
      toast.success(`Analyzed ${data.messages_analyzed} messages`);
    },
    onError: () => {
      toast.error('Failed to generate summary');
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Brain className="w-4 h-4" />
          Generate Comms Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-zinc-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Communications Summary — {event.title}
          </DialogTitle>
        </DialogHeader>

        {!summary ? (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-sm text-zinc-400 mb-4">
                Generate an AI-powered analysis of all communications during this operation
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="gap-2"
              >
                <Brain className="w-4 h-4" />
                {generateMutation.isPending ? 'Analyzing...' : 'Generate Summary'}
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {/* Executive Summary */}
              <div className="border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-sm font-bold text-zinc-200 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Executive Summary
                </h3>
                <p className="text-xs text-zinc-300">{summary.executive_summary}</p>
              </div>

              {/* Timeline */}
              <div className="border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-sm font-bold text-zinc-200 mb-3">Key Timeline</h3>
                <div className="space-y-2">
                  {summary.timeline?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <Badge className={`text-[9px] ${
                        item.importance === 'critical' ? 'bg-red-900/50 text-red-300' :
                        item.importance === 'high' ? 'bg-orange-900/50 text-orange-300' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {item.time}
                      </Badge>
                      <span className="text-zinc-300">{item.event}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Information */}
              {summary.critical_information?.length > 0 && (
                <div className="border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="text-sm font-bold text-zinc-200 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Critical Information
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {summary.critical_information.map((info, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-orange-500">•</span>
                        <span>{info}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {summary.action_items?.length > 0 && (
                <div className="border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="text-sm font-bold text-zinc-200 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Action Items
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {summary.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 text-blue-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {summary.recommendations?.length > 0 && (
                <div className="border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="text-sm font-bold text-zinc-200 mb-2">Recommendations</h3>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {summary.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Effectiveness */}
              <div className="border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-sm font-bold text-zinc-200 mb-2">Communication Effectiveness</h3>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-blue-900/50 text-blue-300 text-xs">
                    Score: {summary.effectiveness_score}/10
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400">{summary.effectiveness_notes}</p>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}