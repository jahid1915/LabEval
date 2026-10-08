import React from 'react';

/**
 * RuetLogo
 * High-definition, aspect-ratio-preserved official RUET emblem.
 * Completely transparent background without any artificial white circle or clipped borders,
 * seamlessly blending into both Light Mode and Dark Mode backgrounds.
 */
export default function RuetLogo({
  size = 40,
  className = '',
  containerClassName = ''
}) {
  return (
    <div
      className={`shrink-0 flex items-center justify-center transition-transform duration-200 hover:scale-105 ${containerClassName}`}
      style={{
        width: size,
        height: size
      }}
      title="Rajshahi University of Engineering & Technology"
    >
      <img
        src="/RUETLOGO.png"
        alt="RUET Official Logo"
        className={`w-full h-full object-contain select-none drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] ${className}`}
        loading="eager"
      />
    </div>
  );
}
