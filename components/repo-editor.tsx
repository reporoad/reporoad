'use client';
import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Slider } from './ui/slider';
import { Download, Code2 as Github, Check, Upload } from 'lucide-react';
import { Input } from './ui/input';
import { NativeSelect, NativeSelectOption } from './ui/native-select';
import RepositoryBuilding from './repository-building';
import RepoSubmit from './repo-submit';
import { BUILDING_STYLES, CONFIG_PATH, parseBuildingConfig, serializeBuildingConfig, type BuildingStyle, type Repository } from '@/lib/repositories';

const LABELS = { woodland: 'Cabin', stone: 'Workshop', cafe: 'Café', brick: 'Brick house', greenhouse: 'Greenhouse', townhouse: 'Townhouse' };
const COLORS = ['#778565', '#b7d879', '#ad5542', '#ebd9bd', '#718bad'];
const defaults = (): BuildingStyle => ({ version: 1, style: 'woodland', color: '#778565', roof: 'gable', garden: true, signText: '', support: { sponsor: false, helpWanted: false } });

function PreviewCamera({floors}:{floors:number}) {
  const {camera,size,invalidate}=useThree();
  useEffect(()=>{
    const height=floors*2.4+2;
    const halfAngle=Math.min(21*Math.PI/180,Math.atan(Math.tan(21*Math.PI/180)*size.width/size.height));
    const distance=Math.hypot(6,6,height/2)/Math.sin(halfAngle)*1.1;
    const length=Math.hypot(11,6,16);
    camera.position.set(11/length*distance,height/2+6/length*distance,16/length*distance);
    camera.lookAt(0,height/2,0);camera.updateProjectionMatrix();invalidate();
  },[camera,size.width,size.height,floors,invalidate]);
  return null;
}

export default function RepoEditor({ active = true }: { active?: boolean }) {
  const [building, setBuilding] = useState<BuildingStyle>(defaults);
  const [address, setAddress] = useState('');
  const [identity, setIdentity] = useState('reporoad/your-repo');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [floors,setFloors] = useState(1);
  const [githubLogin,setGithubLogin] = useState<string | null>(null);
  const [settingsMode,setSettingsMode] = useState<'website'|'file'>('website');
  useEffect(()=>{
    let stopped=false;
    fetch('/api/github/session',{cache:'no-store'}).then(r=>r.json() as Promise<{login?:string}>).then(data=>{if(!stopped)setGithubLogin(data.login || null);}).catch(()=>{});
    if(new URLSearchParams(window.location.search).get('github')==='error')setMessage('GitHub sign-in did not finish. Please connect again.');
    return ()=>{stopped=true;};
  },[]);
  const preview = useMemo<Repository>(() => ({ fullName: identity, name: identity.split('/')[1], stars: floors*10000, description: '', language: null, defaultBranch: 'main', fetchedAt: 0, configStatus: 'custom', building }), [identity, building, floors]);
  const update = (patch: Partial<BuildingStyle>) => setBuilding(old => ({ ...old, ...patch }));
  function apply(raw: string) {
    const parsed = parseBuildingConfig(raw);
    if (!parsed) throw Error('Invalid settings. Use version 1, a supported style, a six-digit hex color and a gable or flat roof. Files must be under 8 KB.');
    setBuilding({ ...defaults(), ...parsed });
  }
  async function load() {
    const name = address.trim().replace(/^https:\/\/github\.com\//i, '').replace(/^github\.com\//i, '').replace(/\/$/, '');
    if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(name) || name.split('/')[1] === '.' || name.split('/')[1] === '..') { setMessage('Enter a public GitHub repository: owner/repo.'); return; }
    setBusy(true); setMessage('Loading settings…');
    try {
      const response = await fetch(`/api/repositories/building?repository=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(25000), cache:'no-store' });
      const data=await response.json() as {error?:string;repository:Repository;mode:string};
      if(!response.ok)throw Error(data.error || 'Could not load settings.');
      apply(JSON.stringify(data.repository.building)); setIdentity(data.repository.fullName);
      setSettingsMode(data.mode==='website' || data.repository.configStatus!=='custom'?'website':'file');
      setFloors(Math.min(50,Math.max(1,Math.floor(data.repository.stars/10000))));
      setMessage('Loaded the current building. Choose Website-managed to save your edits here.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load settings.'); }
    finally { setBusy(false); }
  }
  async function saveDesign() {
    setBusy(true);setMessage('Verifying GitHub permissions…');
    try {
      const response=await fetch('/api/repositories/building',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repository:address,mode:settingsMode,building}),signal:AbortSignal.timeout(45000)});
      const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error || 'Could not save.');
      setMessage(settingsMode==='website'?'Saved! Your design is now on the shared road.':'File-managed settings restored. Website overrides have been removed.');
      window.dispatchEvent(new Event('reporoad:directory-updated'));
    } catch(error){setMessage(error instanceof Error?error.message:'Could not save. Your preview is still here.');}
    finally{setBusy(false);}
  }
  function download() {
    const content = serializeBuildingConfig(building);
    if (!parseBuildingConfig(content)) { setMessage('Check your settings before downloading.'); return; }
    const url = URL.createObjectURL(new Blob([content], { type: 'application/yaml' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = CONFIG_PATH; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Downloaded ${CONFIG_PATH}. Commit it at the root of your public repository on its default branch.`);
  }
  return <section className="place-editor">
    <h2>Add a place</h2>
    <RepoSubmit/>
    <h3>Customize a building</h3><p className="muted">Owners and repository administrators can save a design here—no commits needed.</p>
    {githubLogin ? <div className="fine">Connected as <strong>{githubLogin}</strong> · <button className="btn" onClick={async()=>{const r=await fetch('/api/github/session',{method:'DELETE'});if(r.ok)setGithubLogin(null);else setMessage('Could not disconnect. Please try again.');}}>Disconnect GitHub</button></div> : <a className="btn" href="https://reporoad.org/api/github/start" target="_top">Connect GitHub to claim and edit</a>}
    <p className="fine">First <a href="https://github.com/apps/reporoad/installations/new" target="_blank" rel="noopener noreferrer">install RepoRoad</a> for the repository you manage. This grants read-only metadata access, not code-writing access. Connect before designing; sign-in reloads the page.</p>
    <label htmlFor="load-repo">Load an existing place <small>(optional)</small></label>
    <div className="place-load"><Github size={18}/><Input id="load-repo" placeholder="github.com/owner/repo" value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void load(); }}/><button className="btn" disabled={busy} onClick={load}>{busy ? 'Loading…' : 'Load'}</button></div>
    <label className="file-load"><Upload size={13}/> Or open a .reporoad.yml file<input type="file" accept=".yml,.yaml" disabled={busy} onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { if (file.size > 8192) throw Error('File exceeds 8 KB.'); apply(await file.text()); setMessage('File loaded. Adjust the settings below.'); } catch (error) { setMessage(String(error instanceof Error ? error.message : error)); } }}/></label>
    <div className="place-preview" aria-label="Live building preview">
      {active && <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [11, 8, 16], fov: 42, near: 0.1, far: 2000 }}>
        <PreviewCamera floors={floors}/>
        <color attach="background" args={['#18221c']}/><ambientLight intensity={1.4}/><directionalLight position={[3, 10, 6]} intensity={3}/>
        <RepositoryBuilding repo={preview} season="Summer"/>
      </Canvas>}<small>Live preview · {floors} {floors===1?'floor':'floors'}</small>
    </div>
    <label id="preview-floors-label">Preview height · {floors} {floors===1?'floor':'floors'}</label>
    <Slider aria-labelledby="preview-floors-label" min={1} max={50} step={1} value={[floors]} onValueChange={value=>setFloors(Array.isArray(value)?value[0]:value)}/>
    <p className="fine">Preview only. Actual height comes from GitHub stars: one floor per 10,000 stars, with a minimum of one. Not saved in your repo file.</p>
    <label>Building</label><div className="building-choices">{(['woodland', 'stone', 'cafe', 'brick', 'greenhouse', 'townhouse'] as typeof BUILDING_STYLES[number][]).map(style => <button key={style} className={`building-choice ${building.style === style ? 'selected' : ''}`} aria-pressed={building.style === style} onClick={() => update({ style })}>
      <svg viewBox="0 0 80 60" aria-hidden="true"><rect x="15" y="25" width="50" height="30" fill={style === 'stone' ? '#81877d' : style === 'greenhouse' ? '#6f9e91' : building.color}/><path d={style === 'townhouse' ? 'M10 24H70V18H10Z' : 'M7 26L40 5L73 26Z'} fill="#55432f"/><rect x="34" y="35" width="13" height="20" fill="#443623"/><path d="M21 33h8v10h-8zm32 0h8v10h-8z" fill="#efc774"/>{style === 'cafe' && <path d="M12 28h56v8H12z" fill="#f1d3a1"/>}</svg>
      {building.style === style && <Check size={15}/>}<span>{LABELS[style]}</span></button>)}</div>
    <label htmlFor="sign-text">Sign text</label><Input id="sign-text" maxLength={48} placeholder="Repository name (default)" value={building.signText || ''} onChange={e => update({ signText: e.target.value })}/>
    <label>Accent color</label><div className="accent-choices">{COLORS.map(color => <button key={color} aria-label={`Accent ${color}`} aria-pressed={building.color === color} style={{ background: color }} onClick={() => update({ color })}>{building.color === color && <Check size={17}/>}</button>)}<input type="color" aria-label="Custom accent color" value={building.color} onChange={e => update({ color: e.target.value })}/></div>
    <label htmlFor="roof">Roof</label><NativeSelect id="roof" value={building.roof} onChange={e => update({ roof: e.target.value as BuildingStyle['roof'] })}><NativeSelectOption value="gable">Gable</NativeSelectOption><NativeSelectOption value="flat">Flat</NativeSelectOption></NativeSelect>
    <label className="place-toggle">Garden<input type="checkbox" role="switch" checked={building.garden !== false} onChange={e => update({ garden: e.target.checked })}/></label>
    <label className="place-toggle">Help wanted sign<input type="checkbox" role="switch" checked={!!building.support?.helpWanted} onChange={e => update({ support: { ...building.support, helpWanted: e.target.checked } })}/></label>
    <label className="place-toggle">Sponsor heart<input type="checkbox" role="switch" checked={!!building.support?.sponsor} onChange={e => update({ support: { ...building.support, sponsor: e.target.checked } })}/></label>
    <p className="fine">The heart indicates that the repository is seeking sponsorship. Visitors can open the repository to learn more.</p>
    <div className="place-export"><p>Optional: commit <code>{CONFIG_PATH}</code> at your repo’s root to publish this design.</p><button className="btn primary" onClick={download}><Download size={17}/> Get repo file</button><button className="reset-place" onClick={() => { setBuilding(defaults()); setFloors(1); setIdentity('reporoad/your-repo'); setAddress(''); setMessage(''); }}>Reset changes</button></div>
    {message && <p className="notice" role="status">{message}</p>}
    <label htmlFor="building-source">Settings source</label>
    <NativeSelect id="building-source" value={settingsMode} onChange={e=>setSettingsMode(e.target.value as 'website'|'file')}><NativeSelectOption value="website">Website-managed</NativeSelectOption><NativeSelectOption value="file">Repository file / defaults</NativeSelectOption></NativeSelect>
    <p className="fine">Website-managed overrides the file. Switching back removes that override. GitHub owner or administrator permissions are checked on every save.</p>
    <button className="btn primary" disabled={busy || !githubLogin || !address.trim()} onClick={saveDesign}>{busy?'Checking…':settingsMode==='website'?'Verify ownership & save design':'Use repository file / defaults'}</button>
  </section>;
}
