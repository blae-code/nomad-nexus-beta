import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, RefreshCw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AARPanel({ eventId, eventTitle }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: aar, isLoading } = useQuery({
    queryKey: ['event-aar', eventId],
    queryFn: async () => {
      const reports = await base44.entities.EventReport.filter(
        { event_id: eventId, report_type: 'AAR' },
        '-created_date',
        1
      );
      return reports?.[0] || null;
    },
    enabled: !!eventId
  });

  const generateAARMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await base44.functions.invoke('generateEventAAR', { eventId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-aar', eventId] });
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([aar.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `AAR_${eventTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide">After Action Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!aar) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" />
            After Action Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-sm mb-4">Generate a comprehensive debrief of this mission.</p>
          <Button
            onClick={() => generateAARMutation.mutate()}
            disabled={isGenerating || generateAARMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating || generateAARMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating AAR...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate AAR
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" />
            After Action Report
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateAARMutation.mutate()}
              disabled={isGenerating || generateAARMutation.isPending}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 mb-2">{aar.title}</h3>
            <div className="text-xs text-zinc-500 font-mono">
              Generated: {new Date(aar.created_date).toLocaleString()}
            </div>
          </div>

          {aar.key_findings && aar.key_findings.length > 0 && (
            <div className="p-2 bg-zinc-950/50 border border-zinc-800 rounded">
              <div className="text-xs font-bold text-zinc-300 mb-1">Key Findings:</div>
              <ul className="text-xs text-zinc-400 space-y-1">
                {aar.key_findings.map((finding, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-[#ea580c]">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto border border-zinc-800 p-3 rounded bg-zinc-950/30 prose prose-sm prose-zinc">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h2 className="text-xs font-bold text-zinc-100 mt-2 mb-1">{children}</h2>,
                h2: ({ children }) => <h3 className="text-xs font-bold text-zinc-200 mt-1 mb-0.5">{children}</h3>,
                p: ({ children }) => <p className="text-[10px] text-zinc-400 mb-1">{children}</p>,
                ul: ({ children }) => <ul className="text-[10px] text-zinc-400 ml-2">{children}</ul>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                strong: ({ children }) => <strong className="text-zinc-100">{children}</strong>
              }}
            >
              {aar.content}
            </ReactMarkdown>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}