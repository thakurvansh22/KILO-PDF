import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import {
  FileText,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Download,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  Image as ImageIcon,
  FileType,
  Check,
  XCircle,
  ScanText,
  FileSearch,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { PdfToWordMode } from '../types';
import { formatBytes, readPdfFile, createSamplePDF, parsePageRange } from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';
import { convertPdfToWord } from '../utils/docxConverter';

export const PdfToWordPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Conversion Options
  const [mode, setMode] = useState<PdfToWordMode>('text-clean');
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('1');

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressCurrentPage, setProgressCurrentPage] = useState<number>(0);
  const [progressTotalPages, setProgressTotalPages] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result States
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [isScannedWarning, setIsScannedWarning] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);
    setPreviewDataUrl(null);
    setIsScannedWarning(false);
    clearThumbnailCache();

    try {
      const { pageCount: count } = await readPdfFile(file);
      const proxy = await getPdfDocumentProxy(file);

      setSelectedFile(file);
      setPdfProxy(proxy);
      setPageCount(count);
      setCustomRange(count > 1 ? `1-${Math.min(count, 5)}` : '1');
      setResultBlob(null);

      // Render thumbnail preview of the first page
      const page1 = await proxy.getPage(1);
      const viewport = page1.getViewport({ scale: 0.6 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page1.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;
        setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
      }
      canvas.width = 0;
      canvas.height = 0;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setSelectedFile(null);
      setPdfProxy(null);
      setPageCount(0);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePDF('Annual Business & Research Report', 4);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate demo sample.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleStartConversion = async () => {
    if (!selectedFile || !pdfProxy || pageCount === 0) return;

    // Validate page range
    let pagesToConvert: number[] = [];
    if (rangeMode === 'all') {
      pagesToConvert = Array.from({ length: pageCount }, (_, i) => i + 1);
    } else {
      const rangeResult = parsePageRange(customRange, pageCount);
      if (!rangeResult.valid) {
        setErrorMessage(rangeResult.error || 'Invalid page range specified.');
        return;
      }
      pagesToConvert = rangeResult.pageNumbers;
    }

    if (pagesToConvert.length === 0) {
      setErrorMessage('No valid pages selected for conversion.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressCurrentPage(0);
    setProgressTotalPages(pagesToConvert.length);
    setProgressStatus('Initializing Word document generator...');
    setIsScannedWarning(false);

    try {
      const result = await convertPdfToWord(
        pdfProxy,
        pagesToConvert,
        mode,
        (current, total, status) => {
          setProgressCurrentPage(current);
          setProgressTotalPages(total);
          setProgressStatus(status);
        }
      );

      setResultBlob(result.blob);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${baseName}.docx`);
      setIsScannedWarning(result.isEmptyTextScan);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Conversion failed: ${msg}`);
      setResultBlob(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !resultFileName) return;
    saveAs(resultBlob, resultFileName);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setPageCount(0);
    setResultBlob(null);
    setResultFileName('');
    setPreviewDataUrl(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setIsScannedWarning(false);
  };

  const progressPercent =
    progressTotalPages > 0
      ? Math.min(100, Math.round((progressCurrentPage / progressTotalPages) * 100))
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <SEO
        title={TOOL_GUIDES['pdf-to-word'].seoTitle}
        description={TOOL_GUIDES['pdf-to-word'].seoDescription}
        path={TOOL_GUIDES['pdf-to-word'].route}
      />
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tools</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <FileType className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  PDF to Word
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  Beta
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Convert your PDF document into an editable Microsoft Word (.docx) document right inside your browser.
            </p>
          </div>

          {selectedFile && !isProcessing && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer self-start md:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Choose Another File</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Beta Notice Callout */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-3 text-indigo-900 dark:text-indigo-200 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
        <div className="space-y-0.5">
          <span className="font-bold">PDF to Word is basic (Beta).</span>
          <p className="text-indigo-800 dark:text-indigo-300 text-[11px] leading-relaxed">
            Standard paragraphs, bullet lists, headings, and images are reconstructed. Complex multi-nested tables, form fields, and exact proprietary fonts may differ from the original design.
          </p>
        </div>
      </div>

      <PrivacyBanner />

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/60 rounded cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {!selectedFile && (
        <div className="space-y-6">
          <FileDropzone
            onFilesSelected={handleFileSelected}
            title="Select PDF to convert to Word"
            subtitle="Upload a PDF file to generate an editable .docx document"
            sampleDocumentTitle="Business Report"
            disabled={isLoadingFile}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Text Only (Clean)
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Rebuilds paragraphs, heading levels, and bullet lists with native Word typography.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <ImageIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Text + Images
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Extracts embedded graphics and figures, placing them directly into your Word sections.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <Layers className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Page as Image
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Perfect for non-editable archive fidelity or scanned PDF documents.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure & Convert */}
      {selectedFile && !resultBlob && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Preview Column: First Page Thumbnail */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Document Preview
              </h3>
              <span className="text-[11px] font-mono text-zinc-400">
                Page 1 of {pageCount}
              </span>
            </div>

            <div className="relative aspect-[1/1.38] rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center overflow-hidden shadow-xs">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="First page preview"
                  className="max-h-full max-w-full object-contain pointer-events-none"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400 text-xs">
                  <FileType className="w-8 h-8 animate-pulse text-indigo-500" />
                  <span>Loading preview...</span>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <p className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatBytes(selectedFile.size)} • {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              </p>
            </div>
          </div>

          {/* Right Configuration Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Conversion Mode Selection */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                <FileType className="w-4 h-4 text-indigo-500" />
                <span>1. Conversion Mode</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'text-clean',
                    title: 'Text only (clean)',
                    desc: 'Rebuilds paragraphs & headings. Easiest to edit and re-style.',
                    icon: FileText,
                  },
                  {
                    id: 'text-images',
                    title: 'Text + Images',
                    desc: 'Extracts text and embeds graphic images inside sections.',
                    icon: ImageIcon,
                  },
                  {
                    id: 'page-image',
                    title: 'Page as image (exact)',
                    desc: 'High-res full page images in Word. 100% visual replica.',
                    icon: Layers,
                  },
                ].map(opt => {
                  const isSelected = mode === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMode(opt.id as PdfToWordMode)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{opt.title}</span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block leading-relaxed">
                            {opt.desc}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Page Range Selection */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>2. Page Range</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRangeMode('all')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    rangeMode === 'all'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">All Pages</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Convert all {pageCount} pages to Word
                    </span>
                  </div>
                  {rangeMode === 'all' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setRangeMode('custom')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    rangeMode === 'custom'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Custom Range</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Select specific page range
                    </span>
                  </div>
                  {rangeMode === 'custom' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              </div>

              {rangeMode === 'custom' && (
                <div className="pt-2 space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Pages to include (e.g. 1-3, 5):
                  </label>
                  <input
                    type="text"
                    value={customRange}
                    onChange={e => setCustomRange(e.target.value)}
                    placeholder={`1-${pageCount}`}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <p className="text-[10px] text-zinc-400">
                    Total document pages: 1 to {pageCount}
                  </p>
                </div>
              )}
            </div>

            {/* Action & Progress Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              {isProcessing ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                        Converting to Word (.docx)...
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {progressStatus}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-zinc-400 text-center">
                    Page {progressCurrentPage} of {progressTotalPages} • Generating Word processing OpenXML
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ready to generate Word document (.docx)
                  </div>
                  <button
                    type="button"
                    onClick={handleStartConversion}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
                  >
                    <FileType className="w-4 h-4" />
                    <span>Convert to Word (.docx)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Result & Download */}
      {resultBlob && selectedFile && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Word Document Ready!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Converted into a standard Microsoft Word (.docx) file.
              </p>
            </div>

            {/* Scanned warning notice if extracted text is virtually empty */}
            {isScannedWarning && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs text-left">
                <ScanText className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1.5">
                  <span className="font-bold">This looks like a scanned PDF.</span>
                  <p className="text-[11px] leading-relaxed">
                    Little or no digital selectable text was detected. To get an editable text Word document from scanned pages, try running the OCR tool first, or use mode "Page as image (exact look)".
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Link
                      to="/ocr"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px]"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Run OCR First</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('page-image');
                        setResultBlob(null);
                      }}
                      className="px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 font-semibold text-[10px] text-amber-900 dark:text-amber-200 hover:bg-amber-100"
                    >
                      Switch to "Page as Image"
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* File Info Pill */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {resultFileName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {formatBytes(resultBlob.size)} • Word Document (.docx)
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download {resultFileName}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Convert Another</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="pdf-to-word" />
    </div>
  );
};
