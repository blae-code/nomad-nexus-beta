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

export function isAdminUser(user?: {
    role?: string;
    is_admin?: boolean;
    member_profile_data?: { rank?: string; roles?: string[] };
    rank?: string;
    roles?: string[];
} | null) {
    if (!user) return false;
    if (user.role === 'admin' || user.is_admin) return true;
    const profile = user.member_profile_data || user;
    const rank = (profile.rank || '').toString().toUpperCase();
    if (rank === 'PIONEER' || rank === 'FOUNDER') return true;
    const roles = (profile.roles || []).map((r) => r.toString().toLowerCase());
    return roles.includes('admin');
}
