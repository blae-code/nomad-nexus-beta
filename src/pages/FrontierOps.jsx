import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { useAuth } from '@/components/providers/AuthProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import TacticalMap from '@/components/tactical/TacticalMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Compass, Flag, MapPin, ScrollText, Target } from 'lucide-react';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

const DEFAULT_RECORD_DRAFT = {
  recordType: 'discovery',
  region: '',
  coordinates: '',
  notes: '',
};

function formatWhen(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function FrontierOps() {
  const { user } = useAuth();
  const activeOp = useActiveOp();
  const member = user?.member_profile_data || user;
  const [missionContracts, setMissionContracts] = useState([]);
  const [claims, setClaims] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [recordDraft, setRecordDraft] = useState(DEFAULT_RECORD_DRAFT);
  const [loading, setLoading] = useState(true);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [missionActionById, setMissionActionById] = useState({});
  const [statusBanner, setStatusBanner] = useState(null);

  const isCommandStaff = useMemo(
    () => COMMAND_RANKS.has(String(member?.rank || '').toUpperCase()),
    [member?.rank]
  );

  const loadFrontierData = async () => {
    setLoading(true);
    try {
      const eventFilter = activeOp?.activeEventId ? { event_id: activeOp.activeEventId } : {};
      const [missions, logs] = await Promise.all([
        base44.entities.MissionBoardPost.list('-created_date', 200).catch(() => []),
        base44.entities.EventLog.filter(eventFilter, '-created_date', 300).catch(() => []),
      ]);

      const contracts = (missions || []).filter((post) => {
        const type = String(post?.type || '').toLowerCase();
        return [
          'mission_support',
          'bounty',
          'hauling',
          'escort',
          'recon',
          'combat',
          'salvage',
        ].includes(type);
      });
      setMissionContracts(contracts);

      const claimLogs = (logs || []).filter((entry) => entry?.type === 'TERRITORY_CLAIM');
      const discoveryLogs = (logs || []).filter((entry) => entry?.type === 'FRONTIER_DISCOVERY');
      setClaims(claimLogs);
      setDiscoveries(discoveryLogs);
    } catch (error) {
      console.error('Failed to load frontier ops data:', error);
      setStatusBanner({ type: 'error', message: 'Failed to load frontier operations data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFrontierData();
  }, [activeOp?.activeEventId]);

  const runMissionAction = async (postId, action) => {
    try {
      setMissionActionById((prev) => ({ ...prev, [postId]: action }));
      const response = await invokeMemberFunction('updateMissionBoardPostStatus', {
        postId,
        action,
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setStatusBanner({
          type: 'success',
          message: `Mission contract updated: ${action.replace('_', ' ')}.`,
        });
      } else {
        setStatusBanner({
          type: 'error',
          message: payload?.error || 'Mission contract update failed.',
        });
      }
      await loadFrontierData();
    } catch (error) {
      console.error('Failed to update mission contract:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Mission contract update failed.',
      });
    } finally {
      setMissionActionById((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const submitRecord = async () => {
    if (!recordDraft.region.trim()) return;
    if (!activeOp?.activeEventId) {
      setStatusBanner({
        type: 'error',
        message: 'No active operation. Start/select an operation before logging frontier records.',
      });
      return;
    }
    if (recordDraft.recordType === 'claim' && !isCommandStaff) {
      setStatusBanner({
        type: 'error',
        message: 'Territory claims require command staff privileges.',
      });
      return;
    }

    try {
      setSubmittingRecord(true);
      const response = await invokeMemberFunction('logFrontierRecord', {
        recordType: recordDraft.recordType,
        eventId: activeOp.activeEventId,
        region: recordDraft.region.trim(),
        coordinates: recordDraft.coordinates.trim(),
        notes: recordDraft.notes.trim(),
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setStatusBanner({
          type: 'success',
          message:
            recordDraft.recordType === 'claim'
              ? 'Territory claim registered.'
              : 'Discovery logged to registry.',
        });
        setRecordDraft(DEFAULT_RECORD_DRAFT);
      } else {
        setStatusBanner({
          type: 'error',
          message: payload?.error || 'Failed to record frontier entry.',
        });
      }
      await loadFrontierData();
    } catch (error) {
      console.error('Failed to submit frontier record:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Failed to record frontier entry.',
      });
    } finally {
      setSubmittingRecord(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Frontier Ops</h1>
        <p className="text-zinc-400 text-sm">
          Frontier contracts, exploration mapping, territory claims, and discovery registry
        </p>
        <div className="text-xs text-zinc-500 mt-2">
          Active operation: {activeOp?.activeEvent?.title || 'No active operation'}
        </div>
        {statusBanner && (
          <div
            role={statusBanner.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-xs ${
              statusBanner.type === 'error'
                ? 'border-red-500/40 text-red-300 bg-red-500/10'
                : 'border-green-500/40 text-green-300 bg-green-500/10'
            }`}
          >
            {statusBanner.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Exploration Mapping
            </div>
            <TacticalMap eventId={activeOp?.activeEventId || null} activeEvent={activeOp?.activeEvent || null} compact />
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Target className="w-3 h-3" />
              Mission Contracts
            </div>
            {loading ? (
              <div className="text-zinc-500 text-xs">Loading contracts...</div>
            ) : missionContracts.length === 0 ? (
              <div className="text-zinc-500 text-xs">No frontier contracts found.</div>
            ) : (
              missionContracts.slice(0, 12).map((post) => {
                const status = String(post.status || 'open').toLowerCase();
                const canComplete =
                  status === 'claimed' &&
                  (post.claimed_by_member_profile_id === member?.id || isCommandStaff);
                return (
                  <div key={post.id} className="border border-zinc-700/80 rounded p-3 bg-zinc-950/40 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{post.title}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">
                          {post.type} • {post.status}
                        </div>
                      </div>
                      {post.reward && <div className="text-xs text-green-400">{post.reward}</div>}
                    </div>
                    {post.location && <div className="text-xs text-zinc-400">Location: {post.location}</div>}
                    {post.description && <div className="text-xs text-zinc-300">{post.description}</div>}
                    <div className="flex gap-2">
                      {status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runMissionAction(post.id, 'claim')}
                          disabled={Boolean(missionActionById[post.id])}
                        >
                          {missionActionById[post.id] === 'claim' ? 'Claiming...' : 'Accept'}
                        </Button>
                      )}
                      {canComplete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runMissionAction(post.id, 'complete')}
                          disabled={Boolean(missionActionById[post.id])}
                        >
                          {missionActionById[post.id] === 'complete' ? 'Updating...' : 'Mark Complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Compass className="w-3 h-3" />
              Frontier Record
            </div>
            <select
              aria-label="Record type"
              value={recordDraft.recordType}
              onChange={(e) => setRecordDraft((prev) => ({ ...prev, recordType: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="discovery">Discovery</option>
              <option value="claim">Territory Claim</option>
            </select>
            <Input
              aria-label="Region"
              value={recordDraft.region}
              onChange={(e) => setRecordDraft((prev) => ({ ...prev, region: e.target.value }))}
              placeholder="Region / zone"
            />
            <Input
              aria-label="Coordinates"
              value={recordDraft.coordinates}
              onChange={(e) => setRecordDraft((prev) => ({ ...prev, coordinates: e.target.value }))}
              placeholder="Coordinates"
            />
            <Textarea
              aria-label="Frontier notes"
              value={recordDraft.notes}
              onChange={(e) => setRecordDraft((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="min-h-[70px]"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={submitRecord}
              disabled={submittingRecord || !recordDraft.region.trim()}
            >
              {submittingRecord ? 'Recording...' : 'Record Entry'}
            </Button>
            {recordDraft.recordType === 'claim' && !isCommandStaff && (
              <div className="text-[10px] text-orange-300">
                Command staff rank required to register territory claims.
              </div>
            )}
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Flag className="w-3 h-3" />
              Territory Claims
            </div>
            {claims.length === 0 ? (
              <div className="text-xs text-zinc-500">No claims recorded.</div>
            ) : (
              claims.slice(0, 8).map((entry) => (
                <div key={entry.id} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/40">
                  <div className="text-xs text-white">{entry.details?.region || entry.summary}</div>
                  <div className="text-[10px] text-zinc-500">{formatWhen(entry.created_date)}</div>
                </div>
              ))
            )}
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <ScrollText className="w-3 h-3" />
              Discovery Registry
            </div>
            {discoveries.length === 0 ? (
              <div className="text-xs text-zinc-500">No discoveries logged.</div>
            ) : (
              discoveries.slice(0, 8).map((entry) => (
                <div key={entry.id} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/40">
                  <div className="text-xs text-white">{entry.details?.region || entry.summary}</div>
                  {entry.details?.coordinates && (
                    <div className="text-[10px] text-zinc-400">Coords: {entry.details.coordinates}</div>
                  )}
                  <div className="text-[10px] text-zinc-500">{formatWhen(entry.created_date)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
