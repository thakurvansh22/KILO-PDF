import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Thumbnail cache to avoid re-rendering pages
const thumbnailCache = new Map<string, string>();

export async function getPdfDocumentProxy(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypt')) {
      throw new Error(`"${file.name}" is password protected. Please provide an unencrypted PDF.`);
    }
    throw new Error(`Failed to load "${file.name}". The PDF might be corrupted.`);
  }
}

export async function renderPageThumbnail(
  pdfProxy: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  cacheKey?: string,
  scale = 0.32
): Promise<string> {
  if (cacheKey && thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  const page = await pdfProxy.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context could not be created');
  }

  // Set crisp white background for transparency handling
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  if (cacheKey) {
    thumbnailCache.set(cacheKey, dataUrl);
  }

  // Cleanup
  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}

export function clearThumbnailCache() {
  thumbnailCache.clear();
}

export async function renderPageToImageBlob(
  pdfProxy: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  format: 'image/jpeg' | 'image/png',
  scale = 2.0,
  quality = 0.85
): Promise<Blob> {
  const page = await pdfProxy.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context could not be created');
  }

  // Crisp white background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  }).promise;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        canvas.width = 0;
        canvas.height = 0;
        if (blob) resolve(blob);
        else reject(new Error(`Failed to render page ${pageNumber} to image`));
      },
      format,
      format === 'image/jpeg' ? quality : undefined
    );
  });
}

export interface PageTextResult {
  pageNumber: number;
  text: string;
}

export async function extractTextFromPDF(
  pdfProxy: pdfjsLib.PDFDocumentProxy,
  onProgress?: (progress: number, status: string) => void
): Promise<PageTextResult[]> {
  const total = pdfProxy.numPages;
  const results: PageTextResult[] = [];

  for (let i = 1; i <= total; i++) {
    const percent = Math.round((i / total) * 100);
    onProgress?.(percent, `Extracting text from page ${i} of ${total}...`);

    const page = await pdfProxy.getPage(i);
    const textContent = await page.getTextContent();

    let pageText = '';
    let currentY: number | null = null;

    for (const item of textContent.items) {
      if ('str' in item) {
        // Line-break estimation by transform matrix Y position or hasEOL
        const itemY = 'transform' in item ? item.transform[5] : null;
        if (currentY !== null && itemY !== null && Math.abs(itemY - currentY) > 8) {
          pageText += '\n';
        }
        pageText += item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ');
        currentY = itemY;
      }
    }

    // Clean up excessive whitespace
    const cleaned = pageText
      .split('\n')
      .map(line => line.trim())
      .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
      .join('\n')
      .trim();

    results.push({
      pageNumber: i,
      text: cleaned,
    });
  }

  return results;
}

export function mapToStandardFont(fontName: string): {
  family: 'Helvetica' | 'Times' | 'Courier';
  isBold: boolean;
  isItalic: boolean;
} {
  const lower = (fontName || '').toLowerCase();
  const isBold = lower.includes('bold') || lower.includes('black') || lower.includes('heavy') || lower.includes('semibold') || lower.includes('w7') || lower.includes('w8');
  const isItalic = lower.includes('italic') || lower.includes('oblique') || lower.includes('slanted');

  let family: 'Helvetica' | 'Times' | 'Courier' = 'Helvetica';
  if (
    lower.includes('times') ||
    lower.includes('serif') ||
    lower.includes('georgia') ||
    lower.includes('roman') ||
    lower.includes('palatino') ||
    lower.includes('garamond') ||
    lower.includes('minion')
  ) {
    family = 'Times';
  } else if (
    lower.includes('courier') ||
    lower.includes('mono') ||
    lower.includes('consolas') ||
    lower.includes('menlo') ||
    lower.includes('typewriter') ||
    lower.includes('code')
  ) {
    family = 'Courier';
  }

  return { family, isBold, isItalic };
}

interface ExtractedItem {
  idx: number;
  str: string;
  tx: number;
  ty: number;
  width: number;
  height: number;
  fontSize: number;
  font: { family: 'Helvetica' | 'Times' | 'Courier'; isBold: boolean; isItalic: boolean };
  rawFontName: string;
}

export async function extractPageTextBlocks(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number
): Promise<import('../types').ExistingTextBlock[]> {
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const unscaledHeight = unscaledViewport.height;

  const textContent = await page.getTextContent();
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return [];
  }

  const validItems: ExtractedItem[] = [];
  textContent.items.forEach((item, idx) => {
    if ('str' in item && typeof item.str === 'string' && item.str.length > 0 && Array.isArray(item.transform)) {
      const tx = item.transform[4];
      const ty = item.transform[5];
      const scaleX = item.transform[0];
      const fontSize = Math.round(Math.hypot(scaleX, item.transform[1])) || Math.round(item.height) || 12;
      const fontHeight = item.height > 0 ? item.height : fontSize;
      const styleInfo = textContent.styles?.[item.fontName];
      const rawFontName = (styleInfo?.fontFamily || item.fontName || '');
      const font = mapToStandardFont(rawFontName);

      validItems.push({
        idx,
        str: item.str,
        tx,
        ty,
        width: item.width,
        height: fontHeight,
        fontSize,
        font,
        rawFontName,
      });
    }
  });

  if (validItems.length === 0) return [];

  // Sort items from top of page downwards, then left-to-right
  validItems.sort((a, b) => {
    const diffY = b.ty - a.ty;
    if (Math.abs(diffY) > 3) {
      return diffY;
    }
    return a.tx - b.tx;
  });

  // Group into lines based on baseline ty proximity
  const lines: (typeof validItems)[] = [];
  let currentLine: typeof validItems = [];

  for (const it of validItems) {
    if (currentLine.length === 0) {
      currentLine.push(it);
    } else {
      const lineBaseline = currentLine[0].ty;
      const baselineDiff = Math.abs(it.ty - lineBaseline);
      const threshold = Math.max(3, currentLine[0].fontSize * 0.35);

      if (baselineDiff <= threshold) {
        currentLine.push(it);
      } else {
        lines.push(currentLine);
        currentLine = [it];
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const blocks: import('../types').ExistingTextBlock[] = [];
  let blockCounter = 1;

  for (const line of lines) {
    line.sort((a, b) => a.tx - b.tx);

    let segment: typeof line = [];

    const flushSegment = (seg: typeof line) => {
      if (seg.length === 0) return;
      let combinedStr = '';
      for (let i = 0; i < seg.length; i++) {
        const cur = seg[i];
        if (i > 0) {
          const prev = seg[i - 1];
          const gap = cur.tx - (prev.tx + prev.width);
          if (gap > cur.fontSize * 0.15 && !prev.str.endsWith(' ') && !cur.str.startsWith(' ')) {
            combinedStr += ' ';
          }
        }
        combinedStr += cur.str;
      }

      if (!combinedStr.trim()) return;

      const minX = seg[0].tx;
      const lastItem = seg[seg.length - 1];
      const maxX = lastItem.tx + lastItem.width;
      const width = Math.max(16, maxX - minX);
      const avgFontSize = Math.round(seg.reduce((s, c) => s + c.fontSize, 0) / seg.length);
      const maxFontHeight = Math.max(...seg.map(c => c.height || c.fontSize));
      const baselineY = seg[0].ty;

      // In top-left coordinates:
      const yTop = Math.max(0, unscaledHeight - baselineY - maxFontHeight * 0.88);
      const dominantFont = seg[0].font;

      blocks.push({
        id: `block-p${pageNumber}-${blockCounter++}`,
        originalText: combinedStr,
        x: Math.round(minX),
        y: Math.round(yTop),
        width: Math.round(width),
        height: Math.round(maxFontHeight * 1.15),
        baselineY: baselineY,
        fontSize: avgFontSize,
        fontFamily: dominantFont.family,
        color: '#000000',
        isBold: dominantFont.isBold,
        isItalic: dominantFont.isItalic,
        rawFontName: seg[0].rawFontName,
      });
    };

    for (let i = 0; i < line.length; i++) {
      const it = line[i];
      if (segment.length === 0) {
        segment.push(it);
      } else {
        const prev = segment[segment.length - 1];
        const gap = it.tx - (prev.tx + prev.width);
        if (gap > prev.fontSize * 2.8) {
          flushSegment(segment);
          segment = [it];
        } else {
          segment.push(it);
        }
      }
    }
    flushSegment(segment);
  }

  return blocks;
}

