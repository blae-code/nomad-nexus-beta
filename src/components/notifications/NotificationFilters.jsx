import React, { useState } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Settings } from 'lucide-react';

export default function NotificationFilters() {
  const { rules, createRule, deleteRule, updateRule } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    pattern: '',
    types: [],
    action: 'defer',
    priority: 'medium',
    is_active: true,
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.pattern) return;
    try {
      await createRule(formData);
      setFormData({
        name: '',
        pattern: '',
        types: [],
        action: 'defer',
        priority: 'medium',
        is_active: true,
      });
    } catch (e) {
      console.error('Failed to create rule:', e);
    }
  };

  const handleToggle = async (rule) => {
    await updateRule(rule.id, { is_active: !rule.is_active });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Settings className="w-4 h-4" />
          Notification Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notification Rules & Filtering</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Create Rule */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Create New Rule</h3>
            <input
              type="text"
              placeholder="Rule name (e.g., 'Mute Team Alerts')"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              placeholder="Pattern (regex or keywords)"
              value={formData.pattern}
              onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-orange-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="defer">Defer (Quiet Hours)</option>
                <option value="block">Block</option>
                <option value="group">Group</option>
                <option value="promote">Promote</option>
              </select>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <Button onClick={handleCreate} className="w-full gap-2 bg-orange-600 hover:bg-orange-500">
              <Plus className="w-4 h-4" />
              Create Rule
            </Button>
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Active Rules</h3>
            {rules.length === 0 ? (
              <p className="text-xs text-zinc-600">No rules created yet</p>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded"
                >
                  <input
                    type="checkbox"
                    checked={rule.is_active}
                    onChange={() => handleToggle(rule)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">{rule.name}</h4>
                    <p className="text-xs text-zinc-500 mt-1">Pattern: {rule.pattern}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded">
                        {rule.action}
                      </span>
                      <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded">
                        {rule.priority}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}