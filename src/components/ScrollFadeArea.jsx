/**
 * Skiper87 — Scroll with Fade Effect
 * Source: skiper-ui.com/docs/components/skiper87
 * Pure CSS scroll-driven animation with dynamic masking that smoothly fades
 * content at the top and bottom boundaries based on container scroll position.
 */
import React from 'react';

export default function ScrollFadeArea({
  children,
  className = '',
  maxHeight = 'max-h-[460px]',
  ...props
}) {
  return (
    <div
      className={`overflow-y-auto overflow-x-hidden scroll-fade-y ${maxHeight} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export { ScrollFadeArea as Skiper87 };

