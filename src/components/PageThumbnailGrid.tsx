import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
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
  RotateCcw,
  RotateCw,
  Check,
  Trash2,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Loader2,
  ArrowRightLeft,
  MoveRight,
  X,
} from 'lucide-react';
import { PageItem } from '../types';
import { renderPageThumbnail } from '../utils/pdfViewer';

interface PageThumbnailGridProps {
  pdfProxy: pdfjsLib.PDFDocumentProxy | null;
  pdfProxies?: Map<string, pdfjsLib.PDFDocumentProxy>;
  pages: PageItem[];
  mode: 'rotate' | 'delete' | 'reorder' | 'select';
  highlightedPageId?: string | null;
  onRotatePage?: (pageId: string, direction: 'left' | 'right') => void;
  onToggleSelectPage?: (pageId: string) => void;
  onReorderPages?: (newPages: PageItem[]) => void;
  onMoveToFirst?: (pageId: string) => void;
  onMoveToLast?: (pageId: string) => void;
  onMoveToPosition?: (pageId: string, targetPosition: number) => void;
  onReplacePageClick?: (pageId: string, pageNumber: number) => void;
}

// Sub-component for an individual thumbnail card with lazy loading
interface ThumbnailCardProps {
  item: PageItem;
  displayIndex: number;
  totalPages: number;
  pdfProxy: pdfjsLib.PDFDocumentProxy | null;
  pdfProxies?: Map<string, pdfjsLib.PDFDocumentProxy>;
  mode: 'rotate' | 'delete' | 'reorder' | 'select';
  isHighlighted?: boolean;
  onRotatePage?: (pageId: string, direction: 'left' | 'right') => void;
  onToggleSelectPage?: (pageId: string) => void;
  onMoveToFirst?: (pageId: string) => void;
  onMoveToLast?: (pageId: string) => void;
  onMoveToPosition?: (pageId: string, targetPosition: number) => void;
  onReplacePageClick?: (pageId: string, pageNumber: number) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  item,
  displayIndex,
  totalPages,
  pdfProxy,
  pdfProxies,
  mode,
  isHighlighted,
  onRotatePage,
  onToggleSelectPage,
  onMoveToFirst,
  onMoveToLast,
  onMoveToPosition,
  onReplacePageClick,
  isFirst,
  isLast,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [showMoveInput, setShowMoveInput] = useState(false);
  const [targetPosInput, setTargetPosInput] = useState('');
  const [inputError, setInputError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Determine which proxy to render from
  const targetProxy = (item.sourceFileId && pdfProxies?.get(item.sourceFileId)) || pdfProxy;

  // Lazy loading observer
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Render thumbnail when in viewport
  useEffect(() => {
    let isCancelled = false;
    if (isIntersecting && targetProxy && !imageUrl) {
      setIsLoading(true);
      const docId = targetProxy.fingerprints?.[0] || item.sourceFileId || 'pdf';
      const cacheKey = `${docId}_p${item.pageNumber}`;
      renderPageThumbnail(targetProxy, item.pageNumber, cacheKey, 0.32)
        .then(url => {
          if (!isCancelled) {
            setImageUrl(url);
            setIsLoading(false);
          }
        })
        .catch(err => {
          console.error(`Failed to render page ${item.pageNumber}`, err);
          if (!isCancelled) setIsLoading(false);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [isIntersecting, targetProxy, item.pageNumber, item.sourceFileId, imageUrl]);

  // Sortable hook for reorder mode
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: mode !== 'reorder' });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const isSelectedForDelete = mode === 'delete' && item.selected;
  const isSelectedForConvert = mode === 'select' && item.selected;

  const handleApplyMoveTo = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = parseInt(targetPosInput, 10);
    if (isNaN(pos) || pos < 1 || pos > totalPages) {
      setInputError(true);
      return;
    }
    setInputError(false);
    setShowMoveInput(false);
    onMoveToPosition?.(item.id, pos);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-300 select-none overflow-hidden ${
        isHighlighted
          ? 'ring-4 ring-indigo-500 border-indigo-500 scale-[1.02] shadow-xl shadow-indigo-500/20 z-20'
          : isSelectedForDelete
          ? 'border-red-500/80 dark:border-red-500/80 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-950/20 shadow-md'
          : isSelectedForConvert
          ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/25 dark:bg-indigo-950/25 shadow-md'
          : isDragging
          ? 'border-indigo-500 shadow-2xl scale-105'
          : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header bar: Page number and status badge */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs gap-1">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300 min-w-0">
          {mode === 'reorder' && (
            <div
              {...attributes}
              {...listeners}
              className="p-1 -ml-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing rounded shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="shrink-0">Page {displayIndex + 1}</span>

          {/* Detailed original & copy status labels */}
          {mode === 'reorder' && (
            <div className="truncate">
              {item.isCopy ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                  orig. {item.pageNumber} (copy)
                </span>
              ) : item.sourceLabel ? (
                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono font-medium">
                  orig. {item.pageNumber} ({item.sourceLabel})
                </span>
              ) : item.pageNumber !== displayIndex + 1 ? (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  (orig. {item.pageNumber})
                </span>
              ) : null}
            </div>
          )}
        </div>

        {mode === 'rotate' && (
          <span
            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
              item.rotation % 360 !== 0
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            {((item.rotation % 360) + 360) % 360}°
          </span>
        )}

        {mode === 'delete' && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
              isSelectedForDelete
                ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {isSelectedForDelete ? 'Delete' : 'Keep'}
          </span>
        )}

        {mode === 'select' && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
              isSelectedForConvert
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {isSelectedForConvert ? 'Selected' : 'Skip'}
          </span>
        )}
      </div>

      {/* Main Thumbnail Viewport */}
      <div
        ref={cardRef}
        onClick={() => {
          if ((mode === 'delete' || mode === 'select') && onToggleSelectPage) {
            onToggleSelectPage(item.id);
          }
        }}
        className={`relative aspect-[1/1.38] bg-zinc-100/70 dark:bg-zinc-950 flex items-center justify-center p-3 overflow-hidden ${
          mode === 'delete' || mode === 'select' ? 'cursor-pointer' : ''
        }`}
      >
        {isLoading || !imageUrl ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-[11px] font-medium">Page {item.pageNumber}</span>
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
            style={{
              transform: `rotate(${item.rotation}deg)`,
            }}
          >
            <img
              src={imageUrl}
              alt={`Page ${item.pageNumber}`}
              className="max-h-full max-w-full object-contain rounded shadow-xs pointer-events-none"
              loading="lazy"
            />
          </div>
        )}

        {/* Delete Overlay */}
        {isSelectedForDelete && (
          <div className="absolute inset-0 bg-red-500/20 dark:bg-red-900/30 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
              <Trash2 className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Inline "Move To..." input overlay popover */}
        {showMoveInput && mode === 'reorder' && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 p-3 flex flex-col justify-center items-center gap-2 z-30 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[11px] font-bold text-zinc-900 dark:text-white">
                Move to Position:
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowMoveInput(false);
                  setInputError(false);
                }}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleApplyMoveTo} className="w-full space-y-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={targetPosInput}
                onChange={e => {
                  setTargetPosInput(e.target.value);
                  setInputError(false);
                }}
                autoFocus
                placeholder={`1 – ${totalPages}`}
                className={`w-full text-center py-1.5 px-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 ${
                  inputError
                    ? 'border-red-500 text-red-600 ring-red-500/20'
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-indigo-500/30'
                }`}
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  Go
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoveInput(false);
                    setInputError(false);
                  }}
                  className="py-1 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className="text-[10px] text-zinc-400">Range: 1 to {totalPages}</p>
          </div>
        )}

        {/* Selection Checkbox for Delete or Select Mode */}
        {(mode === 'delete' || mode === 'select') && (
          <div
            onClick={e => {
              e.stopPropagation();
              onToggleSelectPage?.(item.id);
            }}
            className={`absolute top-2 right-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              item.selected
                ? mode === 'delete'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-transparent hover:border-zinc-400'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        )}
      </div>

      {/* Card Action Controls Footer */}
      <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs">
        {mode === 'rotate' && (
          <div className="w-full flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => onRotatePage?.(item.id, 'left')}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Rotate Left (-90°)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">-90°</span>
            </button>

            <button
              type="button"
              onClick={() => onRotatePage?.(item.id, 'right')}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Rotate Right (+90°)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">+90°</span>
            </button>
          </div>
        )}

        {mode === 'delete' && (
          <button
            type="button"
            onClick={() => onToggleSelectPage?.(item.id)}
            className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              isSelectedForDelete
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                : 'border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60'
            }`}
          >
            {isSelectedForDelete ? (
              <span>Restore Page</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Mark for Delete</span>
              </>
            )}
          </button>
        )}

        {mode === 'select' && (
          <button
            type="button"
            onClick={() => onToggleSelectPage?.(item.id)}
            className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              isSelectedForConvert
                ? 'border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <Check className={`w-3.5 h-3.5 ${isSelectedForConvert ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
            <span>{isSelectedForConvert ? 'Selected' : 'Select Page'}</span>
          </button>
        )}

        {mode === 'reorder' && (
          <div className="space-y-1.5">
            {/* Quick First / Move to / Last buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMoveToFirst?.(item.id)}
                disabled={isFirst}
                className="flex-1 inline-flex items-center justify-center py-1 px-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Move to First Position"
              >
                <ChevronsLeft className="w-3 h-3" />
                <span className="text-[10px] font-medium ml-0.5">First</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetPosInput(String(displayIndex + 1));
                  setShowMoveInput(true);
                }}
                className="flex-1 inline-flex items-center justify-center py-1 px-1.5 rounded-md border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                title="Move to specific position"
              >
                <MoveRight className="w-3 h-3" />
                <span className="text-[10px] font-semibold ml-0.5">Move to</span>
              </button>

              <button
                type="button"
                onClick={() => onMoveToLast?.(item.id)}
                disabled={isLast}
                className="flex-1 inline-flex items-center justify-center py-1 px-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Move to Last Position"
              >
                <span className="text-[10px] font-medium mr-0.5">Last</span>
                <ChevronsRight className="w-3 h-3" />
              </button>
            </div>

            {/* Replace Button */}
            <button
              type="button"
              onClick={() => onReplacePageClick?.(item.id, displayIndex + 1)}
              className="w-full inline-flex items-center justify-center gap-1 py-1 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-semibold transition-colors cursor-pointer"
              title="Replace this page"
            >
              <ArrowRightLeft className="w-3 h-3 text-amber-500" />
              <span>Replace / Swap</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PageThumbnailGrid: React.FC<PageThumbnailGridProps> = ({
  pdfProxy,
  pdfProxies,
  pages,
  mode,
  highlightedPageId,
  onRotatePage,
  onToggleSelectPage,
  onReorderPages,
  onMoveToFirst,
  onMoveToLast,
  onMoveToPosition,
  onReplacePageClick,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderPages) {
      const oldIndex = pages.findIndex(p => p.id === active.id);
      const newIndex = pages.findIndex(p => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(pages, oldIndex, newIndex);
        onReorderPages(reordered);
      }
    }
  };

  const gridContent = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {pages.map((item, index) => (
        <ThumbnailCard
          key={item.id}
          item={item}
          displayIndex={index}
          totalPages={pages.length}
          pdfProxy={pdfProxy}
          pdfProxies={pdfProxies}
          mode={mode}
          isHighlighted={highlightedPageId === item.id}
          onRotatePage={onRotatePage}
          onToggleSelectPage={onToggleSelectPage}
          onMoveToFirst={onMoveToFirst}
          onMoveToLast={onMoveToLast}
          onMoveToPosition={onMoveToPosition}
          onReplacePageClick={onReplacePageClick}
          isFirst={index === 0}
          isLast={index === pages.length - 1}
        />
      ))}
    </div>
  );

  if (mode === 'reorder') {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
          {gridContent}
        </SortableContext>
      </DndContext>
    );
  }

  return gridContent;
};
