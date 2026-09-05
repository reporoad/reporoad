export const TEMPLATES = [
  'cafe',
  'cabin',
  'garden',
  'garage',
  'billboard',
] as const;
export type Template = (typeof TEMPLATES)[number];
export const COLORS = ['#e4b978', '#91b6a0', '#cf8773', '#879fba', '#b4a0bc'];
export type Plot = {
  id: number;
  name: string;
  tagline: string;
  url: string;
  template: Template;
  color: string;
  plants: number;
  status: 'available' | 'example' | 'yours';
  logo?: string;
};
export const STORAGE_KEY = 'chilldrive-prototype-v1';
export const TRACKS = [
  {
    name: 'Golden hour',
    mood: 'Warm keys · slow afternoon',
    root: 130.81,
    beat: 0.48,
  },
  {
    name: 'Forest notes',
    mood: 'Soft chimes · fresh air',
    root: 146.83,
    beat: 0.6,
  },
  {
    name: 'Blue mile',
    mood: 'Mellow tones · evening drive',
    root: 110,
    beat: 0.54,
  },
];
export function createPlots(): Plot[] {
  const examples: Record<number, [string, string, Template]> = {
    1: ['MOSS & MUG', 'Coffee. Slowly.', 'cafe'],
    4: ['FERN HOUSE', 'A little room to grow', 'garden'],
    7: ['OFF THE GRID', 'Stay a little longer', 'cabin'],
    12: ['SUNDAY GARAGE', 'Good things take time', 'garage'],
    17: ['WILD POST', 'Find your own way', 'billboard'],
    22: ['THE CORNER', 'Something lovely ahead', 'cafe'],
  };
  return Array.from({ length: 24 }, (_, index) => {
    const id = index + 1,
      example = examples[id];
    return {
      id,
      name: example?.[0] ?? 'YOUR LITTLE PLACE',
      tagline: example?.[1] ?? 'Make yourself at home',
      url: '',
      template: example?.[2] ?? 'cafe',
      color: COLORS[index % COLORS.length],
      plants: 3,
      status: example ? 'example' : 'available',
    };
  });
}
export function safeShopUrl(value: string): string | null {
  if (!value.trim()) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function validPlot(value: unknown): value is Plot {
  if (!value || typeof value !== 'object') return false;
  const p = value as Plot;
  return (
    Number.isInteger(p.id) &&
    p.id >= 1 &&
    p.id <= 24 &&
    typeof p.name === 'string' &&
    p.name.length <= 26 &&
    typeof p.tagline === 'string' &&
    p.tagline.length <= 44 &&
    typeof p.url === 'string' &&
    p.url.length <= 500 &&
    safeShopUrl(p.url) !== null &&
    TEMPLATES.includes(p.template) &&
    COLORS.includes(p.color) &&
    Number.isInteger(p.plants) &&
    p.plants >= 0 &&
    p.plants <= 5 &&
    ['available', 'example', 'yours'].includes(p.status) &&
    (p.logo === undefined ||
      (typeof p.logo === 'string' &&
        p.logo.length < 180000 &&
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.logo)))
  );
}
export function restorePlots(raw: string | null): Plot[] {
  if (!raw) return createPlots();
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !Array.isArray(data) ||
      data.length !== 24 ||
      !data.every(validPlot) ||
      new Set(data.map((p) => p.id)).size !== 24
    )
      return createPlots();
    return data.sort((a, b) => a.id - b.id);
  } catch {
    return createPlots();
  }
}
export function claimPlot(plots: Plot[], id: number): Plot[] {
  return plots.map((p) =>
    p.id === id && p.status === 'available' ? { ...p, status: 'yours' } : p,
  );
}
export function publishPlot(plots: Plot[], draft: Plot): Plot[] {
  if (
    !validPlot(draft) ||
    draft.status !== 'yours' ||
    !plots.some((p) => p.id === draft.id && p.status === 'yours')
  )
    throw new Error('Choose a valid plot you have claimed.');
  if (!draft.name.trim()) throw new Error('Give your place a name first.');
  return plots.map((p) =>
    p.id === draft.id
      ? { ...draft, name: draft.name.trim(), tagline: draft.tagline.trim() }
      : p,
  );
}
export function chooseTrack(vote: number | null, current: number): number {
  return vote !== null &&
    Number.isInteger(vote) &&
    vote >= 0 &&
    vote < TRACKS.length
    ? vote
    : (current + 1) % TRACKS.length;
}
