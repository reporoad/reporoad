const bytes = new TextEncoder();
export function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const randomToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.encode(value))));
}
async function key(secret: string) {
  if (secret.length < 32) throw Error('GitHub security configuration unavailable');
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', bytes.encode(secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value: unknown, secret: string, purpose: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:bytes.encode(purpose)}, await key(secret), bytes.encode(JSON.stringify(value)));
  return `${base64url(iv)}.${base64url(new Uint8Array(encrypted))}`;
}
export async function unseal(value: string, secret: string, purpose: string): Promise<unknown> {
  if (value.length > 6000) throw Error('Invalid cookie');
  const [iv, payload, extra] = value.split('.');
  if (!iv || !payload || extra) throw Error('Invalid cookie');
  const decode = (v:string) => Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({name:'AES-GCM', iv:decode(iv), additionalData:bytes.encode(purpose)}, await key(secret), decode(payload));
  return JSON.parse(new TextDecoder().decode(decrypted));
}
export function mayManageRepository(repo: {private?:boolean; id?:number; owner?:{id?:number}; permissions?:{admin?:boolean}}, userId:number) {
  return repo.private === false && Number.isSafeInteger(repo.id) && Number.isSafeInteger(repo.owner?.id) &&
    (repo.owner?.id === userId || repo.permissions?.admin === true);
}
