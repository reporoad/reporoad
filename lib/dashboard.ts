import { chickenCycle, type CrossingSchedule } from './chickens.ts';
export function dashboardState(now: number, schedule: CrossingSchedule | null | undefined, live: boolean, playing: boolean) {
  const cycle = chickenCycle(now, schedule);
  const seconds = schedule ? (now - schedule.departAt) / 1000 : 0;
  const smooth = (u: number) => u * u * (3 - 2 * u);
  const speed = !live ? (playing ? 6.5 : 0) : !schedule || seconds <= 0 || seconds >= 300 ? 0
    : seconds < 4 ? 6.5 * smooth(seconds / 4)
    : seconds > 296 ? 6.5 * (1 - smooth((seconds - 296) / 4)) : 6.5;
  const status = !live ? (playing ? 'PREVIEW' : 'PARKED') : !schedule ? 'SYNCING'
    : cycle.crossing ? 'CROSSING' : now < schedule.departAt ? 'WAIT'
    : cycle.waiting ? 'WAIT' : seconds >= 296 ? 'BRAKING' : 'DRIVING';
  return { speedKph: speed * 3.6, status, live,
    signal: !live ? 'LOCAL' : !schedule ? 'SYNC' : now < schedule.departAt || cycle.waiting || seconds >= 296 ? 'RED' : 'GREEN',
    nextLight: live && schedule && now >= schedule.departAt && !cycle.waiting ? cycle.nextIn : null,
    remaining: live && schedule ? cycle.remaining : null };
}
export type DashboardState = ReturnType<typeof dashboardState>;
export function drawDashboard(ctx: CanvasRenderingContext2D, state: DashboardState) {
  ctx.fillStyle = '#121811'; ctx.fillRect(0, 0, 768, 240);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#51422c'; ctx.fillRect(246, 24, 2, 192); ctx.fillRect(506, 24, 2, 192);
  ctx.fillStyle = '#dc984a'; ctx.font = '22px monospace';
  ctx.fillText(state.live ? 'LIVE SPEED' : 'PREVIEW SPEED', 122, 24);
  // Square amber ticks form a vintage gauge, but the reading still follows
  // the actual road velocity. Pixel-aligned marks stay crisp on the texture.
  const speedFraction = Math.max(0, Math.min(1, state.speedKph / 30));
  for (let i = 0; i < 19; i++) {
    const angle = Math.PI * (0.85 + i / 18 * 1.3);
    const x = Math.round(122 + Math.cos(angle) * 98);
    const y = Math.round(130 + Math.sin(angle) * 85);
    ctx.fillStyle = speedFraction > 0 && i / 18 <= speedFraction ? '#e8a74d' : '#493821';
    const size = i % 3 === 0 ? 10 : 6;
    ctx.fillRect(x - size / 2, y - 5, size, 10);
  }
  ctx.fillStyle = '#f1b665';
  ctx.font = 'bold 64px monospace'; ctx.fillText(Math.round(state.speedKph).toString().padStart(2, '0'), 122, 142);
  ctx.font = '24px monospace'; ctx.fillText('km/h', 122, 177);
  ctx.fillStyle = '#b27c3c'; ctx.font = '20px monospace';
  ctx.fillText('0', 40, 218); ctx.fillText('30', 204, 218);
  ctx.fillStyle = '#dc984a'; ctx.font = '22px monospace'; ctx.fillText('TRAFFIC', 376, 36);
  ctx.fillStyle = state.signal === 'RED' ? '#ff7555' : state.signal === 'GREEN' ? '#b5ce73' : '#dc984a';
  ctx.font = 'bold 42px monospace'; ctx.fillText(state.signal, 376, 93);
  ctx.font = '22px monospace'; ctx.fillText(state.status, 376, 132);
  ctx.fillStyle = '#dc984a'; ctx.font = '20px monospace'; ctx.fillText('NEXT LIGHT', 376, 174);
  ctx.font = '32px monospace'; ctx.fillText(state.nextLight === null ? '—' : `${Math.floor(state.nextLight/60)}:${String(state.nextLight%60).padStart(2,'0')}`, 376, 214);
  ctx.font = '22px monospace'; ctx.fillText('CHICKENS', 638, 36);
  const count = state.remaining === null ? '—' : state.remaining.toLocaleString('en-US');
  ctx.font = `bold ${count.length > 7 ? 29 : count.length > 4 ? 38 : 68}px monospace`;
  ctx.fillText(count,638,123,218);
  ctx.font = '20px monospace'; ctx.fillText('STILL TO CROSS',638,164);
  ctx.font = '22px monospace'; ctx.fillText(state.status === 'CROSSING' ? 'PLEASE WAIT' : state.live ? 'SHARED ROAD' : 'LOCAL ONLY',638,207);
}
