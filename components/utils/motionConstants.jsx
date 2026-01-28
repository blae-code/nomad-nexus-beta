// Motion Constants - Operational clarity without decoration
// Use ONLY for state changes, alerts, and log updates
// All timings 150-250ms with non-elastic (cubic-bezier) easing

export const MOTION = {
  // Easing - non-elastic, professional
  EASING: {
    IN: 'cubic-bezier(0.32, 0, 0.67, 0)',
    OUT: 'cubic-bezier(0.33, 1, 0.68, 1)',
    IN_OUT: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },

  // Durations for different scenarios
  DURATION: {
    ALERT: 150,      // Incoming critical alerts
    STATE: 200,      // State changes (expand/collapse)
    LOG: 250,        // Log entries appearing
    TRANSITION: 180, // Tab/view transitions
  },

  // Reusable animation variants for framer-motion
  VARIANTS: {
    // Alert/Critical incoming
    alertFade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15, ease: 'easeOut' }
    },

    // State change (expand/collapse)
    stateSlide: {
      initial: { opacity: 0, y: -8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
      transition: { duration: 0.2, ease: 'easeOut' }
    },

    // Log entry appearing
    logEntry: {
      initial: { opacity: 0, x: -4 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -4 },
      transition: { duration: 0.25, ease: 'easeOut' }
    },

    // Transmit state indicator
    transmitPulse: {
      animate: { opacity: [1, 0.6, 1] },
      transition: { duration: 1, repeat: Infinity, ease: 'linear' }
    },

    // Tab transition
    tabSlide: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.18, ease: 'easeOut' }
    },
  },

  // CSS classes for non-motion transitions (fallback)
  CSS: {
    STATE: 'transition-all duration-200 ease-out',
    ALERT: 'transition-all duration-150 ease-out',
    LOG: 'transition-all duration-250 ease-out',
    SMOOTH: 'transition-colors duration-180 ease-in-out',
  },
};

// Guidance: Do NOT use for:
// - Hover effects (use CSS transitions)
// - Decorative spinning/bouncing
// - Background animations
// - Idle state animations