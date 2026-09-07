import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync, openSync, closeSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { config, ffmpegArgs } from './config.mjs';
import { CDP } from './cdp.mjs';
import { CaptureHealth } from './health.mjs';

const children = [], clients = [], logFiles = [];
let runDir, ffmpeg, stopping = false, healthTimer;
const stop = async (code = 0) => {
  if (stopping) return; stopping = true;
  clearInterval(healthTimer);
  // Let FFmpeg finalize MP4 before shutting down its audio/video sources.
  if (ffmpeg && ffmpeg.exitCode === null) {
    ffmpeg.kill('SIGINT');
    await Promise.race([new Promise(r => ffmpeg.once('exit',r)), delay(5000)]);
  }
  clients.forEach(c => c.close());
  for (const child of children.reverse()) if (child.exitCode === null) child.kill('SIGTERM');
  await delay(1000);
  for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
  logFiles.forEach(fd => closeSync(fd));
  // Only this run's mkdtemp directory is removed; logs/recording live outside it.
  if (runDir) rmSync(runDir, {recursive:true,force:true});
  process.exitCode = code;
  if (process.connected) process.disconnect();
};
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());

async function main() {
  const c = config(process.argv.slice(2));
  if (process.getuid?.() === 0) throw Error('Run as a dedicated non-root user; Chrome sandbox remains enabled');
  for (const bin of ['Xvfb','xauth','ffmpeg',c.chrome,c.pulse]) {
    const check = spawnSync('which',[bin],{encoding:'utf8'});
    if (check.status !== 0) throw Error(`Missing ${bin}; see docs/broadcaster.md`);
  }
  if (existsSync(`/tmp/.X${c.display}-lock`) || existsSync(`/tmp/.X11-unix/X${c.display}`))
    throw Error(`Display :${c.display} already in use; choose BROADCAST_DISPLAY`);
  if (c.mode === 'record' && existsSync(c.output)) throw Error('Output already exists; choose another BROADCAST_OUTPUT');
  mkdirSync(dirname(c.output),{recursive:true});
  const logDir = `${c.output}.logs`; mkdirSync(logDir,{recursive:true,mode:0o700});
  runDir = mkdtempSync(join(tmpdir(),'reporoad-broadcast-'));
  const display = `:${c.display}`, auth = join(runDir,'Xauthority');
  writeFileSync(auth,'',{mode:0o600});
  const xauth = spawnSync('xauth',['-f',auth,'add',display,'.',randomBytes(16).toString('hex')]);
  if (xauth.status !== 0) throw Error('Could not initialize private Xauthority');
  const pulseDir = join(runDir,'pulse'); mkdirSync(pulseDir,{mode:0o700});
  const socket = `unix:${join(pulseDir,'native')}`;
  const env = {...process.env, DISPLAY:display,XAUTHORITY:auth,PULSE_SERVER:socket,
    PULSE_SINK:'reporoad',PULSE_SOURCE:'reporoad.monitor',PULSE_RUNTIME_PATH:pulseDir};
  if(c.audioLibraryPath)env.LD_LIBRARY_PATH=c.audioLibraryPath;
  function launch(name,bin,args) {
    const fd=openSync(join(logDir,`${name}.log`),'w',0o600);logFiles.push(fd);
    const child=spawn(bin,args,{env,stdio:['ignore',fd,fd]}); children.push(child);
    child.on('error',e=>{console.error(`${name}: ${e.message}`);void stop(1);});
    child.on('exit',()=>{if(!stopping){console.error(`${name} exited; stopping broadcaster. See ${logDir}`);void stop(1);}});
    return child;
  }
  launch('xvfb','Xvfb',[display,'-screen','0',`${c.width}x${c.height}x24`,'-nolisten','tcp','-auth',auth,'-noreset']);
  // Private audio server: no hardware sink/source and no microphone modules.
  const pulseConfig=join(runDir,'pulse.pa');
  writeFileSync(pulseConfig,`load-module module-native-protocol-unix socket=${join(pulseDir,'native')} auth-anonymous=1\nload-module module-null-sink sink_name=reporoad rate=48000 channels=2\nset-default-sink reporoad\nset-default-source reporoad.monitor\n`,{mode:0o600});
  launch('pulse',c.pulse,['-n','--daemonize=no','--exit-idle-time=-1','--use-pid-file=no','--log-target=stderr',
    ...(c.pulseModules ? ['--dl-search-path',c.pulseModules] : []),'-F',pulseConfig]);
  async function until(fn, seconds=30) {
    const end=Date.now()+seconds*1000;
    while(!stopping && Date.now()<end) {const v=await fn();if(v)return v;await delay(250);}
    throw Error('Startup timed out; inspect run logs');
  }
  await until(()=>existsSync(join(pulseDir,'native')) && existsSync(`/tmp/.X11-unix/X${c.display}`));
  const profile=join(runDir,'chrome');
  launch('chrome',c.chrome,[`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
    '--no-first-run','--no-default-browser-check','--password-store=basic','--disable-sync',
    '--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows','--force-device-scale-factor=1',`--window-size=${c.width},${c.height}`,
    '--window-position=0,0','--kiosk',`--use-angle=${c.angle}`,
    ...(c.allowSoftware && c.angle==='swiftshader' ? ['--enable-unsafe-swiftshader'] : []),
    ...(c.angle==='vulkan' ? ['--enable-features=Vulkan','--disable-vulkan-surface'] : []),'about:blank']);
  const portFile=join(profile,'DevToolsActivePort');await until(()=>existsSync(portFile));
  const [port, browserPath]=readFileSync(portFile,'utf8').trim().split('\n');
  const browser=await CDP.connect(`ws://127.0.0.1:${port}${browserPath}`); clients.push(browser);
  const targets=await until(async()=>{try { const v=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();return v.find(t=>t.type==='page'); }catch{return false;}});
  const page=await CDP.connect(targets.webSocketDebuggerUrl); clients.push(page);
  await page.send('Page.enable');await page.send('Runtime.enable');
  const errors=[];
  page.on('Runtime.exceptionThrown',e=>{ errors.push(e.exceptionDetails?.exception?.description || e.exceptionDetails?.text); if(errors.length>50)errors.shift(); });
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__broadcastProbe={frames:0,audio:[],events:{},started:performance.now()};
    const probe=window.__broadcastProbe;
    const tick=()=>{probe.frames++;requestAnimationFrame(tick)};requestAnimationFrame(tick);
    const original=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){
      if(!probe.audio.includes(this)) { probe.audio.push(this);
        for(const type of ['waiting','stalled','seeking','error'])this.addEventListener(type,()=>{probe.events[type]=(probe.events[type]||0)+1});
      } return original.apply(this,args);
    };
  `});
  await page.send('Page.navigate',{url:c.url});
  await until(()=>page.evaluate(`Boolean(document.querySelector('.broadcast canvas'))`),90);
  await page.evaluate(`(()=>{const style=document.createElement('style');style.textContent='.broadcast-exit{display:none!important}';document.head.appendChild(style)})()`);
  const gpu=await browser.send('SystemInfo.getInfo');
  const renderer=gpu.gpu.auxAttributes?.glRenderer || JSON.stringify(gpu.gpu.devices);
  console.log(`Renderer: ${renderer}`);
  if (!c.allowSoftware && /swiftshader|llvmpipe|softpipe|software/i.test(renderer)) throw Error('Software renderer detected; fix GPU/ANGLE configuration, or explicitly set BROADCAST_ALLOW_SOFTWARE=1 for a diagnostic run');
  const audioReady=async()=>{
    const missing=await page.evaluate(`document.querySelector('[data-broadcast-error]')?.textContent`);
    if(missing) throw Error(missing);
    return page.evaluate(`window.__broadcastProbe.audio.some(a=>!a.paused && a.readyState>=3 && a.currentTime>0)`);
  };
  await until(audioReady,90);
  await delay(c.warmup*1000);
  if(stopping)return;
  const size=await page.evaluate(`({width:innerWidth,height:innerHeight})`);
  // Without a window manager Chrome's kiosk border can consume one pixel.
  // Capture remains the exact configured X screen size; reject larger mismatch.
  if(Math.abs(size.width-c.width)>2 || Math.abs(size.height-c.height)>2)throw Error(`Unexpected browser viewport ${JSON.stringify(size)}; expected ${c.width}x${c.height}`);
  const started=Date.now();
  const probe=async()=>page.evaluate(`(()=>{const p=window.__broadcastProbe;return {frames:p.frames,now:performance.now(),audio:p.audio.map(a=>({paused:a.paused,time:a.currentTime,ready:a.readyState,volume:a.volume})),events:p.events}})()`);
  let last=await probe();const samples=[];
  const logFd=openSync(join(logDir,'ffmpeg.log'),'w',0o600);logFiles.push(logFd);
  const args=ffmpegArgs(c,display,socket);
  const health = new CaptureHealth(Date.now(), c.stallSeconds * 1000);
  // Destination is never printed. FFmpeg may include it in errors; redact stderr.
  ffmpeg=spawn('ffmpeg',args,{env,stdio:['ignore','pipe','pipe']});children.push(ffmpeg);
  let progress='', progressLines='';ffmpeg.stdout.on('data',d=>{
    progress+=d; if(progress.length>12000)progress=progress.slice(-12000);
    progressLines+=d; const lines=progressLines.split('\n'); progressLines=lines.pop();
    for(const line of lines) { const match=/^out_time_us=(\d+)/.exec(line); if(match) health.progress(Number(match[1]), Date.now()); }
  });
  const {writeSync}=await import('node:fs');
  let errorTail='';ffmpeg.stderr.on('data',d=>{
    let text=errorTail+d.toString();
    const split=text.lastIndexOf('\n');if(split<0){errorTail=text;return;}
    errorTail=text.slice(split+1);text=text.slice(0,split+1);
    if(c.destination)text=text.replaceAll(c.destination,'[REDACTED STREAM DESTINATION]');writeSync(logFd,text);
  });
  ffmpeg.on('error',e=>{console.error(e.message);void stop(1);});
  let checking=false;
  healthTimer=setInterval(async()=>{
    if(checking||stopping)return;checking=true;
    try {
      const current=await probe();
      const fps=Math.round((current.frames-last.frames)*1000/(current.now-last.now));
      samples.push({seconds:Math.round((Date.now()-started)/1000),fps,...current});
      if(samples.length>720)samples.shift();
      if(process.connected)process.send({type:'heartbeat'});
      console.log(`Capture ${samples.at(-1).seconds}s · browser ${fps} FPS · audio ${current.audio.some(a=>!a.paused&&a.ready>=3)?'playing':'waiting'}`);
      const unhealthy = health.check(current, last, Date.now());
      if(unhealthy)throw Error(unhealthy);
      last=current;
    } catch(e) {if(!stopping){console.error(e.message);void stop(1);}} finally{checking=false;}
  },5000);
  console.log(c.mode==='record' ? `Recording ${c.seconds}s to ${c.output}` : 'Streaming to configured destination');
  if(process.connected)process.send({type:'capturing'});
  const exit=await new Promise(resolve=>ffmpeg.once('exit',resolve));
  clearInterval(healthTimer);
  writeFileSync(join(logDir,'report.json'),JSON.stringify({url:c.url,renderer,features:gpu.gpu.featureStatus,width:c.width,height:c.height,fps:c.fps,encoder:c.encoder,exit,errors,samples,progress},null,2));
  if(exit!==0 && !stopping)throw Error(`Encoder exited ${exit}; inspect ${logDir}/ffmpeg.log`);
  console.log(`Report: ${logDir}/report.json`);
  await stop(exit===0?0:1);
}
main().catch(async e=>{console.error(e.message);await stop(1);});
