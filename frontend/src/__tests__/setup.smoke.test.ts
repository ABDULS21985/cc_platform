import { describe, it, expect } from 'vitest';

/**
 * Confirms Vitest is wired up correctly. If this test file fails to find
 * its globals, the rest of the suite needs investigation before adding
 * more.
 */
describe('test runner smoke', () => {
  it('runs and has DOM globals', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('has localStorage polyfill', () => {
    window.localStorage.setItem('k', 'v');
    expect(window.localStorage.getItem('k')).toBe('v');
    window.localStorage.removeItem('k');
    expect(window.localStorage.getItem('k')).toBeNull();
  });
});
