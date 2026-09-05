'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  ExternalLink,
  GitFork,
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
import { PLAYLIST, PlaylistPlayer } from '@/lib/playlist';
import { worldAt, SEASONS, type WorldPreview } from '@/lib/live-world';
import {
  CONFIG_PATH,
  EXAMPLE_CONFIG,
  repositoryFloors,
  type Repository,
} from '@/lib/repositories';
import { REPOSITORY_SEED } from '@/lib/repository-seed';

export default function Chilldrive() {
  const [repositories, setRepositories] =
    useState<Repository[]>(REPOSITORY_SEED);
  const [dataStatus, setDataStatus] = useState(
    'Verified GitHub snapshot · 5 Sep 2026 · checking for updates…',
  );
  const [selected, setSelected] = useState(REPOSITORY_SEED[0].fullName);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('repositories');
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
  const repo =
    repositories.find((r) => r.fullName === selected) || repositories[0];
  const environment = worldAt(now, mode === 'studio' ? preview : undefined);
  const filtered = useMemo(
    () =>
      repositories.filter((r) =>
        `${r.fullName} ${r.description} ${r.language}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [repositories, query],
  );
  const reposRef = useRef(repositories);
  reposRef.current = repositories;
  useEffect(() => {
    let stopped = false;
    async function refresh() {
      try {
        const response = await fetch('/api/repositories');
        if (!response.ok) throw Error();
        const data = (await response.json()) as {
          repositories: Repository[];
          source: string;
          warning?: string;
        };
        if (
          !Array.isArray(data.repositories) ||
          data.repositories.length !== 24
        )
          throw Error();
        if (stopped) return;
        setRepositories(data.repositories);
        const oldest = Math.min(
          ...data.repositories.map((r: Repository) => r.fetchedAt),
        );
        setDataStatus(
          data.warning ||
            `${data.source === 'github-cache' ? 'GitHub data' : 'Verified snapshot'} · oldest check ${new Date(oldest).toLocaleString()} · refreshes up to every 6 hours`,
        );
      } catch {
        if (!stopped)
          setDataStatus(
            'GitHub sync unavailable · showing the verified 5 Sep 2026 snapshot',
          );
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15 * 60 * 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
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
        plots={[]}
        repositories={repositories}
        playing={playing}
        environment={environment}
        clock={clock}
        live={mode === 'live'}
        preview={preview}
        focus={focus}
      />
      {!broadcast && (
        <>
          <div className="drive-top">
            <span className="drive-tag">
              {environment.season.toUpperCase()} ·{' '}
              {environment.weather.toUpperCase()}
            </span>
          </div>
          <div className="drive-bottom">
            <span className="repo-scene-caption">
              {mode === 'live'
                ? 'A shared drive through open source'
                : `Visiting ${repo.fullName}`}
            </span>
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
          chilldrive<span style={{ color: 'var(--primary)' }}>.</span>
          <span className="repo-brand-label">Repository world</span>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            setTab('repositories');
            directory.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Explore repositories <GitFork size={16} />
        </button>
      </header>
      <div className="workspace">
        <section aria-label="Repository world live view">
          <div className="live-toolbar">
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
                  ? '● Shared world'
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
          {scene}
          <div className="radio">
            <Music2 size={20} />
            <div className="radio-text">
              <span className="eyebrow">Chilldrive radio</span>
              <strong>{PLAYLIST[track].name}</strong>
              <small>
                {audioOn
                  ? 'Continuous lofi · a shared soundtrack'
                  : 'Press play · settle into the soundtrack'}
              </small>
            </div>
            <div className="volume">
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
            <button
              className="btn icon"
              aria-label={audioOn ? 'Pause music' : 'Play music'}
              onClick={toggleAudio}
            >
              {audioOn ? <Pause size={19} /> : <Play size={19} />}
            </button>
          </div>
          <div className="intro">
            <div>
              <h1>A town built from open source.</h1>
              <p>
                Every repository has a building. Every 10,000 stars adds a
                floor’s worth of height. Take a slow drive past the software
                people build together.
              </p>
            </div>
          </div>
          <p className="repo-rule">
            Height = complete groups of 10,000 stars, with a minimum of one
            floor. 9,999 → 1 · 10,000 → 1 · 20,000 → 2.
          </p>
          <p className="fine">
            The shared view is a synchronised 3D scene, not a YouTube video
            stream yet.
          </p>
        </section>
        <aside
          ref={directory}
          className="panel repo-panel"
          aria-label="Repository directory and community"
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="repositories">Repositories</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="style">Building style</TabsTrigger>
            </TabsList>
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
                  <h2>The neighbourhood</h2>
                  <span>{repositories.length} repositories</span>
                </div>
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
                        <strong>{r.fullName}</strong>
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
                      No matches in this starter neighbourhood. Try another name
                      or language.
                    </p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="chat">
                <LiveChat />
              </TabsContent>
              <TabsContent value="style">
                <div className="repo-style-guide">
                  <Code2 size={24} />
                  <h2>Your repository, your building.</h2>
                  <label>
                    Repository
                    <NativeSelect
                      aria-label="Repository to customise"
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {repositories.map((r) => (
                        <NativeSelectOption key={r.fullName} value={r.fullName}>
                          {r.fullName}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  <p>
                    Add <code>{CONFIG_PATH}</code> to{' '}
                    <strong>{repo.fullName}</strong> on its default branch,{' '}
                    <strong>{repo.defaultBranch}</strong>.
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
                    <li>Styles: woodland, brick or stone.</li>
                    <li>Colour: a six-digit hex colour.</li>
                    <li>Roof: gable or flat.</li>
                    <li>Stars and names always come from GitHub.</li>
                  </ul>
                  <p>
                    Merge the file into the default branch. Changes are checked
                    on a site visit when the shared six-hour cache expires. Only
                    people able to merge into that repository can change its
                    building.
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
                    This first street includes 24 selected public GitHub
                    repositories. No payment, sponsorship or repository write
                    access is required. No code or remote assets from the file
                    are executed.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>
      <footer className="footer">
        <span>Chilldrive · a cosy world of repositories</span>
        <span>
          Public GitHub data · independent project, not affiliated with GitHub
          or featured repositories
        </span>
      </footer>
    </main>
  );
}
