// Share decoded avatars between repositories owned by the same organisation.
const images = new Map<string, Promise<HTMLImageElement | null>>();
export function loadOwnerAvatar(fullName: string) {
  const owner = fullName.split('/')[0].toLowerCase();
  if (!/^[a-z\d][a-z\d-]{0,38}$/.test(owner)) return Promise.resolve(null);
  const cached = images.get(owner);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement | null>(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `https://avatars.githubusercontent.com/${encodeURIComponent(owner)}?s=128`;
  });
  if (images.size >= 128) images.delete(images.keys().next().value!);
  images.set(owner, pending);
  return pending;
}
