// Optional Ubuntu helper: extract distro packages privately; never replace the
// user's PipeWire/PulseAudio services. System-installed PulseAudio also works.
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const temp=mkdtempSync(join(tmpdir(),'reporoad-audio-bootstrap-'));
const target=resolve('.tools/pulseaudio');mkdirSync(target,{recursive:true});
try {
  execFileSync('apt-get',['download','pulseaudio','pulseaudio-utils'],{cwd:temp,stdio:'inherit'});
  for(const file of readdirSync(temp).filter(f=>f.endsWith('.deb')))
    execFileSync('dpkg-deb',['-x',join(temp,file),target],{stdio:'inherit'});
  console.log(`Private audio binaries installed in ${target}. Shared libraries still use the host Ubuntu packages.`);
}finally{rmSync(temp,{recursive:true,force:true});}
