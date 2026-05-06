/**
 * Firebase Cloud Messaging bootstrap for the web app.
 *
 * This is a minimal, dependency-free skeleton: it requests Notification
 * permission, registers a service worker, and POSTs the FCM token to the
 * backend. The actual Firebase Web SDK call is deferred behind a dynamic
 * import so the bundle stays slim when push isn't configured.
 *
 * Required environment variables (set in .env.local — these are public
 * by Firebase design):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_VAPID_KEY
 *
 * Service worker file required at: public/firebase-messaging-sw.js
 *
 * The function is a no-op if any of the above is missing (sandbox mode).
 */
import { ApiService } from '@/services/api';

interface FcmConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

function loadConfig(): FcmConfig | null {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  };
  if (
    !cfg.apiKey ||
    !cfg.projectId ||
    !cfg.messagingSenderId ||
    !cfg.appId ||
    !cfg.vapidKey
  ) {
    return null;
  }
  return cfg as FcmConfig;
}

export type FcmRegistrationResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'unsupported' | 'no_config' | 'denied' | 'failed' };

/**
 * Request OS notification permission, register the service worker, fetch a
 * fresh FCM token, and POST it to /v2/notifications/device-tokens.
 *
 * Call this AFTER the user opts into push in settings — never automatically
 * on app boot. Browsers that block the permission prompt as spammy will
 * silently deny, so always check the result.
 */
export async function registerForPush(): Promise<FcmRegistrationResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const config = loadConfig();
  if (!config) {
    return { ok: false, reason: 'no_config' };
  }

  // 1. OS-level permission.
  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  // 2. Service worker registration. Browsers require the SW file to live at
  //    /firebase-messaging-sw.js — see public/firebase-messaging-sw.js.
  let swRegistration: ServiceWorkerRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );
  } catch {
    return { ok: false, reason: 'failed' };
  }

  // 3. Firebase Web SDK — dynamic import so we don't pull it in for users
  //    who never opt into push. The `firebase` package is intentionally
  //    not in package.json yet; install with `npm i firebase` once you
  //    have a Firebase project configured. We use runtime-resolved module
  //    specifiers so TypeScript doesn't try to type-check the import.
  try {
    const appModSpec = 'firebase/app';
    const msgModSpec = 'firebase/messaging';
    const [appMod, msgMod] = await Promise.all([
      import(/* @vite-ignore */ appModSpec) as Promise<{
        initializeApp: (config: Record<string, string>) => unknown;
      }>,
      import(/* @vite-ignore */ msgModSpec) as Promise<{
        getMessaging: (app: unknown) => unknown;
        getToken: (
          m: unknown,
          opts: { vapidKey: string; serviceWorkerRegistration: ServiceWorkerRegistration },
        ) => Promise<string | null>;
      }>,
    ]);

    const app = appMod.initializeApp({
      apiKey: config.apiKey,
      projectId: config.projectId,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
    const messaging = msgMod.getMessaging(app);
    const token = await msgMod.getToken(messaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      return { ok: false, reason: 'failed' };
    }

    // 4. POST to backend so future pushes can fan out to this device.
    await ApiService.notifications.deviceTokens.register({
      fcm_token: token,
      platform: 'web',
    });

    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Inverse of registerForPush — call this when the user disables push.
 * Best-effort: failure to revoke is logged and swallowed.
 */
export async function unregisterFromPush(token: string): Promise<void> {
  try {
    await ApiService.notifications.deviceTokens.revoke({ fcm_token: token });
  } catch {
    // ignore — token will eventually be pruned server-side
  }
}
