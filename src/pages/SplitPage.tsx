import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileOutput,
  Layers,
  Archive,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  FileCheck2,
  Info,
  HelpCircle,
  Hash,
  ShieldCheck
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressLoader } from '../components/ProgressLoader';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { SplitMode } from '../types';
import {
  formatBytes,
  readPdfFile,
  parsePageRangeString,
  extractPDFPages,
  splitAllPagesToZip,
  createSamplePDF
} from '../utils/pdfUtils';

export const SplitPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Split mode state
  const [mode, setMode] = useState<SplitMode>('range');
  const [rangeInput, setRangeInput] = useState('1');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [extractedPageNumbers, setExtractedPageNumbers] = useState<number[]>([]);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When a file is loaded or page count changes, validate range
  useEffect(() => {
    if (pageCount > 0 && mode === 'range') {
      const parsed = parsePageRangeString(rangeInput, pageCount);
      if (!parsed.valid) {
        setRangeError(parsed.error || 'Invalid page range');
        setExtractedPageNumbers([]);
      } else {
        setRangeError(null);
        setExtractedPageNumbers(parsed.pageNumbers);
      }
    }
  }, [rangeInput, pageCount, mode]);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);

    try {
      const { pageCount: count } = await readPdfFile(file);
      setSelectedFile(file);
      setPageCount(count);
      setFileSize(file.size);
      setResultData(null);

      // Default reasonable range
      if (count === 1) {
        setRangeInput('1');
      } else if (count <= 3) {
        setRangeInput(`1-${count}`);
      } else {
        setRangeInput(`1-${Math.min(3, count)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setSelectedFile(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLoadDemoFile = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePDF('Annual Report & Strategy', 6);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate sample PDF.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPageCount(0);
    setFileSize(0);
    setResultData(null);
    setResultFileName('');
    setErrorMessage(null);
    setRangeError(null);
  };

  // Preset range helpers
  const applyPreset = (preset: 'all' | 'odd' | 'even' | 'first-half') => {
    if (pageCount <= 0) return;

    if (preset === 'all') {
      setRangeInput(`1-${pageCount}`);
    } else if (preset === 'odd') {
      const odds: number[] = [];
      for (let i = 1; i <= pageCount; i += 2) odds.push(i);
      setRangeInput(odds.join(', '));
    } else if (preset === 'even') {
      const evens: number[] = [];
      for (let i = 2; i <= pageCount; i += 2) evens.push(i);
      setRangeInput(evens.length > 0 ? evens.join(', ') : '1');
    } else if (preset === 'first-half') {
      const half = Math.max(1, Math.ceil(pageCount / 2));
      setRangeInput(`1-${half}`);
    }
  };

  const handleExecuteSplit = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(5);

    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');

    try {
      if (mode === 'range') {
        const parsed = parsePageRangeString(rangeInput, pageCount);
        if (!parsed.valid || parsed.pageIndices.length === 0) {
          throw new Error(parsed.error || 'Please provide a valid page range.');
        }

        const bytes = await extractPDFPages(selectedFile, parsed.pageIndices, (prog, stat) => {
          setProgressPercent(prog);
          setProgressStatus(stat);
        });

        const rangeLabel = rangeInput.replace(/[^a-zA-Z0-9-]/g, '_');
        setResultFileName(`${baseName}_extracted_p${rangeLabel}.pdf`);
        setResultData(bytes);
      } else {
        // Split all pages into ZIP
        const zipBlob = await splitAllPagesToZip(selectedFile, (prog, stat) => {
          setProgressPercent(prog);
          setProgressStatus(stat);
        });

        setResultFileName(`${baseName}_all_pages.zip`);
        setResultData(zipBlob);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred during splitting.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES.split.seoTitle}
        description={TOOL_GUIDES.split.seoDescription}
        path={TOOL_GUIDES.split.route}
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
              <span className="p-2.5 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-600/20">
                <FileOutput className="w-6 h-6" />
              </span>
              <span>Split PDF</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Extract specific page ranges or unpack every single page into individual files in a ZIP.
            </p>
          </div>

          <PrivacyBanner compact />
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Split Failed</span>
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

      {/* Download Result View */}
      {resultData ? (
        <DownloadButton
          data={resultData}
          fileName={resultFileName}
          label={mode === 'range' ? 'Download Extracted PDF' : 'Download ZIP of All Pages'}
          resetLabel="Split Another PDF"
          subtitle={
            mode === 'range'
              ? `Extracted ${extractedPageNumbers.length} pages (${extractedPageNumbers.join(', ')}) from ${selectedFile?.name}.`
              : `Created ZIP containing ${pageCount} individual page PDF files.`
          }
          onReset={handleReset}
        />
      ) : isProcessing ? (
        /* Progress loader */
        <div className="py-12">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title={mode === 'range' ? 'Extracting Specified Pages...' : 'Splitting Pages into ZIP...'}
          />
        </div>
      ) : !selectedFile ? (
        /* Dropzone Upload View */
        <div className="space-y-6">
          <FileDropzone
            multiple={false}
            title="Drop a PDF file here to split"
            subtitle="Select a PDF to extract pages or split into individual documents"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Multipage Report"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemoFile}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load 6-page demo document to test split features</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Configure Split Options View */
        <div className="space-y-6">
          {/* Loaded File Metadata Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold shrink-0">
                <FileOutput className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                  {selectedFile.name}
                </h3>
                <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <Hash className="w-3 h-3" />
                    {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                  </span>
                  <span>•</span>
                  <span className="font-mono">{formatBytes(fileSize)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Choose Different File</span>
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mode A: Extract Range */}
            <div
              onClick={() => setMode('range')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                mode === 'range'
                  ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      mode === 'range'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-base">
                      (a) Extract Page Range
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Extract custom selection into one PDF
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    mode === 'range'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {mode === 'range' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3">
                Specify pages like <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">1-3, 5, 8-10</code> to combine into a new single PDF.
              </p>
            </div>

            {/* Mode B: Split every page to ZIP */}
            <div
              onClick={() => setMode('all')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                mode === 'all'
                  ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      mode === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-base">
                      (b) Split All to ZIP
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Save every page as separate PDF
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    mode === 'all'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {mode === 'all' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3">
                Splits every page into its own individual PDF and packages all <span className="font-semibold text-zinc-900 dark:text-white">{pageCount}</span> files into a ZIP archive.
              </p>
            </div>
          </div>

          {/* Mode Configuration Details */}
          {mode === 'range' ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="range-input" className="block text-sm font-bold text-zinc-900 dark:text-white">
                    Pages to Extract:
                  </label>
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    Document has {pageCount} {pageCount === 1 ? 'page' : 'pages'} (1–{pageCount})
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="range-input"
                    type="text"
                    value={rangeInput}
                    onChange={e => setRangeInput(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8-10"
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-mono transition-all focus:outline-none focus:ring-2 ${
                      rangeError
                        ? 'border-red-500 bg-red-50/20 text-red-900 dark:text-red-200 focus:ring-red-500/30'
                        : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-indigo-500/30 focus:border-indigo-500'
                    }`}
                  />
                </div>

                {rangeError ? (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{rangeError}</span>
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Will extract {extractedPageNumbers.length} {extractedPageNumbers.length === 1 ? 'page' : 'pages'}:{' '}
                      <span className="font-mono font-semibold">
                        {extractedPageNumbers.length <= 15
                          ? extractedPageNumbers.join(', ')
                          : `${extractedPageNumbers.slice(0, 15).join(', ')}... (+${extractedPageNumbers.length - 15} more)`}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Quick Presets:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    All Pages (1–{pageCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('odd')}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Odd Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('even')}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Even Pages
                  </button>
                  {pageCount > 2 && (
                    <button
                      type="button"
                      onClick={() => applyPreset('first-half')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      First Half (1–{Math.ceil(pageCount / 2)})
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Page Pills Preview */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Page Selection Map:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => {
                    const isSelected = extractedPageNumbers.includes(p);
                    return (
                      <span
                        key={p}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                            : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {p}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ZIP Split Option Info */
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">
                    Package {pageCount} Individual PDF Files
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Every page from <strong>{selectedFile.name}</strong> will be saved as an independent single-page PDF document and bundled inside a compressed ZIP archive using JSZip.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono text-zinc-600 dark:text-zinc-300 space-y-1">
                <div className="text-zinc-400 dark:text-zinc-500 font-sans font-semibold">Archive contents preview:</div>
                <div className="truncate text-indigo-600 dark:text-indigo-400">📁 {selectedFile.name.replace(/\.[^/.]+$/, '')}_all_pages.zip</div>
                <div className="pl-4">├── page_001.pdf</div>
                <div className="pl-4">├── page_002.pdf</div>
                {pageCount > 3 && <div className="pl-4 text-zinc-400">├── ... ({pageCount - 2} more pages)</div>}
                <div className="pl-4">└── page_{String(pageCount).padStart(3, '0')}.pdf</div>
              </div>
            </div>
          )}

          {/* Action CTA Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Processed locally in browser memory.</span>
            </div>

            <button
              type="button"
              onClick={handleExecuteSplit}
              disabled={mode === 'range' && (Boolean(rangeError) || extractedPageNumbers.length === 0)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all cursor-pointer"
            >
              {mode === 'range' ? (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Extract {extractedPageNumbers.length} Pages</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Split All {pageCount} Pages into ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="split" />
    </div>
  );
};
