import React from 'react';
import { ShieldCheck, Lock, Cpu, EyeOff } from 'lucide-react';

interface PrivacyBannerProps {
  compact?: boolean;
}

export const PrivacyBanner: React.FC<PrivacyBannerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Your files never leave your browser</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-emerald-50/70 dark:from-emerald-950/20 dark:via-zinc-900 dark:to-emerald-950/20 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Zero-Server Privacy Guarantee</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                100% Client-Side
              </span>
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Your files never leave your browser. All PDF parsing, splitting, and merging happens purely in local device RAM using WebAssembly and JavaScript.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400 font-medium shrink-0 self-end sm:self-center">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>Local RAM</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <div className="flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" />
            <span>No telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};
