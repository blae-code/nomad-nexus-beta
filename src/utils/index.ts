export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export function getDisplayCallsign(profile?: { display_callsign?: string; callsign?: string } | null) {
    if (!profile) return '';
    return profile.display_callsign || profile.callsign || '';
}
