import { readdir, mkdir, stat, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join, relative, resolve, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
const exec = promisify(execFile);
const source=resolve(process.argv[2] || '/home/joris/Projects/suppers-ai/lofi-songs/10_hour_versions');
const target=resolve(process.argv[3] || 'media/music');
if(source===target || target.startsWith(source+'/'))throw Error('Destination must be outside the source collection');
async function walk(dir) {
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const p=join(dir,entry.name);
    if(entry.isDirectory())result.push(...await walk(p));
    else if(entry.isFile()&&/\.mp3$/i.test(entry.name))result.push(p);
  }
  return result;
}
const files=(await walk(source)).sort(), tracks=new Array(files.length);
await mkdir(target,{recursive:true});let cursor=0;
await Promise.all(Array.from({length:8},async()=>{
  while(cursor<files.length){const index=cursor++,file=files[index],rel=relative(source,file);
    const destination=join(target,'library',rel);
    const {stdout}=await exec('ffprobe',['-v','error','-show_entries','format=duration','-of','json',file]);
    const duration=Number(JSON.parse(stdout).format.duration);
    if(!Number.isFinite(duration)||duration<=10)throw Error(`Invalid duration: ${rel}`);
    const bytes=(await stat(file)).size;
    await mkdir(join(destination,'..'),{recursive:true});
    try { await copyFile(file,destination,1); } catch(e) {
      if(e.code!=='EEXIST')throw e;
      // Never silently overwrite local media; verify an existing copy.
      const [a,b]=await Promise.all([readFile(file),readFile(destination)]);
      if(!a.equals(b))throw Error(`Existing destination differs: ${rel}`);
    }
    tracks[index]={name:basename(rel).replace(/\.mp3$/i,''),collection:rel.split('/')[0].replace(/^\d+_/,'').replaceAll('-',' '),
      src:'/music/library/'+rel.split('/').map(encodeURIComponent).join('/'),duration,bytes};
  }
}));
const version=createHash('sha256').update(JSON.stringify(tracks)).digest('hex').slice(0,16);
await writeFile(join(target,'catalog.json'),JSON.stringify({version,tracks},null,2)+'\n');
console.log(JSON.stringify({tracks:tracks.length,bytes:tracks.reduce((s,t)=>s+t.bytes,0),hours:tracks.reduce((s,t)=>s+t.duration,0)/3600,version,target}));
