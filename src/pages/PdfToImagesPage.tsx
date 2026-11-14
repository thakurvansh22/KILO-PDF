import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import {
  Image as ImageIcon,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  FileCheck2,
  Download,
  Settings2,
  Sliders,
  Archive,
  Layers,
  Sparkles,
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
import { formatBytes, readPdfFile, createSamplePDF } from '../utils/pdfUtils';
import {
  getPdfDocumentProxy,
  renderPageToImageBlob,
  clearThumbnailCache,
} from '../utils/pdfViewer';

type ImageFormat = 'image/jpeg' | 'image/png';
type QualityPreset = 'low' | 'medium' | 'high';

export const PdfToImagesPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Conversion options
  const [format, setFormat] = useState<ImageFormat>('image/jpeg');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('medium');
  const [jpgQuality, setJpgQuality] = useState<number>(0.85);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [resultData, setResultData] = useState<Blob | null>(null);
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

      // Default: all pages selected
      const initialPages: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
        id: `page-${i}`,
        originalIndex: i,
        pageNumber: i + 1,
        rotation: 0,
        selected: true,
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
      const sample = await createSamplePDF('Document for Image Conversion', 4);
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

  const selectedPages = pages.filter(p => p.selected);
  const selectedCount = selectedPages.length;

  const getScale = (): number => {
    switch (qualityPreset) {
      case 'low':
        return 1.0; // ~72-96 DPI
      case 'medium':
        return 2.0; // ~150-200 DPI
      case 'high':
        return 3.0; // ~300 DPI high resolution
      default:
        return 2.0;
    }
  };

  const handleConvert = async () => {
    if (!selectedFile || !pdfProxy) return;

    if (selectedCount === 0) {
      setErrorMessage('Please select at least one page to convert.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(5);

    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    const scale = getScale();
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');

    try {
      // Case 1: Single image download directly as image blob
      if (selectedCount === 1) {
        const targetPage = selectedPages[0];
        setProgressStatus(`Rendering page ${targetPage.pageNumber} as ${ext.toUpperCase()}...`);
        setProgressPercent(50);

        const imgBlob = await renderPageToImageBlob(
          pdfProxy,
          targetPage.pageNumber,
          format,
          scale,
          jpgQuality
        );

        setResultFileName(`${baseName}_page_${String(targetPage.pageNumber).padStart(3, '0')}.${ext}`);
        setResultData(imgBlob);
        setProgressPercent(100);
      } else {
        // Case 2: Multiple pages -> zip archive
        const zip = new JSZip();

        for (let i = 0; i < selectedCount; i++) {
          const targetPage = selectedPages[i];
          const percent = Math.round(10 + ((i + 1) / selectedCount) * 80);
          setProgressPercent(percent);
          setProgressStatus(
            `Rendering page ${targetPage.pageNumber} (${i + 1} of ${selectedCount})...`
          );

          // Render one by one in succession to prevent memory leaks / canvas starvation
          const imgBlob = await renderPageToImageBlob(
            pdfProxy,
            targetPage.pageNumber,
            format,
            scale,
            jpgQuality
          );

          const fileName = `${baseName}_page_${String(targetPage.pageNumber).padStart(3, '0')}.${ext}`;
          zip.file(fileName, imgBlob);
        }

        setProgressStatus('Creating ZIP archive...');
        setProgressPercent(95);

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        setResultFileName(`${baseName}_images.zip`);
        setResultData(zipBlob);
        setProgressPercent(100);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred during image conversion.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES['pdf-to-images'].seoTitle}
        description={TOOL_GUIDES['pdf-to-images'].seoDescription}
        path={TOOL_GUIDES['pdf-to-images'].route}
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
              <span className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <ImageIcon className="w-6 h-6" />
              </span>
              <span>PDF to Images</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Convert PDF pages into high-resolution JPG or PNG images directly in your browser.
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
              <span className="font-semibold block">Conversion Error</span>
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
          mimeType={selectedCount === 1 ? format : 'application/zip'}
          label={selectedCount === 1 ? 'Download Single Image' : 'Download Images (ZIP)'}
          resetLabel="Convert Another PDF"
          subtitle={`Converted ${selectedCount} page(s) to ${format === 'image/jpeg' ? 'JPG' : 'PNG'} at ${qualityPreset.toUpperCase()} resolution.`}
          onReset={handleReset}
        />
      ) : isProcessing ? (
        /* Processing View */
        <div className="py-12">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Converting PDF Pages to Images..."
          />
        </div>
      ) : !selectedFile ? (
        /* Dropzone Upload View */
        <div className="space-y-6">
          <FileDropzone
            multiple={false}
            title="Drop PDF file here to convert to images"
            subtitle="Choose a PDF to select pages and export as JPG or PNG"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Document to Convert"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load demo PDF document to test image conversion</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Loaded Document Workspace */
        <div className="space-y-6">
          {/* Metadata & Settings Toolbar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <ImageIcon className="w-6 h-6" />
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
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {selectedCount} of {pages.length} selected
                    </span>
                  </div>
                </div>
              </div>

              {/* Selection & Reset Buttons */}
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

            {/* Conversion Options Controls Bar */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Format Option */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Output Format:</span>
                </label>
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setFormat('image/jpeg')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      format === 'image/jpeg'
                        ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    JPG (Smaller)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('image/png')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      format === 'image/png'
                        ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                </div>
              </div>

              {/* Quality Preset */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>Resolution Quality:</span>
                </label>
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setQualityPreset('low')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      qualityPreset === 'low'
                        ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Low (1x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQualityPreset('medium')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      qualityPreset === 'medium'
                        ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Medium (2x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQualityPreset('high')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      qualityPreset === 'high'
                        ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    High (3x)
                  </button>
                </div>
              </div>

              {/* JPG Compression Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    JPG Compression:
                  </label>
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {Math.round(jpgQuality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.05"
                  value={jpgQuality}
                  disabled={format === 'image/png'}
                  onChange={e => setJpgQuality(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
                />
                <span className="text-[10px] text-zinc-400 block">
                  {format === 'image/png' ? 'PNG uses lossless compression' : 'Higher = clearer text & images'}
                </span>
              </div>
            </div>
          </div>

          {/* Page Thumbnail Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <span>Click on any thumbnail to select or deselect pages for conversion.</span>
              <span className="font-mono">{selectedCount} pages marked</span>
            </div>

            <PageThumbnailGrid
              pdfProxy={pdfProxy}
              pages={pages}
              mode="select"
              onToggleSelectPage={handleToggleSelectPage}
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                {selectedCount === 1
                  ? 'Single page will be downloaded directly as an image file.'
                  : `Multiple pages (${selectedCount}) will be bundled into a ZIP file.`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleConvert}
              disabled={selectedCount === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all cursor-pointer"
            >
              {selectedCount === 1 ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Single {format === 'image/jpeg' ? 'JPG' : 'PNG'} Image</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Download {selectedCount} Selected as ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="pdf-to-images" />
    </div>
  );
};
