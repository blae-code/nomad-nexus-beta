import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trash2, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function DevTools() {
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const handleWipeData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL data from the app. Are you sure?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('wipeAppData', {});
      setLastAction({
        type: 'wipe',
        success: true,
        result: response.data
      });
      toast.success('App data cleared successfully - ready for LIVE');
    } catch (error) {
      setLastAction({
        type: 'wipe',
        success: false,
        error: error.message
      });
      toast.error('Failed to wipe data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateData = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('populateSampleData', {});
      setLastAction({
        type: 'populate',
        success: true,
        result: response.data
      });
      toast.success('Sample data populated successfully');
    } catch (error) {
      setLastAction({
        type: 'populate',
        success: false,
        error: error.message
      });
      toast.error('Failed to populate data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-orange-500/30 bg-orange-950/20 p-3 rounded-none">
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-orange-300">DEVELOPER TOOLS</h3>
            <p className="text-[8px] text-orange-400/70 mt-1">Admin-only utilities for app management</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="border border-red-500/30 bg-red-950/30 p-3"
          >
            <div className="mb-2">
              <p className="text-[8px] font-bold text-red-300 uppercase mb-1">Wipe All Data</p>
              <p className="text-[7px] text-red-400/60">Delete all records and prepare for LIVE deployment</p>
            </div>
            <Button
              onClick={handleWipeData}
              disabled={loading}
              className="w-full gap-1 text-[7px] bg-red-600 hover:bg-red-700 text-white"
              size="sm"
            >
              <Trash2 className="w-3 h-3" />
              {loading ? 'Wiping...' : 'Wipe Data'}
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="border border-green-500/30 bg-green-950/30 p-3"
          >
            <div className="mb-2">
              <p className="text-[8px] font-bold text-green-300 uppercase mb-1">Populate Test Data</p>
              <p className="text-[7px] text-green-400/60">Load sample data for dynamic display testing</p>
            </div>
            <Button
              onClick={handlePopulateData}
              disabled={loading}
              className="w-full gap-1 text-[7px] bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Database className="w-3 h-3" />
              {loading ? 'Populating...' : 'Add Test Data'}
            </Button>
          </motion.div>
        </div>
      </div>

      {lastAction && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border p-2 text-[7px] font-mono ${
            lastAction.success
              ? 'border-green-500/30 bg-green-950/20 text-green-300'
              : 'border-red-500/30 bg-red-950/20 text-red-300'
          }`}
        >
          {lastAction.success ? (
            <div className="space-y-1">
              <p>✓ {lastAction.type === 'wipe' ? 'Wipe' : 'Populate'} completed</p>
              {lastAction.result?.message && (
                <p className="text-green-400/70">{lastAction.result.message}</p>
              )}
              {lastAction.result?.created && (
                <details className="mt-1">
                  <summary className="cursor-pointer">Created records:</summary>
                  <pre className="mt-1 bg-black/30 p-1 overflow-x-auto text-[6px]">
                    {JSON.stringify(lastAction.result.created, null, 2)}
                  </pre>
                </details>
              )}
              <p className="text-green-400/50 mt-1">
                {new Date(lastAction.result.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div>
              <p>✗ Error: {lastAction.error}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}