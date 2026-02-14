const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

function text(value) {
  return String(value || '').trim();
}

function isPrivateIpv4(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split('.').map((entry) => Number(entry));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized.includes(':')) return false;
  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80:')) return true;
  return false;
}

function isPrivateHost(hostname) {
  const normalized = text(hostname).toLowerCase().replace(/\.$/, '');
  if (!normalized) return true;
  if (LOCAL_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.internal') || normalized.endsWith('.home')) return true;
  if (isPrivateIpv4(normalized)) return true;
  if (isPrivateIpv6(normalized)) return true;
  return false;
}

function parseUrl(input) {
  const candidate = text(input);
  if (!candidate) return null;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

export function sanitizeExternalUrl(input, options = {}) {
  const {
    allowHttp = true,
    allowLocalhost = false,
  } = options;

  const parsed = parseUrl(input);
  if (!parsed) return null;
  const protocol = parsed.protocol.toLowerCase();
  if (protocol === 'https:') {
    // allowed
  } else if (protocol === 'http:' && allowHttp) {
    // allowed
  } else {
    return null;
  }

  if (!allowLocalhost && isPrivateHost(parsed.hostname)) return null;
  return parsed.toString();
}

export function sanitizeAttachmentUrl(input, options = {}) {
  const {
    allowHttp = true,
    allowBlob = true,
    allowLocalhost = false,
  } = options;
  const candidate = text(input);
  if (!candidate) return null;
  if (allowBlob && candidate.startsWith('blob:')) return candidate;
  return sanitizeExternalUrl(candidate, { allowHttp, allowLocalhost });
}

export function isLikelyImageUrl(input) {
  const safeUrl = sanitizeAttachmentUrl(input);
  if (!safeUrl) return false;
  const pathname = parseUrl(safeUrl)?.pathname || '';
  return /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/i.test(pathname);
}

export function isLikelyAudioUrl(input) {
  const safeUrl = sanitizeAttachmentUrl(input);
  if (!safeUrl) return false;
  const pathname = parseUrl(safeUrl)?.pathname || '';
  return /\.(mp3|wav|ogg|webm|m4a|aac|flac)$/i.test(pathname);
}

export function safeFileNameFromUrl(input, fallback = 'attachment') {
  const safeUrl = sanitizeAttachmentUrl(input);
  if (!safeUrl) return fallback;
  const pathname = parseUrl(safeUrl)?.pathname || '';
  const tail = pathname.split('/').pop() || fallback;
  const clean = text(tail).replace(/[^\w.\-()]+/g, '_');
  return clean || fallback;
}
