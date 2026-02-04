import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plug, Satellite, MessageSquare } from 'lucide-react';

const loadLocal = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export default function IntegrationSettings() {
  const [scConfig, setScConfig] = useState({ api_key: '', notes: '' });
  const [discordConfig, setDiscordConfig] = useState({ webhook_url: '', notes: '' });
  const [discordTest, setDiscordTest] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const configs = await base44.entities.IntegrationConfig.list('-created_date', 100);
        const sc = configs.find((c) => c.provider === 'STAR_CITIZEN');
        const discord = configs.find((c) => c.provider === 'DISCORD');
        if (sc) setScConfig({ api_key: sc.api_key || '', notes: sc.notes || '' });
        if (discord) setDiscordConfig({ webhook_url: discord.webhook_url || '', notes: discord.notes || '' });
      } catch (error) {
        setSchemaMissing(true);
        setScConfig(loadLocal('nexus.sc.config', scConfig));
        setDiscordConfig(loadLocal('nexus.discord.config', discordConfig));
      }
    };

    loadConfigs();
  }, []);

  const saveConfig = async (provider, payload) => {
    try {
      const existing = await base44.entities.IntegrationConfig.filter({ provider });
      if (existing?.[0]) {
        await base44.entities.IntegrationConfig.update(existing[0].id, payload);
      } else {
        await base44.entities.IntegrationConfig.create({ provider, ...payload });
      }
    } catch (error) {
      setSchemaMissing(true);
      if (provider === 'STAR_CITIZEN') saveLocal('nexus.sc.config', payload);
      if (provider === 'DISCORD') saveLocal('nexus.discord.config', payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
        <Plug className="w-3 h-3" />
        External Integrations
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
          <Satellite className="w-3 h-3" />
          Star Citizen API (Future)
        </div>
        <Input
          value={scConfig.api_key}
          onChange={(e) => setScConfig((prev) => ({ ...prev, api_key: e.target.value }))}
          placeholder="API key (when released)"
        />
        <Textarea
          value={scConfig.notes}
          onChange={(e) => setScConfig((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Notes / configuration"
          className="min-h-[60px]"
        />
        <Button onClick={() => saveConfig('STAR_CITIZEN', scConfig)}>
          Save Star Citizen Config
        </Button>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
          <MessageSquare className="w-3 h-3" />
          Discord Bridge
        </div>
        <Input
          value={discordConfig.webhook_url}
          onChange={(e) => setDiscordConfig((prev) => ({ ...prev, webhook_url: e.target.value }))}
          placeholder="Discord webhook URL"
        />
        <Textarea
          value={discordConfig.notes}
          onChange={(e) => setDiscordConfig((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Integration notes"
          className="min-h-[60px]"
        />
        <div className="flex gap-2">
          <Button onClick={() => saveConfig('DISCORD', discordConfig)}>
            Save Discord Config
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (!discordTest.trim()) return;
              try {
                await base44.functions.invoke('discordBridgeSync', { message: discordTest, webhookUrl: discordConfig.webhook_url });
                setDiscordTest('');
              } catch (error) {
                console.error('Discord test failed:', error);
              }
            }}
          >
            Send Test
          </Button>
        </div>
        <Input
          value={discordTest}
          onChange={(e) => setDiscordTest(e.target.value)}
          placeholder="Test message for Discord bridge"
        />
      </div>

      {schemaMissing && (
        <div className="text-[10px] text-zinc-500">
          IntegrationConfig entity missing. Using localStorage fallback for configuration.
        </div>
      )}
    </div>
  );
}
