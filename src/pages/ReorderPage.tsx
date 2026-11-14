import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Layers,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Undo2,
  ArrowUpDown,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft,
  Copy,
  FileUp,
  X,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressLoader } from '../components/ProgressLoader';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { PageThumbnailGrid } from '../components/PageThumbnailGrid';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { PageItem } from '../types';
import {
  formatBytes,
  readPdfFile,
  buildCustomPDF,
  PageSourceReference,
  createSamplePDF,
} from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

export const ReorderPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [initialPages, setInitialPages] = useState<PageItem[]>([]);
  const [undoHistory, setUndoHistory] = useState<PageItem[][]>([]);
  const [highlightedPageId, setHighlightedPageId] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // External files map for external replacement feature
  const [externalFiles, setExternalFiles] = useState<Map<string, File>>(new Map());
  const [externalProxies, setExternalProxies] = useState<Map<string, pdfjsLib.PDFDocumentProxy>>(new Map());

  // Replace / Swap Panel State
  const [isReplacePanelOpen, setIsReplacePanelOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState<'replace' | 'swap' | 'external'>('replace');
  const [pageA, setPageA] = useState<number>(1);
  const [pageB, setPageB] = useState<number>(2);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  // External PDF picker state
  const [extFile, setExtFile] = useState<File | null>(null);
  const [extProxy, setExtProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [extPageCount, setExtPageCount] = useState<number>(0);
  const [isLoadingExtFile, setIsLoadingExtFile] = useState(false);
  const extFileInputRef = useRef<HTMLInputElement>(null);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pushHistory = (currentPages: PageItem[]) => {
    setUndoHistory(prev => [...prev.slice(-20), currentPages]);
  };

  const highlightCard = (id: string) => {
    setHighlightedPageId(id);
    setTimeout(() => {
      setHighlightedPageId(null);
    }, 1500);
  };

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);
    clearThumbnailCache();

    try {
      const { pageCount } = await readPdfFile(file);
      const proxy = await getPdfDocumentProxy(file);

      setPdfProxy(proxy);
      setSelectedFile(file);

      const items: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
        id: `page-${i}`,
        originalIndex: i,
        pageNumber: i + 1,
        rotation: 0,
        sourceFileId: 'main',
      }));
      setPages(items);
      setInitialPages(items);
      setUndoHistory([]);
      setResultData(null);
      setPageA(1);
      setPageB(Math.min(2, pageCount));
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
      const sample = await createSamplePDF('Document for Reordering', 6);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate demo sample.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Reorder via Drag & Drop
  const handleReorderPages = (newPages: PageItem[]) => {
    pushHistory(pages);
    setPages(newPages);
  };

  // Move to First
  const handleMoveToFirst = (pageId: string) => {
    const index = pages.findIndex(p => p.id === pageId);
    if (index <= 0) return;
    pushHistory(pages);

    const item = pages[index];
    const next = [...pages];
    next.splice(index, 1);
    next.unshift(item);
    setPages(next);
    highlightCard(pageId);
  };

  // Move to Last
  const handleMoveToLast = (pageId: string) => {
    const index = pages.findIndex(p => p.id === pageId);
    if (index === -1 || index === pages.length - 1) return;
    pushHistory(pages);

    const item = pages[index];
    const next = [...pages];
    next.splice(index, 1);
    next.push(item);
    setPages(next);
    highlightCard(pageId);
  };

  // 1. Move to Arbitrary Target Position (1 to N)
  const handleMoveToPosition = (pageId: string, targetPosition: number) => {
    const currentIndex = pages.findIndex(p => p.id === pageId);
    const targetIndex = targetPosition - 1;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= pages.length) return;
    if (currentIndex === targetIndex) return;

    pushHistory(pages);

    const next = [...pages];
    const [movedItem] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, movedItem);

    setPages(next);
    highlightCard(pageId);
  };

  // 2. Replace Page A with Page B (Duplicate B into A's slot)
  const handleExecuteReplace = () => {
    setReplaceError(null);
    if (pageA < 1 || pageA > pages.length) {
      setReplaceError(`Target Page A must be between 1 and ${pages.length}.`);
      return;
    }
    if (pageB < 1 || pageB > pages.length) {
      setReplaceError(`Source Page B must be between 1 and ${pages.length}.`);
      return;
    }
    if (pageA === pageB) {
      setReplaceError('Page A and Page B cannot be the same page.');
      return;
    }

    pushHistory(pages);

    const targetIdx = pageA - 1;
    const sourceIdx = pageB - 1;
    const sourcePage = pages[sourceIdx];

    // Create duplicate item with fresh unique id
    const newId = `page-${sourcePage.originalIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duplicatePage: PageItem = {
      ...sourcePage,
      id: newId,
      isCopy: true,
    };

    const next = [...pages];
    next[targetIdx] = duplicatePage;

    setPages(next);
    highlightCard(newId);
  };

  // Swap Page A with Page B
  const handleExecuteSwap = () => {
    setReplaceError(null);
    if (pageA < 1 || pageA > pages.length) {
      setReplaceError(`Page A must be between 1 and ${pages.length}.`);
      return;
    }
    if (pageB < 1 || pageB > pages.length) {
      setReplaceError(`Page B must be between 1 and ${pages.length}.`);
      return;
    }
    if (pageA === pageB) {
      setReplaceError('Please select two distinct pages to swap.');
      return;
    }

    pushHistory(pages);

    const idxA = pageA - 1;
    const idxB = pageB - 1;
    const next = [...pages];
    const temp = next[idxA];
    next[idxA] = next[idxB];
    next[idxB] = temp;

    setPages(next);
    highlightCard(next[idxA].id);
    setTimeout(() => highlightCard(next[idxB].id), 200);
  };

  // Replace Page A with page from external PDF
  const handleExternalFileSelected = async (file: File) => {
    setIsLoadingExtFile(true);
    setReplaceError(null);
    try {
      const { pageCount } = await readPdfFile(file);
      const proxy = await getPdfDocumentProxy(file);
      const extId = `ext-${Date.now()}`;

      setExtFile(file);
      setExtProxy(proxy);
      setExtPageCount(pageCount);

      setExternalFiles(prev => new Map(prev).set(extId, file));
      setExternalProxies(prev => new Map(prev).set(extId, proxy));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReplaceError(`External PDF error: ${msg}`);
    } finally {
      setIsLoadingExtFile(false);
    }
  };

  const handlePickExternalPage = (extPageNum: number) => {
    if (!extFile || !extProxy) return;
    const targetIdx = pageA - 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    pushHistory(pages);

    const extId = Array.from(externalFiles.entries()).find(([_, f]) => f === extFile)?.[0] || `ext-${Date.now()}`;
    const newId = `page-ext-${extPageNum}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newPage: PageItem = {
      id: newId,
      originalIndex: extPageNum - 1,
      pageNumber: extPageNum,
      rotation: 0,
      sourceFileId: extId,
      sourceFileName: extFile.name,
      sourceLabel: 'Doc 2',
    };

    const next = [...pages];
    next[targetIdx] = newPage;
    setPages(next);
    highlightCard(newId);
  };

  // Reverse Order
  const handleReverseOrder = () => {
    pushHistory(pages);
    setPages(prev => [...prev].reverse());
  };

  // Undo last action
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, prev.length - 1));
    setPages(previous);
  };

  // Reset to initial
  const handleResetOrder = () => {
    pushHistory(pages);
    setPages([...initialPages]);
  };

  // Change file / start over
  const handleReset = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setPages([]);
    setInitialPages([]);
    setUndoHistory([]);
    setExternalFiles(new Map());
    setExternalProxies(new Map());
    setExtFile(null);
    setExtProxy(null);
    setResultData(null);
    setResultFileName('');
    setErrorMessage(null);
    clearThumbnailCache();
  };

  // Quick Replace button on a card: opens Replace Panel with Page A set to that card
  const handleCardReplaceClick = (_pageId: string, pageNum: number) => {
    setPageA(pageNum);
    setIsReplacePanelOpen(true);
    // Suggest next page or page 1 for B
    setPageB(pageNum === pages.length ? 1 : pageNum + 1);
  };

  const isOrderChanged =
    pages.length !== initialPages.length ||
    pages.some((p, idx) => p.originalIndex !== idx || p.isCopy || p.sourceFileId !== 'main');

  // Build & Download
  const handleApplyReorder = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStatus('Compiling PDF pages...');

    try {
      const pageReferences: PageSourceReference[] = pages.map(p => {
        const file = (p.sourceFileId && externalFiles.get(p.sourceFileId)) || selectedFile;
        return {
          file,
          pageIndex: p.originalIndex,
          rotation: p.rotation,
        };
      });

      const reorderedBytes = await buildCustomPDF(pageReferences, (prog, stat) => {
        setProgressPercent(prog);
        setProgressStatus(stat);
      });

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${baseName}_reordered.pdf`);
      setResultData(reorderedBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred while building the reordered PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES.reorder.seoTitle}
        description={TOOL_GUIDES.reorder.seoDescription}
        path={TOOL_GUIDES.reorder.route}
      />
      {/* Header */}
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
                <Layers className="w-6 h-6" />
              </span>
              <span>Reorder & Replace Pages</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Drag and drop pages, jump to specific positions, duplicate/replace pages, or swap pages effortlessly.
            </p>
          </div>

          <PrivacyBanner compact />
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Notice</span>
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
          label="Download Reordered PDF"
          resetLabel="Reorder Another PDF"
          subtitle={`Successfully reorganized all ${pages.length} pages in ${selectedFile?.name}. Zero server uploads.`}
          onReset={handleReset}
        />
      ) : isProcessing ? (
        /* Processing View */
        <div className="py-12">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Arranging PDF Pages..."
          />
        </div>
      ) : !selectedFile ? (
        /* Dropzone Upload View */
        <div className="space-y-6">
          <FileDropzone
            multiple={false}
            title="Drop PDF file here to reorder pages"
            subtitle="Drag & drop thumbnails, move to position, or duplicate/replace pages"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Document to Reorder"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load 6-page demo document to test reordering & replacement</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Loaded Document Workspace */
        <div className="space-y-6">
          {/* Metadata & Actions Toolbar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                  {selectedFile.name}
                </h3>
                <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {pages.length} Pages
                  </span>
                  <span>•</span>
                  <span className="font-mono">{formatBytes(selectedFile.size)}</span>
                  {isOrderChanged && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        Modified
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sequence Action Buttons & Undo/Reset */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReplacePanelOpen(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isReplacePanelOpen
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                <span>Replace / Swap</span>
                {isReplacePanelOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleReverseOrder}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Reverse</span>
              </button>

              <button
                type="button"
                onClick={handleUndo}
                disabled={undoHistory.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer shadow-xs"
                title="Undo last action"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
                {undoHistory.length > 0 && (
                  <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 rounded-full font-mono">
                    {undoHistory.length}
                  </span>
                )}
              </button>

              {isOrderChanged && (
                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <span>Change File</span>
              </button>
            </div>
          </div>

          {/* Collapsible Replace / Swap Panel */}
          {isReplacePanelOpen && (
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/60 shadow-lg space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                    <span>Page Replacement & Swapping</span>
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Duplicate pages into other positions, swap two pages, or import pages from a secondary PDF.
                  </p>
                </div>

                {/* Sub-tab navigation */}
                <div className="flex items-center p-1 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceMode('replace');
                      setReplaceError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      replaceMode === 'replace'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Replace with Page
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceMode('swap');
                      setReplaceError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      replaceMode === 'swap'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Swap Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceMode('external');
                      setReplaceError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      replaceMode === 'external'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    From Another PDF
                  </button>
                </div>
              </div>

              {replaceError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{replaceError}</span>
                </div>
              )}

              {/* Mode 1: Replace Page A with Page B */}
              {replaceMode === 'replace' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Replace Target Page [A]:
                      </label>
                      <select
                        value={pageA}
                        onChange={e => setPageA(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {pages.map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-zinc-500">
                        This page will be removed from position {pageA}.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        With Duplicate Copy of Page [B]:
                      </label>
                      <select
                        value={pageB}
                        onChange={e => setPageB(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {pages.map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-zinc-500">
                        Page {pageB} stays at its spot and also appears at position {pageA}.
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <Copy className="w-4 h-4 text-indigo-500" />
                      <span>
                        Result: Page {pageA} becomes a copy of Page {pageB} (labeled as <code className="font-mono text-indigo-600 dark:text-indigo-400">orig. {pages[pageB - 1]?.pageNumber || pageB} (copy)</code>).
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteReplace}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Apply Page Replacement</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 2: Swap Page A and Page B */}
              {replaceMode === 'swap' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Swap Page [A]:
                      </label>
                      <select
                        value={pageA}
                        onChange={e => setPageA(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {pages.map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        With Page [B]:
                      </label>
                      <select
                        value={pageB}
                        onChange={e => setPageB(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {pages.map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                      <span>Exchanges positions: Page {pageA} and Page {pageB} will swap places.</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteSwap}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Swap Page {pageA} and {pageB}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 3: Replace from External PDF */}
              {replaceMode === 'external' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Target Page in Current Document:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Replace</span>
                        <select
                          value={pageA}
                          onChange={e => setPageA(parseInt(e.target.value, 10))}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-bold"
                        >
                          {pages.map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Page {i + 1}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-zinc-500">with a page chosen below</span>
                      </div>
                    </div>

                    <div>
                      <input
                        ref={extFileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleExternalFileSelected(e.target.files[0]);
                          }
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => extFileInputRef.current?.click()}
                        disabled={isLoadingExtFile}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>{extFile ? 'Choose Different PDF' : 'Upload Second PDF'}</span>
                      </button>
                    </div>
                  </div>

                  {/* External Document Preview / Page Picker */}
                  {extFile && extProxy && (
                    <div className="space-y-2 p-4 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          Click a page from <span className="text-violet-600 dark:text-violet-400">"{extFile.name}"</span> ({extPageCount} pages) to replace Page {pageA}:
                        </span>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-56 overflow-y-auto p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        {Array.from({ length: extPageCount }, (_, i) => i + 1).map(pageNum => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePickExternalPage(pageNum)}
                            className="group flex flex-col items-center p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-violet-500 hover:ring-2 hover:ring-violet-500/20 transition-all cursor-pointer shadow-xs"
                          >
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-violet-600 dark:group-hover:text-violet-400">
                              Page {pageNum}
                            </span>
                            <span className="text-[10px] text-zinc-400 mt-1">Insert</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Interactive Reordering Grid */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1 gap-1">
              <span>
                Drag cards to re-sequence, click <strong className="text-zinc-700 dark:text-zinc-300">Move to</strong> to jump to any page number, or use <strong className="text-zinc-700 dark:text-zinc-300">Replace / Swap</strong>.
              </span>
              <span className="font-mono">{pages.length} total pages in document</span>
            </div>

            <PageThumbnailGrid
              pdfProxy={pdfProxy}
              pdfProxies={externalProxies}
              pages={pages}
              mode="reorder"
              highlightedPageId={highlightedPageId}
              onReorderPages={handleReorderPages}
              onMoveToFirst={handleMoveToFirst}
              onMoveToLast={handleMoveToLast}
              onMoveToPosition={handleMoveToPosition}
              onReplacePageClick={handleCardReplaceClick}
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Client-Side. High-fidelity vector PDF compiled directly in your browser.</span>
            </div>

            <button
              type="button"
              onClick={handleApplyReorder}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Save & Download Reordered PDF ({pages.length} Pages)</span>
            </button>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="reorder" />
    </div>
  );
};
