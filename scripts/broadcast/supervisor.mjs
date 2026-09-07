import { fork } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { restartDelay } from './health.mjs';

export async function supervise(worker, args, { spawnWorker = fork, sleep = delay, log = console.log, startupMs = 240000, heartbeatMs = 45000, tickMs = 1000, signal } = {}) {
  let child, stopping = false, failures = 0, killTimer;
  const abort = new AbortController();
  function terminate() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    clearTimeout(killTimer);
    const target = child;
    killTimer = setTimeout(() => {
      try { process.kill(-target.pid, 'SIGKILL'); } catch { /* Already exited. */ }
    }, 12000);
  }
  const stop = () => { stopping = true; abort.abort(); terminate(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  signal?.addEventListener('abort', stop, {once:true});
  try {
    if (signal?.aborted) return;
    while (!stopping) {
      const started = Date.now(); let lastHeartbeat = started, capturing = false, timedOut = false;
      child = spawnWorker(worker, args, { detached: true, stdio: ['ignore','inherit','inherit','ipc'] });
      const current = child;
      current.on('message', message => {
        if (message?.type === 'heartbeat' || message?.type === 'capturing') {
          lastHeartbeat = Date.now(); if(message.type === 'capturing')capturing = true;
        }
      });
      const watchdog = setInterval(() => {
        if (!timedOut && Date.now() - lastHeartbeat > (capturing ? heartbeatMs : startupMs)) {
          timedOut = true; log('Broadcaster stopped responding; restarting its isolated session.'); terminate();
        }
      }, tickMs);
      const result = await new Promise(resolve => {
        current.once('exit', (code, signal) => resolve({code,signal}));
        current.once('error', () => resolve({code:1}));
      });
      clearInterval(watchdog); clearTimeout(killTimer);
      // Each worker owns its process group; clean up descendants of abrupt crashes.
      try { process.kill(-current.pid, 'SIGKILL'); } catch { /* Normal clean exit. */ }
      child = undefined;
      if (stopping) break;
      if (Date.now() - started >= 300000) failures = 0;
      const seconds = restartDelay(failures++);
      log(`Broadcaster exited ${result.code ?? result.signal}; retrying in ${seconds}s. Ctrl+C stops retries.`);
      try { await sleep(seconds * 1000, undefined, {signal:abort.signal}); } catch { if(!stopping)throw Error('Retry wait failed'); }
    }
  } finally {
    process.off('SIGINT',stop); process.off('SIGTERM',stop);
    signal?.removeEventListener('abort',stop); clearTimeout(killTimer);
  }
}
