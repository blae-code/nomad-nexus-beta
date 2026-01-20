import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Loader2, AlertCircle, Radio, Activity, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { typographyClasses } from '@/components/utils/typography';
import { motionLogEntry } from '@/components/utils/motionSystem';

const typeIcons = {
  STATUS: Activity,
  COMMS: Radio,
  RESCUE: AlertCircle,
  SYSTEM: Zap,
  NOTE: FileText
};

const severityColors = {
  LOW: 'text-zinc-500 border-zinc-700 bg-zinc-900/30',
  MEDIUM: 'text-amber-500 border-amber-900 bg-amber-950/30',
  HIGH: 'text-red-500 border-red-900 bg-red-950/30'
};

export default function EventTimeline({ eventId }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['event-logs', eventId],
    queryFn: () => base44.entities.EventLog.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId,
    refetchInterval: 5000
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) return;
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'NOTE',
        severity: 'LOW',
        summary: newNote.trim(),
        details: { note_type: 'user_note' }
      });
    },
    onSuccess: () => {
      setNewNote('');
      setIsAddingNote(false);
      queryClient.invalidateQueries({ queryKey: ['event-logs', eventId] });
    }
  });

  const filteredLogs = logs.filter(log => {
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
    return true;
  });

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide">Event Timeline</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingNote(!isAddingNote)}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        
        {/* Add Note Section */}
         <AnimatePresence>
           {isAddingNote && (
             <motion.div {...motionStateChange} className="p-3 border border-zinc-700 bg-zinc-950/50 rounded">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add operational note..."
              className="w-full text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 p-2 rounded"
              rows="2"
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => addNoteMutation.mutate()}
                disabled={!newNote.trim() || addNoteMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {addNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Note'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNote('');
                }}
              >
                Cancel
              </Button>
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="STATUS">Status</SelectItem>
              <SelectItem value="COMMS">Comms</SelectItem>
              <SelectItem value="RESCUE">Rescue</SelectItem>
              <SelectItem value="SYSTEM">System</SelectItem>
              <SelectItem value="NOTE">Note</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading timeline...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-sm">
            No events to display
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => {
                const Icon = typeIcons[log.type] || FileText;
                const timestamp = new Date(log.timestamp || log.created_date);
                return (
                  <motion.div
                    key={log.id}
                    {...motionLogEntry}
                    className={`p-3 border rounded text-xs ${severityColors[log.severity]}`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                         <div className={cn(typographyClasses.logContent, "text-zinc-100 truncate")}>{log.summary}</div>
                         <div className={cn(typographyClasses.logTimestamp, "mt-0.5")}>
                           {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                         </div>
                       </div>
                       <Badge variant="outline" className={cn(typographyClasses.netCodeSmall, "text-[8px] shrink-0")}>
                         {log.type}
                       </Badge>
                    </div>
                    {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                      <div className={cn(typographyClasses.logEntry, "mt-2 pl-5")}>
                        {Object.entries(log.details).slice(0, 2).map(([k, v]) => (
                          <div key={k} className={typographyClasses.timestamp}>{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}