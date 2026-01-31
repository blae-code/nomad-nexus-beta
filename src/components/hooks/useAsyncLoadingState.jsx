/**
 * useAsyncLoadingState — Hook to manage loading state for async operations
 * Automatically shows/hides AsyncLoadingOverlay
 */

import { useState, useCallback } from 'react';

export default function useAsyncLoadingState(defaultMessage = 'Processing...') {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(defaultMessage);

  const withLoading = useCallback(async (asyncFn, customMessage = null) => {
    try {
      if (customMessage) setMessage(customMessage);
      setIsLoading(true);
      const result = await asyncFn();
      return result;
    } finally {
      setIsLoading(false);
      setMessage(defaultMessage);
    }
  }, [defaultMessage]);

  return {
    isLoading,
    message,
    setMessage,
    setIsLoading,
    withLoading,
  };
}