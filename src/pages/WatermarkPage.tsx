import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Stamp,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Layers,
  FileCheck2,
  Image as ImageIcon,
  Type,
  Grid3X3,
  Move,
  RotateCw,
  Magnet,
  Maximize2,
  Check,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressLoader } from '../components/ProgressLoader';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { WatermarkOptions, WatermarkPosition, WatermarkType, WatermarkPercentPosition } from '../types';
import {
  formatBytes,
  readPdfFile,
  createSamplePDF,
  applyWatermarkToPDF,
  checkWinAnsiSafe,
  parsePageRange,
} from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

export const WatermarkPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 595.28,
    height: 841.89,
  });

  // Watermark Type & Content
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [text, setText] = useState<string>('CONFIDENTIAL');
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'Times' | 'Courier'>('Helvetica');
  const [fontSize, setFontSize] = useState<number>(54);
  const [textColor, setTextColor] = useState<string>('#dc2626');
  const [isBold, setIsBold] = useState<boolean>(true);

  // Image watermark state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageScalePercent, setImageScalePercent] = useState<number>(40);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Common options
  const [opacity, setOpacity] = useState<number>(0.3);
  const [rotation, setRotation] = useState<number>(-45);
  const [isTiled, setIsTiled] = useState<boolean>(false);
  const [tileSpacing, setTileSpacing] = useState<number>(160);
  const [applyTo, setApplyTo] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('1');
  const [layer, setLayer] = useState<'over' | 'under'>('over');

  // Placement & Custom Position State
  const [positionMode, setPositionMode] = useState<'preset' | 'custom'>('preset');
  const [position, setPosition] = useState<WatermarkPosition>('center');
  const [cornerMargin, setCornerMargin] = useState<number>(45); // pt/px for 3x3 presets
  const [customPosition, setCustomPosition] = useState<WatermarkPercentPosition>({
    xPercent: 50,
    yPercent: 50,
  });
  const [positionScope, setPositionScope] = useState<'all' | 'per-page'>('all');
  const [positionsByPage, setPositionsByPage] = useState<Record<number, WatermarkPercentPosition>>({});
  const [snapToGuides, setSnapToGuides] = useState<boolean>(true);

  // Interactive Drag & Transform State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeSnapGuides, setActiveSnapGuides] = useState<{ x?: number; y?: number } | null>(null);

  // Execution states
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const watermarkBoxRef = useRef<HTMLDivElement>(null);

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
      setPositionsByPage({});
      setCustomPosition({ xPercent: 50, yPercent: 50 });
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
      const sample = await createSamplePDF('Contract Agreement for Watermarking', 4);
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

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Current active position for the preview page
  const currentActivePercentPosition: WatermarkPercentPosition = (() => {
    if (positionMode === 'custom') {
      if (positionScope === 'per-page' && positionsByPage[currentPage]) {
        return positionsByPage[currentPage];
      }
      return customPosition;
    }

    // Preset mode: derive percent from 3x3 preset and cornerMargin
    const marginXPercent = Math.min(45, (cornerMargin / pageDimensions.width) * 100);
    const marginYPercent = Math.min(45, (cornerMargin / pageDimensions.height) * 100);

    switch (position) {
      case 'top-left':
        return { xPercent: marginXPercent, yPercent: marginYPercent };
      case 'top-center':
        return { xPercent: 50, yPercent: marginYPercent };
      case 'top-right':
        return { xPercent: 100 - marginXPercent, yPercent: marginYPercent };
      case 'center-left':
        return { xPercent: marginXPercent, yPercent: 50 };
      case 'center':
        return { xPercent: 50, yPercent: 50 };
      case 'center-right':
        return { xPercent: 100 - marginXPercent, yPercent: 50 };
      case 'bottom-left':
        return { xPercent: marginXPercent, yPercent: 100 - marginYPercent };
      case 'bottom-center':
        return { xPercent: 50, yPercent: 100 - marginYPercent };
      case 'bottom-right':
        return { xPercent: 100 - marginXPercent, yPercent: 100 - marginYPercent };
      default:
        return { xPercent: 50, yPercent: 50 };
    }
  })();

  const updateCurrentPosition = (newPos: WatermarkPercentPosition) => {
    if (positionScope === 'per-page') {
      setPositionsByPage(prev => ({ ...prev, [currentPage]: newPos }));
    } else {
      setCustomPosition(newPos);
    }
  };

  // 1. DRAG WATERMARK HANDLER
  const handleStartDragWatermark = (e: React.MouseEvent | React.TouchEvent) => {
    if (isTiled) return; // Tiling covers whole page
    e.preventDefault();
    e.stopPropagation();

    // Auto switch to custom mode
    if (positionMode !== 'custom') {
      setPositionMode('custom');
      setCustomPosition(currentActivePercentPosition);
    }

    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const startX = clientX;
    const startY = clientY;
    const initPos = { ...currentActivePercentPosition };

    const containerRect = previewContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const marginXPct = (cornerMargin / pageDimensions.width) * 100;
    const marginYPct = (cornerMargin / pageDimensions.height) * 100;

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaXPct = ((curX - startX) / containerWidth) * 100;
      const deltaYPct = ((curY - startY) / containerHeight) * 100;

      let rawXPct = Math.max(2, Math.min(98, initPos.xPercent + deltaXPct));
      let rawYPct = Math.max(2, Math.min(98, initPos.yPercent + deltaYPct));

      const activeGuides: { x?: number; y?: number } = {};

      if (snapToGuides) {
        // Snap to Horizontal Center (50%)
        if (Math.abs(rawXPct - 50) < 2.5) {
          rawXPct = 50;
          activeGuides.x = 50;
        } else if (Math.abs(rawXPct - marginXPct) < 2) {
          rawXPct = marginXPct;
          activeGuides.x = marginXPct;
        } else if (Math.abs(rawXPct - (100 - marginXPct)) < 2) {
          rawXPct = 100 - marginXPct;
          activeGuides.x = 100 - marginXPct;
        }

        // Snap to Vertical Center (50%)
        if (Math.abs(rawYPct - 50) < 2.5) {
          rawYPct = 50;
          activeGuides.y = 50;
        } else if (Math.abs(rawYPct - marginYPct) < 2) {
          rawYPct = marginYPct;
          activeGuides.y = marginYPct;
        } else if (Math.abs(rawYPct - (100 - marginYPct)) < 2) {
          rawYPct = 100 - marginYPct;
          activeGuides.y = 100 - marginYPct;
        }
      }

      setActiveSnapGuides(Object.keys(activeGuides).length > 0 ? activeGuides : null);

      const roundedPos = {
        xPercent: parseFloat(rawXPct.toFixed(1)),
        yPercent: parseFloat(rawYPct.toFixed(1)),
      };
      updateCurrentPosition(roundedPos);
    };

    const onEnd = () => {
      setIsDragging(false);
      setActiveSnapGuides(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // 2. ROTATION HANDLE HANDLER
  const handleStartRotate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const boxRect = watermarkBoxRef.current?.getBoundingClientRect();
    if (!boxRect) return;

    const centerX = boxRect.left + boxRect.width / 2;
    const centerY = boxRect.top + boxRect.height / 2;

    const onMove = (moveEvt: MouseEvent) => {
      const angleRad = Math.atan2(moveEvt.clientY - centerY, moveEvt.clientX - centerX);
      let deg = Math.round((angleRad * 180) / Math.PI) + 90; // offset so straight-up is 0°

      // Normalize to -180 to 180
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;

      // Snapping to common angles
      const snapAngles = [-180, -90, -45, 0, 45, 90, 180];
      for (const snap of snapAngles) {
        if (Math.abs(deg - snap) < 4) {
          deg = snap;
          break;
        }
      }

      setRotation(deg);
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  };

  // 3. CORNER RESIZE HANDLE HANDLER
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const containerWidth = previewContainerRef.current?.getBoundingClientRect().width || 500;

    if (watermarkType === 'image') {
      const initScale = imageScalePercent;
      const onMove = (moveEvt: MouseEvent) => {
        const deltaXPct = Math.round(((moveEvt.clientX - startX) / containerWidth) * 100);
        const newScale = Math.max(10, Math.min(100, initScale + deltaXPct));
        setImageScalePercent(newScale);
      };
      const onEnd = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    } else {
      const initFontSize = fontSize;
      const onMove = (moveEvt: MouseEvent) => {
        const deltaX = moveEvt.clientX - startX;
        const newSize = Math.max(12, Math.min(130, initFontSize + Math.round(deltaX * 0.4)));
        setFontSize(newSize);
      };
      const onEnd = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    }
  };

  // Apply Watermark Execution
  const handleApplyWatermark = async () => {
    if (!selectedFile) return;

    if (watermarkType === 'image' && !imageDataUrl) {
      setErrorMessage('Please upload a watermark image first.');
      return;
    }

    if (watermarkType === 'text' && !text.trim()) {
      setErrorMessage('Please enter watermark text.');
      return;
    }

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
    setProgressStatus('Initializing watermark rendering...');

    try {
      const options: WatermarkOptions = {
        type: watermarkType,
        text,
        fontFamily,
        fontSize,
        color: textColor,
        isBold,
        imageDataUrl: imageDataUrl || undefined,
        imageScalePercent,
        opacity,
        rotation,
        position,
        positionMode,
        cornerMargin,
        customPosition: currentActivePercentPosition,
        positionScope,
        positionsByPage,
        isTiled,
        tileSpacing,
        applyTo,
        customRange: applyTo === 'current' ? `${currentPage}` : customRange,
        layer,
      };

      const watermarkedBytes = await applyWatermarkToPDF(selectedFile, options, (prog, stat) => {
        setProgressPercent(prog);
        setProgressStatus(stat);
      });

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${baseName}_watermarked.pdf`);
      setResultData(watermarkedBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred while applying watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setResultData(null);
    setImageDataUrl(null);
    setText('CONFIDENTIAL');
    setPositionMode('preset');
    setPositionsByPage({});
    setCustomPosition({ xPercent: 50, yPercent: 50 });
    setErrorMessage(null);
  };

  // WinAnsi character safety check
  const winAnsiCheck = checkWinAnsiSafe(text);

  // Position presets for 3x3 grid
  const positions: WatermarkPosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'center-left',
    'center',
    'center-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES.watermark.seoTitle}
        description={TOOL_GUIDES.watermark.seoDescription}
        path={TOOL_GUIDES.watermark.route}
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-fuchsia-500/20">
            <Stamp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              Watermark PDF
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200/60 dark:border-fuchsia-800/60">
                Drag & Position
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Drag to position anywhere, rotate visually, or stamp 3x3 grid presets across your document.
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
            label="Download Watermarked PDF"
            resetLabel="Watermark Another PDF"
            subtitle="Your document has been watermarked with the exact custom position and settings."
            onReset={handleReset}
          />
        </div>
      ) : isProcessing ? (
        <div className="py-24 max-w-md mx-auto">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Stamping Watermarks onto PDF..."
          />
        </div>
      ) : !selectedFile ? (
        /* Empty Upload State */
        <div className="space-y-6 max-w-3xl mx-auto">
          <FileDropzone
            multiple={false}
            title="Drop PDF file here to watermark"
            subtitle="Upload a document to drag & drop or stamp custom watermarks"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Agreement Document"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load sample contract document (4 pages)</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Two-Column Editor Layout: Left Live Preview, Right Options */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Canvas Preview with Interactive Drag & Drop Watermark */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-4">
            <div className="w-full flex items-center justify-between px-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span>Page Preview:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {currentPage} of {pageCount}
                </span>
                {positionMode === 'custom' && positionScope === 'per-page' && positionsByPage[currentPage] && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-200/60 dark:border-fuchsia-800/60 font-semibold">
                    Page-specific position
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

            {/* Canvas Container with Overlaid Watermark Preview */}
            <div
              ref={previewContainerRef}
              className="relative bg-white shadow-xl rounded-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden select-none"
              style={{
                width: Math.floor(pageDimensions.width * zoomScale),
                height: Math.floor(pageDimensions.height * zoomScale),
              }}
            >
              {/* PDF Background Canvas */}
              <canvas ref={canvasRef} className="block pointer-events-none" />

              {/* Alignment / Snap Guide Lines */}
              {activeSnapGuides?.x !== undefined && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-fuchsia-500 z-30 pointer-events-none"
                  style={{ left: `${activeSnapGuides.x}%` }}
                />
              )}
              {activeSnapGuides?.y !== undefined && (
                <div
                  className="absolute left-0 right-0 h-px bg-fuchsia-500 z-30 pointer-events-none"
                  style={{ top: `${activeSnapGuides.y}%` }}
                />
              )}

              {/* Watermark Overlay Preview */}
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ opacity }}
              >
                {isTiled ? (
                  /* Tiled / Repeating Watermark Preview */
                  <div
                    className="w-full h-full flex flex-wrap items-center justify-around p-4"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div key={idx} className="p-4 m-2 text-center">
                        {watermarkType === 'text' ? (
                          <span
                            style={{
                              fontFamily,
                              fontSize: `${fontSize * 0.65 * zoomScale}px`,
                              color: textColor,
                              fontWeight: isBold ? 'bold' : 'normal',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {text || 'WATERMARK'}
                          </span>
                        ) : imageDataUrl ? (
                          <img
                            src={imageDataUrl}
                            alt="Watermark"
                            className="object-contain"
                            style={{ width: `${60 * zoomScale}px` }}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Single Draggable / Interactive Watermark Element */
                  <div
                    ref={watermarkBoxRef}
                    onMouseDown={handleStartDragWatermark}
                    onTouchStart={handleStartDragWatermark}
                    className={`absolute pointer-events-auto group cursor-move select-none transition-shadow ${
                      isDragging
                        ? 'ring-2 ring-fuchsia-500 bg-fuchsia-500/10'
                        : 'hover:ring-1 hover:ring-fuchsia-400'
                    }`}
                    style={{
                      left: `${currentActivePercentPosition.xPercent}%`,
                      top: `${currentActivePercentPosition.yPercent}%`,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {/* Visual Outline Box when hovered or dragging */}
                    <div
                      className={`absolute -inset-1.5 border border-dashed rounded-xs transition-opacity ${
                        isDragging
                          ? 'border-fuchsia-600 opacity-100 bg-fuchsia-500/5'
                          : 'border-fuchsia-400 opacity-0 group-hover:opacity-100'
                      }`}
                    />

                    {/* Rotation Handle (circle above the box) */}
                    <div
                      onMouseDown={handleStartRotate}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-40 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Drag to rotate"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-800 border-2 border-fuchsia-600 shadow-sm flex items-center justify-center hover:scale-125 transition-transform">
                        <RotateCw className="w-2 h-2 text-fuchsia-600" />
                      </div>
                      <div className="w-0.5 h-3.5 bg-fuchsia-500" />
                    </div>

                    {/* Corner Resize Handle */}
                    <div
                      onMouseDown={handleStartResize}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-fuchsia-600 border-2 border-white rounded-full cursor-nwse-resize z-40 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title={watermarkType === 'image' ? 'Drag to resize image' : 'Drag to adjust font size'}
                    />

                    {/* Watermark Content: Text or Image */}
                    {watermarkType === 'text' ? (
                      <span
                        className="block px-2 py-1 leading-none"
                        style={{
                          fontFamily,
                          fontSize: `${fontSize * zoomScale}px`,
                          color: textColor,
                          fontWeight: isBold ? 'bold' : 'normal',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {text || 'WATERMARK'}
                      </span>
                    ) : imageDataUrl ? (
                      <img
                        src={imageDataUrl}
                        alt="Watermark"
                        className="object-contain pointer-events-none block"
                        style={{
                          width: `${(pageDimensions.width * (imageScalePercent / 100)) * zoomScale}px`,
                        }}
                      />
                    ) : (
                      <span className="text-xs text-zinc-400 bg-zinc-100 p-2 rounded">
                        No image uploaded
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Helper drag tip */}
            {!isTiled && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-fuchsia-500" />
                <span>Drag watermark to position anywhere. Use top handle to rotate, bottom-right to resize.</span>
              </p>
            )}

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
            {/* Watermark Type Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Watermark Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    watermarkType === 'text'
                      ? 'bg-white dark:bg-zinc-700 text-fuchsia-600 dark:text-fuchsia-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span>Text Watermark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    watermarkType === 'image'
                      ? 'bg-white dark:bg-zinc-700 text-fuchsia-600 dark:text-fuchsia-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Image / Logo</span>
                </button>
              </div>
            </div>

            {/* Type A: Text Options */}
            {watermarkType === 'text' ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Watermark Text:
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="CONFIDENTIAL, DRAFT, COPY..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                  />
                  {!winAnsiCheck.safe && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                      ⚠️ Note: Non-standard characters will be converted on export.
                    </p>
                  )}
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
                      <option value="Helvetica">Helvetica (Sans-Serif)</option>
                      <option value="Times">Times New Roman (Serif)</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  {/* Bold Toggle */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Weight:</label>
                    <button
                      type="button"
                      onClick={() => setIsBold(!isBold)}
                      className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isBold
                          ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600'
                          : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Bold Typography
                    </button>
                  </div>
                </div>

                {/* Font Size Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Font Size:</span>
                    <span className="font-mono text-zinc-500">{fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="120"
                    value={fontSize}
                    onChange={e => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-fuchsia-600 cursor-pointer"
                  />
                </div>

                {/* Color Palette */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Text Color:</label>
                  <div className="flex items-center gap-2">
                    {['#dc2626', '#e11d48', '#71717a', '#2563eb', '#16a34a', '#000000'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTextColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          textColor === c ? 'scale-110 border-fuchsia-600 ring-2 ring-fuchsia-500/20' : 'border-transparent'
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
            ) : (
              /* Type B: Image Watermark Options */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Upload Logo / Image (PNG, JPG):
                  </label>
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-fuchsia-500 dark:hover:border-fuchsia-500 rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    {imageDataUrl ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <img
                          src={imageDataUrl}
                          alt="Watermark preview"
                          className="max-h-24 max-w-full object-contain"
                        />
                        <span className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-semibold underline">
                          Click to replace image
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-zinc-500">
                        <ImageIcon className="w-8 h-8 mx-auto text-zinc-400" />
                        <p className="text-xs font-semibold">Click to upload stamp or logo</p>
                        <p className="text-[11px] text-zinc-400">PNG with transparency recommended</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                </div>

                {/* Scale slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Size (% of page):</span>
                    <span className="font-mono text-zinc-500">{imageScalePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={imageScalePercent}
                    onChange={e => setImageScalePercent(parseInt(e.target.value, 10))}
                    className="w-full accent-fuchsia-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Position Modes: Preset vs Custom */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Placement
                </label>
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPositionMode('preset')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      positionMode === 'preset'
                        ? 'bg-white dark:bg-zinc-700 text-fuchsia-600 dark:text-fuchsia-300 shadow-xs'
                        : 'text-zinc-500'
                    }`}
                  >
                    Preset (3×3)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPositionMode('custom');
                      setCustomPosition(currentActivePercentPosition);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      positionMode === 'custom'
                        ? 'bg-white dark:bg-zinc-700 text-fuchsia-600 dark:text-fuchsia-300 shadow-xs'
                        : 'text-zinc-500'
                    }`}
                  >
                    Custom (Drag)
                  </button>
                </div>
              </div>

              {/* Tiling Option Toggle */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTiled}
                    onChange={e => setIsTiled(e.target.checked)}
                    className="rounded accent-fuchsia-600"
                  />
                  <span>Tile / Repeat across page</span>
                </label>
              </div>

              {isTiled ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">Tile Grid Spacing:</span>
                    <span className="font-mono">{tileSpacing} pt</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="260"
                    value={tileSpacing}
                    onChange={e => setTileSpacing(parseInt(e.target.value, 10))}
                    className="w-full accent-fuchsia-600 cursor-pointer"
                  />
                </div>
              ) : positionMode === 'preset' ? (
                /* PRESET MODE: 3x3 Grid + Corner Margin */
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 w-fit mx-auto">
                    <div className="grid grid-cols-3 gap-1.5 w-36">
                      {positions.map(pos => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setPosition(pos)}
                          className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            position === pos
                              ? 'border-fuchsia-600 bg-fuchsia-600 text-white font-bold shadow-xs'
                              : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-500 hover:border-zinc-400'
                          }`}
                          title={pos.replace('-', ' ')}
                        >
                          <div className={`w-2 h-2 rounded-full ${position === pos ? 'bg-white' : 'bg-zinc-400'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Margin Input / Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Margin from corner / edge:</span>
                      <span className="font-mono text-zinc-500">{cornerMargin} pt</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="110"
                      value={cornerMargin}
                      onChange={e => setCornerMargin(parseInt(e.target.value, 10))}
                      className="w-full accent-fuchsia-600 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                /* CUSTOM POSITION MODE: Coordinates, Snap Toggle & Scope */
                <div className="space-y-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-fuchsia-600" />
                      <span>Custom Coordinates (% of page):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCurrentPosition({ xPercent: 50, yPercent: 50 })}
                      className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 hover:underline font-semibold cursor-pointer"
                    >
                      Reset Center
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">X (from left):</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={currentActivePercentPosition.xPercent}
                          onChange={e =>
                            updateCurrentPosition({
                              ...currentActivePercentPosition,
                              xPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Y (from top):</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={currentActivePercentPosition.yPercent}
                          onChange={e =>
                            updateCurrentPosition({
                              ...currentActivePercentPosition,
                              yPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Snap to guides toggle */}
                  <div className="pt-1 flex items-center justify-between border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <Magnet className="w-3.5 h-3.5 text-fuchsia-600" />
                      <span className="font-semibold">Snap to edges & center guides</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={snapToGuides}
                      onChange={e => setSnapToGuides(e.target.checked)}
                      className="rounded accent-fuchsia-600"
                    />
                  </div>

                  {/* Position Scope: Same on all pages vs Per-page */}
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Position Application:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPositionScope('all')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          positionScope === 'all'
                            ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600 font-bold'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        Same on all pages
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPositionScope('per-page');
                          if (!positionsByPage[currentPage]) {
                            setPositionsByPage(prev => ({ ...prev, [currentPage]: customPosition }));
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          positionScope === 'per-page'
                            ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600 font-bold'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        Set position per page
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Common Options: Opacity & Rotation */}
            <div className="space-y-4">
              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Opacity:</span>
                  <span className="font-mono text-zinc-500">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={Math.round(opacity * 100)}
                  onChange={e => setOpacity(parseInt(e.target.value, 10) / 100)}
                  className="w-full accent-fuchsia-600 cursor-pointer"
                />
              </div>

              {/* Rotation Presets & Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Rotation Angle:</span>
                  <span className="font-mono text-zinc-500">{rotation}°</span>
                </div>
                <div className="flex gap-1.5">
                  {[-45, 0, 45, 90].map(deg => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setRotation(deg)}
                      className={`flex-1 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        rotation === deg
                          ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600 font-bold'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={e => setRotation(parseInt(e.target.value, 10))}
                  className="w-full accent-fuchsia-600 cursor-pointer"
                />
              </div>

              {/* Layer Selection: Over vs Under content */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Layering:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLayer('over')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      layer === 'over'
                        ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Over Page Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayer('under')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      layer === 'under'
                        ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Under Page Content
                  </button>
                </div>
              </div>

              {/* Apply to pages */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Apply to:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'all', label: 'All Pages' },
                    { id: 'current', label: 'Current Only' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setApplyTo(tab.id as 'all' | 'current' | 'custom')}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        applyTo === tab.id
                          ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {applyTo === 'custom' && (
                  <input
                    type="text"
                    value={customRange}
                    onChange={e => setCustomRange(e.target.value)}
                    placeholder="e.g. 1-3, 5"
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                  />
                )}
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyWatermark}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-fuchsia-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Apply Watermark & Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="watermark" />
    </div>
  );
};
