import { config, reclaimDisplay } from './config.mjs';
import { supervise } from './supervisor.mjs';
import { spawnSync } from 'node:child_process';

try {
  if(Number(process.versions.node.split('.')[0])<22)throw Error('Node.js 22+ required; this runner uses the built-in WebSocket client.');
  const c = config(process.argv.slice(2));
  if (c.mode === 'record') await import('./worker.mjs');
  else {
    if(process.getuid?.() === 0)throw Error('Run as a non-root user.');
    for (const bin of ['Xvfb','xauth','ffmpeg',c.chrome,c.pulse])
      if(spawnSync('which',[bin],{stdio:'ignore'}).status !== 0)throw Error(`Missing ${bin}; see docs/broadcaster.md`);
    if(!reclaimDisplay(c.display))throw Error(`Display :${c.display} is occupied. Stop the previous broadcaster or choose BROADCAST_DISPLAY.`);
    console.log('Stream supervisor enabled: output/browser/audio monitoring, automatic retries, Ctrl+C to stop.');
    await supervise(new URL('./worker.mjs', import.meta.url), ['stream']);
  }
} catch(error) { console.error(error.message); process.exitCode = 1; }
