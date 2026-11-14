import React from 'react';
import { Download, CheckCircle2, RotateCcw, FileText, Archive } from 'lucide-react';
import { formatBytes } from '../utils/pdfUtils';

interface DownloadButtonProps {
  data: Uint8Array | Blob;
  fileName: string;
  mimeType?: string;
  onReset?: () => void;
  label?: string;
  resetLabel?: string;
  subtitle?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  data,
  fileName,
  mimeType = 'application/pdf',
  onReset,
  label = 'Download Result',
  resetLabel = 'Process Another Document',
  subtitle,
}) => {
  const isZip = fileName.endsWith('.zip');
  const size = data instanceof Blob ? data.size : data.byteLength;

  const handleDownload = () => {
    const blob = data instanceof Blob ? data : new Blob([data.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Your file is ready!
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle || 'Processed entirely within your browser in milliseconds.'}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            {isZip ? <Archive className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {fileName}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {formatBytes(size)} • {isZip ? 'ZIP Archive' : 'PDF Document'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{label}</span>
        </button>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 font-medium text-sm transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{resetLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
