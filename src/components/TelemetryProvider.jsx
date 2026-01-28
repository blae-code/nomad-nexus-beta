import React, { createContext, useContext } from 'react';

/**
 * TelemetryProvider — Analytics and observability context.
 * Stub: Provides no-op tracking functions. Will integrate with base44.analytics later.
 */
const TelemetryContext = createContext();

export const TelemetryProvider = ({ children }) => {
  const trackEvent = (eventName, properties = {}) => {
    // Stub: No-op tracking
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Telemetry] ${eventName}`, properties);
    }
  };

  const trackPageView = (pageName) => {
    trackEvent('page_view', { page: pageName });
  };

  const trackError = (errorName, details) => {
    trackEvent('error', { error: errorName, details });
  };

  return (
    <TelemetryContext.Provider value={{ trackEvent, trackPageView, trackError }}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  return context;
};