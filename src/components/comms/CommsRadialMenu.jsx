import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageSquare, Radio, Crown, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CommsRadialMenu: Context-aware radial menu on node click
 * Actions: Whisper (with submenu), Broadcast Ping, Request/Grant Priority
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
  onGrantPriority,
  capabilities = {}
}) {
  const [submenu, setSubmenu] = useState(null);

  if (!isOpen || !position) return null;

  const items = getMenuItems(nodeType, capabilities, onBroadcast, onRequestPriority, onGrantPriority, () => setSubmenu('whisper'));

  const handleWhisperClick = () => {
    setSubmenu('whisper');
  };

  const handleWhisperSubmit = (scope) => {
    onWhisper?.(nodeId, scope);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />

          {/* Radial Menu Container */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 50
            }}
            className="pointer-events-none"
          >
            {/* Center dot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute w-2 h-2 bg-[#ea580c] rounded-full"
              style={{ transform: 'translate(-50%, -50%)' }}
            />

            {/* Menu items arranged in circle */}
            {!submenu ? (
              <div>
                {items.map((item, idx) => {
                  const angle = (idx / items.length) * 2 * Math.PI;
                  const radius = 60;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 0, y: 0 }}
                      animate={{
                        opacity: 1,
                        x,
                        y,
                        transition: { delay: idx * 0.05 }
                      }}
                      exit={{ opacity: 0, x: 0, y: 0 }}
                      style={{
                        position: 'absolute',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <button
                        onClick={() => {
                          if (item.submenu) {
                            item.onClick?.();
                          } else {
                            item.onClick?.();
                            onClose();
                          }
                        }}
                        className={cn(
                          'relative flex items-center justify-center w-12 h-12 rounded-full transition-all',
                          'border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-[#ea580c]',
                          'text-zinc-300 hover:text-[#ea580c] pointer-events-auto'
                        )}
                        title={item.label}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.submenu && (
                          <ChevronRight className="w-3 h-3 absolute -right-1 -top-1 text-[#ea580c]" />
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // Whisper submenu
              <WhisperSubmenu
                scopes={capabilities.whisperScopes || ['ONE']}
                onSelect={handleWhisperSubmit}
                onBack={() => setSubmenu(null)}
              />
            )}
          </motion.div>

          {/* Label tooltip */}
          {!submenu && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y - 90}px`,
                transform: 'translateX(-50%)'
              }}
              className="pointer-events-none text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-1 border border-zinc-800 rounded"
            >
              {nodeType === 'command' ? 'COMMAND' : nodeType === 'squad' ? 'SQUAD' : 'NET'}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Whisper Submenu: Select scope (ONE, ROLE, SQUAD, WING, FLEET)
 */
function WhisperSubmenu({ scopes, onSelect, onBack }) {
  const scopeLabels = {
    ONE: '1:1 Whisper',
    ROLE: 'Role Whisper',
    SQUAD: 'Squad Whisper',
    WING: 'Wing Whisper',
    FLEET: 'Fleet Whisper'
  };

  const scopeDescriptions = {
    ONE: 'Private 1:1 channel',
    ROLE: 'All with role',
    SQUAD: 'Squad members',
    WING: 'Wing members',
    FLEET: 'Full fleet'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute -left-64 top-1/2 transform -translate-y-1/2 w-60 bg-zinc-900 border border-zinc-800 rounded"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#ea580c]" />
          <span className="text-xs font-bold uppercase">Whisper Scope</span>
        </div>
        <button
          onClick={onBack}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scope options */}
      <div className="space-y-1 p-2">
        {scopes.map(scope => (
          <button
            key={scope}
            onClick={() => onSelect(scope)}
            className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800 transition-colors group"
          >
            <div className="text-xs font-bold text-zinc-200 group-hover:text-[#ea580c]">
              {scopeLabels[scope]}
            </div>
            <div className="text-[9px] text-zinc-500 group-hover:text-zinc-400 mt-0.5">
              {scopeDescriptions[scope]}
            </div>
          </button>
        ))}
      </div>

      {/* Footer info */}
      <div className="px-3 py-2 border-t border-zinc-800 text-[9px] text-zinc-600 bg-zinc-950/50">
        Whisper creates a temporary side-channel. Press ESC or click Leave to exit.
      </div>
    </motion.div>
  );
}

/**
 * Get menu items based on node type and capabilities
 */
function getMenuItems(nodeType, capabilities, onBroadcast, onRequestPriority, onGrantPriority, onWhisperMenu) {
  const items = [];

  // Whisper (always visible if user has any whisper scope)
  if (capabilities.whisperScopes?.length > 0) {
    items.push({
      id: 'whisper',
      label: 'Whisper',
      icon: MessageSquare,
      submenu: true,
      onClick: onWhisperMenu
    });
  }

  // Broadcast (only if user can broadcast)
  if (capabilities.broadcast) {
    items.push({
      id: 'broadcast',
      label: 'Broadcast Ping',
      icon: Radio,
      onClick: onBroadcast
    });
  }

  // Priority management
  if (nodeType === 'command' && capabilities.grantPriority) {
    items.push({
      id: 'priority',
      label: 'Manage Priority',
      icon: Crown,
      onClick: onGrantPriority
    });
  } else if ((nodeType === 'squad' || nodeType === 'user') && capabilities.requestPriority) {
    items.push({
      id: 'priority',
      label: 'Request Priority',
      icon: Crown,
      onClick: onRequestPriority
    });
  }

  return items;
}