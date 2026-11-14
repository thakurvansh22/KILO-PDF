import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Files,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  AlertTriangle,
  RotateCcw,
  Layers,
  FileCheck2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressLoader } from '../components/ProgressLoader';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { PDFFileInfo } from '../types';
import { formatBytes, readPdfFile, mergePDFs, createSamplePDF } from '../utils/pdfUtils';

export const MergePage: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFileInfo[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeStatus, setMergeStatus] = useState('');
  const [mergedData, setMergedData] = useState<Uint8Array | null>(null);
  const [mergedFileName, setMergedFileName] = useState('merged.pdf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesSelected = async (newFiles: File[]) => {
    setErrorMessage(null);
    setIsReadingFiles(true);

    const validNewEntries: PDFFileInfo[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      try {
        const { pageCount } = await readPdfFile(file);
        validNewEntries.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          pageCount,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
      }
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' | '));
    }

    if (validNewEntries.length > 0) {
      setPdfFiles(prev => [...prev, ...validNewEntries]);
    }

    setIsReadingFiles(false);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setPdfFiles(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    setPdfFiles(prev => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleRemove = (id: string) => {
    setPdfFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearAll = () => {
    setPdfFiles([]);
    setMergedData(null);
    setErrorMessage(null);
  };

  const handleLoadDemoPair = async () => {
    setIsReadingFiles(true);
    setErrorMessage(null);
    try {
      const doc1 = await createSamplePDF('Report Volume 1', 3);
      const doc2 = await createSamplePDF('Report Volume 2', 2);
      await handleFilesSelected([doc1, doc2]);
    } catch {
      setErrorMessage('Failed to generate demo sample files.');
    } finally {
      setIsReadingFiles(false);
    }
  };

  const handleMerge = async () => {
    if (pdfFiles.length < 2) {
      setErrorMessage('Please add at least 2 PDF documents to merge.');
      return;
    }

    setErrorMessage(null);
    setIsMerging(true);
    setMergeProgress(5);
    setMergeStatus('Initializing client-side merge...');

    try {
      const filesToMerge = pdfFiles.map(p => p.file);
      const resultBytes = await mergePDFs(filesToMerge, (prog, status) => {
        setMergeProgress(prog);
        setMergeStatus(status);
      });

      // Suggest name based on first file or custom
      const firstBase = pdfFiles[0].name.replace(/\.[^/.]+$/, '');
      setMergedFileName(`${firstBase}_merged.pdf`);
      setMergedData(resultBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An unexpected error occurred while merging your PDFs.');
    } finally {
      setIsMerging(false);
    }
  };

  const totalPages = pdfFiles.reduce((acc, curr) => acc + curr.pageCount, 0);
  const totalBytes = pdfFiles.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES.merge.seoTitle}
        description={TOOL_GUIDES.merge.seoDescription}
        path={TOOL_GUIDES.merge.route}
      />
      {/* Navigation Breadcrumb / Header */}
      <div className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Tools</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Files className="w-6 h-6" />
              </span>
              <span>Merge PDF</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Combine multiple PDF documents into a single cohesive file in whatever order you want.
            </p>
          </div>

          <PrivacyBanner compact />
        </div>
      </div>

      {/* Error alert box */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">PDF Processing Error</span>
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold hover:underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Completed State: Download Button */}
      {mergedData ? (
        <DownloadButton
          data={mergedData}
          fileName={mergedFileName}
          label="Download Merged PDF"
          resetLabel="Merge More Files"
          subtitle={`Combined ${pdfFiles.length} documents (${totalPages} total pages) without server upload.`}
          onReset={handleClearAll}
        />
      ) : isMerging ? (
        /* Progress State */
        <div className="py-12">
          <ProgressLoader
            progress={mergeProgress}
            status={mergeStatus}
            title="Merging PDF Documents..."
          />
        </div>
      ) : pdfFiles.length === 0 ? (
        /* Empty State: Dropzone */
        <div className="space-y-6">
          <FileDropzone
            multiple={true}
            title="Drop PDF files here to merge"
            subtitle="Select two or more PDF files from your device"
            onFilesSelected={handleFilesSelected}
            disabled={isReadingFiles}
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemoPair}
              disabled={isReadingFiles}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load 2 demo sample documents to test merge instantly</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* File List & Reorder Controls */
        <div className="space-y-6">
          {/* Summary Bar */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Files className="w-4 h-4 text-indigo-500" />
                <strong className="text-zinc-900 dark:text-white">{pdfFiles.length}</strong> files
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                <strong className="text-zinc-900 dark:text-white">{totalPages}</strong> total pages
              </span>
              <span>•</span>
              <span className="font-mono text-xs text-zinc-500">
                {formatBytes(totalBytes)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Add More PDFs</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      handleFilesSelected(Array.from(e.target.files));
                    }
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Draggable / Reorderable List */}
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Use the <span className="font-semibold text-zinc-700 dark:text-zinc-300">Up</span> and <span className="font-semibold text-zinc-700 dark:text-zinc-300">Down</span> arrows to change the order documents will appear in the merged PDF.
            </p>

            <ul className="space-y-2.5">
              {pdfFiles.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === pdfFiles.length - 1;

                return (
                  <li
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-3 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{formatBytes(item.size)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Move Up, Move Down, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={isFirst}
                        title="Move Up"
                        aria-label="Move Up"
                        className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={isLast}
                        title="Move Down"
                        aria-label="Move Down"
                        className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        title="Remove file"
                        aria-label="Remove file"
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Merge Action CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>Processed locally in browser memory.</span>
            </div>

            <button
              type="button"
              onClick={handleMerge}
              disabled={pdfFiles.length < 2 || isReadingFiles}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
            >
              <Files className="w-4 h-4" />
              <span>Merge {pdfFiles.length} PDF Files ({totalPages} Pages)</span>
            </button>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="merge" />
    </div>
  );
};
