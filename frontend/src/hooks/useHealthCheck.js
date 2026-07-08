import { useState, useEffect } from 'react';
import { openDataLoaderService } from '@/services/opendataloader.service';

export function useHealthCheck() {
  const [status, setStatus] = useState('checking'); // checking, online, offline, timeout, network_error
  const [message, setMessage] = useState('');

  const checkHealth = async () => {
    try {
      const res = await openDataLoaderService.checkHealth();
      if (res.status === 'online') {
        setStatus('online');
      } else {
        setStatus(res.status || 'offline');
      }
      setMessage(res.message || 'Unknown status');
    } catch (err) {
      console.error('Unexpected health check error:', err);
      setStatus('offline');
      setMessage('Backend Offline');
    }
  };

  useEffect(() => {
    // Run the health check asynchronously so it doesn't synchronously update state during render
    let isMounted = true;
    
    const runCheck = async () => {
      try {
        const res = await openDataLoaderService.checkHealth();
        if (!isMounted) return;
        if (res.status === 'online') {
          setStatus('online');
        } else {
          setStatus(res.status || 'offline');
        }
        setMessage(res.message || 'Unknown status');
      } catch (err) {
        console.error('Unexpected health check error:', err);
        if (!isMounted) return;
        setStatus('offline');
        setMessage('Backend Offline');
      }
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
