import { io, type Socket } from 'socket.io-client';

let cached: Socket | null = null;

/**
 * Resolve the Socket.IO server URL.
 *
 * The REST base URL ends in `/api` (we hit `/api/v2/...`), but Socket.IO
 * runs at the root of the same host, so we strip the `/api` suffix here.
 */
function resolveSocketUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://cc-pay-666057252406.europe-west1.run.app/api';
  return base.replace(/\/api\/?$/, '');
}

/**
 * Lazily get a singleton Socket.IO client authenticated with the user's
 * JWT access token. Returns `null` if there is no token — callers should
 * skip realtime subscription in that case.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem('access_token');
  if (!token) return null;

  if (cached && cached.connected) {
    return cached;
  }

  if (cached) {
    cached.disconnect();
    cached = null;
  }

  cached = io(resolveSocketUrl(), {
    transports: ['websocket', 'polling'],
    auth: { token },
    extraHeaders: { Authorization: `Bearer ${token}` },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  });

  return cached;
}

/** Disconnect and clear the cached socket — call on signout. */
export function clearSocket(): void {
  if (cached) {
    cached.disconnect();
    cached = null;
  }
}
