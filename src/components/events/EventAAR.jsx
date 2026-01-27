import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import CommsSummaryGenerator from './CommsSummaryGenerator';

export default function EventAAR({ eventId, eventTitle, event }) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch channels for comms summary
  const { data: channels = [] } = useQuery({
    queryKey: ['event-channels', eventId],
    queryFn: () => base44.entities.Channel.list(),
    enabled: !!eventId
  });

  const { data: report, isLoading: reportLoading, refetch } = useQuery({
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

  const handleGenerateAAR = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateEventAAR', { eventId });
      if (response.data.success) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to generate AAR:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (report) {
      const printWindow = window.open('', '', 'width=900,height=800');
      printWindow.document.write(`
        <html>
          <head>
            <title>${report.title}</title>
            <style>
              body { font-family: monospace; background: #09090b; color: #e4e4e7; padding: 40px; }
              h1, h2, h3 { color: #ea580c; margin-top: 20px; }
              .metadata { border: 1px solid #27272a; padding: 10px; margin-bottom: 20px; color: #a1a1aa; }
              .content { line-height: 1.6; }
              pre { background: #18181b; padding: 10px; overflow-x: auto; border: 1px solid #27272a; }
              ul, ol { margin-left: 20px; }
            </style>
          </head>
          <body>
            <h1>${report.title}</h1>
            <div class="metadata">
              <div>Event: ${eventTitle}</div>
              <div>Generated: ${new Date(report.created_date).toLocaleString()}</div>
              <div>Type: ${report.report_type}</div>
            </div>
            <div class="content">${report.content.replace(/\n/g, '<br/>')}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#ea580c]" />
          AFTER ACTION REPORT
        </h3>
        <div className="flex gap-2">
          {event && <CommsSummaryGenerator event={event} channels={channels} />}
          {report && (
            <Button size="sm" variant="outline" onClick={handlePrint} className="text-[10px] h-7 gap-1">
              <Printer className="w-3 h-3" />
              Print
            </Button>
          )}
        </div>
      </div>

      {!report ? (
        <div className="border border-zinc-700 bg-zinc-900/30 p-4 text-center space-y-3">
          <div className="text-zinc-500 text-xs font-mono">NO AAR GENERATED YET</div>
          <Button
            onClick={handleGenerateAAR}
            disabled={isGenerating}
            className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs h-8"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                GENERATING...
              </>
            ) : (
              'GENERATE AAR'
            )}
          </Button>
        </div>
      ) : (
        <div className="border border-zinc-700 bg-zinc-900/30 p-4">
          <div className="text-[10px] text-zinc-500 font-mono mb-3">
            Generated {new Date(report.created_date).toLocaleString()}
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-xs">
            <ReactMarkdown className="text-zinc-300 space-y-2">
              {report.content}
            </ReactMarkdown>
          </div>
          {report.key_findings?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-700">
              <div className="text-xs font-bold text-[#ea580c] mb-2">KEY FINDINGS</div>
              <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                {report.key_findings.map((finding, idx) => (
                  <li key={idx}>{finding}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}