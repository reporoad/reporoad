import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function config(argv, env = process.env) {
  const mode = argv[0] || 'record';
  if (!['record', 'stream'].includes(mode)) throw Error('Usage: node scripts/broadcast/run.mjs record|stream');
  const integer = (key, fallback, min, max) => {
    const n = Number(env[key] || fallback);
    if (!Number.isInteger(n) || n < min || n > max) throw Error(`Invalid ${key}`);
    return n;
  };
  const url = new URL(env.REPOROAD_URL || 'http://localhost:3000/?broadcast=1');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Use an HTTP(S) page URL without credentials');
  url.searchParams.set('broadcast', '1');
  for (const key of ['quality', 'mirror', 'v']) url.searchParams.delete(key);
  const width = integer('BROADCAST_WIDTH', 1280, 640, 3840);
  const height = integer('BROADCAST_HEIGHT', 720, 360, 2160);
  if (width % 2 || height % 2) throw Error('Dimensions must be even');
  const encoder = env.BROADCAST_ENCODER || 'h264_nvenc';
  if (!['h264_nvenc', 'libx264'].includes(encoder)) throw Error('Encoder must be h264_nvenc or libx264');
  let destination;
  if (mode === 'stream') {
    if (!env.BROADCAST_STREAM_URL_FILE) throw Error('Streaming requires BROADCAST_STREAM_URL_FILE (a private file containing the full RTMPS URL/key)');
    destination = readFileSync(env.BROADCAST_STREAM_URL_FILE, 'utf8').trim();
    const target = new URL(destination);
    if (!['rtmp:', 'rtmps:'].includes(target.protocol)) throw Error('Destination must be RTMP(S)');
  }
  const privatePulse=resolve('.tools/pulseaudio');
  const bundled=!env.BROADCAST_PULSE && existsSync(`${privatePulse}/usr/bin/pulseaudio`);
  const pulseLib=bundled ? `${privatePulse}/usr/lib/${readdirSync(`${privatePulse}/usr/lib`).find(p=>p.startsWith('pulse-'))}/modules` : undefined;
  const triplet=bundled ? readdirSync(`${privatePulse}/usr/lib`).find(p=>p.endsWith('-linux-gnu')) : undefined;
  return { mode, url: url.href, width, height, encoder, destination,
    videoKbps: integer('BROADCAST_VIDEO_KBPS', 6000, 1000, 20000),
    stallSeconds: integer('BROADCAST_STALL_SECONDS', 20, 10, 120),
    fps: integer('BROADCAST_FPS', 30, 10, 60),
    seconds: integer('BROADCAST_SECONDS', 60, 5, 86400),
    display: integer('BROADCAST_DISPLAY', 97, 10, 199),
    warmup: integer('BROADCAST_WARMUP', 10, 2, 120),
    output: resolve(env.BROADCAST_OUTPUT || `outputs/broadcast/${new Date().toISOString().replaceAll(':','-')}.mp4`),
    chrome: env.BROADCAST_CHROME || 'google-chrome',
    pulse: env.BROADCAST_PULSE || (bundled ? `${privatePulse}/usr/bin/pulseaudio` : 'pulseaudio'),
    pulseModules: env.BROADCAST_PULSE_MODULES || pulseLib,
    audioLibraryPath: bundled ? [`${privatePulse}/usr/lib/${triplet}/pulseaudio`,`/usr/lib/${triplet}/pulseaudio`,pulseLib,env.LD_LIBRARY_PATH].filter(Boolean).join(':') : env.LD_LIBRARY_PATH,
    angle: env.BROADCAST_ANGLE || 'vulkan',
    allowSoftware: env.BROADCAST_ALLOW_SOFTWARE === '1',
  };
}

export function ffmpegArgs(c, display, pulseSocket) {
  const codec = c.encoder === 'h264_nvenc'
    ? ['-c:v','h264_nvenc','-preset','p4','-tune','ll','-rc','cbr']
    : ['-c:v','libx264','-preset','veryfast','-tune','zerolatency'];
  return ['-hide_banner','-nostdin','-n',
    '-thread_queue_size','512','-f','x11grab','-draw_mouse','0','-framerate',String(c.fps),
    '-video_size',`${c.width}x${c.height}`,'-i',`${display}.0+0,0`,
    '-thread_queue_size','512','-f','pulse','-server',pulseSocket,'-sample_rate','48000','-channels','2','-i','reporoad.monitor',
    '-map','0:v:0','-map','1:a:0',...codec,'-b:v',`${c.videoKbps}k`,'-maxrate',`${c.videoKbps}k`,'-bufsize',`${c.videoKbps*2}k`,
    '-g',String(c.fps*2),'-pix_fmt','yuv420p','-r',String(c.fps),
    '-c:a','aac','-b:a','192k','-ar','48000','-af','aresample=async=1:first_pts=0',
    '-progress','pipe:1','-stats_period','2',
    ...(c.mode === 'record' ? ['-t',String(c.seconds),'-movflags','+faststart',c.output]
      : ['-rw_timeout','15000000','-flvflags','no_duration_filesize','-f','flv',c.destination])];
}
