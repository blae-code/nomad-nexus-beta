import { useEffect } from 'react';
import { NX_ICON_SIZES, NX_SPACING, NX_TYPOGRAPHY } from '../ui/theme/design-tokens';

const ALLOWED_FONT_SIZES = new Set(['8px', '10px']);
const ALLOWED_PADDING = new Set(['p-1.5', 'p-2', 'p-2.5', 'px-2.5', 'py-2', 'px-2', 'py-1.5', 'px-1.5', 'py-1']);
const ALLOWED_GAPS = new Set(['gap-1', 'gap-1.5', 'gap-2']);
const ICON_SIZE_CLASSES = Object.values(NX_ICON_SIZES);
const TOKEN_SIZE_PATTERN = /\bw-(2\.5|3|3\.5|4|5|6)\b.*\bh-(2\.5|3|3\.5|4|5|6)\b/;
const TYPOGRAPHY_PATTERNS = Object.values(NX_TYPOGRAPHY).map((entry) => {
  const token = String(entry || '').trim().replace(/\s+/g, '\\s+');
  return new RegExp(token);
});

function toArray(listLike) {
  return Array.from(listLike || []);
}

function hasClassLike(className, pattern) {
  return pattern.test(String(className || '').trim().replace(/\s+/g, ' '));
}

function pxValue(raw) {
  const value = Number.parseFloat(String(raw || '').replace('px', ''));
  return Number.isFinite(value) ? value : 0;
}

function parseTrackingPx(style) {
  const spacing = String(style.letterSpacing || '').trim();
  if (!spacing) return 0;
  if (spacing.endsWith('em')) return Number.parseFloat(spacing) * pxValue(style.fontSize || '0px');
  return pxValue(spacing);
}

export function validateTypography(element, expectedScale = '') {
  if (!element || typeof window === 'undefined') return [];
  const style = window.getComputedStyle(element);
  const violations = [];
  const fontSize = String(style.fontSize || '');
  const fontWeight = Number.parseInt(String(style.fontWeight || '0'), 10);
  const trackingPx = parseTrackingPx(style);
  const transform = String(style.textTransform || '').toLowerCase();
  const className = String(element.className || '');

  if (!ALLOWED_FONT_SIZES.has(fontSize)) {
    violations.push(`font-size expected 8px or 10px; found ${fontSize || 'n/a'}`);
  }
  if (!(fontWeight >= 600)) {
    violations.push(`font-weight expected >= 600; found ${style.fontWeight || 'n/a'}`);
  }
  if (trackingPx < 0.96) {
    violations.push(`letter-spacing expected >= 0.12em equivalent; found ${style.letterSpacing || 'n/a'}`);
  }
  if (transform !== 'uppercase') {
    violations.push(`text-transform expected uppercase; found ${style.textTransform || 'n/a'}`);
  }
  if (expectedScale) {
    const expected = String(NX_TYPOGRAPHY[expectedScale] || '').trim();
    if (expected && !hasClassLike(className, new RegExp(expected.replace(/\s+/g, '\\s+')))) {
      violations.push(`typography scale mismatch for ${expectedScale}`);
    }
  } else if (!TYPOGRAPHY_PATTERNS.some((pattern) => hasClassLike(className, pattern))) {
    violations.push('missing registered Nexus typography scale');
  }
  return violations;
}

export function validateSpacing(element, context = '') {
  if (!element) return [];
  const className = String(element.className || '');
  const violations = [];
  const classTokens = className.split(/\s+/).filter(Boolean);
  const paddingTokens = classTokens.filter((token) => /^p([trblxy])?-/.test(token));
  const gapTokens = classTokens.filter((token) => /^gap[xy]?-[\d.]+/.test(token));

  for (const token of paddingTokens) {
    if (!ALLOWED_PADDING.has(token) && token !== 'p-0' && token !== 'px-0' && token !== 'py-0') {
      violations.push(`unsupported padding token "${token}"${context ? ` (${context})` : ''}`);
    }
  }
  for (const token of gapTokens) {
    if (!ALLOWED_GAPS.has(token)) {
      violations.push(`unsupported gap token "${token}"${context ? ` (${context})` : ''}`);
    }
  }
  if (className.includes('overflow-y-auto') || className.includes('overflow-y-scroll')) {
    violations.push('internal vertical scroll detected');
  }
  return violations;
}

export function validateIconSize(iconElement) {
  if (!iconElement || typeof window === 'undefined') return [];
  const style = window.getComputedStyle(iconElement);
  const width = pxValue(style.width);
  const height = pxValue(style.height);
  const className = String(iconElement.className || '');
  const violations = [];

  if (width < 10 || width > 24 || height < 10 || height > 24) {
    violations.push(`icon size out of matrix range (10-24px): ${width}x${height}`);
  }
  if (!ICON_SIZE_CLASSES.some((entry) => className.includes(entry.split(' ')[0])) && !TOKEN_SIZE_PATTERN.test(className)) {
    violations.push(`icon missing standard size class: "${className}"`);
  }
  return violations;
}

export function validateColors(element) {
  if (!element || typeof window === 'undefined') return [];
  const className = String(element.className || '');
  const style = window.getComputedStyle(element);
  const violations = [];
  const hasOpacityBg = /bg-[\w-]+\/\d+/.test(className);
  const hasBlur = className.includes('backdrop-blur-sm') || className.includes('backdrop-blur');
  const hasDecorativeGradient = className.includes('bg-gradient') && !className.includes('hover:bg-gradient');
  const borderOpacityMatches = /border-zinc-(700|800)\/(40|50|60|70)/.test(className);

  if (hasOpacityBg && !hasBlur && style.backdropFilter === 'none') {
    violations.push('opacity backdrop requires blur pairing');
  }
  if (hasDecorativeGradient) {
    violations.push('decorative gradient detected outside interaction state');
  }
  if (className.includes('border-zinc-700') || className.includes('border-zinc-800')) {
    if (!borderOpacityMatches && !/border-zinc-(700|800)\/(40|60)/.test(className)) {
      violations.push('border opacity outside 40-60% standard range');
    }
  }
  return violations;
}

function walkNodes(root) {
  const nodes = [];
  if (!root) return nodes;
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    nodes.push(node);
    queue.push(...toArray(node.children));
  }
  return nodes;
}

export function runFullAudit(rootElement, options = {}) {
  const nodes = walkNodes(rootElement);
  const report = {
    nodesAudited: nodes.length,
    violations: [],
    score: 100,
  };
  for (const node of nodes) {
    const className = String(node.className || '');
    if (!className) continue;
    const typography = validateTypography(node);
    const spacing = validateSpacing(node);
    const color = validateColors(node);
    const icon = className.includes('lucide') || className.includes('token') || className.includes('icon') ? validateIconSize(node) : [];
    const all = [...typography, ...spacing, ...color, ...icon];
    if (all.length === 0) continue;
    report.violations.push({
      node: node.tagName || 'unknown',
      className,
      issues: all,
    });
  }
  const maxPenalty = Math.max(1, nodes.length);
  const penalty = Math.min(100, Math.round((report.violations.length / maxPenalty) * 100));
  report.score = Math.max(0, 100 - penalty);

  if (options.logWarnings !== false && typeof console !== 'undefined' && report.violations.length > 0) {
    console.warn('[NexusOS][StyleGuide] violations', report.violations);
    console.warn(`[NexusOS][StyleGuide] score ${report.score}`);
  }
  if (options.strict && report.violations.length > 0) {
    throw new Error(`[NexusOS][StyleGuide] strict mode violation count ${report.violations.length}`);
  }
  return report;
}

/**
 * React helper for dev-only audits.
 */
export function useStyleGuideAudit(rootRef, options = {}) {
  useEffect(() => {
    const isDev = Boolean((import.meta || {}).env?.DEV);
    if (!isDev) return;
    const root = rootRef && 'current' in rootRef ? rootRef.current : rootRef;
    if (!root) return;
    runFullAudit(root, { logWarnings: true, ...options });
  }, [rootRef, options]);
}

