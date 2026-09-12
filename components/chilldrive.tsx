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
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import RoadScene from './road-scene';
import LiveChat from './live-chat';
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
  const [audioOn, setAudioOn] = useState(false),
    [volume, setVolume] = useState(30);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [enablingSound, setEnablingSound] = useState(false);
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
              : 'No repositories yet. Add a public GitHub URL to start the road.'),
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
    window.addEventListener('reporoad:directory-updated', refresh);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener('reporoad:directory-updated', refresh);
    };
  }, []);
  useEffect(() => {
    // Every viewer hears the shared soundtrack through the local scene player.
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
      void radio.current.play().catch(() => {
        if (!disposed && new URLSearchParams(window.location.search).get('broadcast') !== '1')
          setWelcomeOpen(true);
      });
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
    if (!radio.current) return;
    setEnablingSound(true);
    try {
      radio.current.sync(clock.current.now());
      await radio.current.play();
      setNotice('');
      setWelcomeOpen(false);
    } catch {
      setNotice('Music couldn’t start just yet. Please try again, or close this welcome and enjoy the road quietly.');
    } finally {
      setEnablingSound(false);
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
          <Popover>
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
          </Popover>
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
          <img className="broadcast-crossing-icon" src="/icons/chicken.png" width={36} height={36} alt="" aria-hidden="true"/>
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
      <Dialog open={welcomeOpen} onOpenChange={setWelcomeOpen}>
        <DialogContent className="welcome-dialog">
          <DialogTitle>Welcome to RepoRoad!</DialogTitle>
          <DialogDescription>Take a cosy drive through GitHub repositories with a little lo-fi music. Say hello in the chat, explore the roadside projects, and send some chickens across the road!</DialogDescription>
          <p className="fine">Your browser needs a click before the music can start.</p>
          {notice && <p role="alert">{notice}</p>}
          <button className="btn" disabled={enablingSound} onClick={enableSound}>{enablingSound ? 'Starting music…' : 'OK, let’s ride'}</button>
        </DialogContent>
      </Dialog>
      <header className="topbar">
        <div className="brand">
          <Route size={29} />
          <h1>RepoRoad</h1>
          <span className="repo-brand-label">A live lo-fi drive through GitHub.</span>
        </div>
        <div className="topbar-right">
          <span className="header-note">Every roadside place is a repo.</span>
          <a className="btn icon" href="https://github.com/reporoad/reporoad" target="_blank" rel="noopener noreferrer" aria-label="RepoRoad source on GitHub" title="View source on GitHub"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.303-5.467-1.334-5.467-5.931 0-1.31.465-2.381 1.235-3.221-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.5 11.5 0 0 1 12 6.098c1.02.005 2.045.138 3.003.404 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.911 1.23 3.221 0 4.609-2.805 5.625-5.475 5.922.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg></a>
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
          </details>
          {scene}
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
              <button className="btn" disabled={!chickens.schedule} onClick={chickens.add}><img className="chicken-button-icon" src="/icons/chicken.png" width={24} height={24} alt="" aria-hidden="true"/> Add chicken <Plus size={16} /></button>
              <span>{chickens.queued === null ? 'Connecting…' : `${chickens.queued.toLocaleString()} queued`}{chickens.pending ? ` · +${chickens.pending} sending` : ''}</span>
              <small>{chickens.crossing ? `${chickens.remaining.toLocaleString()} still to cross · timer starts on green` : chickens.waiting ? 'At the light · syncing crossing…' : `Next light in ${Math.floor(chickens.nextIn / 60)}:${String(chickens.nextIn % 60).padStart(2, '0')}`}</small>
              {chickens.error && <small role="status">{chickens.error}</small>}
            </div>
            <div className="tab-body">
              {musicError && <p className="notice" role="alert">{musicError}</p>}
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
                <LiveChat online={online} />
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
