import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Brain, Settings } from 'lucide-react';

export default function AINotificationEngine() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.NotificationRule.list('-created_date', 50);
      setRules(data || []);
    } catch (err) {
      console.warn('Failed to load notification rules:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId, isActive) => {
    try {
      await base44.entities.NotificationRule.update(ruleId, { is_active: !isActive });
      setRules(rules.map((r) => (r.id === ruleId ? { ...r, is_active: !isActive } : r)));
    } catch (err) {
      console.warn('Failed to update rule:', err.message);
    }
  };

  const createSmartRule = async (pattern, action) => {
    try {
      const newRule = await base44.entities.NotificationRule.create({
        name: `Smart Rule: ${pattern}`,
        pattern,
        action,
        priority: 'medium',
        is_active: true,
      });
      setRules([...rules, newRule]);
    } catch (err) {
      console.warn('Failed to create rule:', err.message);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-zinc-900/50 rounded-lg border border-orange-500/20">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-semibold text-zinc-200">AI Notification Rules</span>
      </div>

      {loading ? (
        <div className="text-xs text-zinc-500">Loading rules...</div>
      ) : (
        <>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {rules.slice(0, 5).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-2 bg-zinc-800/50 rounded border border-zinc-700/50 text-xs"
              >
                <div className="flex-1">
                  <div className="font-medium text-zinc-200">{rule.name}</div>
                  <div className="text-zinc-500">Action: {rule.action}</div>
                </div>
                <button
                  onClick={() => toggleRule(rule.id, rule.is_active)}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    rule.is_active
                      ? 'bg-orange-600/30 text-orange-300'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {rule.is_active ? 'On' : 'Off'}
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-700">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => createSmartRule('priority', 'promote')}
              className="text-xs flex-1"
            >
              <Settings className="w-3 h-3 mr-1" />
              New Rule
            </Button>
          </div>
        </>
      )}
    </div>
  );
}