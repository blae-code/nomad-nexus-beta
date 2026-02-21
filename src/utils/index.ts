export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

function dispatchPopState() {
    try {
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
    } catch {
        // Older browsers can fail PopStateEvent constructor
    }
    window.dispatchEvent(new Event('popstate'));
}

export function navigateToUrl(targetUrl: string, options: { replace?: boolean } = {}) {
    if (typeof window === 'undefined') return false;
    const { replace = false } = options;

    try {
        const resolved = new URL(targetUrl, window.location.href);
        if (resolved.origin !== window.location.origin) return false;

        const nextPath = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (nextPath === currentPath) return true;

        if (replace) {
            window.history.replaceState(window.history.state, '', nextPath);
        } else {
            window.history.pushState(window.history.state, '', nextPath);
        }
        dispatchPopState();
        return true;
    } catch {
        return false;
    }
}

export function navigateToPage(pageName: string, options: { replace?: boolean } = {}) {
    return navigateToUrl(createPageUrl(pageName), options);
}

export function getDisplayCallsign(profile?: { display_callsign?: string; callsign?: string } | null) {
    if (!profile) return '';
    return profile.display_callsign || profile.callsign || '';
}

function normalizeIdentifier(value?: string | null) {
    return String(value || '').trim().toLowerCase();
}

const SYSTEM_ADMIN_IDENTIFIERS = (() => {
    const defaults = ['blae@katrasoluta.com'];
    let configured = '';
    try {
        configured = String((import.meta as any)?.env?.VITE_SYSTEM_ADMIN_IDENTIFIERS || '');
    } catch {
        configured = '';
    }
    const configuredList = configured
        .split(',')
        .map((entry) => normalizeIdentifier(entry))
        .filter(Boolean);
    return new Set([...defaults.map((entry) => normalizeIdentifier(entry)), ...configuredList]);
})();

function collectUserIdentifiers(user?: {
    email?: string;
    full_name?: string;
    callsign?: string;
    login_callsign?: string;
    member_profile_data?: {
        email?: string;
        callsign?: string;
        display_callsign?: string;
        login_callsign?: string;
    };
} | null) {
    const profile = user?.member_profile_data || {};
    return [
        user?.email,
        user?.full_name,
        user?.callsign,
        user?.login_callsign,
        profile?.email,
        profile?.callsign,
        profile?.display_callsign,
        profile?.login_callsign,
    ]
        .map((entry) => normalizeIdentifier(entry))
        .filter(Boolean);
}

export function isSystemAdminUser(user?: {
    email?: string;
    full_name?: string;
    callsign?: string;
    login_callsign?: string;
    member_profile_data?: {
        email?: string;
        callsign?: string;
        display_callsign?: string;
        login_callsign?: string;
    };
} | null) {
    if (!user) return false;
    const identifiers = collectUserIdentifiers(user);
    return identifiers.some((entry) => SYSTEM_ADMIN_IDENTIFIERS.has(entry));
}

export function isAdminUser(user?: {
    role?: string;
    is_admin?: boolean;
    email?: string;
    full_name?: string;
    callsign?: string;
    login_callsign?: string;
    member_profile_data?: { rank?: string; roles?: string[] };
    rank?: string;
    roles?: string[];
} | null) {
    if (!user) return false;
    if (isSystemAdminUser(user)) return true;
    if (user.role === 'admin' || user.is_admin) return true;
    const profile = user.member_profile_data || user;
    const rank = (profile.rank || '').toString().toUpperCase();
    if (rank === 'PIONEER' || rank === 'FOUNDER') return true;
    const roles = (profile.roles || []).map((r) => r.toString().toLowerCase());
    return roles.includes('admin');
}
