'use client';
import { useEffect, useRef, useState } from 'react';
import { chickenCycle, MAX_CHICKENS_PER_SESSION } from '@/lib/chickens';
type Snapshot = { round: number; queued: number; crossingCount: number };
export function useChickens(now: number) {
  const cycle = chickenCycle(now);
  const roundRef = useRef(cycle.round); roundRef.current = cycle.round;
  const local = useRef({ id: '', round: cycle.round, total: 0, accepted: 0 });
  const [pending, setPending] = useState(0);
  const [snapshot, setSnapshot] = useState({ round: -1, queued: 0, crossingCount: 0 });
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    // Fetch the final previous-round count promptly at the traffic light.
    void fetch(`/api/chickens?round=${cycle.round}`, { signal: controller.signal }).then(async response => {
      if (response.ok) { const data = await response.json() as Snapshot; setSnapshot(old => data.round >= old.round ? data : old); }
    }).catch(() => {});
    return () => controller.abort();
  }, [cycle.round]);
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
          if (!result.ok) throw Error(result.status === 429 ? 'Busy crossing — your clicks are queued.' : 'Clicks pending — reconnecting…');
          const data = await result.json() as { accepted: number };
          if (round === state.round) { state.accepted = data.accepted; setPending(state.total - state.accepted); }
        }
        const response = await fetch('/api/chickens', { signal: controller.signal });
        if (!response.ok) throw Error('Crossing unavailable — reconnecting…');
        const data = await response.json() as Snapshot;
        if (!stopped) { setSnapshot(old => data.round >= old.round ? data : old); setError(''); }
      } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : 'Reconnecting…'); }
      finally { if (!stopped) timer = setTimeout(tick, 10000 + Math.random() * 1000); }
    }
    void tick();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, []);
  function add() {
    const state = local.current;
    if (state.round !== cycle.round) { state.round = cycle.round; state.total = 0; state.accepted = 0; }
    if (state.total >= MAX_CHICKENS_PER_SESSION) { setError('Your flock is full for this crossing!'); return; }
    state.total++; setPending(state.total - state.accepted);
  }
  return { ...cycle, add, pending, error, queued: snapshot.round === cycle.round ? snapshot.queued : null,
    crossingCount: snapshot.round === cycle.round ? snapshot.crossingCount : null };
}
