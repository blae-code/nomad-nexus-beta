import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const TEMPLATE_DEFS = {
  SITREP: {
    label: 'SITREP',
    fields: [
      { key: 'location', label: 'Location' },
      { key: 'objective', label: 'Objective' },
      { key: 'friendly', label: 'Friendly Forces' },
      { key: 'enemy', label: 'Enemy Activity' },
      { key: 'requests', label: 'Requests' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  CONTACT: {
    label: 'CONTACT',
    fields: [
      { key: 'contact_type', label: 'Contact Type' },
      { key: 'location', label: 'Location' },
      { key: 'enemy_strength', label: 'Enemy Strength' },
      { key: 'support_needed', label: 'Support Needed' },
    ],
  },
  STATUS: {
    label: 'STATUS',
    fields: [
      { key: 'unit', label: 'Unit' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status' },
      { key: 'eta', label: 'ETA/Next Move' },
    ],
  },
  ORDERS: {
    label: 'ORDERS',
    fields: [
      { key: 'task', label: 'Tasking' },
      { key: 'location', label: 'Location' },
      { key: 'time', label: 'Time / Window' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  LOGISTICS: {
    label: 'LOGISTICS',
    fields: [
      { key: 'request', label: 'Request' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'delivery', label: 'Delivery / Pickup' },
    ],
  },
  ALERT: {
    label: 'ALERT',
    fields: [
      { key: 'alert', label: 'Alert' },
      { key: 'location', label: 'Location' },
      { key: 'action', label: 'Action Required' },
    ],
  },
};

const PRIORITIES = ['NORMAL', 'HIGH', 'CRITICAL'];

const buildTemplateMessage = (type, priority, values) => {
  const def = TEMPLATE_DEFS[type];
  if (!def) return '';
  const header = priority && priority !== 'NORMAL' ? `[${def.label}:${priority}]` : `[${def.label}]`;
  const lines = def.fields
    .map((field) => {
      const value = values[field.key];
      return value ? `${field.label}: ${value}` : null;
    })
    .filter(Boolean);
  return [header, ...lines].join('\n');
};

export default function CommsTemplateDialog({ isOpen, onClose, channels = [], defaultChannelId, onSendTemplate }) {
  const [templateType, setTemplateType] = useState('SITREP');
  const [priority, setPriority] = useState('NORMAL');
  const [values, setValues] = useState({});
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);

  const availableChannels = useMemo(
    () => channels.filter((ch) => !ch.is_dm),
    [channels]
  );

  useEffect(() => {
    if (defaultChannelId) {
      setSelectedChannelIds([defaultChannelId]);
    }
  }, [defaultChannelId, isOpen]);

  useEffect(() => {
    setValues({});
  }, [templateType]);

  const messagePreview = useMemo(
    () => buildTemplateMessage(templateType, priority, values),
    [templateType, priority, values]
  );

  const toggleChannel = (channelId) => {
    setSelectedChannelIds((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId);
      }
      return [...prev, channelId];
    });
  };

  const handleSend = () => {
    if (!messagePreview) return;
    onSendTemplate?.({
      content: messagePreview,
      channelIds: selectedChannelIds,
    });
  };

  const def = TEMPLATE_DEFS[templateType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Structured Comms</DialogTitle>
          <div className="text-xs text-zinc-500">Generate formatted tactical messages.</div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Template</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(TEMPLATE_DEFS).map((key) => (
                  <button
                    key={key}
                    onClick={() => setTemplateType(key)}
                    className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded border ${
                      templateType === key
                        ? 'border-orange-500 text-orange-300 bg-orange-500/10'
                        : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Priority</div>
              <div className="flex gap-2">
                {PRIORITIES.map((level) => (
                  <button
                    key={level}
                    onClick={() => setPriority(level)}
                    className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded border ${
                      priority === level
                        ? 'border-red-500 text-red-300 bg-red-500/10'
                        : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Fields</div>
              <div className="space-y-2">
                {def.fields.map((field) => (
                  <Input
                    key={field.key}
                    value={values[field.key] || ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.label}
                    className="h-8 text-xs"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Channel Targets</div>
            <div className="max-h-40 overflow-y-auto border border-zinc-800 rounded p-2 space-y-1 text-xs">
              {availableChannels.length === 0 ? (
                <div className="text-zinc-600">No channels available.</div>
              ) : (
                availableChannels.map((channel) => (
                  <label key={channel.id} className="flex items-center gap-2 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={selectedChannelIds.includes(channel.id)}
                      onChange={() => toggleChannel(channel.id)}
                    />
                    <span>#{channel.name}</span>
                  </label>
                ))
              )}
            </div>

            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Preview</div>
            <Textarea
              value={messagePreview}
              readOnly
              className="text-xs bg-zinc-900/60 border-zinc-800 min-h-[160px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!messagePreview || selectedChannelIds.length === 0}>
            Send Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
