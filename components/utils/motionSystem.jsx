/**
 * Standardized Motion System for REDSCAR OpsShell
 * Motion communicates operational state changes—no decorative animation.
 * All durations: 150–250ms. Easing: ease-in-out (no elastic).
 */

// Easing curves for operational clarity
export const MOTION_EASING = {
  // Quick, predictable state transitions
  standard: [0.4, 0, 0.2, 1],  // ease-in-out cubic
  // Fast acknowledge/dismiss
  quick: [0.6, 0, 0.4, 1],     // faster ease-in-out
};

// Duration constants (milliseconds)
export const MOTION_DURATION = {
  fast: 150,      // Quick state changes (toggle, collapse)
  standard: 200,  // Normal state transitions
  slow: 250,      // Alert entrance/focus
};

/**
 * State Change Animation
 * For toggles, expansions, visibility changes
 */
export const motionStateChange = {
  initial: { opacity: 0, y: -2 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -2 },
  transition: {
    duration: MOTION_DURATION.fast,
    ease: MOTION_EASING.standard,
  },
};

/**
 * Alert Entrance
 * For critical alerts, notifications, incoming events
 */
export const motionAlertEntrance = {
  initial: { opacity: 0, scale: 0.95, y: -8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -8 },
  transition: {
    duration: MOTION_DURATION.slow,
    ease: MOTION_EASING.standard,
  },
};

/**
 * Log Entry Addition
 * For new log entries, timeline items
 */
export const motionLogEntry = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: {
    duration: MOTION_DURATION.standard,
    ease: MOTION_EASING.standard,
  },
};

/**
 * Highlight/Emphasis
 * For drawing attention to changed state (status update)
 */
export const motionHighlight = {
  initial: { backgroundColor: 'rgba(234, 88, 12, 0.2)' },
  animate: { backgroundColor: 'rgba(234, 88, 12, 0)' },
  transition: {
    duration: MOTION_DURATION.slow + 100,
    ease: 'easeOut',
  },
};

/**
 * Collapse/Expand
 * For accordion-like state changes
 */
export const motionCollapse = (isOpen) => ({
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: {
    duration: MOTION_DURATION.standard,
    ease: MOTION_EASING.standard,
  },
});

/**
 * Badge/Status Update
 * For inline status or badge changes
 */
export const motionStatusChange = {
  initial: { scale: 0.9 },
  animate: { scale: 1 },
  transition: {
    duration: MOTION_DURATION.fast,
    ease: MOTION_EASING.quick,
  },
};