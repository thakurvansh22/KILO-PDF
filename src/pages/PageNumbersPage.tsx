import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Hash,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  BookOpen,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressLoader } from '../components/ProgressLoader';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { PageNumberOptions, PageNumberPosition, PageNumberFormatPreset } from '../types';
import {
  readPdfFile,
  createSamplePDF,
  applyPageNumbersToPDF,
  checkWinAnsiSafe,
  parsePageRange,
} from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

export const PageNumbersPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 595.28,
    height: 841.89,
  });

  // Page Number Options
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
  const [margin, setMargin] = useState<number>(25);
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'Times' | 'Courier'>('Helvetica');
  const [fontSize, setFontSize] = useState<number>(11);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [formatPreset, setFormatPreset] = useState<PageNumberFormatPreset>('page-num-total');
  const [customFormat, setCustomFormat] = useState<string>('Page {n} of {total}');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [skipFirstPage, setSkipFirstPage] = useState<boolean>(false);
  const [applyTo, setApplyTo] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('1');
  const [differentOddEven, setDifferentOddEven] = useState<boolean>(false);

  // Execution states
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);
    clearThumbnailCache();

    try {
      const { pageCount: count } = await readPdfFile(file);
      const proxy = await getPdfDocumentProxy(file);

      setSelectedFile(file);
      setPdfProxy(proxy);
      setPageCount(count);
      setCurrentPage(1);
      setCustomRange(count > 1 ? `1-${count}` : '1');
      setResultData(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setSelectedFile(null);
      setPdfProxy(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePDF('Annual Report Document for Numbering', 5);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate sample PDF.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Render current page onto canvas
  useEffect(() => {
    let isCancelled = false;
    if (pdfProxy && currentPage) {
      pdfProxy.getPage(currentPage).then(page => {
        if (isCancelled) return;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({
          width: unscaledViewport.width,
          height: unscaledViewport.height,
        });

        const viewport = page.getViewport({ scale: zoomScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        }).promise.catch(err => {
          if (!isCancelled) console.error('Canvas render error', err);
        });
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [pdfProxy, currentPage, zoomScale]);

  // Compute live formatted text for current preview page
  const getPageNumberString = (pageIdx1: number): string => {
    if (skipFirstPage && pageIdx1 === 1) return '';

    const numValue = skipFirstPage ? pageIdx1 - 1 + startNumber - 1 : pageIdx1 - 1 + startNumber;

    switch (formatPreset) {
      case 'num':
        return `${numValue}`;
      case 'page-num':
        return `Page ${numValue}`;
      case 'page-num-total':
        return `Page ${numValue} of ${pageCount}`;
      case 'num-slash-total':
        return `${numValue} / ${pageCount}`;
      case 'custom':
        return (customFormat || '{n}')
          .replace(/{n}/g, String(numValue))
          .replace(/{total}/g, String(pageCount));
      default:
        return `${numValue}`;
    }
  };

  // Compute effective position for odd/even pages
  const getEffectivePosition = (pageIdx1: number): PageNumberPosition => {
    if (differentOddEven && pageIdx1 % 2 === 0) {
      if (position === 'bottom-right') return 'bottom-left';
      if (position === 'bottom-left') return 'bottom-right';
      if (position === 'top-right') return 'top-left';
      if (position === 'top-left') return 'top-right';
    }
    return position;
  };

  const previewText = getPageNumberString(currentPage);
  const effectivePosition = getEffectivePosition(currentPage);

  // Positioning style helper for live preview overlay
  const getPreviewPositionStyle = (pos: PageNumberPosition): React.CSSProperties => {
    const marginPx = margin * zoomScale;
    switch (pos) {
      case 'top-left':
        return { top: `${marginPx}px`, left: `${marginPx}px` };
      case 'top-center':
        return { top: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'top-right':
        return { top: `${marginPx}px`, right: `${marginPx}px` };
      case 'bottom-left':
        return { bottom: `${marginPx}px`, left: `${marginPx}px` };
      case 'bottom-center':
        return { bottom: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
        return { bottom: `${marginPx}px`, right: `${marginPx}px` };
    }
  };

  // Apply Page Numbers
  const handleApplyNumbers = async () => {
    if (!selectedFile) return;

    if (applyTo === 'custom') {
      const rangeCheck = parsePageRange(customRange, pageCount);
      if (!rangeCheck.valid || rangeCheck.pageIndices.length === 0) {
        setErrorMessage(rangeCheck.error || 'Please enter a valid page range.');
        return;
      }
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(15);
    setProgressStatus('Initializing page number stamping...');

    try {
      const options: PageNumberOptions = {
        position,
        margin,
        fontFamily,
        fontSize,
        color: textColor,
        formatPreset,
        customFormat,
        startNumber,
        skipFirstPage,
        applyTo,
        customRange,
        differentOddEven,
      };

      const numberedBytes = await applyPageNumbersToPDF(selectedFile, options, (prog, stat) => {
        setProgressPercent(prog);
        setProgressStatus(stat);
      });

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${baseName}_numbered.pdf`);
      setResultData(numberedBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred while stamping page numbers.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setResultData(null);
    setErrorMessage(null);
  };

  const winAnsiCheck = checkWinAnsiSafe(previewText);

  // Position presets
  const positionOptions: { id: PageNumberPosition; label: string }[] = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES['page-numbers'].seoTitle}
        description={TOOL_GUIDES['page-numbers'].seoDescription}
        path={TOOL_GUIDES['page-numbers'].route}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Back to All Tools"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              Page Numbers
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                Headers & Footers
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Insert dynamic page numbering with custom placement, formatting, and book printing styles.
            </p>
          </div>
        </div>

        {selectedFile && (
          <button
            type="button"
            onClick={handleReset}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Change PDF</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-bold underline cursor-pointer text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {resultData ? (
        <div className="py-12 max-w-xl mx-auto">
          <DownloadButton
            data={resultData}
            fileName={resultFileName}
            label="Download Numbered PDF"
            resetLabel="Number Another PDF"
            subtitle="Page numbers have been permanently stamped onto your document pages."
            onReset={handleReset}
          />
        </div>
      ) : isProcessing ? (
        <div className="py-24 max-w-md mx-auto">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Stamping Page Numbers..."
          />
        </div>
      ) : !selectedFile ? (
        /* Empty Upload View */
        <div className="space-y-6 max-w-3xl mx-auto">
          <FileDropzone
            multiple={false}
            title="Drop PDF file here to add page numbers"
            subtitle="Upload a document to insert header or footer page numbers"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Annual Report Document"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load sample 5-page report to test numbering</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Two-Column Editor Layout: Left Live Preview, Right Options */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Canvas Preview */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-4">
            <div className="w-full flex items-center justify-between px-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span>Previewing:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  Page {currentPage} of {pageCount}
                </span>
                {differentOddEven && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 font-semibold">
                    {currentPage % 2 === 0 ? 'Even Page (Mirrored)' : 'Odd Page'}
                  </span>
                )}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setZoomScale(s => Math.max(0.6, parseFloat((s - 0.15).toFixed(2))))}
                  className="p-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] w-9 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale(s => Math.min(1.8, parseFloat((s + 0.15).toFixed(2))))}
                  className="p-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Container with Overlaid Number Preview */}
            <div
              className="relative bg-white shadow-xl rounded-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden select-none"
              style={{
                width: Math.floor(pageDimensions.width * zoomScale),
                height: Math.floor(pageDimensions.height * zoomScale),
              }}
            >
              {/* PDF Background Canvas */}
              <canvas ref={canvasRef} className="block pointer-events-none" />

              {/* Page Number Overlay Preview */}
              {previewText && (
                <div
                  className="absolute pointer-events-none transition-all px-1.5 py-0.5 rounded"
                  style={{
                    ...getPreviewPositionStyle(effectivePosition),
                    fontFamily,
                    fontSize: `${fontSize * zoomScale}px`,
                    color: textColor,
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {previewText}
                </div>
              )}

              {skipFirstPage && currentPage === 1 && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-amber-500/90 text-white text-[10px] font-semibold shadow-xs">
                  Cover Page: Numbering Skipped
                </div>
              )}
            </div>

            {/* Page Navigation Switcher */}
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl shadow-xs text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Customization Controls Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
            {/* Format Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Numbering Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'page-num-total', label: `Page 1 of ${pageCount}` },
                  { id: 'num-slash-total', label: `1 / ${pageCount}` },
                  { id: 'page-num', label: 'Page 1' },
                  { id: 'num', label: '1' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormatPreset(opt.id as PageNumberFormatPreset)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      formatPreset === opt.id
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom Format option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setFormatPreset('custom')}
                  className={`w-full py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left flex items-center justify-between ${
                    formatPreset === 'custom'
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span>Custom Format ({'{n}'}, {'{total}'})</span>
                  <span className="text-[10px] text-zinc-400 font-mono">e.g. Doc - {'{n}'}</span>
                </button>
                {formatPreset === 'custom' && (
                  <input
                    type="text"
                    value={customFormat}
                    onChange={e => setCustomFormat(e.target.value)}
                    placeholder="Page {n} of {total}..."
                    className="mt-2 w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                  />
                )}
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Position Selector (Top vs Bottom / Left, Center, Right) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Position
                </label>
                <span className="text-xs text-zinc-400 capitalize">
                  {position.replace('-', ' ')}
                </span>
              </div>

              {/* Visual 2x3 placement selector */}
              <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                {positionOptions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPosition(p.id)}
                    className={`py-2 px-2 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      position === p.id
                        ? 'border-sky-600 bg-sky-600 text-white font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Different position for Odd / Even pages */}
              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={differentOddEven}
                  onChange={e => setDifferentOddEven(e.target.checked)}
                  className="rounded accent-sky-600"
                />
                <span className="font-semibold">Mirror position for Odd / Even pages (Book printing)</span>
              </label>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Margin, Font, Size, Color */}
            <div className="space-y-4">
              {/* Margin Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Margin from Edge:</span>
                  <span className="font-mono text-zinc-500">{margin} pt</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={margin}
                  onChange={e => setMargin(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Font Family */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Font:</label>
                  <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value as 'Helvetica' | 'Times' | 'Courier')}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times">Times New Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>

                {/* Font Size */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Size:</span>
                    <span className="font-mono text-zinc-500">{fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="22"
                    value={fontSize}
                    onChange={e => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Color:</label>
                <div className="flex items-center gap-2">
                  {['#000000', '#334155', '#475569', '#1e3a8a', '#dc2626'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTextColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        textColor === c ? 'scale-110 border-sky-600 ring-2 ring-sky-500/20' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={textColor}
                    onChange={e => setTextColor(e.target.value)}
                    className="w-7 h-7 rounded-full border-0 p-0 cursor-pointer overflow-hidden ml-1"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Sequence & Page Range options */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Numbering Range & Sequence
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Start Number:</label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={e => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={skipFirstPage}
                      onChange={e => setSkipFirstPage(e.target.checked)}
                      className="rounded accent-sky-600"
                    />
                    <span>Skip First Page (Cover)</span>
                  </label>
                </div>
              </div>

              {/* Page Range */}
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyTo('all')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      applyTo === 'all'
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950 text-sky-600 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    All Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyTo('custom')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      applyTo === 'custom'
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950 text-sky-600 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Specific Range
                  </button>
                </div>

                {applyTo === 'custom' && (
                  <input
                    type="text"
                    value={customRange}
                    onChange={e => setCustomRange(e.target.value)}
                    placeholder="e.g. 2-10, 15"
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                  />
                )}
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyNumbers}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Apply Numbers & Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="page-numbers" />
    </div>
  );
};
