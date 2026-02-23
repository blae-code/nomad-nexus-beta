import React from 'react';
import { getTokenAssetUrl, getNumberTokenAssetUrl } from './tokenAssetMap';

/**
 * TokenRenderer — Universal token display component.
 * Renders tactical tokens with optional label, tooltip, animation.
 */
export default function TokenRenderer({
  family,
  number,
  color = 'grey',
  variant = 'base',
  size = 'md',
  label,
  tooltip,
  animated = false,
  className = '',
  onClick,
}) {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const url = number !== undefined 
    ? getNumberTokenAssetUrl(number, color, { variant })
    : getTokenAssetUrl(family, color, { variant });

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      title={tooltip}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
    >
      <img
        src={url}
        alt={label || `${family || `number-${number}`} token`}
        className={`${sizeMap[size]} ${animated ? 'animate-pulse' : ''} flex-shrink-0`}
        loading="lazy"
      />
      {label && (
        <span className="text-xs font-semibold text-zinc-300 truncate">
          {label}
        </span>
      )}
    </div>
  );
}