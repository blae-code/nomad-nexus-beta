import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronUp, X, MessageCircle, Users, Bell, FileUp, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import DMTab from './DMTab';
import GroupChatTab from './GroupChatTab';
import NotificationsTab from './NotificationsTab';
import FileShareTab from './FileShareTab';

export default function MessagingFooter({ user }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [openTabs, setOpenTabs] = useState(['notifications']);
  const [dmTabs, setDmTabs] = useState([]);
  const [groupTabs, setGroupTabs] = useState([]);
  const queryClient = useQueryClient();

  const { data: unreadCounts = {} } = useQuery({
    queryKey: ['message-unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const messages = await base44.entities.Message.list();
      const counts = { dm: 0, group: 0, notifications: 0 };
      
      messages.forEach(msg => {
        if (!msg.read_by?.includes(user.id) && msg.user_id !== user.id) {
          counts.dm += 1;
        }
      });
      
      return counts;
    },
    enabled: !!user?.id,
    refetchInterval: 3000
  });

  const addDMTab = (userId, userName) => {
    const tabId = `dm-${userId}`;
    if (!openTabs.includes(tabId)) {
      setOpenTabs([...openTabs, tabId]);
      setDmTabs([...dmTabs, { userId, userName, tabId }]);
    }
    setActiveTab(tabId);
  };

  const addGroupTab = (groupId, groupName) => {
    const tabId = `group-${groupId}`;
    if (!openTabs.includes(tabId)) {
      setOpenTabs([...openTabs, tabId]);
      setGroupTabs([...groupTabs, { groupId, groupName, tabId }]);
    }
    setActiveTab(tabId);
  };

  const closeTab = (tabId) => {
    setOpenTabs(openTabs.filter(t => t !== tabId));
    if (tabId.startsWith('dm-')) {
      setDmTabs(dmTabs.filter(t => t.tabId !== tabId));
    } else if (tabId.startsWith('group-')) {
      setGroupTabs(groupTabs.filter(t => t.tabId !== tabId));
    }
    if (activeTab === tabId) {
      setActiveTab(openTabs[0]);
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCounts.notifications },
    { id: 'file-share', label: 'File Share', icon: FileUp, badge: 0 },
    ...dmTabs.map(dm => ({ id: dm.tabId, label: `${dm.userName}`, icon: MessageCircle, isDM: true })),
    ...groupTabs.map(g => ({ id: g.tabId, label: `${g.groupName}`, icon: Users, isGroup: true }))
  ];

  if (!user) return null;

  return (
    <div className="z-50 bg-zinc-950 border-t border-zinc-800 flex flex-col shrink-0 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-950 border-b border-zinc-800/50">
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="flex items-center gap-1.5 hover:text-[#ea580c] transition-colors flex-1 group"
        >
          <ChevronUp className={cn("w-3 h-3 text-zinc-500 group-hover:text-[#ea580c] transition-transform", isMinimized && "rotate-180")} />
          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 tracking-wider">MESSAGING</span>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-0.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-2.5 h-2.5" /> : <Minimize2 className="w-2.5 h-2.5" />}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-0.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex items-center gap-0 px-2 py-0 bg-zinc-900/30 border-b border-zinc-800/30 overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono border-b-2 transition-all relative group",
                    activeTab === tab.id
                      ? "border-[#ea580c] text-zinc-100 bg-zinc-900/50"
                      : "border-transparent text-zinc-500 hover:text-zinc-400 hover:border-zinc-700"
                  )}
                >
                  <tab.icon className="w-2.5 h-2.5" />
                  <span className="truncate max-w-28">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="ml-0.5 px-1 py-0.5 bg-[#ea580c] text-[8px] font-bold rounded text-white">
                      {tab.badge}
                    </span>
                  )}
                  {tab.isDM || tab.isGroup ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="ml-1 text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="bg-zinc-950 h-96 overflow-hidden flex flex-col">
              {activeTab === 'notifications' && (
                <NotificationsTab user={user} unreadCounts={unreadCounts} />
              )}
              {activeTab === 'file-share' && (
                <FileShareTab user={user} />
              )}
              {dmTabs.map(dm => activeTab === dm.tabId && (
                <DMTab key={dm.tabId} user={user} recipientId={dm.userId} recipientName={dm.userName} />
              ))}
              {groupTabs.map(g => activeTab === g.tabId && (
                <GroupChatTab key={g.tabId} user={user} groupId={g.groupId} groupName={g.groupName} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}