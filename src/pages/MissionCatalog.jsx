import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { createPageUrl } from '@/utils';
import { Crosshair, Flag, Radio, Search, Swords, Target } from 'lucide-react';

const FALLBACK_MISSIONS = [
  {
    id: 'bounty_vhrt_01',
    title: 'VHRT Bounty Sweep',
    category: 'combat',
    operationProfile: 'focused',
    difficulty: 'high',
    location: 'Crusader',
    reward: '45k aUEC',
    tags: ['bounty', 'combat', 'fighter'],
  },
  {
    id: 'salvage_reclaimer_02',
    title: 'Derelict Reclaimer Salvage',
    category: 'salvage',
    operationProfile: 'casual',
    difficulty: 'medium',
    location: 'Lagrange Belt',
    reward: 'Cargo yield',
    tags: ['salvage', 'multi-crew', 'cargo'],
  },
  {
    id: 'bunker_assault_03',
    title: 'Security Bunker Assault',
    category: 'combat',
    operationProfile: 'focused',
    difficulty: 'medium',
    location: 'Hurston',
    reward: '20k aUEC + loot',
    tags: ['fps', 'ground', 'security'],
  },
  {
    id: 'medical_beacon_04',
    title: 'Emergency Medical Beacon Chain',
    category: 'support',
    operationProfile: 'casual',
    difficulty: 'low',
    location: 'Stanton Wide',
    reward: 'Service + tips',
    tags: ['medical', 'rescue', 'beacon'],
  },
  {
    id: 'haul_quant_05',
    title: 'Quantanium Commodity Haul',
    category: 'hauling',
    operationProfile: 'focused',
    difficulty: 'high',
    location: 'ARC-L1 to Area18',
    reward: 'Margin based',
    tags: ['hauling', 'trade', 'risk'],
  },
  {
    id: 'investigation_06',
    title: 'Missing Crew Investigation',
    category: 'exploration',
    operationProfile: 'casual',
    difficulty: 'medium',
    location: 'MicroTech',
    reward: '16k aUEC',
    tags: ['investigation', 'exploration', 'narrative'],
  },
];

function normalizeMissionRecord(input) {
  if (!input) return null;
  const id = String(input.id || input.code || '').trim();
  const title = String(input.title || input.name || '').trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    category: String(input.category || input.type || 'general').toLowerCase(),
    operationProfile: String(input.operation_profile || input.operationProfile || 'casual').toLowerCase(),
    difficulty: String(input.difficulty || 'medium').toLowerCase(),
    location: String(input.location || 'Unknown'),
    reward: String(input.reward || ''),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => String(tag)) : [],
  };
}

export default function MissionCatalog() {
  const activeOp = useActiveOp();
  const [missions, setMissions] = useState(FALLBACK_MISSIONS);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [linkingMissionId, setLinkingMissionId] = useState(null);
  const [linkedMissionIds, setLinkedMissionIds] = useState([]);
  const [statusBanner, setStatusBanner] = useState(null);

  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      try {
        if (base44.entities?.GameMission?.list) {
          const list = await base44.entities.GameMission.list('-created_date', 500);
          const normalized = (list || []).map(normalizeMissionRecord).filter(Boolean);
          if (normalized.length > 0) {
            setMissions(normalized);
          } else {
            setMissions(FALLBACK_MISSIONS);
          }
        } else {
          setMissions(FALLBACK_MISSIONS);
        }
      } catch (error) {
        console.error('Failed to load mission catalog:', error);
        setMissions(FALLBACK_MISSIONS);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    const loadOperationLinks = async () => {
      if (!activeOp?.activeEventId) {
        setLinkedMissionIds([]);
        return;
      }
      try {
        const operation = await base44.entities.Event.get(activeOp.activeEventId);
        const links = Array.isArray(operation?.linked_missions)
          ? operation.linked_missions
          : Array.isArray(operation?.mission_catalog_entries)
          ? operation.mission_catalog_entries
          : [];
        setLinkedMissionIds(links.map((item) => String(item?.id || '')).filter(Boolean));
      } catch (error) {
        console.error('Failed to load operation mission links:', error);
      }
    };

    loadOperationLinks();
  }, [activeOp?.activeEventId]);

  const categories = useMemo(() => {
    const set = new Set(missions.map((mission) => mission.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [missions]);

  const filteredMissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return missions.filter((mission) => {
      if (categoryFilter !== 'all' && mission.category !== categoryFilter) return false;
      if (profileFilter !== 'all' && mission.operationProfile !== profileFilter) return false;
      if (difficultyFilter !== 'all' && mission.difficulty !== difficultyFilter) return false;
      if (!normalizedQuery) return true;
      return (
        mission.title.toLowerCase().includes(normalizedQuery) ||
        mission.location.toLowerCase().includes(normalizedQuery) ||
        mission.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [missions, query, categoryFilter, profileFilter, difficultyFilter]);

  const linkMissionToOperation = async (mission) => {
    if (!activeOp?.activeEventId) {
      setStatusBanner({
        type: 'error',
        message: 'Select or activate an operation before linking missions.',
      });
      return;
    }
    try {
      setLinkingMissionId(mission.id);
      const response = await invokeMemberFunction('linkMissionToOperation', {
        operationId: activeOp.activeEventId,
        mission,
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setStatusBanner({
          type: 'success',
          message: payload?.alreadyLinked
            ? `${mission.title} is already linked to this operation.`
            : `${mission.title} linked to ${activeOp?.activeEvent?.title || 'active operation'}.`,
        });
        setLinkedMissionIds((prev) => (prev.includes(mission.id) ? prev : [...prev, mission.id]));
      } else {
        setStatusBanner({
          type: 'error',
          message: payload?.error || 'Failed to link mission to operation.',
        });
      }
    } catch (error) {
      console.error('Failed to link mission to operation:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Failed to link mission to operation.',
      });
    } finally {
      setLinkingMissionId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Mission Catalog</h1>
        <p className="text-zinc-400 text-sm">
          In-game mission index for operation planning. Missions are game-native tasks, not player contracts.
        </p>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Operation Context</div>
          <div className="text-xs text-zinc-300 mt-1">
            {activeOp?.activeEvent?.title || 'No active operation selected'}
          </div>
        </div>
        <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Voice Requirement</div>
          <div className="text-xs text-orange-300 mt-1">
            All active operations should run real-time voice comms.
          </div>
        </div>
        <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Related Spaces</div>
            <div className="text-xs text-zinc-300 mt-1">Operations and Contracts remain separate.</div>
          </div>
          <div className="flex gap-2">
            <a
              href={createPageUrl('MissionControl')}
              className="inline-flex items-center rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:text-white hover:border-orange-500/50 transition"
            >
              Operations
            </a>
            <a
              href={createPageUrl('MissionBoard')}
              className="inline-flex items-center rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:text-white hover:border-orange-500/50 transition"
            >
              Contracts
            </a>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
          <Search className="w-3 h-3" />
          Catalog Filters
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input
            aria-label="Search missions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, location, tag"
          />
          <select
            aria-label="Category filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
          <select
            aria-label="Operation profile filter"
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
          >
            <option value="all">All Profiles</option>
            <option value="casual">Casual</option>
            <option value="focused">Focused</option>
          </select>
          <select
            aria-label="Difficulty filter"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
          >
            <option value="all">All Difficulty</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-zinc-500 text-sm">Loading mission catalog...</div>
        ) : filteredMissions.length === 0 ? (
          <div className="text-zinc-500 text-sm">No missions match the current filters.</div>
        ) : (
          filteredMissions.map((mission) => {
            const linked = linkedMissionIds.includes(mission.id);
            return (
              <div key={mission.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      {mission.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase">
                      {mission.category} • {mission.operationProfile} • {mission.difficulty}
                    </div>
                  </div>
                  {mission.reward && <div className="text-xs text-green-400">{mission.reward}</div>}
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Crosshair className="w-3 h-3" />
                    {mission.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Swords className="w-3 h-3" />
                    Profile: {mission.operationProfile}
                  </span>
                </div>

                {mission.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mission.tags.map((tag, idx) => (
                      <span
                        key={`${mission.id}-tag-${idx}`}
                        className="text-[10px] text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded uppercase"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!activeOp?.activeEventId || linkingMissionId === mission.id}
                    onClick={() => linkMissionToOperation(mission)}
                  >
                    {linkingMissionId === mission.id
                      ? 'Linking...'
                      : linked
                      ? 'Linked to Active Operation'
                      : 'Link to Active Operation'}
                  </Button>
                  {!activeOp?.activeEventId && (
                    <span className="text-[10px] text-orange-300 inline-flex items-center gap-1">
                      <Flag className="w-3 h-3" />
                      Activate an operation first in Operations Control
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded p-3 text-xs text-zinc-400 flex items-center gap-2">
        <Radio className="w-3 h-3 text-orange-400" />
        Voice hangout and operation comms are available in Comms Array.
        <a href={createPageUrl('CommsConsole')} className="text-orange-300 hover:text-orange-200 underline">
          Open Comms
        </a>
      </div>
    </div>
  );
}
