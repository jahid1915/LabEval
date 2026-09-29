import React from 'react';

/**
 * RuetLogo
 * High-definition, aspect-ratio-preserved, perfectly circular RUET official logo container.
 * Guaranteed to never distort, stretch into an oval, or clip essential emblem details.
 */
export default function RuetLogo({ size = 40, className = '', containerClassName = '' }) {
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-transparent border border-slate-200/90 dark:border-slate-700/80 shadow-sm transition-all ${containerClassName}`}
      style={{ width: size, height: size }}
      title="Rajshahi University of Engineering & Technology"
    >
      <img
        src="/RUETLOGO.png"
        alt="RUET Official Logo"
        className={`w-full h-full object-contain rounded-full select-none ${className}`}
        style={{ aspectRatio: '1 / 1' }}
        loading="eager"
      />
    </div>
  );
}
