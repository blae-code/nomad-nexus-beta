
const ACCESS_GATE_ROUTE = '/access-gate';

function normalizePageName(pageName: string) {
  return pageName.trim().replace(/(Page|Screen|View)$/i, '').trim();
}

export function createPageUrl(pageName: string) {
  const [rawName, query] = pageName.split('?');
  const normalizedName = normalizePageName(rawName);
  const normalizedLower = normalizedName.toLowerCase();
  const compactKey = normalizedLower.replace(/[\s-_]/g, '');

  const path =
    compactKey === 'accessgate'
      ? ACCESS_GATE_ROUTE
      : '/' + normalizedLower.replace(/ /g, '-');

  return query ? `${path}?${query}` : path;
}
