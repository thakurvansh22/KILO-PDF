import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import {
  FileArchive,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Download,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  Layers,
  FileType,
  ArrowDownRight,
  TrendingDown,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { CompressMode, CompressQualityLevel } from '../types';
import { formatBytes, readPdfFile, createSamplePDF } from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

export const CompressPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [originalSizeBytes, setOriginalSizeBytes] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Compression Options
  const [mode, setMode] = useState<CompressMode>('basic');
  const [qualityLevel, setQualityLevel] = useState<CompressQualityLevel>('medium');
  const [customScale, setCustomScale] = useState<number>(1.5);
  const [customQuality, setCustomQuality] = useState<number>(0.6);

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result States
  const [compressedData, setCompressedData] = useState<Uint8Array | null>(null);
  const [compressedSizeBytes, setCompressedSizeBytes] = useState<number>(0);

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
      setOriginalSizeBytes(file.size);
      setCompressedData(null);
      setCompressedSizeBytes(0);
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
      const sample = await createSamplePDF('High Resolution Business Brochure', 4);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate demo sample.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Determine effective scale and JPG quality
  const getCompressionSettings = () => {
    if (qualityLevel === 'low') {
      return { scale: 2.0, quality: 0.8 };
    }
    if (qualityLevel === 'medium') {
      return { scale: 1.5, quality: 0.6 };
    }
    if (qualityLevel === 'high') {
      return { scale: 1.0, quality: 0.4 };
    }
    return { scale: customScale, quality: customQuality };
  };

  const handleStartCompress = async () => {
    if (!selectedFile || !pdfProxy || pageCount === 0) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setCurrentPage(0);
    setProgressPercent(0);
    setProgressStatus('Starting compression...');

    try {
      if (mode === 'light') {
        // Mode 2: Light compress (keep vector text)
        setProgressStatus('Reading document structures...');
        setProgressPercent(20);

        const arrayBuffer = await selectedFile.arrayBuffer();
        const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

        setProgressStatus('Stripping unnecessary metadata & unneeded dictionaries...');
        setProgressPercent(50);

        // Strip metadata to shrink size
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
        doc.setProducer('');
        doc.setCreator('');

        setProgressStatus('Re-compressing PDF object streams...');
        setProgressPercent(80);

        const savedBytes = await doc.save({ useObjectStreams: true });

        setCompressedData(savedBytes);
        setCompressedSizeBytes(savedBytes.byteLength);
        setProgressPercent(100);
        setProgressStatus('Light compression finished!');
      } else {
        // Mode 1: Basic compress (Image-based)
        const { scale, quality } = getCompressionSettings();
        const newPdfDoc = await PDFDocument.create();

        for (let i = 1; i <= pageCount; i++) {
          setCurrentPage(i);
          const percent = Math.round(((i - 1) / pageCount) * 100);
          setProgressPercent(percent);
          setProgressStatus(`Rendering and compressing page ${i} of ${pageCount}...`);

          const page = await pdfProxy.getPage(i);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not create canvas 2D rendering context');

          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: ctx,
            viewport: viewport,
            canvas: canvas,
          }).promise;

          // Export as compressed JPG
          const jpgBlob = await new Promise<Blob | null>(res =>
            canvas.toBlob(b => res(b), 'image/jpeg', quality)
          );

          // Crucial memory release
          canvas.width = 0;
          canvas.height = 0;

          if (!jpgBlob) {
            throw new Error(`Failed to compress page ${i} to JPEG image`);
          }

          const jpgBuffer = await jpgBlob.arrayBuffer();
          const embeddedJpg = await newPdfDoc.embedJpg(new Uint8Array(jpgBuffer));

          // Preserve exact original physical dimensions in PDF points
          const origWidth = unscaledViewport.width;
          const origHeight = unscaledViewport.height;

          const newPage = newPdfDoc.addPage([origWidth, origHeight]);
          newPage.drawImage(embeddedJpg, {
            x: 0,
            y: 0,
            width: origWidth,
            height: origHeight,
          });
        }

        setProgressStatus('Finalizing compressed PDF document...');
        setProgressPercent(95);

        const finalBytes = await newPdfDoc.save({ useObjectStreams: true });
        setCompressedData(finalBytes);
        setCompressedSizeBytes(finalBytes.byteLength);
        setProgressPercent(100);
        setProgressStatus('Compression complete!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Compression failed: ${msg}`);
      setCompressedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCompressed = () => {
    if (!compressedData || !selectedFile) return;
    const blob = new Blob([compressedData.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_compressed.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadOriginal = () => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setPageCount(0);
    setOriginalSizeBytes(0);
    setCompressedData(null);
    setCompressedSizeBytes(0);
    setErrorMessage(null);
    setIsProcessing(false);
  };

  const isLargerThanOriginal = compressedSizeBytes > originalSizeBytes;
  const sizeDiffBytes = Math.abs(originalSizeBytes - compressedSizeBytes);
  const percentSaved = originalSizeBytes > 0
    ? Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <SEO
        title={TOOL_GUIDES.compress.seoTitle}
        description={TOOL_GUIDES.compress.seoDescription}
        path={TOOL_GUIDES.compress.route}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <FileArchive className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Compress PDF
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Reduce PDF file size directly in your browser without uploading to any remote server.
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
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {!selectedFile && (
        <div className="space-y-6">
          <FileDropzone
            onFilesSelected={handleFileSelected}
            title="Select PDF file to compress"
            subtitle="or drag and drop your document here"
            sampleDocumentTitle="High Res Brochure"
            disabled={isLoadingFile}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <TrendingDown className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Basic Compress
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Rasterizes pages with optimized JPEG encoding, dramatically shrinking scan and photo sizes.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <FileType className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Light Compress
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Keeps text selectable and crystal clear while stripping bloated metadata and stream buffers.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Safe & In-Memory
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Zero upload waiting. Your confidential documents are converted purely in WebAssembly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure Compression */}
      {selectedFile && !compressedData && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* File Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Original Size: <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatBytes(originalSizeBytes)}</span> • {pageCount} pages
                </p>
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setMode('basic')}
              className={`py-3 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                mode === 'basic'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                <span>Basic Compress (Image-based)</span>
              </div>
              <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                Highest reduction (for scans & large images)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('light')}
              className={`py-3 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                mode === 'light'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileType className="w-4 h-4" />
                <span>Light Compress (Keep text)</span>
              </div>
              <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                Preserves selectable text, vectors & fonts
              </span>
            </button>
          </div>

          {/* Mode Explanations & Settings */}
          {mode === 'basic' ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              {/* Important Note */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-bold">Important note:</span> Basic compress converts pages to images. Text will not be selectable after compression.
                </div>
              </div>

              {/* Compression Levels */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider block">
                  Compression Level
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'low', title: 'Low', desc: 'Scale 2.0 • JPG 80%', reduction: 'Minor reduction, highest clarity' },
                    { id: 'medium', title: 'Medium', desc: 'Scale 1.5 • JPG 60%', reduction: 'Recommended balance' },
                    { id: 'high', title: 'High', desc: 'Scale 1.0 • JPG 40%', reduction: 'Maximum reduction' },
                    { id: 'custom', title: 'Custom', desc: 'Adjust sliders', reduction: 'Fine-tune scale & quality' },
                  ].map(lvl => {
                    const isSelected = qualityLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setQualityLevel(lvl.id as CompressQualityLevel)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 font-semibold'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                        }`}
                      >
                        <div>
                          <span className="text-sm font-bold block">{lvl.title}</span>
                          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                            {lvl.desc}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 block">
                          {lvl.reduction}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Sliders if Custom is selected */}
              {qualityLevel === 'custom' && (
                <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-750 space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    <span>Custom Compression Tuning</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-600 dark:text-zinc-300">Resolution Scale:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {customScale.toFixed(1)}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.1"
                        value={customScale}
                        onChange={e => setCustomScale(parseFloat(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>0.5× (Smallest)</span>
                        <span>1.5× (Default)</span>
                        <span>2.5× (Crisp)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-600 dark:text-zinc-300">JPEG Quality:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.round(customQuality * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={customQuality}
                        onChange={e => setCustomQuality(parseFloat(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>10% (Low)</span>
                        <span>60% (Balanced)</span>
                        <span>95% (High)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <FileType className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Vector & Selectable Text Preservation
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Light compression keeps all original PDF fonts, outlines, and selectable text intact.
                    It compresses internal object cross-reference tables and strips non-essential metadata.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-300">
                Best suited for digital invoices, legal contracts, or eBooks where text selection and sharp vector fonts are required.
              </div>
            </div>
          )}

          {/* Action Button & Progress */}
          <div className="flex flex-col items-center justify-center gap-4 pt-2">
            {isProcessing ? (
              <div className="w-full p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-base">
                      Compressing PDF Document...
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {progressStatus}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {progressPercent}%
                  </span>
                </div>

                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {mode === 'basic' && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
                    Processing page {currentPage} of {pageCount} • Canvas memory is cleared after each page
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartCompress}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all cursor-pointer"
              >
                <FileArchive className="w-5 h-5" />
                <span>Compress PDF Now</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Result & Download */}
      {compressedData && selectedFile && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
            <div
              className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${
                isLargerThanOriginal
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isLargerThanOriginal ? (
                <AlertCircle className="w-9 h-9" />
              ) : (
                <CheckCircle2 className="w-9 h-9" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {isLargerThanOriginal ? 'Notice: File Size Increased' : 'Compression Complete!'}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                {isLargerThanOriginal
                  ? 'The compressed result is larger than your original file.'
                  : 'Your document size was reduced successfully.'}
              </p>
            </div>

            {/* Comparison Stats Pill Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 grid grid-cols-3 gap-2 text-center divide-x divide-zinc-200 dark:divide-zinc-700">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Original</span>
                <p className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {formatBytes(originalSizeBytes)}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Compressed</span>
                <p
                  className={`font-mono text-sm font-bold ${
                    isLargerThanOriginal
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatBytes(compressedSizeBytes)}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Reduction</span>
                <p
                  className={`font-mono text-sm font-bold ${
                    isLargerThanOriginal
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isLargerThanOriginal
                    ? `+${formatBytes(sizeDiffBytes)}`
                    : `-${percentSaved}%`}
                </p>
              </div>
            </div>

            {/* Warning when compressed file is larger */}
            {isLargerThanOriginal ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 space-y-2 text-left">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Why did the file get bigger?</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Your original PDF already contains heavily optimized vector elements, or was compressed with proprietary filters. Rasterizing it to JPEG added pixel overhead. We recommend downloading your original file, or switching to "Light compress (keep text)" or "High" compression.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                Reduced by <span className="font-bold">{percentSaved}%</span> (Saved {formatBytes(sizeDiffBytes)})
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {isLargerThanOriginal ? (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadOriginal}
                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCompressed}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 font-medium text-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Compressed Anyway</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadCompressed}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download compressed.pdf</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Compress Another</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="compress" />
    </div>
  );
};
