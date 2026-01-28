/**
 * Severity-based color system
 * Maps operational states to restrained, meaningful colors
 */

export const SEVERITY_LEVELS = {
  NOMINAL: 'nominal',
  INFO: 'info',
  ACTIVE: 'active',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

export const SEVERITY_COLORS = {
  nominal: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-950',
    border: 'border-emerald-900',
    badge: 'text-emerald-600 border-emerald-900 bg-emerald-950/20',
  },
  info: {
    text: 'text-blue-600',
    bg: 'bg-blue-950',
    border: 'border-blue-900',
    badge: 'text-blue-600 border-blue-900 bg-blue-950/20',
  },
  active: {
    text: 'text-amber-600',
    bg: 'bg-amber-950',
    border: 'border-amber-900',
    badge: 'text-amber-600 border-amber-900 bg-amber-950/20',
  },
  warning: {
    text: 'text-orange-600',
    bg: 'bg-orange-950',
    border: 'border-orange-900',
    badge: 'text-orange-600 border-orange-900 bg-orange-950/20',
  },
  critical: {
    text: 'text-red-500',
    bg: 'bg-red-950',
    border: 'border-red-900',
    badge: 'text-red-500 border-red-900 bg-red-950/20',
    glow: 'shadow-lg shadow-red-950/50',
    animate: 'animate-pulse',
  },
};

/**
 * Get color classes for a severity level
 * @param {string} level - Severity level (nominal, info, active, warning, critical)
 * @param {string} variant - Color variant (text, bg, border, badge, glow, animate)
 */
export function getSeverityColor(level, variant = 'text') {
  const colors = SEVERITY_COLORS[level] || SEVERITY_COLORS.nominal;
  return colors[variant] || '';
}

/**
 * Get full badge classes for a severity level
 */
export function getSeverityBadge(level) {
  const colors = SEVERITY_COLORS[level] || SEVERITY_COLORS.nominal;
  return colors.badge;
}

/**
 * Determine severity from event status
 */
export function getEventSeverity(status) {
  const statusMap = {
    cancelled: SEVERITY_LEVELS.INFO,
    failed: SEVERITY_LEVELS.WARNING,
    aborted: SEVERITY_LEVELS.WARNING,
    completed: SEVERITY_LEVELS.NOMINAL,
    active: SEVERITY_LEVELS.CRITICAL,
    pending: SEVERITY_LEVELS.ACTIVE,
    scheduled: SEVERITY_LEVELS.INFO,
  };
  return statusMap[status] || SEVERITY_LEVELS.INFO;
}

/**
 * Determine severity from priority
 */
export function getPrioritySeverity(priority) {
  const priorityMap = {
    CRITICAL: SEVERITY_LEVELS.CRITICAL,
    HIGH: SEVERITY_LEVELS.WARNING,
    STANDARD: SEVERITY_LEVELS.ACTIVE,
    LOW: SEVERITY_LEVELS.INFO,
  };
  return priorityMap[priority] || SEVERITY_LEVELS.NOMINAL;
}

/**
 * Determine severity from alert type
 */
export function getAlertSeverity(type) {
  const typeMap = {
    distress: SEVERITY_LEVELS.CRITICAL,
    emergency: SEVERITY_LEVELS.CRITICAL,
    alert: SEVERITY_LEVELS.WARNING,
    caution: SEVERITY_LEVELS.ACTIVE,
    info: SEVERITY_LEVELS.INFO,
    ok: SEVERITY_LEVELS.NOMINAL,
  };
  return typeMap[type] || SEVERITY_LEVELS.INFO;
}