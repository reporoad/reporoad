'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Flag,
  MapPin,
  Maximize,
  Music2,
  Pause,
  Play,
  Route,
  Save,
  Sprout,
  Undo2,
  Volume2,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import RoadScene, { PlotPreview } from './road-scene';
import {
  COLORS,
  STORAGE_KEY,
  TEMPLATES,
  claimPlot,
  createPlots,
  publishPlot,
  restorePlots,
  safeShopUrl,
  type Plot,
  type Template,
} from '@/lib/world';
import { PLAYLIST, PlaylistPlayer } from '@/lib/playlist';
import LiveChat from './live-chat';
import { worldAt, SEASONS, type WorldPreview } from '@/lib/live-world';
const SHARED_PLOTS = createPlots();

export default function Chilldrive() {
  const [plots, setPlots] = useState<Plot[]>(() => {
    try {
      return restorePlots(localStorage.getItem(STORAGE_KEY));
    } catch {
      return createPlots();
    }
  });
  const [selected, setSelected] = useState(2);
  const [draft, setDraft] = useState<Plot | null>(null);
  const [tab, setTab] = useState('chat');
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [mode, setMode] = useState<'live' | 'studio'>('live');
  const [preview, setPreview] = useState<WorldPreview>({
    hour: 16,
    season: 'Summer',
    weather: 'Sunny',
  });
  const [now, setNow] = useState(Date.now);
  const [synced, setSynced] = useState(false);
  const clock = useRef({ now: () => Date.now() });
  const environment = worldAt(now, mode === 'studio' ? preview : undefined);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const [broadcast, setBroadcast] = useState(
    () => new URLSearchParams(window.location.search).get('broadcast') === '1',
  );
  const [focus, setFocus] = useState<{ id: number; key: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [audioOn, setAudioOn] = useState(false);
  const [track, setTrack] = useState(0);
  const [volume, setVolume] = useState(30);
  const radio = useRef<PlaylistPlayer | null>(null);
  const plotsRef = useRef(plots);
  useEffect(() => {
    plotsRef.current = plots;
  }, [plots]);
  const panel = useRef<HTMLElement | null>(null);
  const plot = plots.find((p) => p.id === selected)!;
  const ownedCount = plots.filter((p) => p.status === 'yours').length;

  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [
      {
        name: 'get_chilldrive_plots',
        description:
          'Read the local prototype plots. These are browser-local demo records, not purchased land.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({
          plots: plotsRef.current.map(({ id, name, status, template }) => ({
            id,
            name,
            status,
            template,
          })),
        }),
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Optional browser integration; the interface remains available. */
      }
    }
    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    radio.current = new PlaylistPlayer(setTrack, setAudioOn, () =>
      setNotice(
        'The music could not load. Check your connection, then press play to retry.',
      ),
    );
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBroadcast(false);
    };
    window.addEventListener('keydown', escape);
    return () => {
      radio.current?.dispose();
      window.removeEventListener('keydown', escape);
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    const sync = async () => {
      const start = performance.now();
      try {
        const response = await fetch('/api/live', { cache: 'no-store' });
        if (!response.ok) throw Error();
        const data = (await response.json()) as { serverTime: number };
        const end = performance.now();
        if (stopped) return;
        const anchor = data.serverTime + (end - start) / 2;
        clock.current.now = () => anchor + (performance.now() - end);
        setSynced(true);
        if (modeRef.current === 'live')
          radio.current?.sync(clock.current.now());
      } catch {
        if (!stopped) setSynced(false);
      }
    };
    void sync();
    const syncTimer = setInterval(sync, 20000);
    const tick = setInterval(() => setNow(clock.current.now()), 1000);
    return () => {
      stopped = true;
      clearInterval(syncTimer);
      clearInterval(tick);
    };
  }, []);

  function persist(next: Plot[], message: string) {
    setPlots(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setNotice(message);
    } catch {
      setNotice(
        'Updated for this visit. Browser storage is full or unavailable, so this change could not be saved.',
      );
    }
  }
  function edit(id: number) {
    const target = plots.find((p) => p.id === id);
    if (!target || target.status !== 'yours') return;
    setMode('studio');
    setSelected(id);
    setDraft({ ...target });
    setTab('edit');
    setFocus({ id, key: Date.now() });
  }
  function claim() {
    setMode('studio');
    const next = claimPlot(plots, selected);
    persist(
      next,
      `Plot ${String(selected).padStart(2, '0')} is yours to try. No payment was taken.`,
    );
    setDraft({ ...next.find((p) => p.id === selected)! });
    setTab('edit');
    setFocus({ id: selected, key: Date.now() });
  }
  function save() {
    if (!draft) return;
    if (safeShopUrl(draft.url) === null) {
      setNotice('Use a complete shop link starting with https:// or http://.');
      return;
    }
    try {
      const next = publishPlot(plots, draft);
      persist(next, 'Your design is saved to your local Studio preview.');
      setDraft({ ...next.find((p) => p.id === draft.id)! });
      setFocus({ id: draft.id, key: Date.now() });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Could not save this design.',
      );
    }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setNotice('Choose a PNG, JPEG or WebP image smaller than 5 MB.');
      return;
    }
    const targetId = draft.id;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext('2d')!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const logo = canvas.toDataURL('image/webp', 0.85);
      setDraft((d) => (d?.id === targetId ? { ...d, logo } : d));
    } catch {
      setNotice('That image could not be opened. Please choose another file.');
    }
    event.target.value = '';
  }
  async function toggleAudio() {
    if (audioOn) {
      radio.current?.pause();
      setAudioOn(false);
    } else {
      try {
        if (mode === 'live') radio.current?.sync(clock.current.now());
        await radio.current?.play();
      } catch {
        setNotice(
          'Audio could not start in this browser. Try pressing play again.',
        );
      }
    }
  }
  function browse() {
    setTab('plots');
    panel.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
  }
  const scene = (
    <div className="drive">
      <RoadScene
        plots={mode === 'live' ? SHARED_PLOTS : plots}
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
            <div>
              <div className="eyebrow">The scenic route · Loop 01</div>
              <p className="drive-title">Nowhere to rush.</p>
            </div>
            <span className="drive-tag">
              {environment.season.toUpperCase()} ·{' '}
              {environment.weather.toUpperCase()}
            </span>
          </div>
          <div className="drive-bottom">
            <div className="drive-meta">
              <div>
                <div className="eyebrow">Cruising at</div>
                <div className="speed">
                  {mode === 'live' || playing ? '24' : '00'}
                  <small>KM/H</small>
                </div>
              </div>
              <div>
                <div className="eyebrow">Along the way</div>
                <span className="row" style={{ fontSize: 13, gap: 6 }}>
                  <MapPin size={14} /> 24 little places
                </span>
              </div>
            </div>
            <div className="actions">
              <button
                className="btn icon"
                disabled={mode === 'live'}
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? 'Pause the drive' : 'Resume the drive'}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                className="btn icon"
                onClick={() => setBroadcast(true)}
                aria-label="Open clean broadcast view"
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
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <Route size={29} strokeWidth={2.1} />
          chilldrive<span style={{ color: 'var(--primary)' }}>.</span>
        </div>
        <div className="topbar-right">
          <span className="eyebrow">A little place along the way</span>
          <span className="pill">
            <span className="dot" /> LIVE WORLD
          </span>
          <button className="btn primary" onClick={browse}>
            Find your plot <ArrowRight size={16} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <section aria-label="Scenic drive and radio">
          <div className="live-toolbar">
            <div className="actions">
              <button
                className={`btn ${mode === 'live' ? 'primary' : ''}`}
                onClick={() => {
                  setMode('live');
                  radio.current?.sync(clock.current.now());
                }}
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
                  ? '● Synced with everyone'
                  : 'Reconnecting to live clock…'
                : 'Local preview · only you'}{' '}
              · {String(Math.floor(environment.hour)).padStart(2, '0')}:
              {String(Math.floor((environment.hour % 1) * 60)).padStart(2, '0')}
            </span>
          </div>
          {mode === 'studio' && (
            <div className="preview-controls">
              <label htmlFor="preview-hour">
                Time of day
                <Slider
                  id="preview-hour"
                  aria-label="Preview time of day"
                  min={0}
                  max={23.9}
                  step={0.1}
                  value={[preview.hour]}
                  onValueChange={(v) =>
                    setPreview({
                      ...preview,
                      hour: Array.isArray(v) ? v[0] : v,
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
            <div className="record">
              <Music2 size={20} />
            </div>
            <div className="radio-text">
              <span className="eyebrow">Chilldrive radio</span>
              <strong>{PLAYLIST[track].name}</strong>
              <small>
                {audioOn
                  ? PLAYLIST[track].collection + ' · continuous lofi'
                  : 'Press play · settle into the soundtrack'}
              </small>
            </div>
            <div className="volume">
              <Slider
                aria-label="Music volume"
                value={[volume]}
                onValueChange={(value) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  setVolume(v);
                  radio.current?.setVolume(v / 100);
                }}
                min={0}
                max={100}
              />
            </div>
            <Volume2 size={16} color="#a8b7ab" />
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
              <h1>Take the long way home.</h1>
              <p>
                Settle into the drive, enjoy the music, and make a little corner
                of the road your own.
              </p>
            </div>
            <span className="scenic-label">
              <Sprout size={18} /> Room to grow
            </span>
          </div>
          <div className="footer">
            <span>
              Live view shares the same drive, weather and music timeline.
              Studio designs stay on this browser. No real purchases yet.
            </span>
            <span>Made for a slower internet.</span>
          </div>
        </section>
        <aside className="panel" ref={panel} aria-label="Roadside plots">
          <div className="panel-heading">
            <div className="eyebrow">Your roadside story</div>
            <h2>Good company. Open road.</h2>
            <p>
              Chat with fellow travelers, or try designing your own roadside
              place.
            </p>
          </div>
          <Tabs
            className="panel-tabs"
            value={tab}
            onValueChange={(value) => {
              setTab(String(value));
              if (value === 'edit' && !draft) {
                const own = plots.find((p) => p.status === 'yours');
                if (own) {
                  setSelected(own.id);
                  setDraft({ ...own });
                }
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="plots">
                <MapPin size={15} /> Plots
              </TabsTrigger>
              <TabsTrigger value="edit">
                <Sprout size={15} /> My place
                {ownedCount > 0 ? ` (${ownedCount})` : ''}
              </TabsTrigger>
            </TabsList>
            <div className="tab-body">
              {notice && (
                <output className="notice">
                  {notice}
                  <button
                    onClick={() => setNotice('')}
                    aria-label="Dismiss message"
                    style={{
                      float: 'right',
                      margin: '2px 0 0 7px',
                      background: 'none',
                      border: 0,
                      color: 'inherit',
                    }}
                  >
                    <X size={14} />
                  </button>
                </output>
              )}
              <TabsContent value="chat">
                <LiveChat />
              </TabsContent>
              <TabsContent value="plots">
                <div className="map-legend">
                  <span>
                    <i className="square" />
                    Available
                  </span>
                  <span>
                    <i className="square taken" />
                    Example shop
                  </span>
                  <span>
                    <Flag size={11} />
                    Yours
                  </span>
                </div>
                <div className="plot-map" aria-label="Roadside plot map">
                  {Array.from({ length: 12 }, (_, row) =>
                    [plots[row * 2], plots[row * 2 + 1]].map((p, side) => (
                      <div key={p.id} style={{ display: 'contents' }}>
                        {side === 1 && (
                          <div className="map-road" aria-hidden="true" />
                        )}
                        <button
                          className={`plot-cell ${p.status !== 'available' ? 'taken' : ''} ${p.id === selected ? 'selected' : ''}`}
                          aria-label={`Plot ${p.id}, ${p.status === 'example' ? p.name + ', example shop' : p.status}`}
                          aria-pressed={p.id === selected}
                          onClick={() => {
                            setMode('studio');
                            setSelected(p.id);
                            setFocus({ id: p.id, key: Date.now() });
                          }}
                        >
                          <span>
                            {String(p.id).padStart(2, '0')}{' '}
                            <span style={{ opacity: 0.65 }}>
                              {side === 0 ? 'West' : 'East'}
                            </span>
                          </span>
                          {p.status === 'yours' ? (
                            <Flag size={12} />
                          ) : p.status === 'example' ? (
                            <Sprout size={12} />
                          ) : (
                            <span>+</span>
                          )}
                        </button>
                      </div>
                    )),
                  )}
                </div>
                <div className="plot-detail">
                  <div
                    className="row"
                    style={{ justifyContent: 'space-between' }}
                  >
                    <h3>
                      Plot {String(plot.id).padStart(2, '0')} ·{' '}
                      {plot.id % 2 ? 'West' : 'East'} side
                    </h3>
                    <MapPin size={16} color="#c6df91" />
                  </div>
                  <p>
                    {plot.status === 'available'
                      ? 'A fresh patch of green, right beside the road. Choose a template and make it yours.'
                      : plot.status === 'example'
                        ? `${plot.name} — an example of what you can create. Choose an available plot to try your own.`
                        : `${plot.name} — your little place is ready for a new look whenever you are.`}
                  </p>
                  {plot.status === 'available' ? (
                    <button className="btn primary full" onClick={claim}>
                      Try this plot — free demo <ArrowRight size={16} />
                    </button>
                  ) : plot.status === 'yours' ? (
                    <>
                      <button
                        className="btn primary full"
                        onClick={() => edit(plot.id)}
                      >
                        Redesign my place <ArrowRight size={16} />
                      </button>
                      {plot.url && (
                        <a
                          className="btn ghost full"
                          style={{ marginTop: 8 }}
                          href={safeShopUrl(plot.url) || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit shop <ExternalLink size={14} />
                        </a>
                      )}
                    </>
                  ) : (
                    <button
                      className="btn full"
                      onClick={() => {
                        const free = plots.find(
                          (p) => p.status === 'available',
                        );
                        if (free) setSelected(free.id);
                      }}
                      disabled={!plots.some((p) => p.status === 'available')}
                    >
                      Find an available plot <ChevronRight size={15} />
                    </button>
                  )}
                  <p className="fine">
                    No payment required. Demo claims are local to this browser.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="edit">
                {draft ? (
                  <>
                    <div className="field">
                      <label htmlFor="owned-plot">Your plot</label>
                      <NativeSelect
                        id="owned-plot"
                        value={draft.id}
                        onChange={(event) => edit(Number(event.target.value))}
                      >
                        {plots
                          .filter((p) => p.status === 'yours')
                          .map((p) => (
                            <NativeSelectOption key={p.id} value={p.id}>
                              Plot {String(p.id).padStart(2, '0')} — {p.name}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    </div>
                    <figure
                      className="edit-preview"
                      aria-label="Live preview of your draft plot"
                    >
                      <PlotPreview plot={draft} />
                    </figure>
                    <div className="field">
                      <label htmlFor="template">Start with a place</label>
                      <NativeSelect
                        id="template"
                        value={draft.template}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            template: e.target.value as Template,
                          })
                        }
                      >
                        {TEMPLATES.map((t) => (
                          <NativeSelectOption key={t} value={t}>
                            {
                              {
                                cafe: 'Corner café',
                                cabin: 'Woodland cabin',
                                garden: 'Little garden shop',
                                garage: 'Sunday garage',
                                billboard: 'Roadside billboard',
                              }[t]
                            }
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="field">
                      <label htmlFor="shop-name">Name on your sign</label>
                      <input
                        id="shop-name"
                        maxLength={26}
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="tagline">A few words underneath</label>
                      <input
                        id="tagline"
                        maxLength={44}
                        value={draft.tagline}
                        onChange={(e) =>
                          setDraft({ ...draft, tagline: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="shop-url">
                        Shop link{' '}
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          (optional)
                        </span>
                      </label>
                      <input
                        id="shop-url"
                        type="url"
                        maxLength={500}
                        placeholder="https://your-shop.com"
                        value={draft.url}
                        onChange={(e) =>
                          setDraft({ ...draft, url: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <span className="field-label">Make it your colour</span>
                      <div className="swatches">
                        {COLORS.map((color, i) => (
                          <button
                            key={color}
                            className="swatch"
                            style={{ background: color }}
                            aria-label={
                              [
                                'Honey',
                                'Eucalyptus',
                                'Terracotta',
                                'Blue',
                                'Lilac',
                              ][i]
                            }
                            aria-pressed={draft.color === color}
                            onClick={() => setDraft({ ...draft, color })}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="logo">
                        Your logo{' '}
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          (optional)
                        </span>
                      </label>
                      <input
                        className="upload"
                        id="logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={upload}
                      />
                      {draft.logo && (
                        <button
                          className="btn ghost"
                          style={{ marginTop: 6 }}
                          onClick={() =>
                            setDraft({ ...draft, logo: undefined })
                          }
                        >
                          Remove logo
                        </button>
                      )}
                    </div>
                    <div className="field">
                      <label>Room for greenery · {draft.plants} trees</label>
                      <Slider
                        aria-label="Number of trees"
                        value={[draft.plants]}
                        min={0}
                        max={5}
                        step={1}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            plants: Array.isArray(value) ? value[0] : value,
                          })
                        }
                      />
                    </div>
                    <div className="actions" style={{ marginTop: 22 }}>
                      <button
                        className="btn primary"
                        style={{ flex: 1 }}
                        onClick={save}
                      >
                        <Save size={15} /> Save to Studio
                      </button>
                      <button
                        className="btn icon"
                        aria-label="Restore last saved design"
                        onClick={() => {
                          setDraft({
                            ...plots.find((p) => p.id === draft.id)!,
                          });
                          setNotice('Restored your last saved design.');
                        }}
                      >
                        <Undo2 size={16} />
                      </button>
                    </div>
                    <p className="fine">
                      Preview changes here, then save to update the drive. Saved
                      only in this browser.
                    </p>
                  </>
                ) : (
                  <div className="empty-editor">
                    <Sprout size={35} />
                    <h3>Your little place starts here.</h3>
                    <p>
                      Pick an available plot and try a design. It’s free to
                      explore this prototype.
                    </p>
                    <button
                      className="btn primary"
                      onClick={() => setTab('plots')}
                    >
                      Choose a plot <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>
    </main>
  );
}
