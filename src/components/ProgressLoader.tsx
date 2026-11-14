import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProgressLoaderProps {
  progress: number;
  status?: string;
  title?: string;
}

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  progress,
  status = 'Processing PDF in memory...',
  title = 'Processing...',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white text-base">
              {title}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              100% Client-Side WebAssembly
            </p>
          </div>
        </div>
        <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {clampedProgress}%
        </span>
      </div>

      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate text-center">
        {status}
      </p>
    </div>
  );
};
