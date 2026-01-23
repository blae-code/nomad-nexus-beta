import { useCallback, useRef } from 'react';

/**
 * Exponential backoff retry logic for API calls.
 * Prevents network thrashing on repeated failures.
 * Base delay 1s, max 32s, jitter +/- 10%
 */
export function useExponentialBackoff(maxRetries = 5) {
  const attemptsRef = useRef(0);

  const calculateDelay = useCallback((attempt) => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 32000; // 32 seconds
    const delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = delayMs * 0.1 * (Math.random() * 2 - 1); // +/- 10%
    return Math.max(100, delayMs + jitter);
  }, []);

  const resetAttempts = useCallback(() => {
    attemptsRef.current = 0;
  }, []);

  const getDelay = useCallback(() => {
    if (attemptsRef.current >= maxRetries) {
      return null;
    }
    const delay = calculateDelay(attemptsRef.current);
    attemptsRef.current += 1;
    return delay;
  }, [calculateDelay, maxRetries]);

  return { getDelay, resetAttempts, attempts: attemptsRef.current };
}