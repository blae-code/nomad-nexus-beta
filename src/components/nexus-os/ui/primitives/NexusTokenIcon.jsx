/**
 * NexusTokenIcon - Standardized tactical token renderer
 * 
 * Renders PNG token assets with consistent sizing and accessibility.
 * Use for all operational icons: status, objectives, roles, priorities.
 * 
 * DESIGN COMPLIANCE:
 * - Sizing: w-3 (sm), w-4 (md), w-5 (lg), w-6 (xl)
 * - Always includes alt text and optional tooltip
 * - Color semantics enforced via tokenAssetMap
 * 
 * @see components/nexus-os/ui/tokens/TOKEN_USAGE_GUIDE.md
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';
import { getTokenAssetUrl } from '../tokens/tokenAssetMap';

const SIZE_CLASSES = {
  sm: 'w-3 h-3',   // 12px
  md: 'w-4 h-4',   // 16px
  lg: 'w-5 h-5',   // 20px
  xl: 'w-6 h-6',   // 24px
};

/**
 * @param {Object} props
 * @param {string} props.family - Token family (circle, hex, target, penta, etc.)
 * @param {string} props.color - Token color (red, orange, yellow, green, blue, cyan, grey, purple, violet)
 * @param {string} [props.variant='base'] - Token variant (base, v1, v2) - only for number tokens
 * @param {string} [props.size='md'] - Size preset (sm, md, lg, xl)
 * @param {string} [props.className] - Additional classes
 * @param {string} [props.tooltip] - Tooltip text (shows on hover)
 * @param {string} [props.alt] - Alt text override (auto-generated if not provided)
 */
export default function NexusTokenIcon({
  family,
  color = 'grey',
  variant = 'base',
  size = 'md',
  className = '',
  tooltip,
  alt,
  ...props
}) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const tokenUrl = getTokenAssetUrl(family, color, { variant });
  
  // Auto-generate alt text if not provided
  const altText = alt || `${color} ${family} token`;
  
  return (
    <img
      src={tokenUrl}
      alt={altText}
      title={tooltip}
      className={`${sizeClass} ${className} inline-block flex-shrink-0`}
      loading="lazy"
      {...props}
    />
  );
}