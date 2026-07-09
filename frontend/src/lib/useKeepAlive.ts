import { useEffect, useRef } from 'react';

const PING_INTERVAL_MS = 8 * 60 * 1000; // 8 minutes

/**
 * useKeepAlive
 *
 * Silently pings the backend /health endpoint every 8 minutes to prevent
 * Render's free-tier spin-down. The ping is skipped when:
 *   - The browser tab is hidden (document.hidden)
 *   - The user is offline (navigator.onLine === false)
 *
 * The interval resets automatically when the tab becomes visible again,
 * so the server is never left cold for more than 8 minutes while a user
 * is actively on the app.
 */
export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function ping() {
    if (document.hidden || !navigator.onLine) return;

    fetch('/api/health', { method: 'GET', cache: 'no-store' })
      .catch(() => {
        // Silently swallow — server might be briefly unavailable
      });
  }

  function startInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);
  }

  useEffect(() => {
    // Kick off immediately on mount, then every PING_INTERVAL_MS
    ping();
    startInterval();

    // When the tab becomes visible again, ping immediately and reset the clock
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        ping();
        startInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
