'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import { Input } from './ui/input';
import RepositoryAvatar from './repository-avatar';
import { supportLinks, type Repository } from '@/lib/repositories';
export default function RepoDirectory({ repositories, status }: { repositories: Repository[]; status: string }) {
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [descending, setDescending] = useState(true);
  const filtered = repositories.filter(r => `${r.fullName} ${r.language || ''}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (descending ? b.stars - a.stars : a.stars - b.stars) || a.fullName.localeCompare(b.fullName));
  const pages = Math.max(1, Math.ceil(filtered.length / 5)), current = Math.min(page, pages), start = (current - 1) * 5;
  const numbers = [...new Set([1, current - 1, current, current + 1, pages].filter(n => n > 0 && n <= pages))].sort((a,b) => a-b);
  return <section className="road-directory"><h2>Along the road</h2><p className="muted">One shared road. Every place is a repository.</p>
    <label className="repo-search"><Search size={16}/><Input aria-label="Search repositories" placeholder="Find a repository…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}/></label>
    <div className="road-table-head"><span>Repository</span><button onClick={() => { setDescending(!descending); setPage(1); }} aria-label={`Sort stars ${descending ? 'ascending' : 'descending'}`}><Star size={14}/> Stars {descending ? '↓' : '↑'}</button></div>
    <ol className="road-repos" start={start + 1}>{filtered.slice(start, start + 5).map((r, i) => <li key={r.fullName}>
      <a className="road-repo-row" href={`https://github.com/${r.fullName}`} target="_blank" rel="noopener noreferrer" title={`Open ${r.fullName} on GitHub`}><span className="road-rank">{start + i + 1}</span><RepositoryAvatar fullName={r.fullName}/><span className="road-repo-name"><small>{r.fullName.split('/')[0]}</small><strong>{r.name}</strong></span><span className="road-stars" title={`${r.stars.toLocaleString()} stars`}><Star size={13}/>{Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 }).format(r.stars)}</span><ChevronRight size={15}/></a>
      {(r.building.support?.helpWanted || r.building.support?.sponsor) && <div className="road-support">{r.building.support.helpWanted && <a href={supportLinks(r.fullName)?.helpWanted} target="_blank" rel="noopener noreferrer">Help wanted ↗</a>}{r.building.support.sponsor && <a href={supportLinks(r.fullName)?.sponsor} target="_blank" rel="noopener noreferrer">♥ Sponsor ↗</a>}</div>}
    </li>)}</ol>
    {!filtered.length && <p className="repo-empty">{query ? 'No matching repositories.' : 'The road is waiting for its first discovered places. Create a .reporoad.yml in the Add tab.'}</p>}
    <nav className="road-pagination" aria-label="Repository pages"><small>{filtered.length ? start + 1 : 0}–{Math.min(start + 5, filtered.length)} of {filtered.length}</small><button aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={15}/></button>{numbers.map((n,i) => <span key={n}>{i > 0 && n > numbers[i-1] + 1 && <span className="page-gap">…</span>}<button aria-label={`Page ${n}`} aria-current={n === current ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button></span>)}<button aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight size={15}/></button></nav>
    <p className="repo-data-status" role="status">{status}</p>
  </section>;
}
