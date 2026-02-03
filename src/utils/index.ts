export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
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
