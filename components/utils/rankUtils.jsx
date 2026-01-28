export const RANK_COLORS = {
  'Pioneer': { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-red-500/50' },
  'Founder': { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/50' },
  'Voyager': { text: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/30', glow: 'shadow-teal-500/50' },
  'Scout': { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', glow: 'shadow-orange-500/50' },
  'Vagrant': { text: 'text-emerald-600', bg: 'bg-emerald-600/10', border: 'border-emerald-600/30', glow: 'shadow-emerald-600/50' },
  'Affiliate': { text: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'shadow-purple-500/50' },
  'Guest': { text: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', glow: 'shadow-zinc-500/50' }
};

export function getRankColorClass(rank, type = 'text') {
  const config = RANK_COLORS[rank] || RANK_COLORS['Guest'];
  return config[type] || config.text;
}

const RANK_VALUES = {
  'Pioneer': 6,
  'Founder': 5,
  'Voyager': 4,
  'Scout': 3,
  'Affiliate': 2,
  'Vagrant': 1
};

export function getUserRankValue(rank) {
  return RANK_VALUES[rank] || 0;
}