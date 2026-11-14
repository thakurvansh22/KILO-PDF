import React from 'react';

export interface AdSlotProps {
  slotId: string;
  format?: 'banner' | 'rectangle' | 'sidebar' | 'auto';
  className?: string;
}

/**
 * AdSlot placeholder for Google AdSense.
 * Renders a clearly marked placeholder ONLY in development (import.meta.env.DEV).
 * In production builds, returns null so no empty placeholder boxes appear on the live site.
 */
export const AdSlot: React.FC<AdSlotProps> = ({
  slotId,
  format = 'auto',
  className = '',
}) => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const formatDimensions: Record<NonNullable<AdSlotProps['format']>, string> = {
    banner: 'min-h-[90px] w-full',
    rectangle: 'min-h-[250px] w-full max-w-[336px] mx-auto',
    sidebar: 'min-h-[600px] w-full',
    auto: 'min-h-[100px] w-full',
  };

  return (
    <aside
      aria-label={`Ad space (${slotId})`}
      data-ad-slot={slotId}
      data-ad-format={format}
      className={`rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/50 flex flex-col items-center justify-center p-4 text-center select-none transition-colors ${formatDimensions[format]} ${className}`}
    >
      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        Ad space
      </span>
      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-1">
        {slotId} • {format}
      </span>
    </aside>
  );
};
