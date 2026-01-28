import { memo } from 'react';

/**
 * Memoization utilities for performance optimization
 */

/**
 * Deep comparison for props (use sparingly - expensive)
 */
export function deepCompare(prevProps, nextProps) {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
}

/**
 * Shallow comparison for props (recommended for most cases)
 */
export function shallowCompare(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) return false;
  
  for (let key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) return false;
  }
  
  return true;
}

/**
 * Memo wrapper with shallow comparison
 */
export const memoShallow = (Component) => memo(Component, shallowCompare);

/**
 * Common prop comparisons
 */
export const compareById = (prev, next) => prev.id === next.id;
export const compareByEventId = (prev, next) => prev.eventId === next.eventId;
export const compareByUser = (prev, next) => prev.user?.id === next.user?.id;