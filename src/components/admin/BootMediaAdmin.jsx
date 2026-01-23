import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Copy, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function BootMediaAdmin() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      let configs = await base44.entities.AppConfig.list();
      let appConfig = configs.find(c => c.key === 'global');

      if (!appConfig) {
        // Create default config
        try {
          appConfig = await base44.entities.AppConfig.create({
            key: 'global',
            boot_video_enabled: false,
            boot_video_mode: 'FIRST_VISIT',
            boot_video_max_ms: 6000,
            boot_video_skip_enabled: true
          });
        } catch (createErr) {
          console.error('Create AppConfig error:', createErr);
          setError(`Failed to create config: ${createErr.message}`);
          setIsLoading(false);
          return;
        }
      }

      setConfig(appConfig);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Load config error:', err);
      setError(`Failed to load config: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Update config
      const updated = await base44.entities.AppConfig.update(config.id, {
        boot_video_url: file_url,
        boot_video_enabled: true
      });

      setConfig(updated);
      setError(null);
    } catch (err) {
      setError('Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleModeChange = async (mode) => {
    if (!config) return;
    try {
      const updated = await base44.entities.AppConfig.update(config.id, {
        boot_video_mode: mode
      });
      setConfig(updated);
    } catch (err) {
      setError('Failed to update mode');
    }
  };

  const handleToggleSkip = async () => {
    if (!config) return;
    try {
      const updated = await base44.entities.AppConfig.update(config.id, {
        boot_video_skip_enabled: !config.boot_video_skip_enabled
      });
      setConfig(updated);
    } catch (err) {
      setError('Failed to update skip setting');
    }
  };

  const handleDisable = async () => {
    if (!config) return;
    try {
      const updated = await base44.entities.AppConfig.update(config.id, {
        boot_video_enabled: false
      });
      setConfig(updated);
    } catch (err) {
      setError('Failed to disable video');
    }
  };

  const handleCopyUrl = () => {
    if (config?.boot_video_url) {
      navigator.clipboard.writeText(config.boot_video_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveFile = async () => {
    if (!config) return;
    try {
      const updated = await base44.entities.AppConfig.update(config.id, {
        boot_video_url: null,
        boot_video_enabled: false
      });
      setConfig(updated);
      setError(null);
    } catch (err) {
      setError('Failed to remove video');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4 text-zinc-400 text-sm">Loading...</div>;
  }

  if (!config) {
    return <div className="text-center py-4 text-zinc-400 text-sm">Failed to load config</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 p-4 border border-zinc-800 bg-zinc-950/50"
    >
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-white">Boot Video Configuration</h3>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/20 border border-red-800/50 p-2">
            {error}
          </div>
        )}

        {/* Upload Section */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-zinc-400">Upload Video</label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="video/mp4"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="text-xs px-3 py-2 border border-zinc-700 bg-zinc-900 text-zinc-300 flex-1 cursor-pointer"
            />
            {isUploading && <span className="text-xs text-zinc-400">Uploading...</span>}
          </div>
        </div>

        {/* Preview & URL Section */}
        {config.boot_video_url && (
          <div className="space-y-2 border-t border-zinc-800 pt-3">
            <label className="text-xs font-mono uppercase text-zinc-400">Preview</label>
            <video
              src={config.boot_video_url}
              muted
              controls
              className="w-full h-32 bg-black border border-zinc-700"
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.boot_video_url}
                readOnly
                className="text-xs px-2 py-1 border border-zinc-700 bg-zinc-900 text-zinc-400 flex-1 font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyUrl}
                className="text-xs gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        {/* Mode Selection */}
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <label className="text-xs font-mono uppercase text-zinc-400">Display Mode</label>
          <div className="flex gap-2">
            {['OFF', 'FIRST_VISIT', 'ALWAYS'].map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                  config.boot_video_mode === mode
                    ? 'bg-[#ea580c] text-white border border-[#ea580c]'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500">
            {config.boot_video_mode === 'OFF' && 'Boot video is disabled.'}
            {config.boot_video_mode === 'FIRST_VISIT' && 'Shows only on first visit (per browser).'}
            {config.boot_video_mode === 'ALWAYS' && 'Shows every time app loads.'}
          </p>
        </div>

        {/* Max Duration */}
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <label className="text-xs font-mono uppercase text-zinc-400">Max Duration (ms)</label>
          <input
            type="number"
            value={config.boot_video_max_ms}
            onChange={(e) => setConfig({ ...config, boot_video_max_ms: parseInt(e.target.value) })}
            onBlur={() => {
              base44.entities.AppConfig.update(config.id, {
                boot_video_max_ms: config.boot_video_max_ms
              });
            }}
            className="w-full text-xs px-2 py-1 border border-zinc-700 bg-zinc-900 text-zinc-300"
          />
        </div>

        {/* Skip Button Toggle */}
        <div className="space-y-2 border-t border-zinc-800 pt-3 flex items-center justify-between">
          <label className="text-xs font-mono uppercase text-zinc-400">Allow Skip</label>
          <button
            onClick={handleToggleSkip}
            className={`px-3 py-1 text-xs font-bold uppercase transition-all ${
              config.boot_video_skip_enabled
                ? 'bg-green-900/40 text-green-300 border border-green-700/50'
                : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/50'
            }`}
          >
            {config.boot_video_skip_enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Disable Button */}
        {config.boot_video_enabled && (
          <div className="border-t border-zinc-800 pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisable}
              className="w-full text-xs gap-2 text-red-400 hover:text-red-300 hover:border-red-500/50"
            >
              <Trash2 className="w-3 h-3" />
              Disable Boot Video
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}