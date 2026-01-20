import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function AIAfterActionReportGenerator({ eventId, eventTitle }) {
  const [report, setReport] = React.useState(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const queryClient = useQueryClient();

  const { data: logs } = useQuery({
    queryKey: ['aar-logs', eventId],
    queryFn: () => eventId ? base44.entities.EventLog.filter({ event_id: eventId }, '-timestamp', 100) : [],
    enabled: !!eventId,
    initialData: []
  });

  const generateReport = async () => {
    if (!eventId) return;

    setIsGenerating(true);
    try {
      const logSummary = logs.map(l => `[${l.type}] ${l.summary}`).join('\n');

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional After Action Report (AAR) for the operation: "${eventTitle}".
        
        Operation Logs:
        ${logSummary}
        
        Format the response as a professional military AAR with sections:
        1. EXECUTIVE SUMMARY (2-3 sentences)
        2. SITUATION (what was the operation)
        3. ANALYSIS (what went well, what could improve)
        4. RECOMMENDATIONS (3-4 actionable next steps)
        5. LESSONS LEARNED (key takeaways)
        
        Use military operational language. Be objective and constructive.`,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            situation: { type: 'string' },
            analysis: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, improvements: { type: 'array', items: { type: 'string' } } } },
            recommendations: { type: 'array', items: { type: 'string' } },
            lessons_learned: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      if (aiResponse?.data) {
        setReport(aiResponse.data);
        await base44.entities.EventReport.create({
          event_id: eventId,
          report_type: 'AAR',
          title: `AAR: ${eventTitle}`,
          content: JSON.stringify(aiResponse.data, null, 2),
          generated_by: 'AI_SYSTEM',
          key_findings: aiResponse.data.lessons_learned || [],
          log_count: logs.length
        });
        toast.success('AAR GENERATED');
      }
    } catch (err) {
      toast.error('AAR GENERATION FAILED');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!report) return;

    const element = document.getElementById('aar-content');
    const canvas = await html2canvas(element, { backgroundColor: '#09090b' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 277);
    pdf.save(`AAR_${eventTitle}_${Date.now()}.pdf`);
    toast.success('PDF DOWNLOADED');
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <FileText className="w-3 h-3" />
          AFTER ACTION REPORT
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-3">
        {!report ? (
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full bg-purple-900 hover:bg-purple-800 text-white text-xs h-7"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                GENERATING...
              </>
            ) : (
              <>
                <FileText className="w-3 h-3 mr-1" />
                GENERATE AAR
              </>
            )}
          </Button>
        ) : (
          <div id="aar-content" className="space-y-3 text-[9px]">
            {report.executive_summary && (
              <div>
                <div className="font-bold text-zinc-400 uppercase mb-1">EXECUTIVE SUMMARY</div>
                <p className="text-zinc-300">{report.executive_summary}</p>
              </div>
            )}

            {report.situation && (
              <div>
                <div className="font-bold text-zinc-400 uppercase mb-1">SITUATION</div>
                <p className="text-zinc-300">{report.situation}</p>
              </div>
            )}

            {report.analysis && (
              <div>
                <div className="font-bold text-zinc-400 uppercase mb-1">ANALYSIS</div>
                {report.analysis.strengths && (
                  <div className="mb-1">
                    <div className="text-emerald-400 text-[8px] font-bold">STRENGTHS:</div>
                    <ul className="text-zinc-300 ml-2 space-y-0.5">
                      {report.analysis.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
                {report.analysis.improvements && (
                  <div>
                    <div className="text-amber-400 text-[8px] font-bold">AREAS FOR IMPROVEMENT:</div>
                    <ul className="text-zinc-300 ml-2 space-y-0.5">
                      {report.analysis.improvements.map((i, idx) => <li key={idx}>• {i}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {report.recommendations && (
              <div>
                <div className="font-bold text-zinc-400 uppercase mb-1">RECOMMENDATIONS</div>
                <ol className="text-zinc-300 ml-2 space-y-0.5">
                  {report.recommendations.map((r, i) => <li key={i}>{i + 1}. {r}</li>)}
                </ol>
              </div>
            )}

            <Button
              onClick={downloadPDF}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs h-6 mt-2"
            >
              <Download className="w-3 h-3 mr-1" />
              EXPORT PDF
            </Button>
          </div>
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}