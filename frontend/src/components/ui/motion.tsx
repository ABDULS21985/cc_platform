'use client';

/**
 * Reusable motion primitives. Wrap content with these to get consistent enter/exit
 * animations using design tokens from src/lib/motion.ts.
 *
 * prefers-reduced-motion is honored automatically because Providers wraps the tree
 * in <MotionConfig reducedMotion="user">.
 *
 * Usage:
 *   <FadeIn>...</FadeIn>
 *   <SlideUp delay={0.1}>...</SlideUp>
 *   <StaggerList>
 *     {items.map(i => <StaggerItem key={i.id}>...</StaggerItem>)}
 *   </StaggerList>
 */

import * as React from 'react';
import { motion, AnimatePresence, type HTMLMotionProps, type Variants } from 'framer-motion';
import { VARIANTS, PRESENCE } from '@/lib/motion';

type MotionDivProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate' | 'exit'>;

interface PresetProps extends MotionDivProps {
  /** Delay before this element animates in, in seconds. */
  delay?: number;
  /** Override the default variants. */
  variantsOverride?: Variants;
}

function buildPreset(defaultVariants: Variants) {
  return React.forwardRef<HTMLDivElement, PresetProps>(
    ({ delay, variantsOverride, transition, ...props }, ref) => {
      const variants = variantsOverride ?? defaultVariants;
      return (
        <motion.div
          ref={ref}
          variants={variants}
          initial={PRESENCE.initial}
          animate={PRESENCE.animate}
          exit={PRESENCE.exit}
          transition={delay !== undefined ? { delay, ...(transition as object) } : transition}
          {...props}
        />
      );
    }
  );
}

export const FadeIn      = buildPreset(VARIANTS.fadeIn);
FadeIn.displayName       = 'FadeIn';

export const SlideUp     = buildPreset(VARIANTS.slideUp);
SlideUp.displayName      = 'SlideUp';

export const SlideDown   = buildPreset(VARIANTS.slideDown);
SlideDown.displayName    = 'SlideDown';

export const SlideLeft   = buildPreset(VARIANTS.slideLeft);
SlideLeft.displayName    = 'SlideLeft';

export const SlideRight  = buildPreset(VARIANTS.slideRight);
SlideRight.displayName   = 'SlideRight';

export const ScaleIn     = buildPreset(VARIANTS.scaleIn);
ScaleIn.displayName      = 'ScaleIn';

export const Pop         = buildPreset(VARIANTS.pop);
Pop.displayName          = 'Pop';

/** Container that staggers its direct StaggerItem children. */
export const StaggerList = React.forwardRef<HTMLDivElement, MotionDivProps>(
  (props, ref) => (
    <motion.div
      ref={ref}
      variants={VARIANTS.staggerContainer}
      initial={PRESENCE.initial}
      animate={PRESENCE.animate}
      {...props}
    />
  )
);
StaggerList.displayName = 'StaggerList';

/** Item used inside a StaggerList; inherits stagger timing from the parent. */
export const StaggerItem = React.forwardRef<HTMLDivElement, MotionDivProps>(
  (props, ref) => <motion.div ref={ref} variants={VARIANTS.staggerItem} {...props} />
);
StaggerItem.displayName = 'StaggerItem';

export { motion, AnimatePresence };
