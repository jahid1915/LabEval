import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const pageVariants = {
  initial: (shouldReduce) => ({
    opacity: 0,
    x: shouldReduce ? 0 : 20,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.24,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
  exit: (shouldReduce) => ({
    opacity: 0,
    x: shouldReduce ? 0 : -20,
    transition: {
      duration: 0.18,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  }),
};

/**
 * PageTransition
 * High-polish Right-to-Left route transition wrapper using Framer Motion.
 * Respects prefers-reduced-motion, prevents layout jumping and horizontal scrollbars.
 */
export default function PageTransition({ children, className = '' }) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      custom={shouldReduce}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full overflow-x-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}
