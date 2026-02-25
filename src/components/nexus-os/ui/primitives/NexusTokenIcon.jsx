import React, { useMemo, useState } from 'react';
import { NX_TOKEN_SIZES } from '../theme/design-tokens';
import { getNumberTokenAssetUrl, getTokenAssetUrl } from '../tokens';

const FALLBACK_TOKEN = { family: 'square', color: 'grey', variant: 'base' };

function isNumberFamily(family) {
  return /^number-(\d{1,2})$/.test(String(family || ''));
}

function numberFromFamily(family) {
  const match = String(family || '').match(/^number-(\d{1,2})$/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * NexusTokenIcon - normalized tactical token image renderer.
 */
export default function NexusTokenIcon({
  family = 'square',
  color = 'grey',
  variant = 'base',
  size = 'md',
  className = '',
  tooltip = '',
  alt = '',
  loading = 'lazy',
}) {
  const [broken, setBroken] = useState(false);
  const sizeClass = NX_TOKEN_SIZES[size] || NX_TOKEN_SIZES.md;
  const resolved = broken ? FALLBACK_TOKEN : { family, color, variant };
  const src = useMemo(() => {
    if (isNumberFamily(resolved.family)) {
      const value = numberFromFamily(resolved.family);
      if (value !== null) return getNumberTokenAssetUrl(value, resolved.color, { variant: resolved.variant });
    }
    return getTokenAssetUrl(resolved.family, resolved.color, { variant: resolved.variant });
  }, [resolved.family, resolved.color, resolved.variant]);

  return (
    <img
      src={src}
      alt={alt || `${resolved.family}-${resolved.color}`}
      title={tooltip || undefined}
      loading={loading}
      className={`${sizeClass} object-contain ${className}`.trim()}
      onError={() => setBroken(true)}
      aria-hidden={alt ? undefined : true}
    />
  );
}

