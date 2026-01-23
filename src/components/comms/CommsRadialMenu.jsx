import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageCircle, Zap, Users, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CommsRadialMenu: Context menu for node interactions in CommsArray
 * Shows options based on node type (Squad, Command, etc)
 */
export default function CommsRadialMenu({ 
  isOpen, 
  nodeId, 
  nodeType,
  position,
  onClose,
  onWhisper,
  onBroadcast,
  onRequestPriority,
  onGrantPriority
}) {
  const [submenu, setSubmenu] = useState(null);

  if (!isOpen) return null;

  // Menu items by node type
  const getMenuItems = () => {
    const items = [];

    if (nodeType === 'squad' || nodeType === 'person') {
      items.push({
        id: 'whisper',
        label: 'Whisper',
        icon: MessageCircle,
        submenu: [
          { id: 'whisper-person', label: '1:1 Whisper', action: () => onWhisper(nodeId, 'ONE') },
          { id: 'whisper-role', label: 'To Role', action: () => onWhisper(nodeId, 'ROLE') },
          { id: 'whisper-squad', label: 'To Squad', action: () => onWhisper(nodeId, 'SQUAD') }
        ]
      });
    }

    if (nodeType === 'squad') {
      items.push({
        id: 'broadcast',
        label: 'Broadcast Ping',
        icon: Send,
        action: () => onBroadcast(nodeId)
      });
    }

    items.push({
      id: 'priority',
      label: 'Request Priority',
      icon: Zap,
      action: () => onRequestPriority(nodeId)
    });

    if (nodeType === 'command') {
      items.push({
        id: 'grant',
        label: 'Grant Priority',
        icon: Users,
        action: () => onGrantPriority(nodeId)
      });
    }

    return items;
  };

  const menuItems = getMenuItems();
  const itemCount = menuItems.length;
  const angleSlice = 360 / Math.max(itemCount, 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40"
        >
          {/* Radial Menu Background */}
          <motion.div
            className="absolute w-48 h-48 rounded-full border border-zinc-700/30 bg-zinc-950/20"
            style={{
              left: `${position.x - 96}px`,
              top: `${position.y - 96}px`
            }}
          />

          {/* Menu Items */}
          {menuItems.map((item, idx) => {
            const angle = (idx * angleSlice - 90) * (Math.PI / 180);
            const radius = 80;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="absolute"
                style={{
                  left: `${position.x + x - 20}px`,
                  top: `${position.y + y - 20}px`
                }}
              >
                {item.submenu ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-zinc-900 border-zinc-700 hover:border-[#ea580c] hover:text-[#ea580c]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubmenu(submenu === item.id ? null : item.id);
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-zinc-900 border-zinc-700 hover:border-[#ea580c] hover:text-[#ea580c]"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action?.();
                      onClose();
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                  </Button>
                )}

                {/* Submenu */}
                {item.submenu && submenu === item.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded min-w-max z-50"
                  >
                    {item.submenu.map((subitem) => (
                      <button
                        key={subitem.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          subitem.action?.();
                          onClose();
                        }}
                        className="block w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-[#ea580c] first:rounded-t last:rounded-b"
                      >
                        {subitem.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {/* Center Icon */}
          <motion.div
            className="absolute w-8 h-8 rounded-full bg-[#ea580c] border-2 border-zinc-950 flex items-center justify-center"
            style={{
              left: `${position.x - 16}px`,
              top: `${position.y - 16}px`
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}