export function broadcastStatus(state: {
  queued: number | null;
  crossing: boolean;
  remaining: number;
  waiting: boolean;
  nextIn: number;
  error: string;
}) {
  if (state.queued === null || state.error) return {
    headline: 'Connecting to the crossing…', detail: 'Waiting for the shared queue',
  };
  const count = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
  if (state.crossing) return {
    headline: `${count(state.remaining)} ${state.remaining === 1 ? 'chicken' : 'chickens'} left to cross`,
    detail: state.queued ? `${count(state.queued)} queued for the next crossing` : 'The drive resumes when they’re across',
  };
  const seconds = Math.max(0, Math.ceil(state.nextIn));
  return {
    headline: `${count(state.queued)} ${state.queued === 1 ? 'chicken' : 'chickens'} queued`,
    detail: state.waiting ? 'At the lights · checking the queue…' : `Next crossing in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
  };
}
