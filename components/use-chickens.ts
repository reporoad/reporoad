'use client';
import { useEffect, useRef, useState } from 'react';
import { chickenCycle, type CrossingSchedule } from '@/lib/chickens';
type Snapshot = CrossingSchedule & { queued: number };
export function useChickens(now: number) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const cycle = chickenCycle(now, snapshot);
  const roundRef = useRef(cycle.round); roundRef.current = cycle.round;
  const local = useRef({ id: '', round: cycle.round, total: 0, accepted: 0 });
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    // Fetch the final previous-round count promptly at the traffic light.
    void fetch(`/api/chickens?round=${cycle.round}`, { signal: controller.signal }).then(async response => {
      if (response.ok) { const data = await response.json() as Snapshot; setSnapshot(old => !old || data.round >= old.round ? data : old); }
    }).catch(() => {});
    return () => controller.abort();
  }, [cycle.waiting]);
  useEffect(() => {
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    local.current.id = crypto.randomUUID();
    async function tick() {
      const state = local.current;
      if (state.round !== roundRef.current) {
        if (state.total > state.accepted) setError('Some unsent clicks missed the last crossing.');
        state.round = roundRef.current; state.total = 0; state.accepted = 0; setPending(0);
      }
      try {
        if (state.total > state.accepted) {
          const total = Math.min(state.total, state.accepted + 200), round = state.round;
          const result = await fetch('/api/chickens', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: state.id, round, total }), signal: controller.signal });
          if (!result.ok) setError(result.status === 429 ? 'Busy crossing — your clicks are queued.' : 'Clicks pending — refreshing crossing…');
          else {
            const data = await result.json() as { accepted: number };
            if (round === state.round) { state.accepted = data.accepted; setPending(state.total - state.accepted); }
          }
        }
        const response = await fetch('/api/chickens', { signal: controller.signal });
        if (!response.ok) throw Error('Crossing unavailable — reconnecting…');
        const data = await response.json() as Snapshot;
        if (!stopped) { setSnapshot(old => !old || data.round >= old.round ? data : old); setError(''); }
      } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : 'Reconnecting…'); }
      finally { if (!stopped) timer = setTimeout(tick, 10000 + Math.random() * 1000); }
    }
    void tick();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, []);
  function add() {
    const state = local.current;
    if (state.round !== cycle.round) { state.round = cycle.round; state.total = 0; state.accepted = 0; }
    if (!snapshot) return;
    state.total++; setPending(state.total - state.accepted);
  }
  return { ...cycle, add, pending, error, schedule: snapshot, queued: snapshot?.queued ?? null,
    crossingCount: snapshot?.crossingCount ?? null };
}
