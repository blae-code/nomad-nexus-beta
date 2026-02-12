const VARIANT_TOKEN_PATTERN = /^(?:CQB|LOOP)-(\d{2})$/i;

function extractVariantNumber(value: string): string | null {
  const token = String(value || '').trim();
  if (!token) return null;
  const match = token.match(VARIANT_TOKEN_PATTERN);
  if (!match) return null;
  return match[1];
}

export function normalizeGameplayLoopVariantId(value: string, fallback = 'CQB-01'): string | null {
  const parsed = extractVariantNumber(value);
  if (parsed) return `CQB-${parsed}`;
  const fallbackParsed = extractVariantNumber(fallback);
  return fallbackParsed ? `CQB-${fallbackParsed}` : null;
}

export function isGameplayLoopVariantToken(value: string): boolean {
  return Boolean(extractVariantNumber(value));
}

export function formatGameplayLoopVariantId(value: string, fallback = 'LOOP-01'): string {
  const parsed = extractVariantNumber(value);
  if (parsed) return `LOOP-${parsed}`;
  const fallbackParsed = extractVariantNumber(fallback);
  return fallbackParsed ? `LOOP-${fallbackParsed}` : 'LOOP-01';
}
