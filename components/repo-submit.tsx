'use client';
import { useId, useState } from 'react';
import { Input } from './ui/input';
export default function RepoSubmit() {
  const id=useId(), [address,setAddress]=useState(''), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  return <form className="repo-submit" onSubmit={async e=>{
    e.preventDefault(); if(busy)return; setBusy(true); setMessage('Checking the public GitHub repository…');
    try {
      const response=await fetch('/api/repositories/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repository:address}),signal:AbortSignal.timeout(25000)});
      const data=await response.json() as {error?:string;repository?:{fullName:string}}; if(!response.ok || !data.repository)throw Error(data.error || 'Unable to submit repository.');
      setMessage(`${data.repository.fullName} is on the road. Its building uses repository settings when available, or a default style.`);
      window.dispatchEvent(new Event('reporoad:directory-updated'));
    } catch(error) {setMessage(error instanceof Error ? error.message : 'Unable to submit repository.');}
    finally {setBusy(false);}
  }}>
    <label htmlFor={id}>Add a GitHub repository</label>
    <p className="fine">Paste any public GitHub repository. No file or repository changes needed. Adding a repository does not claim ownership.</p>
    <Input id={id} placeholder="github.com/owner/repo" required maxLength={250} value={address} onChange={e=>setAddress(e.target.value)} disabled={busy}/>
    <button className="btn" disabled={busy}>{busy?'Checking…':'Submit repository'}</button>
    {message && <p className="fine" role="status">{message}</p>}
  </form>;
}
