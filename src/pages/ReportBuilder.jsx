import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Download, Save, CalendarClock, Mail, Send, Clock3 } from 'lucide-react';
import ReportFilters from '@/components/reports/ReportFilters';
import ReportPreview from '@/components/reports/ReportPreview';

function text(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeStoredFilters(rawFilters, fallbackFilters) {
  if (!rawFilters || typeof rawFilters !== 'object') return fallbackFilters;
  return {
    ...fallbackFilters,
    ...rawFilters,
    startDate: rawFilters.startDate ? new Date(rawFilters.startDate) : fallbackFilters.startDate,
    endDate: rawFilters.endDate ? new Date(rawFilters.endDate) : fallbackFilters.endDate,
  };
}

export default function ReportBuilder() {
  const initialFilters = useMemo(
    () => ({
      reportType: 'operations',
      dateRange: 'last_30_days',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      eventTypes: [],
      includeMembers: true,
      includeAssets: true,
      includeRiskAssessment: true,
      memberStatus: 'all',
    }),
    []
  );

  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');

  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    templateName: '',
    description: '',
    visibility: 'private',
  });
  const [scheduleForm, setScheduleForm] = useState({
    reportName: 'Weekly Operations Report',
    cadence: 'weekly',
    nextRunAt: '',
    memberProfileIds: '',
    emailRecipients: '',
  });
  const [distributionForm, setDistributionForm] = useState({
    subject: 'Operations Report',
    message: 'A new report is ready for review.',
    memberProfileIds: '',
    emailRecipients: '',
  });
  const [banner, setBanner] = useState(null);

  const serializeFilters = () => ({
    ...filters,
    startDate: filters.startDate ? new Date(filters.startDate).toISOString() : null,
    endDate: filters.endDate ? new Date(filters.endDate).toISOString() : null,
  });

  const loadAutomationRecords = async () => {
    setRecordsLoading(true);
    try {
      const logs = await base44.entities.EventLog.list('-created_date', 400);
      const rows = Array.isArray(logs) ? logs : [];
      setTemplates(
        rows.filter((entry) => String(entry?.type || '').toUpperCase() === 'REPORT_TEMPLATE_SAVED')
      );
      setSchedules(
        rows.filter((entry) => String(entry?.type || '').toUpperCase() === 'REPORT_SCHEDULED')
      );
      setDistributions(
        rows.filter((entry) => String(entry?.type || '').toUpperCase() === 'REPORT_DISTRIBUTION_SENT')
      );
    } catch (error) {
      setBanner({ tone: 'error', message: `Failed to load automation records: ${error.message}` });
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadAutomationRecords();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setBanner(null);
    try {
      const response = await invokeMemberFunction('generateReport', { filters });
      setReport(response.data);
      setBanner({ tone: 'success', message: 'Report generated.' });
    } catch (error) {
      setBanner({ tone: 'error', message: `Failed to generate report: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    let csv = `Report Generated: ${new Date().toLocaleString()}\n\n`;

    if (report.summary) {
      csv += 'SUMMARY\n';
      csv += `Operations: ${report.summary.total_operations}\n`;
      csv += `Members: ${report.summary.total_members}\n`;
      csv += `Assets: ${report.summary.total_assets}\n\n`;
    }

    if (report.events && report.events.length > 0) {
      csv += 'OPERATIONS\n';
      csv += 'Title,Type,Status,Priority,Participants,Assets,Risk Level\n';
      report.events.forEach((e) => {
        csv += `"${e.title}","${e.event_type}","${e.status}","${e.priority}",${e.assigned_user_ids?.length || 0},${e.assigned_asset_ids?.length || 0},"${e.risk_level || 'N/A'}"\n`;
      });
      csv += '\n';
    }

    if (report.members && report.members.length > 0) {
      csv += 'MEMBERS\n';
      csv += 'Name,Rank,Roles,Operations Count\n';
      report.members.forEach((m) => {
        csv += `"${m.full_name}","${m.rank || 'VAGRANT'}","${m.roles?.join('; ') || 'None'}",${m.operations_count || 0}\n`;
      });
      csv += '\n';
    }

    if (report.assets && report.assets.length > 0) {
      csv += 'FLEET ASSETS\n';
      csv += 'Name,Model,Status,Location,Deployments\n';
      report.assets.forEach((a) => {
        csv += `"${a.name}","${a.model}","${a.status}","${a.location || 'Unknown'}",${a.deployments || 0}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportToPDF = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(16);
      doc.text('Operation Report', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 8;

      if (report.summary) {
        doc.setFontSize(12);
        doc.text('Summary', 20, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.text(`Total Operations: ${report.summary.total_operations}`, 25, yPos);
        yPos += 5;
        doc.text(`Total Members: ${report.summary.total_members}`, 25, yPos);
        yPos += 5;
        doc.text(`Total Assets: ${report.summary.total_assets}`, 25, yPos);
        yPos += 10;
      }

      if (report.events && report.events.length > 0) {
        doc.setFontSize(12);
        doc.text('Operations', 20, yPos);
        yPos += 7;

        doc.setFontSize(9);
        report.events.forEach((e) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.text(`${e.title} (${e.status})`, 25, yPos);
          yPos += 5;
          doc.setFontSize(8);
          doc.text(`Type: ${e.event_type} | Priority: ${e.priority}`, 30, yPos);
          yPos += 4;
          doc.text(`Participants: ${e.assigned_user_ids?.length || 0} | Assets: ${e.assigned_asset_ids?.length || 0}`, 30, yPos);
          yPos += 7;
          doc.setFontSize(9);
        });
      }

      const blob = doc.output('blob');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setBanner({ tone: 'error', message: `Failed to export PDF: ${error.message}` });
    } finally {
      setExporting(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateForm.templateName.trim()) return;
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateReportBuilder', {
        action: 'save_template',
        templateName: templateForm.templateName.trim(),
        description: templateForm.description.trim(),
        visibility: templateForm.visibility,
        filters: serializeFilters(),
      });

      if (response?.data?.success) {
        setTemplateForm({ templateName: '', description: '', visibility: 'private' });
        setBanner({ tone: 'success', message: 'Template saved.' });
        await loadAutomationRecords();
      } else {
        setBanner({ tone: 'error', message: response?.data?.error || 'Template save failed.' });
      }
    } catch (error) {
      setBanner({ tone: 'error', message: `Template save failed: ${error.message}` });
    }
  };

  const scheduleReport = async () => {
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateReportBuilder', {
        action: 'schedule_report',
        reportName: text(scheduleForm.reportName, 'Scheduled Report'),
        cadence: scheduleForm.cadence,
        nextRunAt: scheduleForm.nextRunAt || null,
        memberProfileIds: scheduleForm.memberProfileIds,
        emailRecipients: scheduleForm.emailRecipients,
        filters: serializeFilters(),
      });

      if (response?.data?.success) {
        setBanner({ tone: 'success', message: 'Report schedule saved.' });
        await loadAutomationRecords();
      } else {
        setBanner({ tone: 'error', message: response?.data?.error || 'Schedule failed.' });
      }
    } catch (error) {
      setBanner({ tone: 'error', message: `Schedule failed: ${error.message}` });
    }
  };

  const sendDistribution = async () => {
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateReportBuilder', {
        action: 'send_distribution',
        subject: text(distributionForm.subject, 'Operations Report'),
        message: text(distributionForm.message, 'A report is ready for review.'),
        memberProfileIds: distributionForm.memberProfileIds,
        emailRecipients: distributionForm.emailRecipients,
      });

      if (response?.data?.success) {
        setBanner({
          tone: 'success',
          message: `Distribution sent (${response.data?.distribution?.delivered_to_members || 0} in-app, ${response.data?.distribution?.queued_emails || 0} email queued).`,
        });
        await loadAutomationRecords();
      } else {
        setBanner({ tone: 'error', message: response?.data?.error || 'Distribution failed.' });
      }
    } catch (error) {
      setBanner({ tone: 'error', message: `Distribution failed: ${error.message}` });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Report Builder</h1>
          <p className="text-zinc-400 text-sm">Generate, template, schedule, and distribute command reports</p>
        </div>
      </div>

      {banner && (
        <div
          className={`mb-5 p-3 rounded border text-sm ${
            banner.tone === 'success'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {banner.message}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder">
            <FileText className="w-4 h-4 mr-2" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Save className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="automation">
            <CalendarClock className="w-4 h-4 mr-2" />
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <ReportFilters filters={filters} onFiltersChange={setFilters} onGenerate={generateReport} generating={loading} />
            </div>

            <div className="col-span-2">
              {!report ? (
                <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded p-8 flex flex-col items-center justify-center h-96">
                  <FileText className="w-12 h-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-400 text-center">Configure filters and generate a report to preview here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ReportPreview report={report} />
                  <div className="flex gap-3">
                    <Button onClick={exportToCSV} variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button onClick={exportToPDF} disabled={exporting} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      {exporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 space-y-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Save Template</h3>
              <Input
                value={templateForm.templateName}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, templateName: e.target.value }))}
                placeholder="Template name"
                aria-label="Template name"
              />
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Template description"
                aria-label="Template description"
              />
              <select
                value={templateForm.visibility}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, visibility: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
                aria-label="Template visibility"
              >
                <option value="private">Private</option>
                <option value="shared">Shared</option>
              </select>
              <Button onClick={saveTemplate} disabled={!templateForm.templateName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save Current Filters
              </Button>
            </div>

            <div className="col-span-2 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Template Library</h3>
                <Button size="sm" variant="outline" onClick={loadAutomationRecords} disabled={recordsLoading}>
                  Refresh
                </Button>
              </div>
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {templates.length === 0 ? (
                  <div className="text-sm text-zinc-500 text-center py-10 border border-dashed border-zinc-700 rounded">
                    No templates yet.
                  </div>
                ) : (
                  templates.map((entry) => {
                    const details = entry?.details || {};
                    return (
                      <div key={entry.id} className="p-3 border border-zinc-700 rounded bg-zinc-900/40 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{details?.name || 'Template'}</div>
                            <div className="text-[11px] text-zinc-500">{details?.description || 'No description provided'}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const nextFilters = normalizeStoredFilters(details?.filters, initialFilters);
                              setFilters(nextFilters);
                              setActiveTab('builder');
                              setBanner({ tone: 'success', message: `Template applied: ${details?.name || 'Template'}` });
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Created {entry?.created_date ? new Date(entry.created_date).toLocaleString() : 'Unknown time'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scheduled Reports</h3>
                <Clock3 className="w-4 h-4 text-orange-400" />
              </div>
              <Input
                value={scheduleForm.reportName}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, reportName: e.target.value }))}
                placeholder="Report name"
                aria-label="Scheduled report name"
              />
              <select
                value={scheduleForm.cadence}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, cadence: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
                aria-label="Schedule cadence"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="on_demand">On demand</option>
              </select>
              <Input
                type="datetime-local"
                value={scheduleForm.nextRunAt}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, nextRunAt: e.target.value }))}
                aria-label="Next run time"
              />
              <Input
                value={scheduleForm.memberProfileIds}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, memberProfileIds: e.target.value }))}
                placeholder="Member profile IDs (comma-separated)"
                aria-label="Member profile recipients"
              />
              <Input
                value={scheduleForm.emailRecipients}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, emailRecipients: e.target.value }))}
                placeholder="Email recipients (comma-separated)"
                aria-label="Email recipients"
              />
              <Button onClick={scheduleReport}>
                <CalendarClock className="w-4 h-4 mr-2" />
                Save Schedule
              </Button>

              <div className="space-y-2 border-t border-zinc-800 pt-3">
                {schedules.slice(0, 4).map((entry) => {
                  const details = entry?.details || {};
                  return (
                    <div key={entry.id} className="p-2 bg-zinc-900/40 border border-zinc-800 rounded text-xs text-zinc-300">
                      <div className="font-semibold text-white">{details?.report_name || 'Scheduled Report'}</div>
                      <div className="text-zinc-500 mt-1">
                        {details?.cadence || 'weekly'} · next run{' '}
                        {details?.next_run_at ? new Date(details.next_run_at).toLocaleString() : 'unspecified'}
                      </div>
                    </div>
                  );
                })}
                {schedules.length === 0 && (
                  <div className="text-xs text-zinc-500">No scheduled reports logged yet.</div>
                )}
              </div>
            </div>

            <div className="space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Email Distribution</h3>
                <Mail className="w-4 h-4 text-cyan-400" />
              </div>
              <Input
                value={distributionForm.subject}
                onChange={(e) => setDistributionForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Distribution subject"
                aria-label="Distribution subject"
              />
              <Input
                value={distributionForm.message}
                onChange={(e) => setDistributionForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Distribution message"
                aria-label="Distribution message"
              />
              <Input
                value={distributionForm.memberProfileIds}
                onChange={(e) => setDistributionForm((prev) => ({ ...prev, memberProfileIds: e.target.value }))}
                placeholder="Member profile IDs (comma-separated)"
                aria-label="In-app distribution targets"
              />
              <Input
                value={distributionForm.emailRecipients}
                onChange={(e) => setDistributionForm((prev) => ({ ...prev, emailRecipients: e.target.value }))}
                placeholder="Email recipients (comma-separated)"
                aria-label="Email distribution targets"
              />
              <Button onClick={sendDistribution}>
                <Send className="w-4 h-4 mr-2" />
                Dispatch Report
              </Button>

              <div className="space-y-2 border-t border-zinc-800 pt-3">
                {distributions.slice(0, 4).map((entry) => {
                  const details = entry?.details || {};
                  return (
                    <div key={entry.id} className="p-2 bg-zinc-900/40 border border-zinc-800 rounded text-xs text-zinc-300">
                      <div className="font-semibold text-white">{details?.subject || 'Report Distribution'}</div>
                      <div className="text-zinc-500 mt-1">
                        {Number(details?.delivered_to_members || 0)} in-app · {Number(details?.queued_emails || 0)} email queued
                      </div>
                    </div>
                  );
                })}
                {distributions.length === 0 && (
                  <div className="text-xs text-zinc-500">No distribution logs yet.</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
