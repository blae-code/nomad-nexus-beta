import React, { useState, useEffect } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye } from 'lucide-react';
import ReportFilters from '@/components/reports/ReportFilters';
import ReportPreview from '@/components/reports/ReportPreview';

export default function ReportBuilder() {
  const [filters, setFilters] = useState({
    reportType: 'operations',
    dateRange: 'last_30_days',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    eventTypes: [],
    includeMembers: true,
    includeAssets: true,
    includeRiskAssessment: true,
    memberStatus: 'all',
  });

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await invokeMemberFunction('generateReport', { filters });
      setReport(response.data);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    let csv = `Report Generated: ${new Date().toLocaleString()}\n\n`;

    if (report.summary) {
      csv += `SUMMARY\n`;
      csv += `Operations: ${report.summary.total_operations}\n`;
      csv += `Members: ${report.summary.total_members}\n`;
      csv += `Assets: ${report.summary.total_assets}\n\n`;
    }

    if (report.events && report.events.length > 0) {
      csv += `OPERATIONS\n`;
      csv += `Title,Type,Status,Priority,Participants,Assets,Risk Level\n`;
      report.events.forEach((e) => {
        csv += `"${e.title}","${e.event_type}","${e.status}","${e.priority}",${e.assigned_user_ids?.length || 0},${e.assigned_asset_ids?.length || 0},"${e.risk_level || 'N/A'}"\n`;
      });
      csv += '\n';
    }

    if (report.members && report.members.length > 0) {
      csv += `MEMBERS\n`;
      csv += `Name,Rank,Roles,Operations Count\n`;
      report.members.forEach((m) => {
        csv += `"${m.full_name}","${m.rank || 'VAGRANT'}","${m.roles?.join('; ') || 'None'}",${m.operations_count || 0}\n`;
      });
      csv += '\n';
    }

    if (report.assets && report.assets.length > 0) {
      csv += `FLEET ASSETS\n`;
      csv += `Name,Model,Status,Location,Deployments\n`;
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

      // Header
      doc.setFontSize(16);
      doc.text('Operation Report', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 8;

      // Summary
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

      // Events Section
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
        yPos += 5;
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
      console.error('Failed to export PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Report Builder</h1>
          <p className="text-zinc-400 text-sm">Generate custom reports with comprehensive analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Filters */}
        <div className="col-span-1">
          <ReportFilters filters={filters} onFiltersChange={setFilters} onGenerate={generateReport} generating={loading} />
        </div>

        {/* Preview */}
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
    </div>
  );
}
