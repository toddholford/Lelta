/**
 * Generate a UUID v4.
 *
 * `crypto.randomUUID` is only defined in secure contexts (HTTPS or localhost),
 * so it's unavailable when the app is opened over a LAN IP on plain http
 * (e.g. http://192.168.1.4:5173 for mobile testing). Fall back to a manual v4
 * built from crypto.getRandomValues — which is *not* gated to secure contexts —
 * or Math.random as a last resort. Used only for client-side ids (demo mode);
 * real rows get their ids from Postgres.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  )
}
