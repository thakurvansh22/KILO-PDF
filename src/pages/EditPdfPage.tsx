import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileEdit,
  ArrowLeft,
  AlertTriangle,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Type,
  Image as ImageIcon,
  PenTool,
  Trash2,
  Bold,
  Italic,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileText,
  Pipette,
  RotateCcw,
  Info,
  AlertCircle,
  Loader2,
  Layers,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressLoader } from '../components/ProgressLoader';
import { DownloadButton } from '../components/DownloadButton';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SignatureModal } from '../components/SignatureModal';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { EditorElement, EditorTool, ExistingTextBlock, ExistingTextEdit } from '../types';
import { readPdfFile, createSamplePDF, compileEditedPDF, checkWinAnsiSafe } from '../utils/pdfUtils';
import { getPdfDocumentProxy, renderPageThumbnail, clearThumbnailCache, extractPageTextBlocks } from '../utils/pdfViewer';

interface HistorySnapshot {
  elements: Record<number, EditorElement[]>;
  textEdits: Record<number, Record<string, ExistingTextEdit>>;
}

const isMobileScreen = () => typeof window !== 'undefined' && window.innerWidth < 768;

export const EditPdfPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 595.28,
    height: 841.89,
  });

  // Mobile drawers
  const [isPagesOpen, setIsPagesOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Editor states
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  const [elementsByPage, setElementsByPage] = useState<Record<number, EditorElement[]>>({});
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Existing Text editing states
  const [textBlocksByPage, setTextBlocksByPage] = useState<Record<number, ExistingTextBlock[]>>({});
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [textEditsByPage, setTextEditsByPage] = useState<Record<number, Record<string, ExistingTextEdit>>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isEyeDropperMode, setIsEyeDropperMode] = useState<boolean>(false);
  const [eyedropperFeedback, setEyedropperFeedback] = useState<string | null>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Signature modal & Image upload input
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Thumbnail sidebar cache
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});

  // Loading & export states
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Push to Undo/Redo history
  const pushState = (
    newElements: Record<number, EditorElement[]>,
    newTextEdits: Record<number, Record<string, ExistingTextEdit>>
  ) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push({
      elements: JSON.parse(JSON.stringify(newElements)),
      textEdits: JSON.parse(JSON.stringify(newTextEdits)),
    });
    if (updated.length > 30) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setElementsByPage(newElements);
    setTextEditsByPage(newTextEdits);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      const snapshot = history[nextIdx];
      setElementsByPage(JSON.parse(JSON.stringify(snapshot.elements)));
      setTextEditsByPage(JSON.parse(JSON.stringify(snapshot.textEdits)));
      setSelectedElementId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const snapshot = history[nextIdx];
      setElementsByPage(JSON.parse(JSON.stringify(snapshot.elements)));
      setTextEditsByPage(JSON.parse(JSON.stringify(snapshot.textEdits)));
      setSelectedElementId(null);
    }
  };

  // Load document
  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);
    clearThumbnailCache();

    try {
      const { pageCount: count } = await readPdfFile(file);
      const proxy = await getPdfDocumentProxy(file);

      // Mobile: auto fit page to screen width
      if (isMobileScreen()) {
        try {
          const firstPage = await proxy.getPage(1);
          const vp = firstPage.getViewport({ scale: 1.0 });
          const fit = (window.innerWidth - 24) / vp.width;
          setZoomScale(Math.max(0.3, Math.min(1.25, parseFloat(fit.toFixed(2)))));
        } catch {
          setZoomScale(0.6);
        }
      } else {
        setZoomScale(1.25);
      }

      setSelectedFile(file);
      setPdfProxy(proxy);
      setPageCount(count);
      setCurrentPage(1);

      const initialElements: Record<number, EditorElement[]> = {};
      const initialTextEdits: Record<number, Record<string, ExistingTextEdit>> = {};
      setElementsByPage(initialElements);
      setTextEditsByPage(initialTextEdits);
      setTextBlocksByPage({});
      setHistory([{ elements: initialElements, textEdits: initialTextEdits }]);
      setHistoryIndex(0);
      setResultData(null);
      setSelectedElementId(null);
      setActiveBlockId(null);
      setThumbnailUrls({});
      setIsPagesOpen(false);
      setIsInspectorOpen(false);
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
      const sample = await createSamplePDF('Document for Visual Editing & Text Modification', 3);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate sample PDF.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Render current page onto canvas whenever currentPage or zoomScale changes
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

  // Extract text blocks for "Edit Text" tool
  useEffect(() => {
    let isCancelled = false;
    if (pdfProxy && currentPage && currentTool === 'editText') {
      if (!textBlocksByPage[currentPage]) {
        setIsExtractingText(true);
        pdfProxy.getPage(currentPage)
          .then(page => extractPageTextBlocks(page, currentPage))
          .then(blocks => {
            if (!isCancelled) {
              setTextBlocksByPage(prev => ({ ...prev, [currentPage]: blocks }));
            }
          })
          .catch(err => {
            console.error('Error extracting text blocks', err);
          })
          .finally(() => {
            if (!isCancelled) setIsExtractingText(false);
          });
      }
    }
    return () => {
      isCancelled = true;
    };
  }, [pdfProxy, currentPage, currentTool, textBlocksByPage]);

  // Lazy thumbnail sidebar rendering
  useEffect(() => {
    let isCancelled = false;
    if (pdfProxy && pageCount > 0) {
      for (let i = 1; i <= pageCount; i++) {
        const pageNum = i;
        const docId = pdfProxy.fingerprints?.[0] || 'edit';
        renderPageThumbnail(pdfProxy, pageNum, `${docId}_thumb_${pageNum}`, 0.22)
          .then(url => {
            if (!isCancelled) {
              setThumbnailUrls(prev => ({ ...prev, [pageNum]: url }));
            }
          })
          .catch(() => {});
      }
    }
    return () => {
      isCancelled = true;
    };
  }, [pdfProxy, pageCount]);

  // Current page elements & edits
  const currentElements = elementsByPage[currentPage] || [];
  const selectedElement = currentElements.find(e => e.id === selectedElementId) || null;

  const currentTextBlocks = textBlocksByPage[currentPage] || [];
  const currentTextEdits = textEditsByPage[currentPage] || {};
  const activeBlock = currentTextBlocks.find(b => b.id === activeBlockId) || null;
  const activeTextEdit: ExistingTextEdit | null = activeBlock
    ? currentTextEdits[activeBlock.id] || {
        id: `edit-${activeBlock.id}`,
        blockId: activeBlock.id,
        originalText: activeBlock.originalText,
        newText: activeBlock.originalText,
        x: activeBlock.x,
        y: activeBlock.y,
        width: activeBlock.width,
        height: activeBlock.height,
        baselineY: activeBlock.baselineY,
        fontSize: activeBlock.fontSize,
        fontFamily: activeBlock.fontFamily,
        color: activeBlock.color || '#000000',
        coverColor: '#ffffff',
        isBold: activeBlock.isBold,
        isItalic: activeBlock.isItalic,
      }
    : null;

  // Mobile: auto-open inspector when an element / text block is selected
  useEffect(() => {
    if (isMobileScreen() && (selectedElementId || activeBlockId)) {
      setIsInspectorOpen(true);
    }
  }, [selectedElementId, activeBlockId]);

  // Eyedropper sampling logic
  const sampleCanvasPixel = (screenX: number, screenY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const clampedX = Math.max(0, Math.min(canvas.width - 1, Math.round(screenX)));
    const clampedY = Math.max(0, Math.min(canvas.height - 1, Math.round(screenY)));
    const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
    return hex;
  };

  const handleTriggerEyedropper = async () => {
    if (!activeBlock || !activeTextEdit) return;

    // 1. Check native EyeDropper API (Chrome, Edge, etc.)
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          updateActiveTextEdit({ coverColor: result.sRGBHex });
          setEyedropperFeedback(`Sampled color: ${result.sRGBHex}`);
          setTimeout(() => setEyedropperFeedback(null), 2500);
          return;
        }
      } catch {
        // Cancelled or errored, proceed to canvas sampling
      }
    }

    // 2. Automatic canvas pixel sampling adjacent to text (2px to left / 2px above)
    const sampleX = activeBlock.x * zoomScale - 3;
    const sampleY = Math.max(0, activeBlock.y * zoomScale - 2);
    const sampled = sampleCanvasPixel(sampleX, sampleY);

    if (sampled) {
      updateActiveTextEdit({ coverColor: sampled });
      setEyedropperFeedback(`Auto-sampled background: ${sampled}`);
      setTimeout(() => setEyedropperFeedback(null), 2500);
    } else {
      // Toggle manual canvas click sampling
      setIsEyeDropperMode(true);
      setEyedropperFeedback('Click anywhere on the document to pick background color');
    }
  };

  // Click on Page canvas container
  const handlePageContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If Eyedropper mode is active
    if (isEyeDropperMode) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const hex = sampleCanvasPixel(clickX, clickY);
        if (hex && activeTextEdit) {
          updateActiveTextEdit({ coverColor: hex });
          setEyedropperFeedback(`Picked color: ${hex}`);
          setTimeout(() => setEyedropperFeedback(null), 2500);
        }
      }
      setIsEyeDropperMode(false);
      return;
    }

    if (currentTool === 'text') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert to PDF points
      const pdfX = Math.round(clickX / zoomScale);
      const pdfY = Math.round(clickY / zoomScale);

      const newId = `text-${Date.now()}`;
      const newElement: EditorElement = {
        id: newId,
        type: 'text',
        x: Math.max(10, Math.min(pageDimensions.width - 150, pdfX)),
        y: Math.max(10, Math.min(pageDimensions.height - 40, pdfY)),
        width: 160,
        height: 36,
        text: 'Type text here',
        fontFamily: 'Helvetica',
        fontSize: 16,
        color: '#000000',
        isBold: false,
        isItalic: false,
      };

      const nextMap = {
        ...elementsByPage,
        [currentPage]: [...currentElements, newElement],
      };
      pushState(nextMap, textEditsByPage);
      setSelectedElementId(newId);
      setActiveBlockId(null);
      setCurrentTool('select');
    } else if (currentTool === 'select') {
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'CANVAS') {
        setSelectedElementId(null);
        setActiveBlockId(null);
      }
    }
  };

  // Add Image Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const targetWidth = Math.min(180, pageDimensions.width * 0.4);
        const aspect = img.width / img.height;
        const targetHeight = targetWidth / aspect;

        const newId = `img-${Date.now()}`;
        const newElement: EditorElement = {
          id: newId,
          type: 'image',
          x: Math.round((pageDimensions.width - targetWidth) / 2),
          y: Math.round((pageDimensions.height - targetHeight) / 2),
          width: Math.round(targetWidth),
          height: Math.round(targetHeight),
          dataUrl,
          aspectRatio: aspect,
        };

        const nextMap = {
          ...elementsByPage,
          [currentPage]: [...currentElements, newElement],
        };
        pushState(nextMap, textEditsByPage);
        setSelectedElementId(newId);
        setActiveBlockId(null);
        setCurrentTool('select');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add Signature Handler
  const handleApplySignature = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const targetWidth = 150;
      const aspect = img.width / img.height;
      const targetHeight = Math.round(targetWidth / aspect);

      const newId = `sig-${Date.now()}`;
      const newElement: EditorElement = {
        id: newId,
        type: 'signature',
        x: Math.round((pageDimensions.width - targetWidth) / 2),
        y: Math.round(pageDimensions.height * 0.7),
        width: targetWidth,
        height: targetHeight,
        dataUrl,
        aspectRatio: aspect,
      };

      const nextMap = {
        ...elementsByPage,
        [currentPage]: [...currentElements, newElement],
      };
      pushState(nextMap, textEditsByPage);
      setSelectedElementId(newId);
      setActiveBlockId(null);
      setCurrentTool('select');
    };
    img.src = dataUrl;
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    const nextMap = {
      ...elementsByPage,
      [currentPage]: currentElements.filter(e => e.id !== id),
    };
    pushState(nextMap, textEditsByPage);
    setSelectedElementId(null);
  };

  // Update element properties
  const updateElementProps = (id: string, updates: Partial<EditorElement>) => {
    const nextMap = {
      ...elementsByPage,
      [currentPage]: currentElements.map(e => (e.id === id ? { ...e, ...updates } : e)),
    };
    pushState(nextMap, textEditsByPage);
  };

  // Handle Existing Text Block Click
  const handleSelectTextBlock = (block: ExistingTextBlock) => {
    setActiveBlockId(block.id);
    setSelectedElementId(null);

    // If edit does not exist yet for this block, initialize it
    if (!textEditsByPage[currentPage]?.[block.id]) {
      const initialEdit: ExistingTextEdit = {
        id: `edit-${block.id}`,
        blockId: block.id,
        originalText: block.originalText,
        newText: block.originalText,
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        baselineY: block.baselineY,
        fontSize: block.fontSize,
        fontFamily: block.fontFamily,
        color: block.color || '#000000',
        coverColor: '#ffffff',
        isBold: block.isBold,
        isItalic: block.isItalic,
      };

      const updatedEdits = {
        ...textEditsByPage,
        [currentPage]: {
          ...(textEditsByPage[currentPage] || {}),
          [block.id]: initialEdit,
        },
      };
      pushState(elementsByPage, updatedEdits);
    }
  };

  // Update Existing Text Edit properties
  const updateActiveTextEdit = (updates: Partial<ExistingTextEdit>) => {
    if (!activeBlock) return;
    const currentEdit = textEditsByPage[currentPage]?.[activeBlock.id] || {
      id: `edit-${activeBlock.id}`,
      blockId: activeBlock.id,
      originalText: activeBlock.originalText,
      newText: activeBlock.originalText,
      x: activeBlock.x,
      y: activeBlock.y,
      width: activeBlock.width,
      height: activeBlock.height,
      baselineY: activeBlock.baselineY,
      fontSize: activeBlock.fontSize,
      fontFamily: activeBlock.fontFamily,
      color: activeBlock.color || '#000000',
      coverColor: '#ffffff',
      isBold: activeBlock.isBold,
      isItalic: activeBlock.isItalic,
    };

    const nextEdit = { ...currentEdit, ...updates };

    const updatedEdits = {
      ...textEditsByPage,
      [currentPage]: {
        ...(textEditsByPage[currentPage] || {}),
        [activeBlock.id]: nextEdit,
      },
    };
    pushState(elementsByPage, updatedEdits);
  };

  // Revert specific text edit back to original PDF
  const handleRevertTextEdit = (blockId: string) => {
    const pageEdits = { ...(textEditsByPage[currentPage] || {}) };
    delete pageEdits[blockId];

    const updatedEdits = {
      ...textEditsByPage,
      [currentPage]: pageEdits,
    };
    pushState(elementsByPage, updatedEdits);
    setActiveBlockId(null);
  };

  // Keyboard shortcut for Delete / Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, elementsByPage, currentPage]);

  // Dragging & Resizing Element Logic (POINTER EVENTS: works for mouse + touch)
  const startDrag = (el: EditorElement, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    setActiveBlockId(null);
    if (currentTool !== 'select') setCurrentTool('select');

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialX = el.x;
    const initialY = el.y;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaX = (moveEvt.clientX - startClientX) / zoomScale;
      const deltaY = (moveEvt.clientY - startClientY) / zoomScale;

      const newX = Math.round(Math.max(0, Math.min(pageDimensions.width - el.width, initialX + deltaX)));
      const newY = Math.round(Math.max(0, Math.min(pageDimensions.height - el.height, initialY + deltaY)));

      setElementsByPage(prev => ({
        ...prev,
        [currentPage]: (prev[currentPage] || []).map(item =>
          item.id === el.id ? { ...item, x: newX, y: newY } : item
        ),
      }));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      setElementsByPage(latest => {
        pushState(latest, textEditsByPage);
        return latest;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const startResize = (el: EditorElement, handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialWidth = el.width;
    const initialHeight = el.height;
    const aspect = el.aspectRatio || initialWidth / initialHeight;
    const isImageOrSig = el.type === 'image' || el.type === 'signature';

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaX = (moveEvt.clientX - startClientX) / zoomScale;
      const deltaY = (moveEvt.clientY - startClientY) / zoomScale;

      const newWidth = Math.max(25, Math.round(initialWidth + deltaX));
      const newHeight = isImageOrSig
        ? Math.round(newWidth / aspect)
        : Math.max(20, Math.round(initialHeight + deltaY));

      setElementsByPage(prev => ({
        ...prev,
        [currentPage]: (prev[currentPage] || []).map(item =>
          item.id === el.id ? { ...item, width: newWidth, height: newHeight } : item
        ),
      }));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      setElementsByPage(latest => {
        pushState(latest, textEditsByPage);
        return latest;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Compile & Download
  const handleExport = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setIsExporting(true);
    setExportProgress(10);
    setExportStatus('Compiling edited PDF document...');

    try {
      const editedBytes = await compileEditedPDF(
        selectedFile,
        elementsByPage,
        textEditsByPage,
        (prog, stat) => {
          setExportProgress(prog);
          setExportStatus(stat);
        }
      );

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setResultFileName(`${baseName}_edited.pdf`);
      setResultData(editedBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred while compiling your edited PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetDocument = () => {
    setSelectedFile(null);
    setPdfProxy(null);
    setElementsByPage({});
    setTextEditsByPage({});
    setTextBlocksByPage({});
    setHistory([]);
    setHistoryIndex(-1);
    setResultData(null);
    setSelectedElementId(null);
    setActiveBlockId(null);
    setIsPagesOpen(false);
    setIsInspectorOpen(false);
    clearThumbnailCache();
  };

  // WinAnsi safety check on active text edit
  const winAnsiCheck = activeTextEdit ? checkWinAnsiSafe(activeTextEdit.newText) : { safe: true, unsupportedChars: [] };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] overflow-x-hidden">
      <SEO
        title={TOOL_GUIDES['edit-pdf'].seoTitle}
        description={TOOL_GUIDES['edit-pdf'].seoDescription}
        path={TOOL_GUIDES['edit-pdf'].route}
      />
      {/* Top Main Bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 md:gap-4 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            title="Back to All Tools"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shrink-0">
              <FileEdit className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white truncate max-w-[130px] sm:max-w-xs">
              {selectedFile ? selectedFile.name : 'Visual PDF Editor'}
            </span>
          </div>
        </div>

        {selectedFile && (
          /* Undo / Redo & Zoom & Export (top row on mobile) */
          <div className="flex items-center gap-1.5 sm:gap-2 md:order-3">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 md:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 md:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 px-1.5 sm:px-2 py-1 rounded-xl text-xs text-zinc-600 dark:text-zinc-300">
              <button
                type="button"
                onClick={() => setZoomScale(s => Math.max(0.3, parseFloat((s - 0.15).toFixed(2))))}
                className="p-1.5 md:p-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-9 sm:w-10 text-center font-bold">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(s => Math.min(2.5, parseFloat((s + 0.15).toFixed(2))))}
                className="p-1.5 md:p-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          </div>
        )}

        {selectedFile && (
          /* Editor Toolbar Tools: full-width scrollable row on mobile */
          <div className="order-last md:order-2 w-full md:w-auto overflow-x-auto md:overflow-visible">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 w-max mx-auto md:mx-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentTool('select');
                  setActiveBlockId(null);
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentTool === 'select'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="Select / Move Elements"
              >
                <MousePointer className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Select</span>
              </button>

              {/* EDIT TEXT */}
              <button
                type="button"
                onClick={() => {
                  setCurrentTool('editText');
                  setSelectedElementId(null);
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentTool === 'editText'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="Edit Existing Text in PDF"
              >
                <FileText className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Edit Text</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentTool('text');
                  setActiveBlockId(null);
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentTool === 'text'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="Add New Text Box to Page"
              >
                <Type className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Add Text</span>
              </button>

              <button
                type="button"
                onClick={() => imageUploadInputRef.current?.click()}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer"
                title="Add Image to Page"
              >
                <ImageIcon className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Add Image</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer"
                title="Add Signature"
              >
                <PenTool className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Signature</span>
              </button>

              <input
                ref={imageUploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile-only strip: open Pages / Inspector drawers */}
      {selectedFile && !resultData && !isExporting && (
        <div className="md:hidden flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setIsPagesOpen(true);
              setIsInspectorOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>
              Pages ({currentPage}/{pageCount})
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsInspectorOpen(true);
              setIsPagesOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Inspector</span>
          </button>
        </div>
      )}

      {/* Eyedropper mode banner */}
      {isEyeDropperMode && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between z-30 shadow-md">
          <div className="flex items-center gap-2">
            <Pipette className="w-4 h-4 animate-bounce" />
            <span>Eyedropper active: Click anywhere on the PDF canvas to sample that exact background color.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsEyeDropperMode(false)}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Eyedropper feedback alert */}
      {eyedropperFeedback && !isEyeDropperMode && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 z-30 animate-in fade-in duration-200">
          <Pipette className="w-3.5 h-3.5" />
          <span>{eyedropperFeedback}</span>
        </div>
      )}

      {/* Main Workspace Area */}
      {errorMessage && (
        <div className="m-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {resultData ? (
        <div className="p-4 sm:p-8 max-w-xl mx-auto my-auto w-full">
          <DownloadButton
            data={resultData}
            fileName={resultFileName}
            label="Download Edited PDF"
            resetLabel="Edit Another PDF"
            subtitle="All modifications, text edits, annotations, and signatures have been permanently burned into the PDF."
            onReset={handleResetDocument}
          />
        </div>
      ) : isExporting ? (
        <div className="py-24 max-w-md mx-auto my-auto w-full px-4">
          <ProgressLoader
            progress={exportProgress}
            status={exportStatus}
            title="Exporting Edited PDF Document..."
          />
        </div>
      ) : !selectedFile ? (
        /* Empty Upload View */
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6 flex-1 flex flex-col justify-center">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Client-Side Visual PDF & Text Editing</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Visual PDF Editor & Existing Text Modifier
            </h2>
            <p className="text-sm text-zinc-500 max-w-lg mx-auto">
              Edit existing text directly in your PDF, add new annotations, insert images, and apply signatures with pixel precision.
            </p>
          </div>

          <FileDropzone
            multiple={false}
            title="Drop PDF file here to edit"
            subtitle="Upload a document to edit existing text, add annotations, or sign"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Invoice Document to Edit"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load demo document with sample text and invoices</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Editor: Desktop = 3 columns | Mobile = full-width canvas + drawers */
        <div className="flex-1 flex md:overflow-hidden bg-zinc-100/60 dark:bg-zinc-950 relative">
          {/* Mobile backdrop for drawers */}
          {(isPagesOpen || isInspectorOpen) && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                setIsPagesOpen(false);
                setIsInspectorOpen(false);
              }}
            />
          )}

          {/* Left Thumbnail Sidebar (mobile: slide-in drawer) */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${
              isPagesOpen ? 'translate-x-0' : '-translate-x-full'
            } md:static md:translate-x-0 md:z-auto md:w-56 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 overflow-hidden`}
          >
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Pages ({pageCount})</span>
              <span className="hidden md:inline font-mono text-[10px] text-zinc-400">Click to edit</span>
              <button
                type="button"
                onClick={() => setIsPagesOpen(false)}
                className="md:hidden p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNum => {
                const isCurrent = pageNum === currentPage;
                const pageElems = elementsByPage[pageNum] || [];
                const pageEdits = Object.keys(textEditsByPage[pageNum] || {}).length;
                const totalModifications = pageElems.length + pageEdits;

                return (
                  <div
                    key={pageNum}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      setSelectedElementId(null);
                      setActiveBlockId(null);
                      setIsPagesOpen(false);
                    }}
                    className={`group relative rounded-xl border p-2 cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40'
                    }`}
                  >
                    <div className="aspect-[1/1.38] bg-white dark:bg-zinc-950 rounded-lg overflow-hidden flex items-center justify-center relative shadow-xs">
                      {thumbnailUrls[pageNum] ? (
                        <img
                          src={thumbnailUrls[pageNum]}
                          alt={`Page ${pageNum}`}
                          className="max-h-full max-w-full object-contain pointer-events-none"
                        />
                      ) : (
                        <span className="text-xs font-mono text-zinc-400">Page {pageNum}</span>
                      )}

                      {totalModifications > 0 && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold shadow-xs">
                          {totalModifications}
                        </span>
                      )}
                    </div>
                    <p className={`text-center text-xs mt-1.5 font-semibold ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}>
                      Page {pageNum}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Page Bottom Switcher */}
            <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  setActiveBlockId(null);
                  setSelectedElementId(null);
                }}
                disabled={currentPage <= 1}
                className="p-1.5 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs">
                {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(p => Math.min(pageCount, p + 1));
                  setActiveBlockId(null);
                  setSelectedElementId(null);
                }}
                disabled={currentPage >= pageCount}
                className="p-1.5 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </aside>

          {/* Center Stage: Viewport Canvas + Interactive Annotations Layer */}
          <main className="flex-1 min-w-0 overflow-auto flex flex-col items-center p-3 md:p-10 select-none relative">
            {/* Scanned PDF warning notice if Edit Text tool is active and no text found */}
            {currentTool === 'editText' && !isExtractingText && currentTextBlocks.length === 0 && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-xs max-w-lg w-full">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>No editable text found on this page (scanned PDF).</span>
              </div>
            )}

            {/* Edit Text Info Note */}
            {currentTool === 'editText' && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Edit existing text is basic: fonts are matched to the closest standard font.</span>
              </div>
            )}

            {isExtractingText && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting page text lines...</span>
              </div>
            )}

            <div
              ref={containerRef}
              onClick={handlePageContainerClick}
              className={`relative bg-white shadow-2xl rounded-sm transition-all shrink-0 ${
                isEyeDropperMode ? 'cursor-crosshair' : currentTool === 'text' ? 'cursor-text' : 'cursor-default'
              }`}
              style={{
                width: Math.floor(pageDimensions.width * zoomScale),
                height: Math.floor(pageDimensions.height * zoomScale),
              }}
            >
              {/* PDF Background Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none block"
              />

              {/* 1. Existing Text Edits Preview Layer (Active in ALL tools so edits stay visible live) */}
              {Object.values(currentTextEdits).map(edit => {
                // If currently editing this exact block in 'editText' mode, the active editor below handles it
                if (currentTool === 'editText' && activeBlockId === edit.blockId) return null;

                const screenX = Math.round(edit.x * zoomScale);
                const screenY = Math.round(edit.y * zoomScale);
                const screenW = Math.max(16, Math.round(edit.width * zoomScale));
                const screenH = Math.max(12, Math.round(edit.height * zoomScale));

                return (
                  <div
                    key={`preview-${edit.blockId}`}
                    onClick={e => {
                      if (currentTool === 'editText') {
                        e.stopPropagation();
                        setActiveBlockId(edit.blockId);
                        setSelectedElementId(null);
                      }
                    }}
                    className={`absolute flex items-center px-0.5 overflow-hidden transition-all ${
                      currentTool === 'editText' ? 'cursor-pointer hover:ring-1 hover:ring-indigo-400' : 'pointer-events-none'
                    }`}
                    style={{
                      left: screenX - 2,
                      top: screenY - 2,
                      width: screenW + 4,
                      height: screenH + 4,
                      backgroundColor: edit.coverColor || '#ffffff',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: edit.fontFamily || 'Helvetica',
                        fontSize: `${Math.max(8, (edit.fontSize || 12) * zoomScale)}px`,
                        color: edit.color || '#000000',
                        fontWeight: edit.isBold ? 'bold' : 'normal',
                        fontStyle: edit.isItalic ? 'italic' : 'normal',
                        whiteSpace: 'pre',
                        lineHeight: 1,
                      }}
                    >
                      {edit.newText}
                    </span>
                  </div>
                );
              })}

              {/* 2. Interactive Text Blocks Overlay (Rendered when 'editText' tool is active) */}
              {currentTool === 'editText' &&
                currentTextBlocks.map(block => {
                  const isBlockActive = activeBlockId === block.id;
                  const edit = currentTextEdits[block.id];

                  const screenX = Math.round(block.x * zoomScale);
                  const screenY = Math.round(block.y * zoomScale);
                  const screenW = Math.max(20, Math.round(block.width * zoomScale));
                  const screenH = Math.max(14, Math.round(block.height * zoomScale));

                  if (isBlockActive && activeTextEdit) {
                    return (
                      <div
                        key={block.id}
                        onClick={e => e.stopPropagation()}
                        className="absolute z-30 ring-2 ring-indigo-500 rounded-xs shadow-md p-0"
                        style={{
                          left: screenX - 2,
                          top: screenY - 2,
                          minWidth: screenW + 8,
                          height: screenH + 4,
                          backgroundColor: activeTextEdit.coverColor || '#ffffff',
                        }}
                      >
                        <input
                          type="text"
                          value={activeTextEdit.newText}
                          onChange={e => updateActiveTextEdit({ newText: e.target.value })}
                          autoFocus
                          className="w-full h-full px-1 border-none outline-none bg-transparent"
                          style={{
                            fontFamily: activeTextEdit.fontFamily || 'Helvetica',
                            fontSize: `${Math.max(8, (activeTextEdit.fontSize || 12) * zoomScale)}px`,
                            color: activeTextEdit.color || '#000000',
                            fontWeight: activeTextEdit.isBold ? 'bold' : 'normal',
                            fontStyle: activeTextEdit.isItalic ? 'italic' : 'normal',
                          }}
                        />
                      </div>
                    );
                  }

                  // Non-active block overlay (hover highlight to discover text lines)
                  return (
                    <div
                      key={block.id}
                      onClick={e => {
                        e.stopPropagation();
                        handleSelectTextBlock(block);
                      }}
                      className={`absolute rounded-xs cursor-text transition-all ${
                        edit
                          ? 'border border-dashed border-indigo-400 bg-transparent'
                          : 'border border-transparent hover:border-indigo-400 hover:border-dashed hover:bg-indigo-500/15'
                      }`}
                      style={{
                        left: screenX,
                        top: screenY,
                        width: screenW,
                        height: screenH,
                      }}
                      title="Click to edit this text"
                    />
                  );
                })}

              {/* 3. Elements Overlay Layer (Added Text, Images, Signatures) */}
              {currentElements.map(el => {
                const isSelected = selectedElementId === el.id;
                const screenX = Math.round(el.x * zoomScale);
                const screenY = Math.round(el.y * zoomScale);
                const screenW = Math.round(el.width * zoomScale);
                const screenH = Math.round(el.height * zoomScale);

                return (
                  <div
                    key={el.id}
                    onPointerDown={e => startDrag(el, e)}
                    className={`absolute group cursor-move transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 border border-indigo-500 shadow-md z-30'
                        : 'hover:ring-1 hover:ring-indigo-300 dark:hover:ring-indigo-600'
                    }`}
                    style={{
                      left: screenX,
                      top: screenY,
                      width: screenW,
                      height: screenH,
                      touchAction: 'none',
                    }}
                  >
                    {/* Element Render Body */}
                    {el.type === 'text' && (
                      <textarea
                        value={el.text || ''}
                        onChange={e => updateElementProps(el.id, { text: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-full resize-none bg-transparent outline-none p-1 font-sans leading-tight border-none"
                        style={{
                          fontSize: `${(el.fontSize || 16) * zoomScale}px`,
                          fontFamily: el.fontFamily || 'Helvetica',
                          color: el.color || '#000000',
                          fontWeight: el.isBold ? 'bold' : 'normal',
                          fontStyle: el.isItalic ? 'italic' : 'normal',
                        }}
                      />
                    )}

                    {(el.type === 'image' || el.type === 'signature') && (
                      <div className="w-full h-full flex items-center justify-center p-0.5 overflow-hidden">
                        <img
                          src={el.dataUrl}
                          alt="Annotation"
                          className="max-w-full max-h-full object-contain pointer-events-none select-none"
                        />
                      </div>
                    )}

                    {/* Resize Handle (bottom-right) - bigger touch target on mobile */}
                    {isSelected && (
                      <div
                        onPointerDown={e => startResize(el, 'se', e)}
                        className="absolute -bottom-2.5 -right-2.5 w-6 h-6 md:-bottom-1.5 md:-right-1.5 md:w-3.5 md:h-3.5 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize z-40 shadow-sm"
                        style={{ touchAction: 'none' }}
                        title="Drag to resize"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </main>

          {/* Right Properties Panel (mobile: bottom sheet) */}
          <aside
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] rounded-t-2xl shadow-2xl transform transition-transform duration-300 ${
              isInspectorOpen ? 'translate-y-0' : 'translate-y-full'
            } md:static md:translate-y-0 md:z-auto md:max-h-none md:rounded-none md:shadow-none md:w-72 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 overflow-y-auto`}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {activeBlock
                  ? 'Edit Existing Text'
                  : selectedElement
                  ? 'Element Properties'
                  : 'Inspector'}
              </h4>
              <div className="flex items-center gap-1">
                {selectedElement && (
                  <button
                    type="button"
                    onClick={() => handleDeleteElement(selectedElement.id)}
                    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                    title="Delete element"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5 text-xs">
              {/* INSPECTOR VIEW A: ACTIVE EXISTING TEXT BLOCK EDIT */}
              {activeBlock && activeTextEdit ? (
                <div className="space-y-4">
                  {/* Original Text Quote */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Original Text:
                    </span>
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono text-[11px] break-words">
                      "{activeBlock.originalText}"
                    </div>
                  </div>

                  {/* Editable New Text */}
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Replacement Text:
                    </label>
                    <textarea
                      rows={2}
                      value={activeTextEdit.newText}
                      onChange={e => updateActiveTextEdit({ newText: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                    />
                  </div>

                  {/* Unsupported character warning */}
                  {!winAnsiCheck.safe && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Font encoding note</span>
                      </div>
                      <p>
                        Characters ({winAnsiCheck.unsupportedChars.slice(0, 3).join(', ')}) will be converted to safe standard approximations on export.
                      </p>
                    </div>
                  )}

                  {/* Font Family */}
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Font:</label>
                    <select
                      value={activeTextEdit.fontFamily || 'Helvetica'}
                      onChange={e =>
                        updateActiveTextEdit({
                          fontFamily: e.target.value as 'Helvetica' | 'Times' | 'Courier',
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="Helvetica">Helvetica (Sans-Serif)</option>
                      <option value="Times">Times New Roman (Serif)</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">Size:</label>
                      <span className="font-mono">{activeTextEdit.fontSize || 12} pt</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="64"
                      value={activeTextEdit.fontSize || 12}
                      onChange={e => updateActiveTextEdit({ fontSize: parseInt(e.target.value, 10) })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Style (Bold / Italic) */}
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Style:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateActiveTextEdit({ isBold: !activeTextEdit.isBold })}
                        className={`flex-1 py-1.5 px-3 rounded-lg border font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          activeTextEdit.isBold
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                        <span>Bold</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveTextEdit({ isItalic: !activeTextEdit.isItalic })}
                        className={`flex-1 py-1.5 px-3 rounded-lg border italic flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          activeTextEdit.isItalic
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <Italic className="w-3.5 h-3.5" />
                        <span>Italic</span>
                      </button>
                    </div>
                  </div>

                  {/* Ink Color */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Text Color:</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {['#000000', '#1e3a8a', '#dc2626', '#059669', '#7c3aed'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateActiveTextEdit({ color: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            activeTextEdit.color === c
                              ? 'scale-110 border-indigo-600 ring-2 ring-indigo-500/20'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={activeTextEdit.color || '#000000'}
                        onChange={e => updateActiveTextEdit({ color: e.target.value })}
                        className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                        title="Custom ink color"
                      />
                    </div>
                  </div>

                  {/* Cover Color & Eyedropper */}
                  <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">Cover Color:</label>
                      <button
                        type="button"
                        onClick={handleTriggerEyedropper}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 cursor-pointer"
                        title="Sample background color with Eyedropper"
                      >
                        <Pipette className="w-3 h-3" />
                        <span>Eyedropper</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {['#ffffff', '#fdfbf7', '#f4f4f5', '#fef3c7', '#eff6ff'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateActiveTextEdit({ coverColor: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer shadow-xs ${
                            activeTextEdit.coverColor === c
                              ? 'scale-110 border-indigo-600 ring-2 ring-indigo-500/20'
                              : 'border-zinc-300'
                          }`}
                          style={{ backgroundColor: c }}
                          title={`Preset: ${c}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={activeTextEdit.coverColor || '#ffffff'}
                        onChange={e => updateActiveTextEdit({ coverColor: e.target.value })}
                        className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer overflow-hidden shadow-xs"
                        title="Custom background cover color"
                      />
                      <span className="font-mono text-[10px] text-zinc-400 uppercase">
                        {activeTextEdit.coverColor || '#ffffff'}
                      </span>
                    </div>
                  </div>

                  {/* Revert This Edit Button */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleRevertTextEdit(activeBlock.id)}
                      className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revert this edit</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 text-[11px] text-zinc-500 space-y-1">
                    <div className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                      <Info className="w-3.5 h-3.5" />
                      <span>Editing Tip</span>
                    </div>
                    <p>Edit existing text is basic: fonts are matched to the closest standard font.</p>
                  </div>
                </div>
              ) : selectedElement ? (
                /* INSPECTOR VIEW B: ADDED ELEMENT (TEXT / IMAGE / SIGNATURE) */
                <>
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase">
                      Type: {selectedElement.type}
                    </span>
                  </div>

                  {/* Properties for Text Elements */}
                  {selectedElement.type === 'text' && (
                    <div className="space-y-4">
                      {/* Font Family */}
                      <div className="space-y-1">
                        <label className="font-semibold text-zinc-700 dark:text-zinc-300">Font:</label>
                        <select
                          value={selectedElement.fontFamily || 'Helvetica'}
                          onChange={e =>
                            updateElementProps(selectedElement.id, {
                              fontFamily: e.target.value as 'Helvetica' | 'Times' | 'Courier',
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        >
                          <option value="Helvetica">Helvetica (Sans-Serif)</option>
                          <option value="Times">Times New Roman (Serif)</option>
                          <option value="Courier">Courier (Monospace)</option>
                        </select>
                      </div>

                      {/* Font Size */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-zinc-700 dark:text-zinc-300">Size:</label>
                          <span className="font-mono">{selectedElement.fontSize || 16} pt</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="72"
                          value={selectedElement.fontSize || 16}
                          onChange={e =>
                            updateElementProps(selectedElement.id, {
                              fontSize: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {/* Styling Toggles: Bold, Italic */}
                      <div className="space-y-1">
                        <label className="font-semibold text-zinc-700 dark:text-zinc-300">Style:</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateElementProps(selectedElement.id, {
                                isBold: !selectedElement.isBold,
                              })
                            }
                            className={`flex-1 py-1.5 px-3 rounded-lg border font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                              selectedElement.isBold
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <Bold className="w-3.5 h-3.5" />
                            <span>Bold</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateElementProps(selectedElement.id, {
                                isItalic: !selectedElement.isItalic,
                              })
                            }
                            className={`flex-1 py-1.5 px-3 rounded-lg border italic flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                              selectedElement.isItalic
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <Italic className="w-3.5 h-3.5" />
                            <span>Italic</span>
                          </button>
                        </div>
                      </div>

                      {/* Color Palette */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-700 dark:text-zinc-300">Ink Color:</label>
                        <div className="flex flex-wrap items-center gap-2">
                          {['#000000', '#1e3a8a', '#dc2626', '#059669', '#7c3aed'].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateElementProps(selectedElement.id, { color: c })}
                              className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                selectedElement.color === c
                                  ? 'scale-110 border-indigo-600 ring-2 ring-indigo-500/20'
                                  : 'border-transparent'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <input
                            type="color"
                            value={selectedElement.color || '#000000'}
                            onChange={e =>
                              updateElementProps(selectedElement.id, { color: e.target.value })
                            }
                            className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                            title="Custom color"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Properties for Image / Signature Elements */}
                  {(selectedElement.type === 'image' || selectedElement.type === 'signature') && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between font-mono text-[11px] text-zinc-500">
                          <span>Width: {selectedElement.width} pt</span>
                          <span>Height: {selectedElement.height} pt</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max={Math.round(pageDimensions.width)}
                          value={selectedElement.width}
                          onChange={e => {
                            const newW = parseInt(e.target.value, 10);
                            const aspect = selectedElement.aspectRatio || 1;
                            updateElementProps(selectedElement.id, {
                              width: newW,
                              height: Math.round(newW / aspect),
                            });
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center min-h-[90px]">
                        <img
                          src={selectedElement.dataUrl}
                          alt="Thumbnail preview"
                          className="max-h-20 max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="w-full py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Element</span>
                    </button>
                  </div>
                </>
              ) : (
                /* INSPECTOR VIEW C: NO SELECTION (HELPFUL GUIDE) */
                <div className="text-zinc-500 space-y-4 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 space-y-2 text-indigo-900 dark:text-indigo-200">
                    <span className="font-bold block">Toolbar Tools</span>
                    <p className="text-[11px]">
                      • <strong>Edit Text</strong>: Hover over any existing line in the document to edit its wording, font, and background cover.
                    </p>
                    <p className="text-[11px]">
                      • <strong>Add Text</strong>: Place new floating text boxes anywhere on the page canvas.
                    </p>
                    <p className="text-[11px]">
                      • <strong>Signature</strong>: Draw, type in cursive, or upload your signature image.
                    </p>
                    <p className="text-[11px]">
                      • <strong>Add Image</strong>: Insert photos or stamps with drag & resize controls.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-zinc-400 text-[11px]">
                    <p>• Click any element or text block to inspect and customize.</p>
                    <p>• Use Eyedropper to sample paper background color automatically.</p>
                    <p>• Changes can be reverted anytime with Undo or "Revert this edit".</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onApplySignature={handleApplySignature}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
        <ToolPageFooter toolId="edit-pdf" />
      </div>
    </div>
  );
};