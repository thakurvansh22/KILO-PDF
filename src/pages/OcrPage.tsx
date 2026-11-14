import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createWorker, Worker } from 'tesseract.js';
import {
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  Download,
  Copy,
  Check,
  FileText,
  FileCheck2,
  Info,
  XCircle,
  Layers,
  Globe2,
  Sliders,
  FileSearch,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { PageThumbnailGrid } from '../components/PageThumbnailGrid';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { PageItem, OCRQualityPreset } from '../types';
import { formatBytes, readPdfFile, createSamplePDF, checkWinAnsiSafe } from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

interface LanguageOption {
  id: string;
  label: string;
  nativeLabel: string;
}

const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { id: 'eng', label: 'English', nativeLabel: 'English' },
  { id: 'hin', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { id: 'pan', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
];

export const OcrPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [hasExistingTextWarning, setHasExistingTextWarning] = useState<boolean>(false);

  // Options
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['eng']);
  const [qualityPreset, setQualityPreset] = useState<OCRQualityPreset>('good');
  const [makeSearchablePdf, setMakeSearchablePdf] = useState<boolean>(true);
  const [exportPlainText, setExportPlainText] = useState<boolean>(true);
  const [copyToClipboard, setCopyToClipboard] = useState<boolean>(false);

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPagesToProcess, setTotalPagesToProcess] = useState(0);
  const [pageProgressPercent, setPageProgressPercent] = useState(0);
  const [overallProgressPercent, setOverallProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results
  const [extractedPagesText, setExtractedPagesText] = useState<{ pageNumber: number; text: string }[]>([]);
  const [searchablePdfData, setSearchablePdfData] = useState<Uint8Array | null>(null);
  const [plainTextData, setPlainTextData] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Cancellation and worker reference
  const isCancelledRef = useRef<boolean>(false);
  const activeWorkerRef = useRef<Worker | null>(null);

  const toggleLanguage = (langId: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(langId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(l => l !== langId);
      } else {
        return [...prev, langId];
      }
    });
  };

  const hasNonLatinLanguage = selectedLanguages.some(l => l === 'hin' || l === 'pan');

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);
    setHasExistingTextWarning(false);
    clearThumbnailCache();

    try {
      const { pageCount } = await readPdfFile(file);
      const proxy = await getPdfDocumentProxy(file);

      setPdfProxy(proxy);
      setSelectedFile(file);

      // Check if any of the first few pages already has selectable text
      let foundSelectableText = false;
      const checkLimit = Math.min(3, pageCount);
      for (let i = 1; i <= checkLimit; i++) {
        try {
          const p = await proxy.getPage(i);
          const textContent = await p.getTextContent();
          let charCount = 0;
          for (const item of textContent.items) {
            if ('str' in item) {
              charCount += item.str.trim().length;
            }
          }
          if (charCount > 25) {
            foundSelectableText = true;
            break;
          }
        } catch {
          // ignore
        }
      }
      setHasExistingTextWarning(foundSelectableText);

      // Default: all pages selected
      const initialPages: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
        id: `ocr-page-${i}`,
        originalIndex: i,
        pageNumber: i + 1,
        rotation: 0,
        selected: true,
      }));
      setPages(initialPages);

      // Reset results
      setExtractedPagesText([]);
      setSearchablePdfData(null);
      setPlainTextData(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setSelectedFile(null);
      setPdfProxy(null);
      setPages([]);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePDF('Scanned Invoice & Contract Document', 3);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate demo document.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleToggleSelectPage = (pageId: string) => {
    setPages(prev =>
      prev.map(p => (p.id === pageId ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleSelectAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const handleClearAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const selectedPages = pages.filter(p => p.selected);

  // Cancellation handler
  const handleCancel = async () => {
    isCancelledRef.current = true;
    setProgressStatus('Cancelling OCR process...');
    if (activeWorkerRef.current) {
      try {
        await activeWorkerRef.current.terminate();
      } catch {
        // ignore
      }
      activeWorkerRef.current = null;
    }
    setIsProcessing(false);
    setIsDownloadingModel(false);
  };

  // Run OCR
  const handleStartOcr = async () => {
    if (!selectedFile || !pdfProxy || selectedPages.length === 0) return;

    if (!makeSearchablePdf && !exportPlainText && !copyToClipboard) {
      setErrorMessage('Please select at least one output option (Searchable PDF, Plain text, or Copy to clipboard).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    isCancelledRef.current = false;
    setCurrentPageIndex(0);
    setTotalPagesToProcess(selectedPages.length);
    setPageProgressPercent(0);
    setOverallProgressPercent(0);
    setProgressStatus('Initializing OCR engine...');

    const scaleMap: Record<OCRQualityPreset, number> = {
      fast: 1.5,
      good: 2.0,
      best: 3.0,
    };
    const renderScale = scaleMap[qualityPreset] || 2.0;

    let worker: Worker | null = null;
    const langCombo = selectedLanguages.join('+');

    try {
      setProgressStatus(`Loading OCR language data (${selectedLanguages.map(l => l.toUpperCase()).join('+')})...`);
      setIsDownloadingModel(true);

      worker = await createWorker(langCombo, 1, {
        logger: m => {
          if (isCancelledRef.current) return;
          if (
            m.status === 'loading language traineddata' ||
            m.status === 'downloading traineddata' ||
            m.status === 'loading tesseract core'
          ) {
            setIsDownloadingModel(true);
            const p = Math.round((m.progress || 0) * 100);
            setProgressStatus(`Downloading language traineddata (${p}%)...`);
          } else if (m.status === 'recognizing text') {
            setIsDownloadingModel(false);
            const p = Math.round((m.progress || 0) * 100);
            setPageProgressPercent(p);
          }
        },
      });

      activeWorkerRef.current = worker;
      setIsDownloadingModel(false);

      if (isCancelledRef.current) {
        await worker.terminate();
        return;
      }

      // Initialize searchable PDF document if requested
      let newPdfDoc: PDFDocument | null = null;
      let helveticaFont: any = null;
      if (makeSearchablePdf) {
        newPdfDoc = await PDFDocument.create();
        helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);
      }

      const resultsText: { pageNumber: number; text: string }[] = [];

      for (let idx = 0; idx < selectedPages.length; idx++) {
        if (isCancelledRef.current) break;

        const pageItem = selectedPages[idx];
        const pageNum = pageItem.pageNumber;
        setCurrentPageIndex(idx + 1);
        setPageProgressPercent(0);
        setProgressStatus(`Rendering & recognizing page ${idx + 1} of ${selectedPages.length} (Doc Page ${pageNum})...`);

        // 1. Render page to canvas with pdfjs-dist
        const pdfPage = await pdfProxy.getPage(pageNum);
        const unscaledViewport = pdfPage.getViewport({ scale: 1.0 });
        const viewport = pdfPage.getViewport({ scale: renderScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas 2D rendering context');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await pdfPage.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        if (isCancelledRef.current) {
          canvas.width = 0;
          canvas.height = 0;
          break;
        }

        // Export canvas as JPEG blob for Searchable PDF image layer
        let pageImgBytes: Uint8Array | null = null;
        if (makeSearchablePdf && newPdfDoc) {
          const blob = await new Promise<Blob | null>(res =>
            canvas.toBlob(b => res(b), 'image/jpeg', 0.88)
          );
          if (blob) {
            const ab = await blob.arrayBuffer();
            pageImgBytes = new Uint8Array(ab);
          }
        }

        // 2. Perform OCR on the rendered canvas
        setProgressStatus(`Recognizing text on page ${idx + 1} of ${selectedPages.length}...`);
        const ocrResult = await worker.recognize(canvas);

        const pageExtractedText = (ocrResult.data.text || '').trim();
        resultsText.push({
          pageNumber: pageNum,
          text: pageExtractedText,
        });

        // 3. If Searchable PDF: build page with background image + invisible text layer
        if (makeSearchablePdf && newPdfDoc && pageImgBytes) {
          const origWidth = unscaledViewport.width;
          const origHeight = unscaledViewport.height;

          const newPage = newPdfDoc.addPage([origWidth, origHeight]);
          const embeddedJpg = await newPdfDoc.embedJpg(pageImgBytes);

          // Draw the original high-resolution page image
          newPage.drawImage(embeddedJpg, {
            x: 0,
            y: 0,
            width: origWidth,
            height: origHeight,
          });

          // Draw invisible text layer if English/Latin characters are present
          const scaleX = origWidth / canvas.width;
          const scaleY = origHeight / canvas.height;

          const words = (ocrResult.data as any).words || [];

          for (const word of words) {
            if (!word || !word.text || !word.bbox) continue;
            const wordStr = word.text.trim();
            if (!wordStr) continue;

            // Only embed words that are safe for StandardFonts (WinAnsi)
            const { safe } = checkWinAnsiSafe(wordStr);
            if (safe && helveticaFont) {
              const x = word.bbox.x0 * scaleX;
              // Invert Y coordinate for bottom-left PDF coordinate system
              const y = origHeight - word.bbox.y1 * scaleY;
              const boxHeight = (word.bbox.y1 - word.bbox.y0) * scaleY;
              const fontSize = Math.max(4, Math.min(Math.round(boxHeight * 0.85), 72));

              try {
                newPage.drawText(wordStr, {
                  x: Math.max(0, x),
                  y: Math.max(0, y),
                  size: fontSize,
                  font: helveticaFont,
                  opacity: 0, // Invisible selectable text!
                });
              } catch {
                // Skip word if encoding error occurs
              }
            }
          }
        }

        // Memory cleanup: release canvas immediately
        canvas.width = 0;
        canvas.height = 0;

        const overallPercent = Math.round(((idx + 1) / selectedPages.length) * 100);
        setOverallProgressPercent(overallPercent);
      }

      if (isCancelledRef.current) {
        return;
      }

      // Finish results
      setExtractedPagesText(resultsText);

      // Plain text compilation
      const combinedText = resultsText
        .map(p => `--- Page ${p.pageNumber} ---\n\n${p.text}`)
        .join('\n\n\n');
      setPlainTextData(combinedText);

      // Copy to clipboard if selected
      if (copyToClipboard && combinedText) {
        try {
          await navigator.clipboard.writeText(combinedText);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
        } catch {
          // fallback
        }
      }

      // Save Searchable PDF if selected
      if (makeSearchablePdf && newPdfDoc) {
        setProgressStatus('Finalizing searchable PDF document...');
        const savedBytes = await newPdfDoc.save({ useObjectStreams: true });
        setSearchablePdfData(savedBytes);
      }

      setProgressStatus('OCR completed successfully!');
    } catch (err: unknown) {
      if (!isCancelledRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`OCR failed: ${msg}`);
      }
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore
        }
      }
      activeWorkerRef.current = null;
      setIsProcessing(false);
      setIsDownloadingModel(false);
    }
  };

  const handleCopyExtractedText = async () => {
    if (!plainTextData) return;
    try {
      await navigator.clipboard.writeText(plainTextData);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownloadPlainText = () => {
    if (!plainTextData || !selectedFile) return;
    const blob = new Blob([plainTextData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_ocr.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setPages([]);
    setExtractedPagesText([]);
    setSearchablePdfData(null);
    setPlainTextData(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setHasExistingTextWarning(false);
  };

  // Word & character stats
  const totalCharacters = plainTextData ? plainTextData.length : 0;
  const totalWords = plainTextData
    ? plainTextData
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <SEO
        title={TOOL_GUIDES.ocr.seoTitle}
        description={TOOL_GUIDES.ocr.seoDescription}
        path={TOOL_GUIDES.ocr.route}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                OCR Text Recognition
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Convert scanned PDF documents and images into selectable, searchable PDFs and editable plain text.
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

      {/* Step 1: Upload File */}
      {!selectedFile && (
        <div className="space-y-6">
          <FileDropzone
            onFilesSelected={handleFileSelected}
            title="Select scanned PDF or Image"
            subtitle="Upload a PDF document to recognize and extract text"
            sampleDocumentTitle="Scanned Invoice"
            disabled={isLoadingFile}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <FileSearch className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Searchable PDF
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Embeds an invisible selectable text layer directly over your original scan.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <Globe2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Multi-Language
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Accurate OCR support for English, Hindi (हिन्दी), and Punjabi (ਪੰਜਾਬੀ).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <Layers className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Local Memory
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tesseract.js runs inside WebAssembly. Your documents never leave your browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure & Process */}
      {selectedFile && !extractedPagesText.length && (
        <div className="space-y-8">
          {/* File Information Banner */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatBytes(selectedFile.size)} • {pages.length} pages total • {selectedPages.length} selected for OCR
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>Select All</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 text-zinc-400" />
                <span>Clear Selection</span>
              </button>
            </div>
          </div>

          {/* Warning if page already has selectable text */}
          {hasExistingTextWarning && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-semibold">Note:</span> This PDF already appears to have selectable text. OCR may not be strictly required unless you are recovering unindexed or damaged portions.
              </div>
            </div>
          )}

          {/* Options Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Language Selection */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                <Globe2 className="w-4 h-4 text-teal-500" />
                <span>1. Language Selection</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select one or more languages in your document:
              </p>

              <div className="grid grid-cols-1 gap-2">
                {AVAILABLE_LANGUAGES.map(lang => {
                  const isChecked = selectedLanguages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLanguage(lang.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isChecked
                          ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{lang.label}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {lang.nativeLabel} ({lang.id})
                      </span>
                    </button>
                  );
                })}
              </div>

              {hasNonLatinLanguage && (
                <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  Searchable PDF layer is optimized for English/Latin text. Full Hindi and Punjabi text is preserved in the Plain Text (.txt) export.
                </div>
              )}
            </div>

            {/* 2. Quality / Recognition Speed */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>2. Recognition Quality</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Balance between accuracy and recognition speed:
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fast', label: 'Fast', desc: 'Scale 1.5×', hint: 'Quick scan' },
                  { id: 'good', label: 'Good', desc: 'Scale 2.0×', hint: 'Recommended' },
                  { id: 'best', label: 'Best', desc: 'Scale 3.0×', hint: 'High-res' },
                ].map(item => {
                  const isSelected = qualityPreset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQualityPreset(item.id as OCRQualityPreset)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold ring-2 ring-indigo-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.desc}</span>
                      <span className="text-[9px] text-indigo-500 dark:text-indigo-400 mt-1">{item.hint}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
                Higher quality renders pages at higher DPI before OCR, improving accuracy for small or faded print.
              </div>
            </div>

            {/* 3. Output Formats */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                <FileCheck2 className="w-4 h-4 text-emerald-500" />
                <span>3. Output Options</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose the desired formats to generate:
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makeSearchablePdf}
                    onChange={e => setMakeSearchablePdf(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Searchable PDF
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Original page image with invisible text layer
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportPlainText}
                    onChange={e => setExportPlainText(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Plain Text (.txt)
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Clean raw text with page separators
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyToClipboard}
                    onChange={e => setCopyToClipboard(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Auto-Copy to Clipboard
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Copy extracted text when finished
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Page Selection Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                  Pages to Recognize ({selectedPages.length} of {pages.length})
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Click a page to select or skip it from the OCR batch
                </p>
              </div>
            </div>

            <PageThumbnailGrid
              pdfProxy={pdfProxy}
              pages={pages}
              mode="select"
              onToggleSelectPage={handleToggleSelectPage}
            />
          </div>

          {/* Execution Button & Progress Bar */}
          <div className="sticky bottom-6 z-30 p-4 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-bold text-zinc-900 dark:text-white">
                {selectedPages.length} {selectedPages.length === 1 ? 'page' : 'pages'}
              </span>{' '}
              selected • Languages: <span className="font-mono font-semibold">{selectedLanguages.join('+')}</span> • Quality: <span className="capitalize">{qualityPreset}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isProcessing ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel OCR</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartOcr}
                  disabled={selectedPages.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:from-teal-800 active:to-emerald-800 text-white font-bold text-sm shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Recognize & Extract Text</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Processing Loader Modal/Card */}
          {isProcessing && (
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4 max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">
                    Recognizing Text with Tesseract.js
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {progressStatus}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
                  {overallProgressPercent}%
                </span>
              </div>

              {/* Overall Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Overall document progress:</span>
                  <span>{currentPageIndex} of {totalPagesToProcess} pages</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Current Page Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Current page recognition:</span>
                  <span>{pageProgressPercent}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-teal-600 h-1.5 rounded-full transition-all duration-200"
                    style={{ width: `${pageProgressPercent}%` }}
                  />
                </div>
              </div>

              {isDownloadingModel && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200/60 dark:border-teal-800/60 flex items-center gap-2 text-xs text-teal-800 dark:text-teal-300">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Language data is downloading (one time only). This will be cached in your browser.</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel Process
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Result Preview & Downloads */}
      {extractedPagesText.length > 0 && selectedFile && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
                <Check className="w-3.5 h-3.5" />
                <span>OCR Recognition Complete</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                {selectedFile.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Processed {extractedPagesText.length} pages • {totalWords.toLocaleString()} words • {totalCharacters.toLocaleString()} characters
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {searchablePdfData && (
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([searchablePdfData.buffer as ArrayBuffer], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
                    a.download = `${baseName}_searchable.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Searchable PDF ({formatBytes(searchablePdfData.byteLength)})</span>
                </button>
              )}

              {plainTextData && (
                <button
                  type="button"
                  onClick={handleDownloadPlainText}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .txt</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyExtractedText}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copied to Clipboard!' : 'Copy All Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Process Another</span>
              </button>
            </div>
          </div>

          {/* Extracted Text Scrollable Preview Box */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  Extracted Text Preview
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  ({extractedPagesText.length} pages)
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyExtractedText}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="p-6 max-h-[550px] overflow-y-auto font-mono text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 selection:text-white space-y-6">
              {extractedPagesText.map(item => (
                <div key={item.pageNumber} className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                    <span>--- PAGE {item.pageNumber} ---</span>
                  </div>
                  <div>
                    {item.text ? (
                      item.text
                    ) : (
                      <span className="italic text-zinc-400">
                        [No text recognized on this page]
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="ocr" />
    </div>
  );
};
