import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Archive, BookOpen, FileText, Search, User, Wrench } from 'lucide-react';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

const DEFAULT_KNOWLEDGE_FORM = {
  title: '',
  content: '',
  category: 'general',
  tags: '',
};

const DEFAULT_DOCUMENT_FORM = {
  title: '',
  content: '',
  documentType: 'VAULT',
  tags: '',
};

function asDateLabel(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function asList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasCuratorAccess(member) {
  const rank = String(member?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank) || Boolean(member?.is_admin)) return true;
  const roles = Array.isArray(member?.roles)
    ? member.roles.map((role) => String(role || '').toLowerCase())
    : [];
  return roles.includes('admin') || roles.includes('command') || roles.includes('archivist') || roles.includes('intel');
}

function parseVaultData(logs, reports) {
  const logList = Array.isArray(logs) ? logs : [];
  const reportList = Array.isArray(reports) ? reports : [];

  const knowledge = logList
    .filter((entry) => String(entry?.type || '').toUpperCase() === 'DATA_VAULT_KNOWLEDGE')
    .map((entry) => ({
      id: entry.id,
      recordType: 'event_log',
      title: entry?.details?.title || entry.summary || 'Knowledge Entry',
      content: entry?.details?.content || '',
      category: entry?.details?.category || 'general',
      tags: Array.isArray(entry?.details?.tags) ? entry.details.tags : [],
      actorMemberId: entry?.actor_member_profile_id || entry?.details?.created_by_member_profile_id || null,
      createdAt: entry.created_date || entry?.details?.created_at || null,
    }));

  const archiveStateMap = new Map();
  for (const entry of logList) {
    if (String(entry?.type || '').toUpperCase() !== 'DATA_VAULT_ARCHIVE_STATE') continue;
    const details = entry?.details || {};
    const recordType = String(details?.record_type || '').toLowerCase() === 'event_log' ? 'event_log' : 'event_report';
    const recordId = String(details?.record_id || '');
    if (!recordId) continue;
    const status = String(details?.status || 'archived').toLowerCase();
    const at = new Date(entry?.created_date || 0).getTime();
    const key = `${recordType}:${recordId}`;
    const existing = archiveStateMap.get(key);
    if (!existing || at >= existing.at) {
      archiveStateMap.set(key, { status, at });
    }
  }

  const documentMeta = new Map();
  for (const entry of logList) {
    if (String(entry?.type || '').toUpperCase() !== 'DATA_VAULT_DOCUMENT') continue;
    const details = entry?.details || {};
    const docId = String(details?.document_id || '');
    if (!docId) continue;
    documentMeta.set(docId, details);
  }

  const documents = reportList.map((report) => {
    const meta = documentMeta.get(report.id) || {};
    return {
      id: report.id,
      recordType: 'event_report',
      title: meta?.title || report?.title || report?.report_type || `Report ${report.id}`,
      content: report?.content || report?.summary || '',
      category: report?.report_type || meta?.report_type || 'VAULT',
      tags: Array.isArray(meta?.tags) ? meta.tags : [],
      actorMemberId: report?.author_id || report?.created_by_member_profile_id || null,
      createdAt: report?.created_date || report?.generated_at || null,
    };
  });

  const exports = logList
    .filter((entry) => String(entry?.type || '').toUpperCase() === 'DATA_VAULT_EXPORT')
    .map((entry) => ({
      id: entry.id,
      actorMemberId: entry?.actor_member_profile_id || null,
      details: entry?.details || {},
      createdAt: entry?.created_date || null,
    }));

  const allRecords = [...documents, ...knowledge].map((record) => {
    const key = `${record.recordType}:${record.id}`;
    const archiveState = archiveStateMap.get(key);
    return {
      ...record,
      archived: archiveState?.status === 'archived',
    };
  });

  return {
    documents,
    knowledge,
    exports,
    allRecords,
    archiveStateMap,
  };
}

export default function DataVault() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const curatorAccess = useMemo(() => hasCuratorAccess(member), [member]);
  const [tab, setTab] = useState('search');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [archiveFilter, setArchiveFilter] = useState('all');
  const [autoArchiveDays, setAutoArchiveDays] = useState('30');
  const [knowledgeForm, setKnowledgeForm] = useState(DEFAULT_KNOWLEDGE_FORM);
  const [documentForm, setDocumentForm] = useState(DEFAULT_DOCUMENT_FORM);

  const { documents, knowledge, exports, allRecords } = useMemo(
    () => parseVaultData(eventLogs, reports),
    [eventLogs, reports]
  );

  const filteredRecords = useMemo(() => {
    const q = query.toLowerCase();
    return allRecords.filter((record) => {
      if (typeFilter !== 'all' && record.recordType !== typeFilter) return false;
      if (archiveFilter === 'archived' && !record.archived) return false;
      if (archiveFilter === 'active' && record.archived) return false;
      if (!q) return true;
      const haystack = [
        record.title,
        record.content,
        record.category,
        ...(Array.isArray(record.tags) ? record.tags : []),
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [allRecords, query, typeFilter, archiveFilter]);

  const analytics = useMemo(() => {
    const categories = {};
    for (const entry of knowledge) {
      const key = String(entry.category || 'general').toLowerCase();
      categories[key] = (categories[key] || 0) + 1;
    }
    return {
      totalRecords: allRecords.length,
      documents: documents.length,
      knowledge: knowledge.length,
      archived: allRecords.filter((record) => record.archived).length,
      active: allRecords.filter((record) => !record.archived).length,
      categories,
    };
  }, [allRecords, documents, knowledge]);

  const personalStats = useMemo(() => {
    const memberId = member?.id;
    if (!memberId) {
      return {
        authoredKnowledge: 0,
        authoredDocuments: 0,
        archiveActions: 0,
        exports: 0,
      };
    }
    const archiveActions = eventLogs.filter((entry) => {
      if (String(entry?.type || '').toUpperCase() !== 'DATA_VAULT_ARCHIVE_STATE') return false;
      return String(entry?.actor_member_profile_id || '') === String(memberId);
    }).length;
    return {
      authoredKnowledge: knowledge.filter((entry) => String(entry.actorMemberId || '') === String(memberId)).length,
      authoredDocuments: documents.filter((entry) => String(entry.actorMemberId || '') === String(memberId)).length,
      archiveActions,
      exports: exports.filter((entry) => String(entry.actorMemberId || '') === String(memberId)).length,
    };
  }, [documents, eventLogs, exports, knowledge, member?.id]);

  const loadVault = async () => {
    setLoading(true);
    try {
      const [logList, reportList] = await Promise.all([
        base44.entities.EventLog.list('-created_date', 600).catch(() => []),
        base44.entities.EventReport.list('-created_date', 500).catch(() => []),
      ]);
      setEventLogs(logList || []);
      setReports(reportList || []);
    } catch (error) {
      console.error('DataVault load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load Data Vault data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  const runAction = async (payload, successMessage) => {
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateDataVault', payload);
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'Data Vault update failed.' });
      } else {
        setBanner({ type: 'success', message: successMessage || 'Data Vault updated.' });
      }
      await loadVault();
      return result;
    } catch (error) {
      console.error('DataVault action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Data Vault update failed.' });
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const submitKnowledge = async () => {
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return;
    const result = await runAction(
      {
        action: 'create_knowledge_entry',
        title: knowledgeForm.title.trim(),
        content: knowledgeForm.content.trim(),
        category: knowledgeForm.category.trim(),
        tags: asList(knowledgeForm.tags),
      },
      'Knowledge entry stored.'
    );
    if (result?.success) setKnowledgeForm(DEFAULT_KNOWLEDGE_FORM);
  };

  const submitDocument = async () => {
    if (!documentForm.title.trim() || !documentForm.content.trim()) return;
    const result = await runAction(
      {
        action: 'create_document',
        title: documentForm.title.trim(),
        content: documentForm.content.trim(),
        documentType: documentForm.documentType.trim() || 'VAULT',
        tags: asList(documentForm.tags),
      },
      'Document stored.'
    );
    if (result?.success) setDocumentForm(DEFAULT_DOCUMENT_FORM);
  };

  const toggleArchive = async (record) => {
    const action = record.archived ? 'unarchive_record' : 'archive_record';
    await runAction(
      {
        action,
        recordType: record.recordType,
        recordId: record.id,
        reason: record.archived ? 'Manual restore from archive search' : 'Manual archive from search',
      },
      record.archived ? 'Record restored.' : 'Record archived.'
    );
  };

  const runAutoArchive = async () => {
    await runAction(
      {
        action: 'run_auto_archive',
        days: Number(autoArchiveDays || 30),
      },
      'Auto-archive run completed.'
    );
  };

  const exportCurrentViewPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Nomad Nexus Data Vault Export', 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);
      doc.text(`Records: ${filteredRecords.length}`, 14, 29);
      let y = 38;
      for (const record of filteredRecords.slice(0, 60)) {
        if (y > 280) {
          doc.addPage();
          y = 18;
        }
        const line = `${record.recordType.toUpperCase()} | ${record.archived ? 'ARCHIVED' : 'ACTIVE'} | ${record.title}`;
        doc.text(line.slice(0, 160), 14, y);
        y += 6;
      }
      doc.save(`data_vault_export_${Date.now()}.pdf`);
      await runAction(
        {
          action: 'log_export',
          format: 'pdf',
          recordCount: filteredRecords.length,
        },
        'Export generated.'
      );
    } catch (error) {
      console.error('DataVault export failed:', error);
      setBanner({ type: 'error', message: 'Failed to generate PDF export.' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading Data Vault...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Data Vault</h1>
          <p className="text-zinc-400 text-sm">Knowledge archive, search system, analytics, archival controls, personal stats, and PDF exports</p>
          <div className="text-[10px] text-zinc-500 uppercase mt-2">Curator Access: <span className={curatorAccess ? 'text-green-400' : 'text-zinc-400'}>{curatorAccess ? 'Granted' : 'Restricted'}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('ReportBuilder')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Report Builder</a>
          <a href={createPageUrl('IntelNexus')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Intel</a>
        </div>
      </div>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`inline-flex rounded border px-3 py-1 text-xs ${
            banner.type === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-green-500/40 text-green-300 bg-green-500/10'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Records</div><div className="text-lg font-bold text-cyan-300">{analytics.totalRecords}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Documents</div><div className="text-lg font-bold text-orange-300">{analytics.documents}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Knowledge</div><div className="text-lg font-bold text-yellow-300">{analytics.knowledge}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Archived</div><div className="text-lg font-bold text-green-300">{analytics.archived}</div></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="search">Archive Search</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="authoring">Knowledge & Documents</TabsTrigger>
          <TabsTrigger value="archive">Auto-Archival</TabsTrigger>
          <TabsTrigger value="personal">Personal Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content, category, tags..." />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="all">All types</option>
                <option value="event_report">Documents</option>
                <option value="event_log">Knowledge</option>
              </select>
              <select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)} className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="archived">Archived only</option>
              </select>
              <Button variant="outline" onClick={exportCurrentViewPdf} disabled={actionBusy}>Export PDF</Button>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <div className="text-xs text-zinc-500">No records found for current search/filter.</div>
              ) : (
                filteredRecords.map((record) => (
                  <div key={`${record.recordType}:${record.id}`} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{record.title}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{record.recordType === 'event_report' ? 'Document' : 'Knowledge'} · {record.category || 'general'} · {record.archived ? 'archived' : 'active'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{asDateLabel(record.createdAt)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleArchive(record)}
                          disabled={actionBusy || !curatorAccess}
                        >
                          {record.archived ? 'Restore' : 'Archive'}
                        </Button>
                      </div>
                    </div>
                    {record.content && <div className="text-xs text-zinc-300 mt-1 whitespace-pre-wrap">{String(record.content).slice(0, 280)}</div>}
                    {Array.isArray(record.tags) && record.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {record.tags.map((tag) => (
                          <span key={`${record.id}-${tag}`} className="text-[10px] border border-zinc-700 rounded px-2 py-0.5 text-zinc-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Search className="w-3 h-3" />Analytics Dashboard</div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300">Active records: {analytics.active}</div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300">Archived records: {analytics.archived}</div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300">Total exports logged: {exports.length}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><BookOpen className="w-3 h-3" />Knowledge Categories</div>
              {Object.keys(analytics.categories).length === 0 ? (
                <div className="text-xs text-zinc-500">No category stats yet.</div>
              ) : (
                Object.entries(analytics.categories).map(([category, count]) => (
                  <div key={category} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 flex items-center justify-between">
                    <span className="text-xs text-zinc-300 uppercase">{category}</span>
                    <span className="text-xs text-orange-300 font-semibold">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="authoring" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><BookOpen className="w-3 h-3" />Knowledge Base</div>
              <Input value={knowledgeForm.title} onChange={(event) => setKnowledgeForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Knowledge title" />
              <Input value={knowledgeForm.category} onChange={(event) => setKnowledgeForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" />
              <Input value={knowledgeForm.tags} onChange={(event) => setKnowledgeForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
              <Textarea value={knowledgeForm.content} onChange={(event) => setKnowledgeForm((prev) => ({ ...prev, content: event.target.value }))} className="min-h-[120px]" placeholder="Knowledge body" />
              <Button onClick={submitKnowledge} disabled={actionBusy || !knowledgeForm.title.trim() || !knowledgeForm.content.trim()}>Store Knowledge</Button>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><FileText className="w-3 h-3" />Document Storage</div>
              <Input value={documentForm.title} onChange={(event) => setDocumentForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Document title" />
              <Input value={documentForm.documentType} onChange={(event) => setDocumentForm((prev) => ({ ...prev, documentType: event.target.value }))} placeholder="Document type" />
              <Input value={documentForm.tags} onChange={(event) => setDocumentForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
              <Textarea value={documentForm.content} onChange={(event) => setDocumentForm((prev) => ({ ...prev, content: event.target.value }))} className="min-h-[120px]" placeholder="Document content" />
              <Button onClick={submitDocument} disabled={actionBusy || !documentForm.title.trim() || !documentForm.content.trim()}>Store Document</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Archive className="w-3 h-3" />Auto-Archival</div>
            <div className="grid grid-cols-3 gap-2 max-w-xl">
              <Input type="number" value={autoArchiveDays} onChange={(event) => setAutoArchiveDays(event.target.value)} placeholder="Days threshold" />
              <Button onClick={runAutoArchive} disabled={actionBusy || !curatorAccess}>Run Auto-Archive</Button>
            </div>
            {!curatorAccess && <div className="text-[10px] text-zinc-500">Curator privileges required.</div>}
            <div className="text-xs text-zinc-400">
              Auto-archive creates immutable archive-state records for stale documents and can be reversed from Archive Search.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><User className="w-3 h-3" />Personal Statistics Dashboard</div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300">Knowledge contributions: {personalStats.authoredKnowledge}</div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300">Document contributions: {personalStats.authoredDocuments}</div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300">Archive actions: {personalStats.archiveActions}</div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300">Exports generated: {personalStats.exports}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Wrench className="w-3 h-3" />Export Reports as PDFs</div>
              <div className="text-xs text-zinc-400">Exports include the current search/filter view and write an auditable export record to the vault.</div>
              <Button onClick={exportCurrentViewPdf} disabled={actionBusy}>Export Current View PDF</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
