import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Radio, Calendar, User, Hash, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const RESULT_TYPES = {
  NET: { icon: Radio, color: "text-blue-500" },
  EVENT: { icon: Calendar, color: "text-purple-500" },
  MESSAGE: { icon: Hash, color: "text-emerald-500" },
  STATUS: { icon: AlertTriangle, color: "text-amber-500" }
};

function SearchResult({ result, onClick }) {
  const typeConfig = RESULT_TYPES[result.type] || RESULT_TYPES.MESSAGE;
  const Icon = typeConfig.icon;

  return (
    <button
      onClick={() => onClick(result)}
      className="w-full p-3 text-left hover:bg-zinc-900 border-l-2 border-transparent hover:border-[#ea580c] transition-all group"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-4 h-4 mt-0.5", typeConfig.color)} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-zinc-200 truncate">{result.title}</span>
            {result.badge && (
              <Badge variant="outline" className="text-[10px] h-4">
                {result.badge}
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-zinc-500 line-clamp-2">{result.description}</p>
          
          {result.metadata && (
            <div className="flex gap-3 mt-2 text-[10px] text-zinc-600">
              {result.metadata.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {result.metadata.time}
                </span>
              )}
              {result.metadata.user && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {result.metadata.user}
                </span>
              )}
            </div>
          )}
        </div>
        
        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-[#ea580c] transition-colors" />
      </div>
    </button>
  );
}

export default function CommsSearch({ isOpen, onClose, eventId, onSelectNet, onSelectEvent, onSelectMessage }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all, nets, events, messages, status

  // Fetch data for search
  const { data: nets } = useQuery({
    queryKey: ['search-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter(eventId ? { event_id: eventId } : {}),
    enabled: isOpen,
    initialData: []
  });

  const { data: events } = useQuery({
    queryKey: ['search-events'],
    queryFn: () => base44.entities.Event.list('-start_time', 50),
    enabled: isOpen,
    initialData: []
  });

  const { data: messages } = useQuery({
    queryKey: ['search-messages', eventId],
    queryFn: () => base44.entities.Message.list('-created_date', 100),
    enabled: isOpen,
    initialData: []
  });

  const { data: statuses } = useQuery({
    queryKey: ['search-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter(eventId ? { event_id: eventId } : {}),
    enabled: isOpen,
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['search-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isOpen && messages.length > 0,
    initialData: []
  });

  // Search and filter results
  const results = React.useMemo(() => {
    if (!query || query.length < 2) return [];

    const searchTerm = query.toLowerCase();
    const results = [];

    // Search nets
    if (filter === 'all' || filter === 'nets') {
      nets.forEach(net => {
        const matches = 
          net.code?.toLowerCase().includes(searchTerm) ||
          net.label?.toLowerCase().includes(searchTerm) ||
          net.type?.toLowerCase().includes(searchTerm);
        
        if (matches) {
          results.push({
            id: `net-${net.id}`,
            type: 'NET',
            title: `${net.code} - ${net.label}`,
            description: `${net.type.toUpperCase()} net • Priority ${net.priority}`,
            badge: net.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            data: net,
            score: net.code.toLowerCase() === searchTerm ? 100 : 50
          });
        }
      });
    }

    // Search events
    if (filter === 'all' || filter === 'events') {
      events.forEach(event => {
        const matches = 
          event.title?.toLowerCase().includes(searchTerm) ||
          event.description?.toLowerCase().includes(searchTerm) ||
          event.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
        
        if (matches) {
          results.push({
            id: `event-${event.id}`,
            type: 'EVENT',
            title: event.title,
            description: event.description?.substring(0, 100) || '',
            badge: event.status?.toUpperCase(),
            metadata: {
              time: new Date(event.start_time).toLocaleDateString()
            },
            data: event,
            score: event.title.toLowerCase().includes(searchTerm) ? 80 : 40
          });
        }
      });
    }

    // Search messages
    if (filter === 'all' || filter === 'messages') {
      messages.forEach(msg => {
        const user = users.find(u => u.id === msg.user_id);
        const matches = 
          msg.content?.toLowerCase().includes(searchTerm) ||
          user?.callsign?.toLowerCase().includes(searchTerm) ||
          user?.rsi_handle?.toLowerCase().includes(searchTerm);
        
        if (matches) {
          results.push({
            id: `msg-${msg.id}`,
            type: 'MESSAGE',
            title: user?.callsign || user?.rsi_handle || 'Unknown',
            description: msg.content?.substring(0, 120) || '',
            metadata: {
              time: new Date(msg.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              user: user?.callsign || user?.rsi_handle
            },
            data: msg,
            score: 30
          });
        }
      });
    }

    // Search statuses
    if (filter === 'all' || filter === 'status') {
      statuses.forEach(status => {
        const user = users.find(u => u.id === status.user_id);
        const matches = 
          status.status?.toLowerCase().includes(searchTerm) ||
          status.current_location?.toLowerCase().includes(searchTerm) ||
          user?.callsign?.toLowerCase().includes(searchTerm);
        
        if (matches && status.status !== 'OFFLINE') {
          results.push({
            id: `status-${status.id}`,
            type: 'STATUS',
            title: `${user?.callsign || 'Operator'} - ${status.status}`,
            description: status.notes || status.current_location || 'No details',
            badge: status.status,
            metadata: {
              time: new Date(status.last_updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              user: user?.callsign
            },
            data: status,
            score: 60
          });
        }
      });
    }

    // Sort by score
    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [query, filter, nets, events, messages, statuses, users]);

  const handleSelect = (result) => {
    if (result.type === 'NET' && onSelectNet) {
      onSelectNet(result.data);
      onClose();
    } else if (result.type === 'EVENT' && onSelectEvent) {
      onSelectEvent(result.data.id);
      onClose();
    } else if (result.type === 'MESSAGE' && onSelectMessage) {
      onSelectMessage(result.data);
      onClose();
    }
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#ea580c]" />
            Search Comms Console
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nets, events, messages, statuses..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200"
              autoFocus
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'nets', 'events', 'messages', 'status'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors",
                  filter === f
                    ? "bg-[#ea580c] border-[#ea580c] text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Results */}
          <ScrollArea className="h-96">
            {query.length < 2 ? (
              <div className="text-center py-12 text-zinc-600">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-mono">Type at least 2 characters to search</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <p className="text-sm font-bold text-zinc-500">No results found</p>
                <p className="text-xs font-mono mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map(result => (
                  <SearchResult
                    key={result.id}
                    result={result}
                    onClick={handleSelect}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-zinc-600 pt-3 border-t border-zinc-900">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-blue-500" /> Nets
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-500" /> Events
              </span>
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-emerald-500" /> Messages
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Status
              </span>
            </div>
            <kbd className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono">
              ESC to close
            </kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}