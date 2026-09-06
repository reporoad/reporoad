'use client';
import { useEffect, useState } from 'react';
export function usePresence() {
  const [online, setOnline] = useState<number | null>(null);
  useEffect(() => {
    let id: string;
    try {
      id = localStorage.getItem('chilldrive-visitor') || crypto.randomUUID();
      localStorage.setItem('chilldrive-visitor', id);
    } catch { id = crypto.randomUUID(); }
    let stopped = false;
    const heartbeat = async () => {
      try {
        const response = await fetch('/api/presence', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (!response.ok) throw Error();
        const data = await response.json() as { online: number };
        if (!stopped) setOnline(data.online);
      } catch { if (!stopped) setOnline(null); }
    };
    void heartbeat();
    const timer = setInterval(heartbeat, 25000);
    return () => { stopped = true; clearInterval(timer); };
  }, []);
  return online;
}
