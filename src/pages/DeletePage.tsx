import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Trash2,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
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
import { formatBytes, readPdfFile, deletePDFPages, createSamplePDF } from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

export const DeletePage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      const initialPages: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
        id: `page-${i}`,
        originalIndex: i,
        pageNumber: i + 1,
        rotation: 0,
        selected: false,
      }));
      setPages(initialPages);
      setResultData(null);
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
      const sample = await createSamplePDF('Document for Page Removal', 6);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate demo sample.');
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

  const handleClearSelection = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setPages([]);
    setResultData(null);
    setResultFileName('');
    setErrorMessage(null);
    clearThumbnailCache();
  };

  const selectedToDeleteCount = pages.filter(p => p.selected).length;
  const remainingCount = pages.length - selectedToDeleteCount;
  const isAllSelected = selectedToDeleteCount === pages.length && pages.length > 0;

  const handleDeleteSelected = async () => {
    if (!selectedFile) return;

    if (selectedToDeleteCount === 0) {
      setErrorMessage('Please select at least one page to delete.');
      return;
    }

    if (isAllSelected) {
      setErrorMessage('Cannot delete all pages! The document must contain at least one remaining page.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStatus('Extracting remaining pages...');

    try {
      const indicesToDelete = pages
        .filter(p => p.selected)
        .map(p => p.originalIndex);

      const editedBytes = await deletePDFPages(selectedFile, indicesToDelete, (prog, stat) => {
        setProgressPercent(prog);
        setProgressStatus(stat);
      });

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${baseName}_edited.pdf`);
      setResultData(editedBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred while deleting pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES.delete.seoTitle}
        description={TOOL_GUIDES.delete.seoDescription}
        path={TOOL_GUIDES.delete.route}
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
              <span className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
                <Trash2 className="w-6 h-6" />
              </span>
              <span>Delete PDF Pages</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Select and remove unwanted pages from your PDF document easily.
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

      {/* Result View */}
      {resultData ? (
        <DownloadButton
          data={resultData}
          fileName={resultFileName}
          label="Download Edited PDF"
          resetLabel="Edit Another PDF"
          subtitle={`Successfully deleted ${selectedToDeleteCount} page(s). Remaining document has ${remainingCount} pages.`}
          onReset={handleReset}
        />
      ) : isProcessing ? (
        /* Processing View */
        <div className="py-12">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Removing Selected Pages..."
          />
        </div>
      ) : !selectedFile ? (
        /* Dropzone Upload View */
        <div className="space-y-6">
          <FileDropzone
            multiple={false}
            title="Drop PDF file here to delete pages"
            subtitle="Select a PDF to view thumbnails and choose pages to remove"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Document for Page Removal"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load 6-page demo document to test deletion</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Loaded Document Workspace */
        <div className="space-y-6">
          {/* Metadata & Selection Toolbar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
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
                  <span>•</span>
                  <span
                    className={`font-semibold ${
                      selectedToDeleteCount > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {selectedToDeleteCount} selected for removal ({remainingCount} remaining)
                  </span>
                </div>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>Select All</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <Square className="w-3.5 h-3.5 text-zinc-400" />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Change File</span>
              </button>
            </div>
          </div>

          {/* Warning notice when all pages are selected */}
          {isAllSelected && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Cannot delete all pages:</strong> A PDF must have at least one remaining page. Please uncheck at least one page.
              </span>
            </div>
          )}

          {/* Thumbnail Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <span>Click on any thumbnail or checkbox to mark pages for deletion.</span>
              <span className="font-mono">{remainingCount} pages will be kept</span>
            </div>

            <PageThumbnailGrid
              pdfProxy={pdfProxy}
              pages={pages}
              mode="delete"
              onToggleSelectPage={handleToggleSelectPage}
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Client-side only. Original file remains untouched on your disk.</span>
            </div>

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedToDeleteCount === 0 || isAllSelected}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-rose-600/25 hover:shadow-rose-600/40 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {selectedToDeleteCount === 0
                  ? 'Select pages to delete'
                  : isAllSelected
                  ? 'Cannot delete all pages'
                  : `Delete ${selectedToDeleteCount} Selected Page(s)`}
              </span>
            </button>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="delete" />
    </div>
  );
};
