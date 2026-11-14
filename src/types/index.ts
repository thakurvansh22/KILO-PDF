export interface PDFFileInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  previewUrl?: string;
  isEncrypted?: boolean;
}

export interface PageItem {
  id: string;
  originalIndex: number;
  pageNumber: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270
  selected?: boolean;
  sourceFileId?: string;
  sourceFileName?: string;
  isCopy?: boolean;
  sourceLabel?: string;
}

export type SplitMode = 'range' | 'all';

export interface SplitRangeResult {
  valid: boolean;
  pageIndices: number[]; // 0-indexed
  pageNumbers: number[]; // 1-indexed
  error?: string;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
}

export type PageSizeOption = 'a4' | 'letter' | 'fit';
export type OrientationOption = 'auto' | 'portrait' | 'landscape';
export type MarginOption = 'none' | 'small' | 'big';

export type EditorElementType = 'text' | 'image' | 'signature';
export type EditorTool = 'select' | 'editText' | 'text' | 'image' | 'signature';

export interface EditorElement {
  id: string;
  type: EditorElementType;
  x: number; // PDF points (distance from left)
  y: number; // PDF points (distance from top)
  width: number; // PDF points
  height: number; // PDF points
  text?: string;
  fontFamily?: 'Helvetica' | 'Times' | 'Courier';
  fontSize?: number;
  color?: string;
  isBold?: boolean;
  isItalic?: boolean;
  dataUrl?: string;
  aspectRatio?: number;
}

export interface ExistingTextBlock {
  id: string;
  originalText: string;
  x: number; // PDF points (distance from left)
  y: number; // PDF points (distance from top)
  width: number; // PDF points
  height: number; // PDF points
  baselineY: number; // PDF points from bottom of page
  fontSize: number;
  fontFamily: 'Helvetica' | 'Times' | 'Courier';
  color: string;
  isBold: boolean;
  isItalic: boolean;
  rawFontName?: string;
}

export interface ExistingTextEdit {
  id: string;
  blockId: string;
  originalText: string;
  newText: string;
  x: number; // PDF points
  y: number; // PDF points
  width: number; // PDF points
  height: number; // PDF points
  baselineY: number; // PDF points from bottom of page
  fontSize: number;
  fontFamily: 'Helvetica' | 'Times' | 'Courier';
  color: string;
  coverColor: string;
  isBold?: boolean;
  isItalic?: boolean;
}

export type WatermarkType = 'text' | 'image';
export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface WatermarkPercentPosition {
  xPercent: number; // 0 to 100 (% of page width from left)
  yPercent: number; // 0 to 100 (% of page height from top)
}

export interface WatermarkOptions {
  type: WatermarkType;
  // Text options
  text: string;
  fontFamily: 'Helvetica' | 'Times' | 'Courier';
  fontSize: number;
  color: string;
  isBold: boolean;
  // Image options
  imageFile?: File;
  imageDataUrl?: string;
  imageScalePercent: number; // 10 to 100
  // Common options
  opacity: number; // 0.05 to 1.0
  rotation: number; // degrees -180 to 180
  position: WatermarkPosition;
  positionMode?: 'preset' | 'custom';
  cornerMargin?: number;
  customPosition?: WatermarkPercentPosition;
  positionScope?: 'all' | 'per-page';
  positionsByPage?: Record<number, WatermarkPercentPosition>;
  isTiled: boolean;
  tileSpacing: number; // pt
  applyTo: 'all' | 'current' | 'custom';
  customRange?: string;
  layer: 'over' | 'under';
}

export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type PageNumberFormatPreset =
  | 'num' // "1"
  | 'page-num' // "Page 1"
  | 'page-num-total' // "Page 1 of N"
  | 'num-slash-total' // "1 / N"
  | 'custom';

export interface PageNumberOptions {
  position: PageNumberPosition;
  margin: number; // pt
  fontFamily: 'Helvetica' | 'Times' | 'Courier';
  fontSize: number;
  color: string;
  formatPreset: PageNumberFormatPreset;
  customFormat: string; // e.g. "Page {n} of {total}"
  startNumber: number;
  skipFirstPage: boolean;
  applyTo: 'all' | 'custom';
  customRange?: string;
  differentOddEven: boolean;
}

export type OCRQualityPreset = 'fast' | 'good' | 'best';

export interface OCROptions {
  languages: string[]; // e.g. ['eng'], ['hin'], ['pan']
  quality: OCRQualityPreset; // scale 1.5, 2.0, 3.0
  makeSearchablePdf: boolean;
  exportPlainText: boolean;
  copyToClipboard: boolean;
}

export type CompressMode = 'basic' | 'light';
export type CompressQualityLevel = 'low' | 'medium' | 'high' | 'custom';

export interface CompressOptions {
  mode: CompressMode;
  level: CompressQualityLevel;
  scale: number; // e.g. 1.0, 1.5, 2.0
  quality: number; // e.g. 0.4, 0.6, 0.8
}

export type PdfToWordMode = 'text-clean' | 'text-images' | 'page-image';

export interface PdfToWordOptions {
  mode: PdfToWordMode;
  pageRangeMode: 'all' | 'custom';
  customRange: string;
}

export interface ProtectPdfOptions {
  userPassword: string;
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowModifying: boolean;
  allowAnnotating: boolean;
  allowFillingForms: boolean;
}

export interface UnlockPdfResult {
  unlockedBytes: Uint8Array;
  method: 'direct' | 'rasterized-fallback';
}


