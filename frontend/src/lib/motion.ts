/**
 * Motion design tokens — durations and easings used across the app.
 * Wrap motion components with <MotionConfig reducedMotion="user"> (already done in
 * Providers) so prefers-reduced-motion users get instant transitions automatically.
 */

import type { Transition, Variants } from 'framer-motion';

export const DURATION = {
  instant: 0.08,
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

export const EASING = {
  /** Decelerate — UI elements arriving on screen. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Accelerate — UI elements leaving the screen. */
  in: [0.7, 0, 0.84, 0] as const,
  /** Standard — symmetric movement, in/out states of toggles. */
  inOut: [0.65, 0, 0.35, 1] as const,
  /** Springy delight — small celebratory cues only; not a default. */
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const TRANSITIONS = {
  fadeIn: { duration: DURATION.base, ease: EASING.out } satisfies Transition,
  slide:  { duration: DURATION.slow, ease: EASING.out } satisfies Transition,
  modal:  { duration: DURATION.fast, ease: EASING.out } satisfies Transition,
  pop:    { duration: DURATION.base, ease: EASING.spring } satisfies Transition,
} as const;

export const VARIANTS = {
  fadeIn: {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: TRANSITIONS.fadeIn },
    exit:   { opacity: 0, transition: { duration: DURATION.fast, ease: EASING.in } },
  },
  slideUp: {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: TRANSITIONS.slide },
    exit:   { opacity: 0, y: 8,  transition: { duration: DURATION.fast, ease: EASING.in } },
  },
  slideDown: {
    hidden: { opacity: 0, y: -16 },
    show:   { opacity: 1, y: 0, transition: TRANSITIONS.slide },
    exit:   { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASING.in } },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 16 },
    show:   { opacity: 1, x: 0, transition: TRANSITIONS.slide },
    exit:   { opacity: 0, x: 8,  transition: { duration: DURATION.fast, ease: EASING.in } },
  },
  slideRight: {
    hidden: { opacity: 0, x: -16 },
    show:   { opacity: 1, x: 0, transition: TRANSITIONS.slide },
    exit:   { opacity: 0, x: -8, transition: { duration: DURATION.fast, ease: EASING.in } },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.96 },
    show:   { opacity: 1, scale: 1, transition: TRANSITIONS.pop },
    exit:   { opacity: 0, scale: 0.98, transition: { duration: DURATION.fast, ease: EASING.in } },
  },
  pop: {
    hidden: { opacity: 0, scale: 0.92 },
    show:   { opacity: 1, scale: 1, transition: TRANSITIONS.pop },
    exit:   { opacity: 0, scale: 0.92, transition: { duration: DURATION.fast, ease: EASING.in } },
  },
  /** Container for staggered lists — children animate one after another. */
  staggerContainer: {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.04, delayChildren: 0.02 },
    },
  },
  /** Item to drop into a staggered list. */
  staggerItem: {
    hidden: { opacity: 0, y: 8 },
    show:   { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASING.out } },
  },
} satisfies Record<string, Variants>;

/** Convenience for AnimatePresence wrappers. */
export const PRESENCE = {
  initial: 'hidden' as const,
  animate: 'show' as const,
  exit: 'exit' as const,
};
