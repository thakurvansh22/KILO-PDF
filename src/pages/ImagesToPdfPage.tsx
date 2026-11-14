import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FileImage,
  ArrowLeft,
  AlertTriangle,
  RotateCw,
  Trash2,
  GripVertical,
  Plus,
  RotateCcw,
  Sparkles,
  FileCheck2,
  Settings,
  Layers,
} from 'lucide-react';
import { ProgressLoader } from '../components/ProgressLoader';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { ImageItem, PageSizeOption, OrientationOption, MarginOption } from '../types';
import { formatBytes, convertImagesToPDF } from '../utils/pdfUtils';

// Sub-component for an individual sortable image card
interface SortableImageCardProps {
  item: ImageItem;
  displayIndex: number;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

const SortableImageCard: React.FC<SortableImageCardProps> = ({
  item,
  displayIndex,
  onRotate,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 select-none overflow-hidden ${
        isDragging
          ? 'border-pink-500 shadow-2xl scale-105'
          : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header bar: Index and drag handle */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
          <div
            {...attributes}
            {...listeners}
            className="p-1 -ml-1 text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 cursor-grab active:cursor-grabbing rounded"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span>Page {displayIndex + 1}</span>
        </div>

        {item.rotation !== 0 && (
          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400">
            {item.rotation}°
          </span>
        )}
      </div>

      {/* Image Preview Viewport */}
      <div className="relative aspect-[1/1.2] bg-zinc-100/70 dark:bg-zinc-950 flex items-center justify-center p-3 overflow-hidden">
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: `rotate(${item.rotation}deg)` }}
        >
          <img
            src={item.previewUrl}
            alt={item.name}
            className="max-h-full max-w-full object-contain rounded shadow-xs pointer-events-none"
          />
        </div>

        {/* Overlay delete button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/60 hover:bg-red-600 text-white backdrop-blur-xs transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shadow-sm"
          title="Remove image"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer details & Rotate button */}
      <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-1 text-xs">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate" title={item.name}>
            {item.name}
          </p>
          <p className="text-[10px] text-zinc-400 font-mono">
            {formatBytes(item.size)} • {item.width}×{item.height}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRotate(item.id)}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer shrink-0"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const ImagesToPdfPage: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [orientation, setOrientation] = useState<OrientationOption>('auto');
  const [margin, setMargin] = useState<MarginOption>('small');

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [resultFileName, setResultFileName] = useState('images.pdf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFilesSelected = (files: File[]) => {
    setErrorMessage(null);
    const validFiles = files.filter(f =>
      f.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name)
    );

    if (validFiles.length === 0) {
      setErrorMessage('Please select valid image files (JPG, PNG, or WEBP).');
      return;
    }

    validFiles.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const item: ImageItem = {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          width: img.width,
          height: img.height,
          rotation: 0,
        };
        setImages(prev => [...prev, item]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(previewUrl);
      };
      img.src = previewUrl;
    });
  };

  const handleLoadDemoImages = () => {
    // Generate 3 colorful demo graphics via canvas
    const sampleColors = ['#4f46e5', '#059669', '#e11d48'];
    const titles = ['Document Cover', 'Financial Graph', 'Closing Summary'];

    titles.forEach((title, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = sampleColors[idx];
      ctx.fillRect(0, 0, 800, 1000);

      // Card
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(50, 50, 700, 900, 30);
      ctx.fill();

      // Text
      ctx.fillStyle = sampleColors[idx];
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(title, 90, 160);

      ctx.fillStyle = '#374151';
      ctx.font = '22px sans-serif';
      ctx.fillText(`Sample Image ${idx + 1} for Images-to-PDF test`, 90, 220);
      ctx.fillText(`Resolution: 800 × 1000 pixels`, 90, 260);
      ctx.fillText(`Converted directly in browser memory without server upload.`, 90, 300);

      canvas.toBlob(blob => {
        if (!blob) return;
        const file = new File([blob], `sample_page_${idx + 1}.png`, { type: 'image/png' });
        handleFilesSelected([file]);
      }, 'image/png');
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(i => i.id === active.id);
      const newIndex = images.findIndex(i => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setImages(arrayMove(images, oldIndex, newIndex));
      }
    }
  };

  const handleRotateImage = (id: string) => {
    setImages(prev =>
      prev.map(img =>
        img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    );
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(img => img.id !== id);
    });
  };

  const handleClearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setResultData(null);
    setErrorMessage(null);
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(5);

    try {
      const pdfBytes = await convertImagesToPDF(
        images,
        { pageSize, orientation, margin },
        (prog, stat) => {
          setProgressPercent(prog);
          setProgressStatus(stat);
        }
      );

      const firstName = images[0].name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${firstName}_document.pdf`);
      setResultData(pdfBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred during PDF creation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalBytes = images.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES['images-to-pdf'].seoTitle}
        description={TOOL_GUIDES['images-to-pdf'].seoDescription}
        path={TOOL_GUIDES['images-to-pdf'].route}
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
              <span className="p-2.5 rounded-2xl bg-pink-600 text-white shadow-md shadow-pink-600/20">
                <FileImage className="w-6 h-6" />
              </span>
              <span>Images to PDF</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Combine JPG, PNG, and WEBP photos, scans, and graphics into a standardized PDF.
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
          label="Download Created PDF"
          resetLabel="Convert More Images"
          subtitle={`Created PDF with ${images.length} pages formatted in ${pageSize.toUpperCase()} format.`}
          onReset={handleClearAll}
        />
      ) : isProcessing ? (
        /* Processing View */
        <div className="py-12">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Converting Images to PDF Document..."
          />
        </div>
      ) : images.length === 0 ? (
        /* Empty Upload View */
        <div className="space-y-6">
          <div
            onClick={() => {
              const input = document.getElementById('images-input') as HTMLInputElement;
              input?.click();
            }}
            className="group cursor-pointer rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-pink-500 dark:hover:border-pink-400 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50/80 p-8 md:p-12 text-center transition-all duration-200 shadow-sm"
          >
            <input
              id="images-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center transition-transform group-hover:scale-110">
                <FileImage className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Drop image files here to convert
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Supports JPG, PNG, and WEBP formats
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold shadow-md shadow-pink-600/20 transition-all">
                <Plus className="w-4 h-4" />
                <span>Select Images</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemoImages}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load 3 sample graphics to test Images-to-PDF conversion</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Loaded Images Workspace */
        <div className="space-y-6">
          {/* Metadata & Page Setup Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/70 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold shrink-0">
                  <FileImage className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {images.length} {images.length === 1 ? 'Image' : 'Images'} Selected
                  </h3>
                  <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <span className="font-mono">{formatBytes(totalBytes)} total</span>
                    <span>•</span>
                    <span>Drag cards to change order in the output PDF</span>
                  </div>
                </div>
              </div>

              {/* Add more images & Reset */}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Layout Options: Page size, orientation, margin */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Page Size */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-pink-500" />
                  <span>Page Size:</span>
                </label>
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setPageSize('a4')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      pageSize === 'a4'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('letter')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      pageSize === 'letter'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('fit')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      pageSize === 'fit'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Fit to Image
                  </button>
                </div>
              </div>

              {/* Orientation */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-pink-500" />
                  <span>Orientation:</span>
                </label>
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setOrientation('auto')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      orientation === 'auto'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      orientation === 'portrait'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      orientation === 'landscape'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Margins */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  Margins:
                </label>
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setMargin('none')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      margin === 'none'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setMargin('small')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      margin === 'small'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Small (20pt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMargin('big')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      margin === 'big'
                        ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Big (40pt)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sortable Images Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <span>Drag cards by the handle to change sequence. Use the rotate button if needed.</span>
              <span className="font-mono">{images.length} pages will be created</span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {images.map((img, index) => (
                    <SortableImageCard
                      key={img.id}
                      item={img}
                      displayIndex={index}
                      onRotate={handleRotateImage}
                      onRemove={handleRemoveImage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>WEBP images are automatically converted to lossless PNG prior to embedding.</span>
            </div>

            <button
              type="button"
              onClick={handleConvert}
              disabled={images.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 active:bg-pink-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-pink-600/25 hover:shadow-pink-600/40 transition-all cursor-pointer"
            >
              <FileImage className="w-4 h-4" />
              <span>Convert {images.length} Images to PDF</span>
            </button>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="images-to-pdf" />
    </div>
  );
};
