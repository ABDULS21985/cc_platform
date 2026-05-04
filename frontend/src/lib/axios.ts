import axios, { AxiosError, AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

/**
 * Backend response envelope:
 *   {
 *     success: boolean,
 *     message: string,
 *     data: T | { ...field-specific },
 *     errors?: Record<string, string[]>,
 *   }
 *
 * Most callers extract `res.data.data.<field>`. The typed helpers in
 * `lib/api-envelope.ts` make this cleaner; raw axios stays available for
 * legacy callers.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://cc-pay-666057252406.europe-west1.run.app/api';

/** Endpoints we should never redirect-on-401 against (the auth flow itself). */
const PUBLIC_AUTH_PATHS = [
  '/v2/auth/login',
  '/v2/auth/signup',
  '/v2/auth/forgot-password',
  '/v2/auth/reset-password',
  '/v2/auth/verify-email',
  '/v2/auth/resend-otp',
  '/v2/auth/verify-login-otp',
  '/v2/auth/health',
];

/** Pages we'll redirect to on hard 401. Kept local so we don't grow it accidentally. */
const SIGNIN_PATH = '/signin';

/** App-wide debounce: don't show the same network error twice in 4s. */
const TOAST_DEBOUNCE_MS = 4_000;
const recentToasts = new Map<string, number>();
function shouldShow(key: string): boolean {
  const now = Date.now();
  const last = recentToasts.get(key) ?? 0;
  if (now - last < TOAST_DEBOUNCE_MS) return false;
  recentToasts.set(key, now);
  return true;
}

/** Single-flight redirect on 401 — even if 12 calls fail at once, redirect runs once. */
let isRedirectingFor401 = false;

function makeRequestId(): string {
  // 12 char base36 — short enough to keep logs readable, distinct enough for grep.
  return Math.random().toString(36).slice(2, 14);
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  // Backend uses Flask-Login session cookies on protected resources (alongside
  // a JWT Bearer for API-only callers). Send cookies on every request so
  // /api/v2/user/profile and /api/v2/wallet/* authenticate cleanly.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ───────────────────────────── Request interceptor ─────────────────────────────

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Attach a per-request id; the backend echoes this in logs once it lands the
    // structured-logging change (engineering roadmap Day 11).
    const requestId = makeRequestId();
    config.headers['X-Request-ID'] = requestId;
    // Surface the id on the config so the response interceptor can attribute errors.
    (config as InternalAxiosRequestConfig & { __requestId?: string }).__requestId = requestId;
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ─────────────────────────── Response interceptor ──────────────────────────────

interface BackendErrorBody {
  message?: string;
  errors?: Record<string, string[] | string>;
  code?: number;
  status?: string;
}

function urlPath(config: AxiosRequestConfig | undefined): string {
  if (!config?.url) return '';
  // Already-absolute URLs come through with the full path.
  try {
    const u = new URL(config.url, API_BASE_URL);
    return u.pathname.replace(/^\/api/, '');
  } catch {
    return config.url;
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorBody>) => {
    const status = error.response?.status;
    const config = error.config;
    const path = urlPath(config);

    // Network / CORS / offline → user-visible toast, debounced.
    if (!error.response) {
      if (typeof window !== 'undefined' && shouldShow('network')) {
        toast.error("Can't reach the server", {
          description: navigator.onLine
            ? 'The backend may be down. Try again in a moment.'
            : 'You appear to be offline.',
        });
      }
      return Promise.reject(error);
    }

    // 401 — token missing / invalid / expired.
    // Public auth endpoints are allowed to 401 (e.g. wrong password); we don't redirect those.
    if (
      status === 401 &&
      !PUBLIC_AUTH_PATHS.some((p) => path.endsWith(p))
    ) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('access_token');
        window.localStorage.removeItem('refresh_token');
        window.localStorage.removeItem('user_data');
        window.localStorage.removeItem('verification_data');

        if (!isRedirectingFor401) {
          isRedirectingFor401 = true;
          if (shouldShow('signin-redirect')) {
            toast.error('Your session expired', {
              description: 'Please sign in again.',
            });
          }
          // Defer one tick so any queued toast renders first.
          setTimeout(() => {
            const here = window.location.pathname + window.location.search;
            const next = encodeURIComponent(here);
            window.location.href = `${SIGNIN_PATH}?next=${next}`;
          }, 50);
        }
      }
      return Promise.reject(error);
    }

    // 5xx — show a generic toast (debounced) and let callers decide if they need more.
    if (status && status >= 500) {
      if (shouldShow(`5xx-${path}`)) {
        toast.error('Something went wrong on our side', {
          description: 'We saved the request id; try again or contact support.',
        });
      }
      return Promise.reject(error);
    }

    // 4xx other than 401 are caller-handled (validation messages live in the body).
    return Promise.reject(error);
  }
);

export default axiosInstance;
