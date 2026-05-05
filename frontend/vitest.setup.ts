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

// jsdom doesn't implement matchMedia. Components that subscribe to
// breakpoint queries (Sidebar, MobileNav, etc.) will throw without this.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

// IntersectionObserver — used by Radix scroll-area, virtualization, etc.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    observe = () => {};
    disconnect = () => {};
    unobserve = () => {};
    takeRecords = () => [];
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
  }
  (window as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
    MockIntersectionObserver;
}

// ResizeObserver — used by some Radix primitives.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class MockResizeObserver {
    observe = () => {};
    disconnect = () => {};
    unobserve = () => {};
  }
  (window as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver = MockResizeObserver;
}

// Pointer Events API — Radix Select / DropdownMenu / Popover trigger code
// reads hasPointerCapture / setPointerCapture on the target. jsdom doesn't
// implement them; polyfill no-ops so userEvent.click on those triggers works.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
