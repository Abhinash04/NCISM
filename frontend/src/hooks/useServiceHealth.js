import { useEffect, useState } from 'react';
import { extractionApi } from '@/services/extractionApi';

const POLL_INTERVAL_MS = 10_000;

/** Polls the Python extraction service. null = unknown, true/false = up/down. */
export function useServiceHealth() {
  const [healthy, setHealthy] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const result = await extractionApi.checkHealth();
      if (!cancelled) setHealthy(result);
    };

    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return healthy;
}
