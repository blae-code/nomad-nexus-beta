/**
 * AccessKeyAuditLog — View and filter audit trail for access key operations
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { History, Filter, X, Download } from 'lucide-react';

export default function AccessKeyAuditLog({ keyId = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: 'ALL',
    dateFrom: '',
    dateTo: '',
    user: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      let query = keyId ? { access_key_id: keyId } : {};
      const auditLogs = await base44.entities.AccessKeyAudit.list('-timestamp', 100);
      setLogs(auditLogs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const actionMatch = filters.action === 'ALL' || log.action === filters.action;
    const userMatch = !filters.user || log.performed_by_name?.toLowerCase().includes(filters.user.toLowerCase());
    
    const logDate = new Date(log.timestamp);
    const dateFromMatch = !filters.dateFrom || logDate >= new Date(filters.dateFrom);
    const dateToMatch = !filters.dateTo || logDate <= new Date(filters.dateTo);

    return actionMatch && userMatch && dateFromMatch && dateToMatch;
  });

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE':
        return 'text-green-400 bg-green-500/20';
      case 'REVOKE':
        return 'text-red-400 bg-red-500/20';
      case 'REDEEM':
        return 'text-blue-400 bg-blue-500/20';
      case 'MODIFY':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/20';
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Timestamp', 'Action', 'Performed By', 'Key ID', 'Details', 'IP Address'].join(','),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          log.action,
          log.performed_by_name,
          log.access_key_id,
          JSON.stringify(log.details || {}),
          log.ip_address || 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-key-audit-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="text-zinc-400">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-orange-400" />
          <h3 className="font-bold text-orange-400">Audit Log</h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-orange-600' : ''}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="text-zinc-400 hover:text-orange-400"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="REVOKE">Revoke</option>
                <option value="REDEEM">Redeem</option>
                <option value="MODIFY">Modify</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">User</label>
              <Input
                type="text"
                placeholder="Filter by user..."
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                className="h-8 text-xs bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="h-8 text-xs bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="h-8 text-xs bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilters({ action: 'ALL', dateFrom: '', dateTo: '', user: '' })}
            className="w-full text-xs"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">No audit logs found</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-3 bg-zinc-900/40 border border-zinc-700/30 rounded text-xs">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-zinc-400">{log.performed_by_name}</span>
                </div>
                <span className="text-zinc-600">
                  {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </span>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="text-zinc-500 text-xs ml-2 p-2 bg-zinc-950/50 rounded border border-zinc-800">
                  {Object.entries(log.details).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="text-xs text-zinc-600 text-center">
        Showing {filteredLogs.length} of {logs.length} entries
      </div>
    </div>
  );
}