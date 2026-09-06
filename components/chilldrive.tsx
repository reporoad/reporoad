'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  ExternalLink,
  Compass,
  History,
  MessageCircle,
  Plus,
  Volume2,
  Maximize,
  Music2,
  Pause,
  Play,
  Route,
  Search,
  Star,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import RoadScene from './road-scene';
import LiveChat from './live-chat';
import { usePresence } from './use-presence';
import { useChickens } from './use-chickens';
import { PLAYLIST, PlaylistPlayer } from '@/lib/playlist';
import { worldAt, SEASONS, type WorldPreview } from '@/lib/live-world';
import {
  CONFIG_PATH,
  EXAMPLE_CONFIG,
  repositoryFloors,
  type Repository,
} from '@/lib/repositories';
import { CATEGORY_SEED } from '@/lib/category-seed';
import { CATEGORIES, type Category } from '@/lib/repository-categories';

export default function RepoRoad() {
  const [category, setCategory] = useState<Category>('top');
  const [repositories, setRepositories] = useState<Repository[]>(
    CATEGORY_SEED.top.repositories,
  );
  const [dataStatus, setDataStatus] = useState(
    'Verified GitHub snapshot · 5 Sep 2026 · checking for updates…',
  );
  const [selected, setSelected] = useState(
    CATEGORY_SEED.top.repositories[0].fullName,
  );
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('chat');
  const [passing, setPassing] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [recentOnly, setRecentOnly] = useState(false);
  const online = usePresence();
  const [mode, setMode] = useState<'live' | 'studio'>('live');
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [preview, setPreview] = useState<WorldPreview>({
    hour: 16,
    season: 'Summer',
    weather: 'Sunny',
  });
  const [now, setNow] = useState(Date.now);
  const chickens = useChickens(now);
  const [synced, setSynced] = useState(false);
  const clock = useRef({ now: () => Date.now() });
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [focus, setFocus] = useState<{ id: number; key: number } | null>(null);
  const [broadcast, setBroadcast] = useState(
    () => new URLSearchParams(window.location.search).get('broadcast') === '1',
  );
  const [audioOn, setAudioOn] = useState(false),
    [track, setTrack] = useState(0),
    [volume, setVolume] = useState(30);
  const [notice, setNotice] = useState('');
  const radio = useRef<PlaylistPlayer | null>(null);
  const directory = useRef<HTMLElement | null>(null);
  const styleRepos = repositories.length
    ? repositories
    : CATEGORY_SEED.top.repositories;
  const repo = styleRepos.find((r) => r.fullName === selected) || styleRepos[0];
  const environment = worldAt(now, mode === 'studio' ? preview : undefined);
  const filtered = useMemo(
    () =>
      repositories.filter((r) =>
        (!recentOnly || recent.includes(r.fullName)) &&
        `${r.fullName} ${r.description} ${r.language}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [repositories, query, recentOnly, recent],
  );
  const reposRef = useRef(repositories);
  reposRef.current = repositories;
  useEffect(() => {
    let stopped = false;
    async function refresh() {
      try {
        const response = await fetch(`/api/repositories?category=${category}`);
        if (!response.ok) throw Error();
        const data = (await response.json()) as {
          repositories: Repository[];
          source: string;
          warning?: string;
        };
        if (!Array.isArray(data.repositories) || data.repositories.length > 100)
          throw Error();
        if (stopped) return;
        setRepositories(data.repositories);
        const oldest = data.repositories.length
          ? Math.min(...data.repositories.map((r: Repository) => r.fetchedAt))
          : 0;
        setDataStatus(
          data.warning ||
            (oldest
              ? `${data.source === 'github-cache' ? 'GitHub data' : 'Verified snapshot'} · checked ${new Date(oldest).toLocaleString()}`
              : category === 'sponsored'
                ? 'No paid placements are active.'
                : 'No verified building files discovered yet.'),
        );
      } catch {
        if (!stopped)
          setDataStatus(
            'Discovery unavailable · keeping this neighbourhood’s last loaded list.',
          );
      }
    }
    void refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [category]);
  useEffect(() => {
    radio.current = new PlaylistPlayer(setTrack, setAudioOn, () =>
      setNotice('Music could not load. Press play to retry.'),
    );
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBroadcast(false);
    };
    window.addEventListener('keydown', escape);
    return () => {
      radio.current?.dispose();
      window.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => {
    let stopped = false;
    async function sync() {
      const start = performance.now();
      try {
        const response = await fetch('/api/live', { cache: 'no-store' });
        if (!response.ok) throw Error();
        const data = (await response.json()) as { serverTime: number },
          end = performance.now();
        if (stopped) return;
        const anchor = data.serverTime + (end - start) / 2;
        clock.current.now = () => anchor + performance.now() - end;
        setSynced(true);
        if (modeRef.current === 'live')
          radio.current?.sync(clock.current.now());
      } catch {
        if (!stopped) setSynced(false);
      }
    }
    void sync();
    const syncTimer = setInterval(sync, 20000),
      tick = setInterval(() => setNow(clock.current.now()), 1000);
    return () => {
      stopped = true;
      clearInterval(syncTimer);
      clearInterval(tick);
    };
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'get_repository_world',
            description:
              'Read the displayed GitHub repositories, verified star counts, floor counts and style-file status.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: () => ({
              repositories: reposRef.current.map((r) => ({
                fullName: r.fullName,
                stars: r.stars,
                floors: repositoryFloors(r.stars),
                configStatus: r.configStatus,
                fetchedAt: r.fetchedAt,
              })),
            }),
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional browser API. */
    }
    return () => lifecycle.abort();
  }, []);
  async function toggleAudio() {
    if (audioOn) {
      radio.current?.pause();
      setAudioOn(false);
      return;
    }
    try {
      if (mode === 'live') radio.current?.sync(clock.current.now());
      await radio.current?.play();
    } catch {
      setNotice('Press play again to enable audio in this browser.');
    }
  }
  function visit(fullName: string) {
    const index = repositories.findIndex((r) => r.fullName === fullName);
    setSelected(fullName);
    setMode('studio');
    setPlaying(false);
    setFocus({ id: index + 1, key: performance.now() });
  }
  const scene = (
    <div className="drive">
      <RoadScene
        key={category}
        plots={[]}
        repositories={repositories}
        playing={playing}
        environment={environment}
        clock={clock}
        live={mode === 'live'}
        preview={preview}
        focus={focus}
        chickenCount={chickens.crossingCount}
        onPassing={(names) => {
          setPassing(names);
          setRecent((old) => [...names, ...old.filter((name) => !names.includes(name))].slice(0, 20));
        }}
      />
      {!broadcast && (
        <>
          <div className="drive-top">
            <span className="drive-tag" title={synced ? 'Shared live world' : 'Connecting to shared clock'}>
              <span /> {mode === 'live' ? 'LIVE' : 'PREVIEW'}
            </span>
            {mode === 'live' && chickens.crossing && <span className="crossing-banner">🚦 Chicken crossing · {chickens.crossingCount === null ? 'Counting…' : `${chickens.crossingCount.toLocaleString()} chickens`}{(chickens.crossingCount || 0) > 64 ? ' · representative flock' : ''}</span>}
          </div>
          <div className="drive-bottom">
            <div className="passing-card">
              <div><span className="passing-label">PASSING NOW</span>
                <div className="passing-names">{passing.length ? passing.map((name) => <a key={name} href={`https://github.com/${name}`} target="_blank" rel="noopener noreferrer">{name.split('/').pop()} <ExternalLink size={13} /></a>) : CATEGORIES[category].label}</div>
              </div>
              <button className="btn recent-button" onClick={() => { setRecentOnly(true); setQuery(''); setTab('repositories'); }}><History size={18} /> Recently passed</button>
            </div>
            <div className="actions">
              <button
                className="btn icon"
                disabled={mode === 'live'}
                aria-label={playing ? 'Pause the drive' : 'Resume the drive'}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                className="btn icon"
                aria-label="Open clean broadcast view"
                onClick={() => setBroadcast(true)}
              >
                <Maximize size={17} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
  if (broadcast)
    return (
      <main className="app broadcast">
        {scene}
        <button
          className="btn broadcast-exit"
          onClick={() => setBroadcast(false)}
        >
          <X size={16} /> Exit broadcast view
        </button>
      </main>
    );
  return (
    <main className="app repository-world">
      <header className="topbar">
        <div className="brand">
          <Route size={29} />
          <h1>RepoRoad</h1>
          <span className="repo-brand-label">A live lo-fi drive through GitHub.</span>
        </div>
        <span className="header-note">Every roadside place is a repo.</span>
      </header>
      <div className="workspace">
        <section aria-label="Repository world live view">
          <details className="drive-settings"><summary>Drive settings</summary><div className="live-toolbar">
            <div className="actions">
              <button
                className={`btn ${mode === 'live' ? 'primary' : ''}`}
                onClick={() => setMode('live')}
              >
                Live view
              </button>
              <button
                className={`btn ${mode === 'studio' ? 'primary' : ''}`}
                onClick={() => setMode('studio')}
              >
                Studio preview
              </button>
            </div>
            <span className="fine">
              {mode === 'live'
                ? synced
                  ? '● Shared clock · selected neighbourhood'
                  : 'Syncing world…'
                : 'Local preview · only you'}
            </span>
          </div>
          {mode === 'studio' && (
            <div className="preview-controls">
              <label htmlFor="preview-hour">
                Time of day{' '}
                <Slider
                  id="preview-hour"
                  aria-label="Preview hour"
                  min={0}
                  max={23.5}
                  step={0.5}
                  value={[preview.hour]}
                  onValueChange={(value) =>
                    setPreview({
                      ...preview,
                      hour: Array.isArray(value) ? value[0] : value,
                    })
                  }
                />
              </label>
              <label>
                Season
                <NativeSelect
                  aria-label="Preview season"
                  value={preview.season}
                  onChange={(e) =>
                    setPreview({
                      ...preview,
                      season: e.target.value as WorldPreview['season'],
                    })
                  }
                >
                  {SEASONS.map((s) => (
                    <NativeSelectOption key={s}>{s}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label>
                Weather
                <NativeSelect
                  aria-label="Preview weather"
                  value={preview.weather}
                  onChange={(e) =>
                    setPreview({
                      ...preview,
                      weather: e.target.value as WorldPreview['weather'],
                    })
                  }
                >
                  {['Sunny', 'Rain', 'Snow'].map((w) => (
                    <NativeSelectOption key={w}>{w}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
            </div>
          )}
          </details>
          {scene}
          <div className="radio">
            <button className="btn radio-play" aria-label={audioOn ? 'Pause music' : 'Play music'} onClick={toggleAudio}>{audioOn ? <Pause size={19} /> : <Play size={19} />}</button>
            <div className="radio-art"><Music2 size={22} /></div>
            <div className="radio-text">
              <strong>{PLAYLIST[track].name}</strong>
              <small>RepoRoad radio</small>
            </div>
            <div className="volume">
              <Volume2 size={19} />
              <Slider
                aria-label="Music volume"
                min={0}
                max={100}
                value={[volume]}
                onValueChange={(value) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  setVolume(v);
                  radio.current?.setVolume(v / 100);
                }}
              />
            </div>
          </div>
        </section>
        <aside
          ref={directory}
          className="panel repo-panel"
          aria-label="Repository directory and community"
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="chat"><MessageCircle /> Chat</TabsTrigger>
              <TabsTrigger value="repositories"><Compass /> Explore</TabsTrigger>
              <TabsTrigger value="style"><Plus /> Add</TabsTrigger>
            </TabsList>
            <div className="chicken-control">
              <button className="btn" onClick={chickens.add}>🐔 Add chicken <Plus size={16} /></button>
              <span>{chickens.queued === null ? 'Connecting…' : `${chickens.queued.toLocaleString()} queued`}{chickens.pending ? ` · +${chickens.pending} sending` : ''}</span>
              <small>Next crossing in {Math.floor(chickens.nextIn / 60)}:{String(chickens.nextIn % 60).padStart(2, '0')} · shared live road</small>
              {chickens.error && <small role="status">{chickens.error}</small>}
            </div>
            <div className="tab-body">
              {notice && (
                <output className="notice">
                  {notice}
                  <button
                    className="btn icon"
                    aria-label="Dismiss notice"
                    onClick={() => setNotice('')}
                  >
                    <X size={14} />
                  </button>
                </output>
              )}
              <TabsContent value="repositories">
                <div className="repo-directory-head">
                  <h2>{recentOnly ? 'Recently passed' : 'The neighbourhood'}</h2>
                  <span>{repositories.length} repositories</span>
                </div>
                {recentOnly && <button className="btn" onClick={() => setRecentOnly(false)}>Show all repositories</button>}
                <label className="repo-category-label">
                  Neighbourhood
                  <NativeSelect
                    aria-label="Repository category"
                    value={category}
                    onChange={(e) => {
                      const next = e.target.value as Category;
                      setCategory(next);
                      setRepositories(CATEGORY_SEED[next].repositories);
                      setDataStatus('Checking this neighbourhood…');
                      setQuery('');
                      setRecentOnly(false);
                      setRecent([]);
                      setPassing([]);
                      setFocus(null);
                      setMode('live');
                    }}
                  >
                    {Object.entries(CATEGORIES).map(([key, value]) => (
                      <NativeSelectOption key={key} value={key}>
                        {value.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
                <p className="repo-category-description">
                  {CATEGORIES[category].description}
                </p>
                <label className="repo-search">
                  <Search size={16} />
                  <Input
                    aria-label="Search repositories"
                    placeholder="Find a repository or language…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <p className="repo-data-status" role="status">
                  {dataStatus}
                </p>
                <div className="repo-list">
                  {filtered.map((r) => (
                    <article
                      key={r.fullName}
                      className={`repo-card ${selected === r.fullName ? 'is-selected' : ''}`}
                    >
                      <div className="repo-card-title">
                        <strong title={r.fullName}>{r.name}</strong>
                        <span className="repo-floor-count">
                          {repositoryFloors(r.stars)} floors
                        </span>
                      </div>
                      <p>{r.description}</p>
                      <div className="repo-card-meta">
                        <span>
                          <Star size={14} />
                          {r.stars.toLocaleString()}
                        </span>
                        <span>{r.language || 'Open source'}</span>
                        <span>{r.building.style}</span>
                        {category === 'trending' &&
                          r.weeklyStars !== undefined && (
                            <span className="repo-weekly">
                              +{r.weeklyStars.toLocaleString()} this week
                            </span>
                          )}
                        {r.configStatus === 'custom' && (
                          <span>Owner-designed</span>
                        )}
                      </div>
                      <div className="actions">
                        <button
                          className="btn"
                          onClick={() => visit(r.fullName)}
                          aria-label={`Visit ${r.fullName}`}
                        >
                          Visit building
                        </button>
                        <a
                          className="btn"
                          href={`https://github.com/${r.fullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          GitHub <ExternalLink size={13} />
                        </a>
                        <button
                          className="btn icon"
                          aria-label={`Building style for ${r.fullName}`}
                          onClick={() => {
                            setSelected(r.fullName);
                            setTab('style');
                          }}
                        >
                          <Code2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {!filtered.length && (
                    <p className="repo-empty">
                      {query
                        ? 'No matches in this neighbourhood. Try another name or language.'
                        : category === 'sponsored'
                          ? 'No sponsored buildings yet. Paid placements will be labelled here and will not affect organic rankings.'
                          : category === 'community'
                            ? 'This street is waiting for its first discovered buildings. Add .github/chilldrive.json to your public repository; discovery must be connected before files can be found automatically.'
                            : 'This neighbourhood is unavailable right now. Try another category.'}
                    </p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="chat">
                <LiveChat online={online} />
              </TabsContent>
              <TabsContent value="style">
                <div className="repo-style-guide">
                  <Code2 size={24} />
                  <h2>Your repository, your building.</h2>
                  <p>Every 10,000 stars adds a floor, with a minimum of one. Add a style file to make the building yours.</p>
                  <label>
                    Repository
                    <NativeSelect
                      aria-label="Repository to customise"
                      value={repo.fullName}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {styleRepos.map((r) => (
                        <NativeSelectOption key={r.fullName} value={r.fullName}>
                          {r.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  <p>
                    Add <code>{CONFIG_PATH}</code> to{' '}
                    <strong title={repo.fullName}>{repo.name}</strong> on its
                    default branch, <strong>{repo.defaultBranch}</strong>.
                  </p>
                  <pre>
                    <code>{EXAMPLE_CONFIG}</code>
                  </pre>
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(EXAMPLE_CONFIG);
                        setNotice('Building configuration copied.');
                      } catch {
                        setNotice('Select and copy the example above.');
                      }
                    }}
                  >
                    Copy configuration
                  </button>
                  <a
                    className="btn"
                    href={`https://github.com/${repo.fullName}/tree/${encodeURIComponent(repo.defaultBranch)}/.github`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open repository <ExternalLink size={13} />
                  </a>
                  <ul>
                    <li>
                      Styles: woodland, brick, stone, greenhouse or townhouse.
                    </li>
                    <li>Colour: a six-digit hex colour.</li>
                    <li>Roof: gable or flat.</li>
                    <li>Stars and names always come from GitHub.</li>
                  </ul>
                  <p>
                    Merge the file into the default branch. Changes are checked
                    in batches on site visits, usually within six hours plus the
                    next batch. Only people able to merge into that repository
                    can change its building.
                  </p>
                  <p className="repo-config-state">
                    Style status:{' '}
                    {
                      {
                        custom: 'Custom file applied',
                        default: 'No file found · default building',
                        invalid: 'Invalid file · last known style retained',
                        unavailable:
                          'File check unavailable or pending · last known style retained',
                      }[repo.configStatus]
                    }
                  </p>
                  <p className="fine">
                    No file is needed for the top-star or trending streets:
                    every repository gets a stable random style. A valid file
                    overrides it. Community discovery uses GitHub’s code index
                    and can take time; committing a file does not guarantee
                    immediate inclusion in the daily sample. No payment is
                    needed for organic categories, and no code or external
                    assets from the file are executed.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>
      <footer className="footer">
        <span>RepoRoad · a cosy world of repositories</span>
        <span>
          Public GitHub data · independent project, not affiliated with GitHub
          or featured repositories
        </span>
      </footer>
    </main>
  );
}
