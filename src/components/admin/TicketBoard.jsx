import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import TicketDetailModal from './TicketDetailModal';

/**
 * Kanban-style Ticket Board for Admin Console
 * Shows bug reports and feature requests with AI analysis
 */
export default function TicketBoard({ user }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['feedback-tickets'],
    queryFn: async () => {
      return await base44.entities.Feedback.list('-created_date', 100);
    },
    initialData: [],
    refetchInterval: 10000 // Refresh every 10s
  });

  const columns = {
    new: { label: 'New', color: 'bg-zinc-800/40', tickets: [] },
    investigating: { label: 'Investigating', color: 'bg-blue-900/20', tickets: [] },
    in_progress: { label: 'In Progress', color: 'bg-purple-900/20', tickets: [] },
    resolved: { label: 'Resolved', color: 'bg-emerald-900/20', tickets: [] },
    closed: { label: 'Closed', color: 'bg-zinc-700/40', tickets: [] }
  };

  // Organize tickets by status and filter
  const organizedTickets = useMemo(() => {
    const filtered = filterType === 'all' 
      ? tickets 
      : tickets.filter(t => t.type === filterType);

    filtered.forEach(ticket => {
      if (columns[ticket.status]) {
        columns[ticket.status].tickets.push(ticket);
      }
    });

    return columns;
  }, [tickets, filterType]);

  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'new').length,
    bugs: tickets.filter(t => t.type === 'bug_report').length,
    features: tickets.filter(t => t.type === 'feature_request').length
  };

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
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

  const typeIcon = (type) => {
    return type === 'bug_report' ? <AlertCircle className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />;
  };

  return (
    <div className="h-full bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800/40 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Feedback Tickets</h2>
            <p className="text-[8px] text-zinc-500 font-mono mt-0.5">Kanban board • User-reported bugs and features</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-[8px] font-mono">
          <Badge variant="outline" className="bg-zinc-900/40 text-zinc-400">
            {stats.total} Total
          </Badge>
          <Badge variant="outline" className="bg-red-950/40 border-red-700/50 text-red-300">
            {stats.bugs} Bugs
          </Badge>
          <Badge variant="outline" className="bg-blue-950/40 border-blue-700/50 text-blue-300">
            {stats.features} Features
          </Badge>
          <Badge variant="outline" className="bg-yellow-950/40 border-yellow-700/50 text-yellow-300">
            {stats.new} New
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {['all', 'bug_report', 'feature_request'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-2 py-1 text-[8px] font-mono font-bold uppercase transition-colors',
                filterType === type
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-zinc-900/40 border border-zinc-800/50 text-zinc-400 hover:text-zinc-300'
              )}
            >
              {type === 'all' ? 'All' : type === 'bug_report' ? 'Bugs' : 'Features'}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-3 gap-3 flex">
        {Object.entries(organizedTickets).map(([status, column]) => (
          <div key={status} className="shrink-0 w-80 flex flex-col">
            {/* Column Header */}
            <div className={cn('p-2 rounded-t', column.color)}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase">
                  {column.label}
                </span>
                <span className="text-[8px] font-mono text-zinc-500">
                  {column.tickets.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-zinc-900/20 rounded-b min-h-[200px]">
              {column.tickets.length === 0 ? (
                <div className="text-[8px] text-zinc-600 text-center py-4 font-mono">
                  — empty —
                </div>
              ) : (
                column.tickets.map((ticket) => (
                  <motion.button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className="w-full text-left p-2 bg-zinc-900/60 border border-zinc-800/60 rounded hover:border-[#ea580c]/40 hover:bg-zinc-900/80 transition-all group"
                    whileHover={{ y: -2 }}
                  >
                    <div className="space-y-1">
                      {/* Title + Type */}
                      <div className="flex items-start gap-1.5">
                        <div className="text-zinc-500 mt-0.5">
                          {typeIcon(ticket.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-white truncate group-hover:text-[#ea580c] transition-colors">
                            {ticket.title}
                          </p>
                        </div>
                      </div>

                      {/* Priority + Status */}
                      <div className="flex gap-1">
                        <Badge className={cn('text-[7px] h-4', priorityColor(ticket.priority))}>
                          {ticket.priority}
                        </Badge>
                      </div>

                      {/* AI Summary snippet */}
                      {ticket.ai_summary && (
                        <p className="text-[7px] text-zinc-500 line-clamp-2">
                          {ticket.ai_summary.slice(0, 80)}...
                        </p>
                      )}

                      {/* Reporter */}
                      <div className="text-[7px] text-zinc-600 font-mono">
                        by user
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          ticket={selectedTicket}
          onUpdate={() => refetch()}
        />
      )}
    </div>
  );
}