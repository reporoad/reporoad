'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Compass,
  MessageCircle,
  Plus,
  Volume2,
  VolumeX,
  Maximize,
  Pause,
  Play,
  Route,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from '@/components/ui/popover';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import RoadScene from './road-scene';
import { YouTubeStream, YouTubeChat } from './youtube-stream';
import { usesRenderedWorld } from '@/lib/youtube';
import { usePresence } from './use-presence';
import { useChickens } from './use-chickens';
import { PLAYLIST, PLAYLIST_EPOCH, playlistMix, PlaylistPlayer, loadMusicLibrary } from '@/lib/playlist';
import { RadioContext } from './radio-context';
import { broadcastStatus } from '@/lib/broadcast-status';
import RepoEditor from './repo-editor';
import RepoDirectory from './repo-directory';
import { worldAt, SEASONS, type WorldPreview } from '@/lib/live-world';
import { repositoryFloors, type Repository } from '@/lib/repositories';
import { SAMPLE_ROAD } from '@/lib/road-seed';

export default function RepoRoad() {
  const [supportPreview, setSupportPreview] = useState(() =>
    ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).get('supportPreview') === '1');
  const [repositories, setRepositories] = useState<Repository[]>(
    import.meta.env.DEV ? SAMPLE_ROAD : [],
  );
  const [dataStatus, setDataStatus] = useState(
    'Loading the shared road…',
  );
  const [tab, setTab] = useState('chat');
  const online = usePresence();
  const [mode, setMode] = useState<'live' | 'studio'>(supportPreview ? 'studio' : 'live');
  const [playing, setPlaying] = useState(
    () => !supportPreview && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [preview, setPreview] = useState<WorldPreview>({
    hour: 16,
    season: 'Summer',
    weather: 'Sunny',
  });
  const [now, setNow] = useState(Date.now);
  const chickens = useChickens(now);
  const crossingStatus = broadcastStatus(chickens);
  const [synced, setSynced] = useState(false);
  const clock = useRef({ now: () => Date.now() });
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [focus, setFocus] = useState<{ id: number; key: number } | null>(null);
  const [broadcast, setBroadcast] = useState(
    () => new URLSearchParams(window.location.search).get('broadcast') === '1',
  );
  const renderWorld = usesRenderedWorld(window.location.search, broadcast);
  const [audioOn, setAudioOn] = useState(false),
    [volume, setVolume] = useState(30);
  const track = playlistMix((now - PLAYLIST_EPOCH) / 1000).index;
  const [notice, setNotice] = useState('');
  const [musicError, setMusicError] = useState('');
  const radio = useRef<PlaylistPlayer | null>(null);
  const directory = useRef<HTMLElement | null>(null);
  const environment = worldAt(now, mode === 'studio' ? preview : undefined);
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
        if (!Array.isArray(data.repositories) || data.repositories.length > 1000)
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
              : 'No verified building files discovered yet.'),
        );
      } catch {
        if (!stopped)
          setDataStatus(
            'Discovery unavailable · keeping the last loaded road.',
          );
      }
    }
    void refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    // The YouTube video already contains music. Never start local MP3 playback
    // for viewers, including after exiting the broadcast source.
    if (!renderWorld) return;
    let disposed = false;
    async function startRadio() {
      try { await loadMusicLibrary(); }
      catch { if (!disposed) setMusicError('Music library missing or invalid. Import MP3s on the broadcaster machine.'); return; }
      if (disposed) return;
      setMusicError('');
      radio.current = new PlaylistPlayer(() => {}, setAudioOn, () =>
        setNotice('Sound disconnected. Enable sound to rejoin the live soundtrack.'),
      );
      radio.current.sync(clock.current.now());
      void radio.current.play().catch(() => {});
    }
    void startRadio();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBroadcast(false);
    };
    window.addEventListener('keydown', escape);
    return () => {
      disposed = true;
      radio.current?.dispose();
      radio.current = null;
      setAudioOn(false);
      window.removeEventListener('keydown', escape);
    };
  }, [renderWorld]);
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
  async function enableSound() {
    try {
      radio.current?.sync(clock.current.now());
      await radio.current?.play();
      setNotice('');
    } catch {
      setNotice('Tap Enable sound to join the shared soundtrack.');
    }
  }
  const scene = (
    <div className="drive">
      <RadioContext.Provider value={{ player: radio, track }}><RoadScene
        supportPreview={supportPreview && mode === 'studio'}
        plots={[]}
        repositories={repositories}
        playing={playing}
        environment={environment}
        clock={clock}
        live={mode === 'live'}
        preview={preview}
        focus={focus}
        chickenSchedule={chickens.schedule}
      /></RadioContext.Provider>
      {!broadcast && (
        <>
          <div className="drive-top">
            <span className="drive-tag" title={synced ? 'Shared live world' : 'Connecting to shared clock'}>
              <span /> {mode === 'live' ? 'LIVE' : 'PREVIEW'}
            </span>
            {mode === 'live' && chickens.crossing && <span className="crossing-banner">🚦 {chickens.remaining.toLocaleString()} chickens still to cross</span>}
          </div>
          <div className="drive-bottom">
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
        {musicError && <div className="notice" data-broadcast-error role="alert" style={{ position: 'absolute', bottom: 20, left: 20 }}>{musicError}</div>}
        <aside className="broadcast-crossing" aria-label="Chicken crossing status">
          <span className="broadcast-crossing-icon" aria-hidden="true">🐔</span>
          <div>
            <strong>{crossingStatus.headline}</strong>
            <span>{crossingStatus.detail}</span>
            <small>Add chickens at reporoad.suppers.chatgpt.site</small>
          </div>
        </aside>
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
        <div className="topbar-right">
          <span className="header-note">Every roadside place is a repo.</span>
          {renderWorld && <Popover>
            <PopoverTrigger className="btn icon" aria-label="Music volume" title={audioOn ? 'Music volume' : 'Enable sound and adjust volume'} onClick={() => { if (!audioOn) void enableSound(); }}>
              {audioOn && volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </PopoverTrigger>
            <PopoverContent align="end" className="header-volume-popup">
              <PopoverTitle>Music volume · {volume}%</PopoverTitle>
              <Slider aria-label="Music volume" min={0} max={100} value={[volume]} onValueChange={(value) => {
                const v = Array.isArray(value) ? value[0] : value;
                setVolume(v);
                radio.current?.setVolume(v / 100);
              }} />
              {!audioOn && <button className="btn sound-enable" onClick={enableSound}>Enable sound</button>}
            </PopoverContent>
          </Popover>}
        </div>
      </header>
      <div className="workspace">
        <section aria-label="Repository world live view">
          {supportPreview && <div className="live-toolbar" role="status" style={{ paddingRight: 150, flexWrap: 'wrap' }}>
            <span className="fine">Support marker preview · sample signs, not owner requests</span>
            <button className="btn" onClick={() => {
              setSupportPreview(false);
              const url = new URL(window.location.href);
              url.searchParams.delete('supportPreview');
              window.history.replaceState(null, '', url);
              setMode('live');
              setPlaying(true);
            }}>Exit preview</button>
          </div>}
          {renderWorld && <details className="drive-settings"><summary>Drive settings</summary><div className="live-toolbar">
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
                  ? '● Shared clock · one shared road'
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
          </details>}
          {renderWorld ? scene : <YouTubeStream/>}
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
              <button className="btn" disabled={!chickens.schedule} onClick={chickens.add}>🐔 Add chicken <Plus size={16} /></button>
              <span>{chickens.queued === null ? 'Connecting…' : `${chickens.queued.toLocaleString()} queued`}{chickens.pending ? ` · +${chickens.pending} sending` : ''}</span>
              <small>{chickens.crossing ? `${chickens.remaining.toLocaleString()} still to cross · timer starts on green` : chickens.waiting ? 'At the light · syncing crossing…' : `Next light in ${Math.floor(chickens.nextIn / 60)}:${String(chickens.nextIn % 60).padStart(2, '0')}`}</small>
              {chickens.error && <small role="status">{chickens.error}</small>}
            </div>
            <div className="tab-body">
              {renderWorld && musicError && <p className="notice" role="alert">{musicError}</p>}
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
              <TabsContent value="repositories" keepMounted><RepoDirectory repositories={repositories} status={dataStatus}/></TabsContent>
              <TabsContent value="chat">
                <YouTubeChat online={online} />
              </TabsContent>
              <TabsContent value="style" keepMounted><RepoEditor active={tab === 'style'}/></TabsContent>
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
