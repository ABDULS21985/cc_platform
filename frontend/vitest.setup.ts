import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Tear down between tests so the DOM (and any mounted providers) start fresh.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Polyfill localStorage for jsdom — most of our auth flow reads from it.
const memStore: Record<string, string> = {};
const memLocalStorage: Storage = {
  getItem: (key) => (key in memStore ? memStore[key] : null),
  setItem: (key, value) => {
    memStore[key] = String(value);
  },
  removeItem: (key) => {
    delete memStore[key];
  },
  clear: () => {
    for (const k of Object.keys(memStore)) delete memStore[k];
  },
  key: (i) => Object.keys(memStore)[i] ?? null,
  get length() {
    return Object.keys(memStore).length;
  },
};
Object.defineProperty(window, 'localStorage', { value: memLocalStorage });

// jsdom doesn't provide window.Notification — tests that need to assert
// OS-permission behavior install a per-test stub.
if (typeof window !== 'undefined' && !('Notification' in window)) {
  // @ts-expect-error — adding a stub to the global so tests can opt in.
  window.Notification = undefined;
}
