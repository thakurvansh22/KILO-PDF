import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import {
  SplitRangeResult,
  ImageItem,
  PageSizeOption,
  OrientationOption,
  MarginOption,
  EditorElement,
  ExistingTextEdit,
  WatermarkOptions,
  PageNumberOptions,
} from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export interface LoadedPDF {
  doc: PDFDocument;
  pageCount: number;
}

export async function readPdfFile(file: File): Promise<LoadedPDF> {
  const buffer = await file.arrayBuffer();
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    const pageCount = doc.getPageCount();
    return { doc, pageCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('encrypted') || message.toLowerCase().includes('password')) {
      throw new Error(`"${file.name}" is password-protected or encrypted. Please decrypt it first.`);
    }
    throw new Error(`Could not read "${file.name}". The file might be corrupted or not a valid PDF.`);
  }
}

export function parsePageRangeString(rangeStr: string, totalPages: number): SplitRangeResult {
  const trimmed = rangeStr.trim();
  if (!trimmed) {
    return {
      valid: false,
      pageIndices: [],
      pageNumbers: [],
      error: 'Please enter page numbers or ranges (e.g. 1-3, 5, 8-10)',
    };
  }

  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return {
      valid: false,
      pageIndices: [],
      pageNumbers: [],
      error: 'No valid page numbers found.',
    };
  }

  const selectedPages = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const bounds = part.split('-').map(b => b.trim());
      if (bounds.length !== 2) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          error: `Invalid range format: "${part}". Use "start-end" like "1-3".`,
        };
      }
      const start = parseInt(bounds[0], 10);
      const end = parseInt(bounds[1], 10);

      if (isNaN(start) || isNaN(end)) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          error: `Non-numeric values in range "${part}".`,
        };
      }

      if (start < 1) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          error: `Page numbers start at 1. Found: ${start}`,
        };
      }

      if (end > totalPages) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          error: `Page ${end} exceeds total pages (${totalPages}).`,
        };
      }

      const lower = Math.min(start, end);
      const upper = Math.max(start, end);
      for (let i = lower; i <= upper; i++) {
        selectedPages.add(i);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum)) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          error: `"${part}" is not a valid page number.`,
        };
      }
      if (pageNum < 1) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          error: `Page numbers must be 1 or greater. Found: ${pageNum}`,
        };
      }
      if (pageNum > totalPages) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          error: `Page ${pageNum} exceeds total document pages (${totalPages}).`,
        };
      }
      selectedPages.add(pageNum);
    }
  }

  const sortedPageNumbers = Array.from(selectedPages).sort((a, b) => a - b);
  const pageIndices = sortedPageNumbers.map(p => p - 1);

  if (pageIndices.length === 0) {
    return {
      valid: false,
      pageIndices: [],
      pageNumbers: [],
      error: 'No pages selected.',
    };
  }

  return {
    valid: true,
    pageIndices,
    pageNumbers: sortedPageNumbers,
  };
}

export const parsePageRange = parsePageRangeString;

export async function mergePDFs(
  files: File[],
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  if (files.length < 2) {
    throw new Error('Please select at least 2 PDF files to merge.');
  }

  onProgress?.(5, 'Initializing merge container...');
  const mergedPdf = await PDFDocument.create();

  const total = files.length;
  for (let i = 0; i < total; i++) {
    const file = files[i];
    const percent = Math.round(10 + ((i + 1) / total) * 75);
    onProgress?.(percent, `Reading and combining "${file.name}" (${i + 1} of ${total})...`);

    const buffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  onProgress?.(92, 'Finalizing merged document structure...');
  const mergedBytes = await mergedPdf.save();
  onProgress?.(100, 'Merge completed successfully!');

  return mergedBytes;
}

export async function extractPDFPages(
  file: File,
  pageIndices: number[],
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Reading source PDF...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });

  onProgress?.(45, `Extracting ${pageIndices.length} page(s)...`);
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcDoc, pageIndices);

  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  onProgress?.(85, 'Rendering extracted PDF...');
  const bytes = await newPdf.save();
  onProgress?.(100, 'Extraction complete!');

  return bytes;
}

export async function splitAllPagesToZip(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Loading PDF pages...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  const totalPages = srcDoc.getPageCount();

  const zip = new JSZip();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  for (let i = 0; i < totalPages; i++) {
    const percent = Math.round(15 + ((i + 1) / totalPages) * 70);
    onProgress?.(percent, `Extracting page ${i + 1} of ${totalPages}...`);

    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(copiedPage);

    const pageBytes = await singleDoc.save();
    const pageFileName = `${baseName}_page_${String(i + 1).padStart(3, '0')}.pdf`;
    zip.file(pageFileName, pageBytes);
  }

  onProgress?.(90, 'Compressing pages into ZIP archive...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.(100, 'ZIP archive created successfully!');
  return zipBlob;
}

export async function createSamplePDF(title: string = 'Sample Document', pageCount: number = 4): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const colors = [
    { r: 0.15, g: 0.35, b: 0.8 }, // Blue
    { r: 0.1, g: 0.6, b: 0.4 },  // Emerald
    { r: 0.8, g: 0.3, b: 0.1 },  // Coral
    { r: 0.5, g: 0.2, b: 0.7 },  // Purple
  ];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const color = colors[i % colors.length];

    // Top banner
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width: width,
      height: 100,
      color: rgb(color.r, color.g, color.b),
    });

    // Header Text
    page.drawText(title, {
      x: 40,
      y: height - 55,
      size: 24,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Page ${i + 1} of ${pageCount}`, {
      x: 40,
      y: height - 80,
      size: 13,
      font: font,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Body content
    page.drawText(`Kilopdf Demonstration Document`, {
      x: 40,
      y: height - 160,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.15),
    });

    const lines = [
      `This sample PDF was generated entirely inside your browser using pdf-lib.`,
      `Zero bytes were uploaded to any remote server or external cloud service.`,
      `Document Details:`,
      `• Section: Chapter ${i + 1} — Verification and Quality Assurance`,
      `• Created Timestamp: ${new Date().toLocaleTimeString()} (Client Local Time)`,
      `• Security: 100% Client-Side Sandbox`,
      `• Format: ISO 32000-1 Standard PDF`,
      ``,
      `Use this file to test merging multiple documents or splitting pages into ranges or ZIP files.`,
    ];

    let currentY = height - 200;
    for (const line of lines) {
      page.drawText(line, {
        x: 40,
        y: currentY,
        size: 12,
        font: line.startsWith('•') ? font : line.startsWith('Document') ? boldFont : font,
        color: rgb(0.25, 0.25, 0.3),
      });
      currentY -= 24;
    }

    // Watermark / Privacy stamp box
    page.drawRectangle({
      x: 40,
      y: 60,
      width: width - 80,
      height: 48,
      borderColor: rgb(0.8, 0.8, 0.85),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 1.0),
    });

    page.drawText(`100% PRIVATE • PROCESSED LOCALLY IN BROWSER • NO SERVER UPLOAD`, {
      x: 60,
      y: 80,
      size: 10,
      font: boldFont,
      color: rgb(0.2, 0.4, 0.8),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return new File([pdfBytes.buffer as ArrayBuffer], `${safeTitle}_${pageCount}p.pdf`, { type: 'application/pdf' });
}

export async function rotatePDF(
  file: File,
  rotations: Record<number, number>,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Reading PDF for rotation...');
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  const count = pdfDoc.getPageCount();

  onProgress?.(45, 'Applying page rotations...');
  for (let i = 0; i < count; i++) {
    const rot = rotations[i] || 0;
    if (rot !== 0) {
      const page = pdfDoc.getPage(i);
      const currentAngle = page.getRotation().angle;
      const newAngle = ((currentAngle + rot) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
    }
  }

  onProgress?.(85, 'Saving rotated document...');
  const bytes = await pdfDoc.save();
  onProgress?.(100, 'Rotation complete!');
  return bytes;
}

export async function deletePDFPages(
  file: File,
  indicesToDelete: number[],
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Loading document pages...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  const totalPages = srcDoc.getPageCount();

  const toDeleteSet = new Set(indicesToDelete);
  const keptIndices: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (!toDeleteSet.has(i)) {
      keptIndices.push(i);
    }
  }

  if (keptIndices.length === 0) {
    throw new Error('Cannot delete all pages. The resulting document must contain at least one page.');
  }

  onProgress?.(45, `Extracting ${keptIndices.length} remaining page(s)...`);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, keptIndices);

  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  onProgress?.(85, 'Rendering edited PDF...');
  const bytes = await newDoc.save();
  onProgress?.(100, 'Pages deleted successfully!');
  return bytes;
}

export async function reorderPDFPages(
  file: File,
  orderedIndices: number[],
  rotations?: Record<number, number>,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Loading PDF for page reordering...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });

  onProgress?.(45, `Arranging ${orderedIndices.length} page(s) in sequence...`);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, orderedIndices);

  for (let i = 0; i < copiedPages.length; i++) {
    const page = copiedPages[i];
    const origIndex = orderedIndices[i];
    if (rotations && rotations[origIndex] !== undefined && rotations[origIndex] !== 0) {
      const currentAngle = page.getRotation().angle;
      const newAngle = ((currentAngle + rotations[origIndex]) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
    }
    newDoc.addPage(page);
  }

  onProgress?.(85, 'Finalizing reordered document...');
  const bytes = await newDoc.save();
  onProgress?.(100, 'Reordering complete!');
  return bytes;
}

export interface PageSourceReference {
  file: File;
  pageIndex: number; // 0-indexed in source file
  rotation: number;
}

export async function buildCustomPDF(
  pages: PageSourceReference[],
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'Initializing document compiler...');
  const newDoc = await PDFDocument.create();

  // Cache loaded source documents so each file is parsed only once
  const loadedDocs = new Map<File, PDFDocument>();

  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const pageRef = pages[i];
    const percent = Math.round(15 + ((i + 1) / total) * 70);
    onProgress?.(percent, `Processing page ${i + 1} of ${total}...`);

    let srcDoc = loadedDocs.get(pageRef.file);
    if (!srcDoc) {
      const buffer = await pageRef.file.arrayBuffer();
      srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      loadedDocs.set(pageRef.file, srcDoc);
    }

    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageRef.pageIndex]);

    if (pageRef.rotation !== 0) {
      const currentAngle = copiedPage.getRotation().angle;
      const newAngle = ((currentAngle + pageRef.rotation) % 360 + 360) % 360;
      copiedPage.setRotation(degrees(newAngle));
    }

    newDoc.addPage(copiedPage);
  }

  onProgress?.(90, 'Finalizing document structure...');
  const bytes = await newDoc.save();
  onProgress?.(100, 'Document generated successfully!');
  return bytes;
}

export interface ImageToPDFOptions {
  pageSize: PageSizeOption;
  orientation: OrientationOption;
  margin: MarginOption;
}

async function prepareImageForPdf(
  imgItem: ImageItem
): Promise<{ type: 'jpg' | 'png'; bytes: Uint8Array; width: number; height: number }> {
  const isJpg =
    imgItem.file.type === 'image/jpeg' ||
    imgItem.name.toLowerCase().endsWith('.jpg') ||
    imgItem.name.toLowerCase().endsWith('.jpeg');
  const isPng =
    imgItem.file.type === 'image/png' ||
    imgItem.name.toLowerCase().endsWith('.png');

  // Convert to PNG on canvas if rotation is applied or if format is WEBP / other non-JPG/PNG
  if (imgItem.rotation !== 0 || (!isJpg && !isPng)) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const rad = (imgItem.rotation * Math.PI) / 180;
        const isSwap = imgItem.rotation % 180 !== 0;
        const canvas = document.createElement('canvas');
        canvas.width = isSwap ? img.height : img.width;
        canvas.height = isSwap ? img.width : img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('Failed to convert image via canvas'));
          blob.arrayBuffer().then(buf => {
            resolve({
              type: 'png',
              bytes: new Uint8Array(buf),
              width: canvas.width,
              height: canvas.height,
            });
          });
        }, 'image/png');
      };
      img.onerror = () => reject(new Error(`Failed to load image "${imgItem.name}"`));
      img.src = imgItem.previewUrl;
    });
  }

  // Pure JPG or PNG with 0 rotation
  const buf = await imgItem.file.arrayBuffer();
  return {
    type: isJpg ? 'jpg' : 'png',
    bytes: new Uint8Array(buf),
    width: imgItem.width,
    height: imgItem.height,
  };
}

export async function convertImagesToPDF(
  images: ImageItem[],
  options: ImageToPDFOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('Please select at least one image to convert.');
  }

  onProgress?.(5, 'Creating empty PDF document...');
  const pdfDoc = await PDFDocument.create();

  const marginValues: Record<MarginOption, number> = {
    none: 0,
    small: 20,
    big: 40,
  };
  const margin = marginValues[options.margin];

  const total = images.length;
  for (let i = 0; i < total; i++) {
    const item = images[i];
    const percent = Math.round(10 + ((i + 1) / total) * 75);
    onProgress?.(percent, `Processing image ${i + 1} of ${total}: "${item.name}"...`);

    const prep = await prepareImageForPdf(item);

    let embeddedImage;
    if (prep.type === 'jpg') {
      try {
        embeddedImage = await pdfDoc.embedJpg(prep.bytes);
      } catch {
        // Fallback to canvas PNG if embedding JPG fails (e.g. CMYK or unusual JPEG)
        const blob = new Blob([prep.bytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
        const dataUrl = URL.createObjectURL(blob);
        const fallbackPrep = await prepareImageForPdf({
          ...item,
          file: new File([prep.bytes.buffer as ArrayBuffer], 'fallback.png', { type: 'image/png' }),
          previewUrl: dataUrl,
          rotation: 0,
        });
        embeddedImage = await pdfDoc.embedPng(fallbackPrep.bytes);
        URL.revokeObjectURL(dataUrl);
      }
    } else {
      embeddedImage = await pdfDoc.embedPng(prep.bytes);
    }

    const imgWidth = prep.width;
    const imgHeight = prep.height;

    // Determine target page dimensions
    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'fit') {
      pageWidth = imgWidth + margin * 2;
      pageHeight = imgHeight + margin * 2;
    } else {
      const baseDims: Record<string, [number, number]> = {
        a4: [595.28, 841.89],
        letter: [612.00, 792.00],
      };
      const [stdW, stdH] = baseDims[options.pageSize] || baseDims.a4;

      // Orientation calculation
      let isLandscape = false;
      if (options.orientation === 'auto') {
        isLandscape = imgWidth > imgHeight;
      } else if (options.orientation === 'landscape') {
        isLandscape = true;
      }

      pageWidth = isLandscape ? Math.max(stdW, stdH) : Math.min(stdW, stdH);
      pageHeight = isLandscape ? Math.min(stdW, stdH) : Math.max(stdW, stdH);
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Available drawing area
    const availWidth = Math.max(1, pageWidth - margin * 2);
    const availHeight = Math.max(1, pageHeight - margin * 2);

    // Maintain aspect ratio
    const scaleFactor = Math.min(availWidth / imgWidth, availHeight / imgHeight);
    const drawWidth = imgWidth * scaleFactor;
    const drawHeight = imgHeight * scaleFactor;

    // Center image
    const x = margin + (availWidth - drawWidth) / 2;
    const y = margin + (availHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  onProgress?.(90, 'Finalizing images.pdf...');
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, 'Images converted to PDF successfully!');
  return pdfBytes;
}

function hexToRgbColor(hex: string = '#000000') {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function checkWinAnsiSafe(text: string): { safe: boolean; unsupportedChars: string[] } {
  const unsupported: string[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13 || (code >= 160 && code <= 255)) {
      continue;
    }
    const win1252Special = [
      0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160,
      0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
      0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178,
    ];
    if (win1252Special.includes(code)) continue;

    if (!unsupported.includes(ch)) {
      unsupported.push(ch);
    }
  }
  return { safe: unsupported.length === 0, unsupportedChars: unsupported };
}

export function sanitizeForStandardFont(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\x7F\xA0-\xFF]/g, '?');
}

export async function compileEditedPDF(
  sourceFile: File,
  elementsByPage: Record<number, EditorElement[]>,
  textEditsByPage: Record<number, Record<string, ExistingTextEdit>> = {},
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'Loading base document...');
  const buffer = await sourceFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });

  onProgress?.(25, 'Embedding standard typography fonts...');
  const fonts = {
    helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    helveticaOblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    helveticaBoldOblique: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),

    times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    timesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    timesItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    timesBoldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),

    courier: await pdfDoc.embedFont(StandardFonts.Courier),
    courierBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    courierOblique: await pdfDoc.embedFont(StandardFonts.CourierOblique),
    courierBoldOblique: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
  };

  const getFontToUse = (fontFamily?: string, isBold?: boolean, isItalic?: boolean) => {
    const fam = (fontFamily || 'Helvetica').toLowerCase();
    if (fam.includes('times')) {
      if (isBold && isItalic) return fonts.timesBoldItalic;
      if (isBold) return fonts.timesBold;
      if (isItalic) return fonts.timesItalic;
      return fonts.times;
    }
    if (fam.includes('courier')) {
      if (isBold && isItalic) return fonts.courierBoldOblique;
      if (isBold) return fonts.courierBold;
      if (isItalic) return fonts.courierOblique;
      return fonts.courier;
    }
    // Default: Helvetica
    if (isBold && isItalic) return fonts.helveticaBoldOblique;
    if (isBold) return fonts.helveticaBold;
    if (isItalic) return fonts.helveticaOblique;
    return fonts.helvetica;
  };

  const pageCount = pdfDoc.getPageCount();

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const pageNumber = pageIdx + 1;
    const elements = elementsByPage[pageNumber] || [];
    const textEditsMap = textEditsByPage[pageNumber] || {};
    const textEdits = Object.values(textEditsMap);

    if (elements.length === 0 && textEdits.length === 0) continue;

    const percent = Math.round(30 + (pageNumber / pageCount) * 55);
    onProgress?.(percent, `Processing modifications on page ${pageNumber} of ${pageCount}...`);

    const page = pdfDoc.getPage(pageIdx);
    const { height: pageHeight } = page.getSize();

    // 1. Process Existing Text Edits first: Draw covering rectangle + new text
    for (const edit of textEdits) {
      const pad = 2; // slightly padded
      const rectY = pageHeight - edit.y - edit.height - pad;
      const rectX = Math.max(0, edit.x - pad);
      const rectW = edit.width + pad * 2;
      const rectH = edit.height + pad * 2;
      const coverColor = hexToRgbColor(edit.coverColor || '#ffffff');

      // Draw cover rectangle over the original text area
      page.drawRectangle({
        x: rectX,
        y: Math.max(0, rectY),
        width: rectW,
        height: rectH,
        color: coverColor,
      });

      // Draw replacement text if not empty
      if (edit.newText && edit.newText.trim().length > 0) {
        const fontToUse = getFontToUse(edit.fontFamily, edit.isBold, edit.isItalic);
        const textColor = hexToRgbColor(edit.color || '#000000');
        const fontSize = Math.max(6, edit.fontSize || 12);
        const targetBaselineY = edit.baselineY !== undefined ? edit.baselineY : (rectY + pad + 2);

        let textToDraw = edit.newText;
        const { safe } = checkWinAnsiSafe(textToDraw);
        if (!safe) {
          textToDraw = sanitizeForStandardFont(textToDraw);
        }

        try {
          page.drawText(textToDraw, {
            x: edit.x,
            y: targetBaselineY,
            size: fontSize,
            font: fontToUse,
            color: textColor,
          });
        } catch {
          page.drawText(sanitizeForStandardFont(edit.newText), {
            x: edit.x,
            y: targetBaselineY,
            size: fontSize,
            font: fontToUse,
            color: textColor,
          });
        }
      }
    }

    // 2. Process added elements (Text, Images, Signatures)
    for (const el of elements) {
      // In PDF points: y from top => bottom-left origin: pageHeight - el.y - el.height
      const pdfX = el.x;
      const pdfY = pageHeight - el.y - el.height;

      if (el.type === 'text') {
        const text = el.text || '';
        if (!text.trim()) continue;

        const fontSize = Math.max(6, el.fontSize || 16);
        const fontToUse = getFontToUse(el.fontFamily, el.isBold, el.isItalic);
        const color = hexToRgbColor(el.color);

        const lines = text.split('\n');
        const lineHeight = fontSize * 1.25;

        // Start drawing from top line downwards
        let lineY = pdfY + el.height - fontSize;
        for (const line of lines) {
          if (line.length > 0) {
            let lineToDraw = line;
            const { safe } = checkWinAnsiSafe(lineToDraw);
            if (!safe) {
              lineToDraw = sanitizeForStandardFont(lineToDraw);
            }

            try {
              page.drawText(lineToDraw, {
                x: pdfX + 2,
                y: lineY,
                size: fontSize,
                font: fontToUse,
                color,
              });
            } catch {
              page.drawText(sanitizeForStandardFont(line), {
                x: pdfX + 2,
                y: lineY,
                size: fontSize,
                font: fontToUse,
                color,
              });
            }
          }
          lineY -= lineHeight;
        }
      } else if ((el.type === 'image' || el.type === 'signature') && el.dataUrl) {
        try {
          const bytes = dataUrlToUint8Array(el.dataUrl);
          const isJpg = el.dataUrl.startsWith('data:image/jpeg') || el.dataUrl.startsWith('data:image/jpg');

          let embeddedImg;
          if (isJpg) {
            try {
              embeddedImg = await pdfDoc.embedJpg(bytes);
            } catch {
              embeddedImg = await pdfDoc.embedPng(bytes);
            }
          } else {
            embeddedImg = await pdfDoc.embedPng(bytes);
          }

          page.drawImage(embeddedImg, {
            x: pdfX,
            y: pdfY,
            width: el.width,
            height: el.height,
          });
        } catch (imgErr) {
          console.error(`Failed to embed image on page ${pageNumber}`, imgErr);
        }
      }
    }
  }

  onProgress?.(92, 'Generating final document bytes...');
  const editedBytes = await pdfDoc.save();
  onProgress?.(100, 'Document edited successfully!');
  return editedBytes;
}

export function mapVisualToPdfCoords(
  visualX: number,
  visualY: number,
  pageWidth: number,
  pageHeight: number,
  rotationAngle: number,
  visualRotationDeg = 0
): { x: number; y: number; rotateDegrees: number } {
  const normRot = ((rotationAngle % 360) + 360) % 360;
  if (normRot === 90) {
    return {
      x: pageWidth - visualY,
      y: visualX,
      rotateDegrees: visualRotationDeg + 90,
    };
  }
  if (normRot === 180) {
    return {
      x: pageWidth - visualX,
      y: pageHeight - visualY,
      rotateDegrees: visualRotationDeg + 180,
    };
  }
  if (normRot === 270) {
    return {
      x: visualY,
      y: pageHeight - visualX,
      rotateDegrees: visualRotationDeg + 270,
    };
  }
  return {
    x: visualX,
    y: visualY,
    rotateDegrees: visualRotationDeg,
  };
}

export function getWatermarkVisualCenter(
  position: import('../types').WatermarkPosition,
  visualWidth: number,
  visualHeight: number,
  cornerMargin: number = 40
): { x: number; y: number } {
  const marginX = Math.max(10, Math.min(visualWidth * 0.45, cornerMargin));
  const marginY = Math.max(10, Math.min(visualHeight * 0.45, cornerMargin));

  const left = marginX;
  const centerX = visualWidth * 0.5;
  const right = visualWidth - marginX;

  const top = visualHeight - marginY;
  const centerY = visualHeight * 0.5;
  const bottom = marginY;

  switch (position) {
    case 'top-left':
      return { x: left, y: top };
    case 'top-center':
      return { x: centerX, y: top };
    case 'top-right':
      return { x: right, y: top };
    case 'center-left':
      return { x: left, y: centerY };
    case 'center':
      return { x: centerX, y: centerY };
    case 'center-right':
      return { x: right, y: centerY };
    case 'bottom-left':
      return { x: left, y: bottom };
    case 'bottom-center':
      return { x: centerX, y: bottom };
    case 'bottom-right':
      return { x: right, y: bottom };
    default:
      return { x: centerX, y: centerY };
  }
}

export async function applyWatermarkToPDF(
  file: File,
  options: WatermarkOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'Loading PDF document...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  const totalPages = srcDoc.getPageCount();

  // Determine target pages
  let targetIndices: number[] = [];
  if (options.applyTo === 'all') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  } else if (options.applyTo === 'current') {
    targetIndices = [0]; // default to first if not specified, caller can set customRange
  } else if (options.applyTo === 'custom' && options.customRange) {
    const rangeResult = parsePageRange(options.customRange, totalPages);
    if (!rangeResult.valid || rangeResult.pageIndices.length === 0) {
      throw new Error(rangeResult.error || 'Invalid page range specified for watermark.');
    }
    targetIndices = rangeResult.pageIndices;
  } else {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  }
  const targetSet = new Set(targetIndices);

  onProgress?.(25, 'Preparing watermark assets...');

  // Setup fonts or images on target doc
  let docToEdit = srcDoc;
  let newDocForUnder: PDFDocument | null = null;
  if (options.layer === 'under') {
    newDocForUnder = await PDFDocument.create();
    docToEdit = newDocForUnder;
  }

  // Load standard font if text watermark
  let font: import('pdf-lib').PDFFont | null = null;
  if (options.type === 'text') {
    const fam = options.fontFamily || 'Helvetica';
    if (fam === 'Times') {
      font = options.isBold
        ? await docToEdit.embedFont(StandardFonts.TimesRomanBold)
        : await docToEdit.embedFont(StandardFonts.TimesRoman);
    } else if (fam === 'Courier') {
      font = options.isBold
        ? await docToEdit.embedFont(StandardFonts.CourierBold)
        : await docToEdit.embedFont(StandardFonts.Courier);
    } else {
      font = options.isBold
        ? await docToEdit.embedFont(StandardFonts.HelveticaBold)
        : await docToEdit.embedFont(StandardFonts.Helvetica);
    }
  }

  // Load image if image watermark
  let embeddedImage: import('pdf-lib').PDFImage | null = null;
  if (options.type === 'image' && options.imageDataUrl) {
    const imgBytes = dataUrlToUint8Array(options.imageDataUrl);
    const isJpg =
      options.imageDataUrl.startsWith('data:image/jpeg') ||
      options.imageDataUrl.startsWith('data:image/jpg');
    if (isJpg) {
      try {
        embeddedImage = await docToEdit.embedJpg(imgBytes);
      } catch {
        embeddedImage = await docToEdit.embedPng(imgBytes);
      }
    } else {
      try {
        embeddedImage = await docToEdit.embedPng(imgBytes);
      } catch {
        embeddedImage = await docToEdit.embedJpg(imgBytes);
      }
    }
  }

  const textColor = hexToRgbColor(options.color || '#dc2626');
  const opacity = Math.max(0.05, Math.min(1.0, options.opacity ?? 0.3));
  const visualRotation = options.rotation ?? -45;

  // Sanitize text if text watermark
  let textToDraw = options.text || 'CONFIDENTIAL';
  const { safe } = checkWinAnsiSafe(textToDraw);
  if (!safe) {
    textToDraw = sanitizeForStandardFont(textToDraw);
  }

  onProgress?.(45, 'Applying watermarks to pages...');

  // Helper to draw watermark onto a given PDF page
  const drawWatermarkOnPage = (
    targetPage: import('pdf-lib').PDFPage,
    pageWidth: number,
    pageHeight: number,
    pageRotation: number,
    pageNumber: number
  ) => {
    // Visual dimensions (account for 90 or 270 degree rotation)
    const normRot = ((pageRotation % 360) + 360) % 360;
    const visualWidth = normRot === 90 || normRot === 270 ? pageHeight : pageWidth;
    const visualHeight = normRot === 90 || normRot === 270 ? pageWidth : pageHeight;

    // Determine watermark centers
    const centers: { x: number; y: number }[] = [];
    if (options.isTiled) {
      const spacing = Math.max(80, options.tileSpacing || 160);
      const cols = Math.ceil(visualWidth / spacing);
      const rows = Math.ceil(visualHeight / spacing);
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          centers.push({
            x: c * spacing + (spacing * 0.5) * (r % 2),
            y: r * spacing + spacing * 0.5,
          });
        }
      }
    } else if (options.positionMode === 'custom') {
      let xPct = 50;
      let yPct = 50;
      if (options.positionScope === 'per-page' && options.positionsByPage && options.positionsByPage[pageNumber]) {
        xPct = options.positionsByPage[pageNumber].xPercent;
        yPct = options.positionsByPage[pageNumber].yPercent;
      } else if (options.customPosition) {
        xPct = options.customPosition.xPercent;
        yPct = options.customPosition.yPercent;
      }
      // xPercent is % from visual left; yPercent is % from visual top
      const customVisualX = (xPct / 100) * visualWidth;
      const customVisualY = ((100 - yPct) / 100) * visualHeight;
      centers.push({ x: customVisualX, y: customVisualY });
    } else {
      centers.push(getWatermarkVisualCenter(options.position, visualWidth, visualHeight, options.cornerMargin ?? 40));
    }

    if (options.type === 'text' && font) {
      const fontSize = Math.max(10, options.fontSize || 50);
      const textWidth = font.widthOfTextAtSize(textToDraw, fontSize);
      const textHeight = font.heightAtSize(fontSize);
      const rad = (visualRotation * Math.PI) / 180;

      // Delta from text baseline/origin to its center in visual space
      const deltaX = (textWidth / 2) * Math.cos(rad) - (textHeight / 2) * Math.sin(rad);
      const deltaY = (textWidth / 2) * Math.sin(rad) + (textHeight / 2) * Math.cos(rad);

      for (const center of centers) {
        const visualOriginX = center.x - deltaX;
        const visualOriginY = center.y - deltaY;

        const pdfCoords = mapVisualToPdfCoords(
          visualOriginX,
          visualOriginY,
          pageWidth,
          pageHeight,
          pageRotation,
          visualRotation
        );

        targetPage.drawText(textToDraw, {
          x: pdfCoords.x,
          y: pdfCoords.y,
          size: fontSize,
          font,
          color: textColor,
          opacity,
          rotate: degrees(pdfCoords.rotateDegrees),
        });
      }
    } else if (options.type === 'image' && embeddedImage) {
      const scalePercent = Math.max(10, Math.min(100, options.imageScalePercent || 40));
      const targetWidth = (visualWidth * scalePercent) / 100;
      const aspect = embeddedImage.width / embeddedImage.height;
      const targetHeight = targetWidth / aspect;
      const rad = (visualRotation * Math.PI) / 180;

      const deltaX = (targetWidth / 2) * Math.cos(rad) - (targetHeight / 2) * Math.sin(rad);
      const deltaY = (targetWidth / 2) * Math.sin(rad) + (targetHeight / 2) * Math.cos(rad);

      for (const center of centers) {
        const visualOriginX = center.x - deltaX;
        const visualOriginY = center.y - deltaY;

        const pdfCoords = mapVisualToPdfCoords(
          visualOriginX,
          visualOriginY,
          pageWidth,
          pageHeight,
          pageRotation,
          visualRotation
        );

        targetPage.drawImage(embeddedImage, {
          x: pdfCoords.x,
          y: pdfCoords.y,
          width: targetWidth,
          height: targetHeight,
          opacity,
          rotate: degrees(pdfCoords.rotateDegrees),
        });
      }
    }
  };

  if (options.layer === 'under' && newDocForUnder) {
    // Reconstruct each page placing watermark under the embedded original page
    for (let i = 0; i < totalPages; i++) {
      const origPage = srcDoc.getPage(i);
      const { width: pWidth, height: pHeight } = origPage.getSize();
      const pRot = origPage.getRotation().angle;

      const [embeddedPage] = await newDocForUnder.embedPdf(srcDoc, [i]);
      const newPage = newDocForUnder.addPage([pWidth, pHeight]);
      newPage.setRotation(origPage.getRotation());

      if (targetSet.has(i)) {
        // Draw watermark FIRST
        drawWatermarkOnPage(newPage, pWidth, pHeight, pRot, i + 1);
      }

      // Draw original page ON TOP
      newPage.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        width: pWidth,
        height: pHeight,
      });

      const prog = Math.round(45 + ((i + 1) / totalPages) * 45);
      onProgress?.(prog, `Watermarking page ${i + 1} of ${totalPages}...`);
    }

    onProgress?.(95, 'Saving watermarked document...');
    const resultBytes = await newDocForUnder.save();
    onProgress?.(100, 'Watermark applied successfully!');
    return resultBytes;
  } else {
    // Layer 'over': draw directly on each page of srcDoc
    for (let i = 0; i < totalPages; i++) {
      if (targetSet.has(i)) {
        const page = srcDoc.getPage(i);
        const { width: pWidth, height: pHeight } = page.getSize();
        const pRot = page.getRotation().angle;
        drawWatermarkOnPage(page, pWidth, pHeight, pRot, i + 1);
      }
      const prog = Math.round(45 + ((i + 1) / totalPages) * 45);
      onProgress?.(prog, `Watermarking page ${i + 1} of ${totalPages}...`);
    }

    onProgress?.(95, 'Saving watermarked document...');
    const resultBytes = await srcDoc.save();
    onProgress?.(100, 'Watermark applied successfully!');
    return resultBytes;
  }
}

export async function applyPageNumbersToPDF(
  file: File,
  options: PageNumberOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'Loading PDF document...');
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  const totalPages = pdfDoc.getPageCount();

  onProgress?.(25, 'Loading typography fonts...');
  const fam = options.fontFamily || 'Helvetica';
  let font: import('pdf-lib').PDFFont;
  if (fam === 'Times') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  } else if (fam === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.Courier);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  // Determine target pages
  let targetIndices: number[] = [];
  if (options.applyTo === 'all') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  } else if (options.applyTo === 'custom' && options.customRange) {
    const rangeResult = parsePageRange(options.customRange, totalPages);
    if (!rangeResult.valid || rangeResult.pageIndices.length === 0) {
      throw new Error(rangeResult.error || 'Invalid page range specified for page numbers.');
    }
    targetIndices = rangeResult.pageIndices;
  } else {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  }
  const targetSet = new Set(targetIndices);

  const fontSize = Math.max(7, Math.min(32, options.fontSize || 11));
  const textColor = hexToRgbColor(options.color || '#000000');
  const margin = Math.max(5, options.margin || 25);
  const startNum = options.startNumber ?? 1;

  onProgress?.(45, 'Stamping page numbers...');

  for (let i = 0; i < totalPages; i++) {
    const pageNum1 = i + 1;

    // Check if skipped
    if (options.skipFirstPage && pageNum1 === 1) {
      continue;
    }
    if (!targetSet.has(i)) {
      continue;
    }

    // Calculate current number value
    const numValue = options.skipFirstPage
      ? i - 1 + startNum
      : i + startNum;

    // Format text
    let text = `${numValue}`;
    switch (options.formatPreset) {
      case 'num':
        text = `${numValue}`;
        break;
      case 'page-num':
        text = `Page ${numValue}`;
        break;
      case 'page-num-total':
        text = `Page ${numValue} of ${totalPages}`;
        break;
      case 'num-slash-total':
        text = `${numValue} / ${totalPages}`;
        break;
      case 'custom':
        text = (options.customFormat || '{n}')
          .replace(/{n}/g, String(numValue))
          .replace(/{total}/g, String(totalPages));
        break;
    }

    // WinAnsi safety check
    const { safe } = checkWinAnsiSafe(text);
    if (!safe) {
      text = sanitizeForStandardFont(text);
    }

    const page = pdfDoc.getPage(i);
    const { width: pWidth, height: pHeight } = page.getSize();
    const pRot = page.getRotation().angle;

    // Visual dimensions
    const normRot = ((pRot % 360) + 360) % 360;
    const visualWidth = normRot === 90 || normRot === 270 ? pHeight : pWidth;
    const visualHeight = normRot === 90 || normRot === 270 ? pWidth : pHeight;

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Determine position with odd/even flipping if enabled
    let pos = options.position;
    if (options.differentOddEven && pageNum1 % 2 === 0) {
      // Even page: mirror left <-> right
      if (pos === 'bottom-right') pos = 'bottom-left';
      else if (pos === 'bottom-left') pos = 'bottom-right';
      else if (pos === 'top-right') pos = 'top-left';
      else if (pos === 'top-left') pos = 'top-right';
    }

    let visualX = margin;
    let visualY = margin;

    switch (pos) {
      case 'bottom-center':
        visualX = (visualWidth - textWidth) / 2;
        visualY = margin;
        break;
      case 'bottom-right':
        visualX = visualWidth - margin - textWidth;
        visualY = margin;
        break;
      case 'bottom-left':
        visualX = margin;
        visualY = margin;
        break;
      case 'top-center':
        visualX = (visualWidth - textWidth) / 2;
        visualY = visualHeight - margin - textHeight;
        break;
      case 'top-right':
        visualX = visualWidth - margin - textWidth;
        visualY = visualHeight - margin - textHeight;
        break;
      case 'top-left':
        visualX = margin;
        visualY = visualHeight - margin - textHeight;
        break;
    }

    const pdfCoords = mapVisualToPdfCoords(
      visualX,
      visualY,
      pWidth,
      pHeight,
      pRot,
      0
    );

    page.drawText(text, {
      x: pdfCoords.x,
      y: pdfCoords.y,
      size: fontSize,
      font,
      color: textColor,
      rotate: degrees(pdfCoords.rotateDegrees),
    });

    const prog = Math.round(45 + ((i + 1) / totalPages) * 45);
    onProgress?.(prog, `Numbering page ${i + 1} of ${totalPages}...`);
  }

  onProgress?.(95, 'Saving numbered document...');
  const resultBytes = await pdfDoc.save();
  onProgress?.(100, 'Page numbers applied successfully!');
  return resultBytes;
}



