import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  RotateCw,
  RotateCcw,
  ArrowLeft,
  AlertTriangle,
  RotateCcw as ResetIcon,
  Sparkles,
  Layers,
  FileCheck2,
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
import { formatBytes, readPdfFile, rotatePDF, createSamplePDF } from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

export const RotatePage: React.FC = () => {
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
      // Validate via pdf-lib
      const { pageCount } = await readPdfFile(file);

      // Load via pdfjs-dist for rendering thumbnails
      const proxy = await getPdfDocumentProxy(file);
      setPdfProxy(proxy);
      setSelectedFile(file);

      // Generate page items
      const initialPages: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
        id: `page-${i}`,
        originalIndex: i,
        pageNumber: i + 1,
        rotation: 0,
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
      const sample = await createSamplePDF('Document for Rotation', 6);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate demo sample.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleRotateSinglePage = (pageId: string, direction: 'left' | 'right') => {
    const delta = direction === 'left' ? -90 : 90;
    setPages(prev =>
      prev.map(p =>
        p.id === pageId ? { ...p, rotation: ((p.rotation + delta) % 360 + 360) % 360 } : p
      )
    );
  };

  const handleRotateAll = (direction: 'left' | 'right') => {
    const delta = direction === 'left' ? -90 : 90;
    setPages(prev =>
      prev.map(p => ({
        ...p,
        rotation: ((p.rotation + delta) % 360 + 360) % 360,
      }))
    );
  };

  const handleResetRotations = () => {
    setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
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

  const handleApplyRotations = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStatus('Initializing rotation engine...');

    try {
      // Map rotations by original index
      const rotationMap: Record<number, number> = {};
      pages.forEach(p => {
        rotationMap[p.originalIndex] = p.rotation;
      });

      const rotatedBytes = await rotatePDF(selectedFile, rotationMap, (prog, stat) => {
        setProgressPercent(prog);
        setProgressStatus(stat);
      });

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${baseName}_rotated.pdf`);
      setResultData(rotatedBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred during rotation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const modifiedCount = pages.filter(p => p.rotation % 360 !== 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES.rotate.seoTitle}
        description={TOOL_GUIDES.rotate.seoDescription}
        path={TOOL_GUIDES.rotate.route}
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
              <span className="p-2.5 rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-600/20">
                <RotateCw className="w-6 h-6" />
              </span>
              <span>Rotate PDF</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Rotate individual pages or entire documents permanently with zero loss in quality.
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
              <span className="font-semibold block">Rotation Error</span>
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

      {/* Download Completed View */}
      {resultData ? (
        <DownloadButton
          data={resultData}
          fileName={resultFileName}
          label="Download Rotated PDF"
          resetLabel="Rotate Another PDF"
          subtitle={`Successfully rotated pages in ${selectedFile?.name}. Zero server uploads.`}
          onReset={handleReset}
        />
      ) : isProcessing ? (
        /* Processing View */
        <div className="py-12">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Rotating PDF Pages..."
          />
        </div>
      ) : !selectedFile ? (
        /* Dropzone Upload View */
        <div className="space-y-6">
          <FileDropzone
            multiple={false}
            title="Drop PDF file here to rotate"
            subtitle="Select a PDF to view page thumbnails and rotate pages"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Document to Rotate"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load 6-page demo document to test rotation</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Loaded Document Workspace */
        <div className="space-y-6">
          {/* Metadata & Global Actions Toolbar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold shrink-0">
                <RotateCw className="w-6 h-6" />
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
                  {modifiedCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                        {modifiedCount} rotated
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bulk Rotation Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleRotateAll('left')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rotate All Left (-90°)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRotateAll('right')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate All Right (+90°)</span>
              </button>

              {modifiedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetRotations}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <ResetIcon className="w-3.5 h-3.5" />
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

          {/* Thumbnail Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <span>Click individual page buttons or use "Rotate All" above.</span>
              <span className="font-mono">{pages.length} thumbnails rendered lazily</span>
            </div>

            <PageThumbnailGrid
              pdfProxy={pdfProxy}
              pages={pages}
              mode="rotate"
              onRotatePage={handleRotateSinglePage}
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Rotations are permanently embedded via pdf-lib ISO 32000-1 metadata.</span>
            </div>

            <button
              type="button"
              onClick={handleApplyRotations}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-bold text-sm shadow-lg shadow-cyan-600/25 hover:shadow-cyan-600/40 transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Apply & Download Rotated PDF</span>
            </button>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="rotate" />
    </div>
  );
};
