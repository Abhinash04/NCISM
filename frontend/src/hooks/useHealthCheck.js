import { useState, useEffect } from 'react';
import { openDataLoaderService } from '@/services/opendataloader.service';

export function useHealthCheck() {
  const [status, setStatus] = useState('checking'); // checking, online, offline
  const [message, setMessage] = useState('');

  const checkHealth = async () => {
    const res = await openDataLoaderService.checkHealth();
    if (res.status === 'online') {
      setStatus('online');
    } else {
      setStatus('offline');
    }
    setMessage(res.message || 'Unknown status');
  };

  useEffect(() => {
    // Run the health check asynchronously so it doesn't synchronously update state during render
    let isMounted = true;
    
    const runCheck = async () => {
      const res = await openDataLoaderService.checkHealth();
      if (!isMounted) return;
      if (res.status === 'online') {
        setStatus('online');
      } else {
        setStatus('offline');
      }
      setMessage(res.message || 'Unknown status');
    };
    
    runCheck();
    const interval = setInterval(runCheck, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { status, message, checkHealth };
}
