import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import pagesConfig, { PAGE_ROUTE_ALIASES, PAGE_ROUTE_OVERRIDES } from '@/pages.config';
import { createPageUrl } from '@/utils';

const normalize = (value = '') => value.toLowerCase().replace(/[\s-_]/g, '');
const aliases = PAGE_ROUTE_ALIASES ?? {};
const overrides = PAGE_ROUTE_OVERRIDES ?? {};

const buildAccessGatePaths = () => {
    const canonical = overrides.AccessGate ?? createPageUrl('AccessGate');
    const accessGateAliases = aliases.AccessGate ?? [];
    return [canonical, ...accessGateAliases];
};

const levenshtein = (left = '', right = '') => {
    const leftLength = left.length;
    const rightLength = right.length;
    if (!leftLength) return rightLength;
    if (!rightLength) return leftLength;

    const matrix = Array.from({ length: leftLength + 1 }, () => new Array(rightLength + 1).fill(0));
    for (let i = 0; i <= leftLength; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= rightLength; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= leftLength; i += 1) {
        for (let j = 1; j <= rightLength; j += 1) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost,
            );
        }
    }

    return matrix[leftLength][rightLength];
};

const rankClosestMatches = (requestedKey, pageKeys) => {
    const normalizedRequested = normalize(requestedKey);

    return pageKeys
        .map((key) => {
            const normalizedKey = normalize(key);
            const distance = levenshtein(normalizedRequested, normalizedKey);
            const longest = Math.max(normalizedRequested.length, normalizedKey.length) || 1;
            const score = 1 - distance / longest;
            return { key, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
};

const getConfiguredPageKeys = () => {
    const dynamicPages = pagesConfig?.Pages ?? (Array.isArray(pagesConfig) ? null : pagesConfig ?? {});
    const dynamicKeys = dynamicPages && typeof dynamicPages === 'object' ? Object.keys(dynamicPages) : [];
    if (dynamicKeys.length > 0) {
        return dynamicKeys;
    }

    if (Array.isArray(pagesConfig)) {
        return pagesConfig
            .map((page) => page.name)
            .filter(Boolean);
    }

    return [];
};

export default function PageNotFound() {
    const location = useLocation();
    const requestedPath = location.pathname || '/';
    const requestedKey = requestedPath.replace('/', '');
    const dynamicPages = pagesConfig?.Pages ?? (Array.isArray(pagesConfig) ? null : pagesConfig ?? {});
    const pageKeys = getConfiguredPageKeys();
    const closestMatches = rankClosestMatches(requestedKey, pageKeys);
    const accessGatePaths = buildAccessGatePaths();
    const hasAccessGate = Boolean(dynamicPages?.AccessGate);
    const isAccessGateRequest = normalize(requestedKey) === 'accessgate';

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b] text-zinc-200">
            <div className="max-w-lg w-full border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm p-8">
                <div className="text-center space-y-6">
                    <div className="space-y-2">
                        <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.3em]">Mission Control</p>
                        <h1 className="text-6xl font-light text-zinc-500">404</h1>
                        <div className="h-px w-20 bg-zinc-800 mx-auto"></div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-semibold text-zinc-100">Route Not Found</h2>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            The requested route <span className="font-mono text-zinc-200">{requestedPath}</span> is not registered.
                        </p>
                    </div>

                    <div className="grid gap-4 text-left bg-zinc-900/40 border border-zinc-800 p-4">
                        <div>
                            <p className="text-[10px] uppercase font-mono text-zinc-500">Requested Route</p>
                            <p className="text-sm font-mono text-zinc-200">{requestedPath}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-mono text-zinc-500">Closest Matches</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {closestMatches.map((match) => (
                                    <span
                                        key={match.key}
                                        className="text-xs font-mono text-zinc-300 border border-zinc-800 px-2 py-1 bg-zinc-950/60"
                                    >
                                        {match.key}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {isAccessGateRequest && !hasAccessGate && (
                        <div className="text-left border border-amber-900/50 bg-amber-950/20 p-4 space-y-2">
                            <p className="text-[10px] uppercase font-mono text-amber-400 tracking-widest">
                                Access Gate missing
                            </p>
                            <p className="text-xs text-amber-200">Check pages.config.js registration.</p>
                            <p className="text-xs text-amber-200">Check filename casing.</p>
                            <p className="text-xs text-amber-200">Check default export.</p>
                        </div>
                    )}

                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-4 p-4 border border-zinc-800 bg-zinc-900/60 text-left">
                            <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Admin Note</p>
                            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                                This route may not be implemented yet. Validate page registration or ask the AI to implement it.
                            </p>
                        </div>
                    )}

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        {hasAccessGate && (
                            <button
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.location.href = accessGatePaths[0];
                                    }
                                }}
                                className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#ea580c] hover:bg-[#ea580c]/90 transition-colors duration-200"
                            >
                                Go to Access Gate
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.location.href = '/';
                                }
                            }}
                            className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 border border-zinc-800 hover:border-[#ea580c]/50 hover:text-white transition-colors duration-200"
                        >
                            Return to Command Hub
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
