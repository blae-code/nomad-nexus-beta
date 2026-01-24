import React, { useMemo } from 'react';
import { createPageUrl } from '@/utils';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[len2][len1];
}

/**
 * Rank closest matches by Levenshtein distance
 */
function rankClosestMatches(attemptedPath, candidates, limit = 5) {
  const normalized = attemptedPath.toLowerCase();
  const scored = candidates.map((path) => ({
    path,
    distance: levenshteinDistance(normalized, path.toLowerCase()),
  }));

  return scored
    .filter((item) => item.distance < 8)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.path);
}

export default function PageNotFound() {
  const routeAliases = {};
  const routeOverrides = {};

  const candidatePaths = useMemo(() => {
    const paths = new Set();

    // Add alias paths
    Object.values(routeAliases).forEach((path) => paths.add(path));

    // Add override paths
    Object.values(routeOverrides).forEach((path) => paths.add(path));

    // Add common page paths via createPageUrl
    const commonPages = [
      'hub',
      'events',
      'comms-console',
      'fleet-manager',
      'rescue',
      'channels',
      'profile',
      'admin',
      'access-gate',
    ];

    commonPages.forEach((pageKey) => {
      try {
        const path = createPageUrl(pageKey);
        paths.add(path);
      } catch (e) {
        // Ignore invalid page keys
      }
    });

    // Always include /login
    paths.add('/login');
    paths.add('/');

    return Array.from(paths);
  }, [routeAliases, routeOverrides]);

  const attemptedPath = window.location.pathname;
  const closestMatches = rankClosestMatches(attemptedPath, candidatePaths);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center px-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-md w-full">
        <div className="border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl font-black text-orange-500 mb-2">404</div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
              Not Found
            </h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
              Route "{attemptedPath}" does not exist
            </p>
          </div>

          {/* Closest Matches */}
          {closestMatches.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                Closest Matches:
              </p>
              <div className="space-y-1">
                {closestMatches.map((path) => (
                  <a
                    key={path}
                    href={path}
                    className="flex items-center gap-2 px-3 py-2 rounded-none bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800 transition-colors group"
                  >
                    <ChevronRight className="w-3 h-3 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <code className="text-xs text-zinc-300 font-mono">{path}</code>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            Return Home
          </a>

          {/* Debug Info */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-[9px] text-zinc-600 text-center font-mono">
              Total routes available: {candidatePaths.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}