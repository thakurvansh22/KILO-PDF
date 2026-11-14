import * as pdfjsLib from 'pdfjs-dist';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Packer,
  PageOrientation,
} from 'docx';
import { PdfToWordMode } from '../types';

export interface ConvertProgressCallback {
  (current: number, total: number, status: string): void;
}

export interface ConvertResult {
  blob: Blob;
  isEmptyTextScan: boolean;
  totalExtractedCharacters: number;
}

interface TextItemInfo {
  str: string;
  vx: number; // Viewport X (from left, pt)
  vy: number; // Viewport Y (from top, pt)
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
}

interface LineInfo {
  vy: number;
  minVx: number;
  maxVx: number;
  items: TextItemInfo[];
  fullText: string;
  fontSize: number;
  isBold: boolean;
}

export async function convertPdfToWord(
  pdfProxy: pdfjsLib.PDFDocumentProxy,
  pageNumbers: number[],
  mode: PdfToWordMode,
  onProgress?: ConvertProgressCallback
): Promise<ConvertResult> {
  const sections: any[] = [];
  let totalExtractedCharacters = 0;
  const totalPages = pageNumbers.length;

  for (let idx = 0; idx < totalPages; idx++) {
    const pageNum = pageNumbers[idx];
    const progressCurrent = idx + 1;
    onProgress?.(
      progressCurrent,
      totalPages,
      `Processing page ${progressCurrent} of ${totalPages} (PDF Page ${pageNum})...`
    );

    const page = await pdfProxy.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const pageWidthPt = unscaledViewport.width;
    const pageHeightPt = unscaledViewport.height;

    // Convert PDF points to twips: 1 pt = 20 twips
    const pageWidthTwips = Math.round(pageWidthPt * 20);
    const pageHeightTwips = Math.round(pageHeightPt * 20);
    const isLandscape = pageWidthPt > pageHeightPt;

    if (mode === 'page-image') {
      // MODE C: Page as Image (Exact visual replica)
      onProgress?.(progressCurrent, totalPages, `Rendering page ${pageNum} image...`);
      const renderScale = 2.0;
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      const blob = await new Promise<Blob | null>(res =>
        canvas.toBlob(res, 'image/jpeg', 0.88)
      );

      // Memory release
      canvas.width = 0;
      canvas.height = 0;

      if (!blob) throw new Error(`Failed to render page ${pageNum} to image`);

      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // In Word, fit the image inside the page margins (margin = 360 twips = 18 pt = 0.25 inch)
      const marginPt = 18;
      const marginTwips = Math.round(marginPt * 20);
      const printableWidthPt = Math.max(100, pageWidthPt - marginPt * 2);
      const printableHeightPt = Math.max(100, pageHeightPt - marginPt * 2);

      const imageParagraph = new Paragraph({
        children: [
          new ImageRun({
            data: uint8,
            transformation: {
              width: printableWidthPt,
              height: printableHeightPt,
            },
            type: 'jpg',
          }),
        ],
      });

      sections.push({
        properties: {
          page: {
            size: {
              width: pageWidthTwips,
              height: pageHeightTwips,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: marginTwips,
              bottom: marginTwips,
              left: marginTwips,
              right: marginTwips,
            },
          },
        },
        children: [imageParagraph],
      });
    } else {
      // MODE A & B: Text extraction and structured document recreation
      onProgress?.(progressCurrent, totalPages, `Extracting text and layout from page ${pageNum}...`);
      const textContent = await page.getTextContent();
      const textItems: TextItemInfo[] = [];

      for (const item of textContent.items) {
        if ('str' in item && typeof item.str === 'string') {
          const str = item.str;
          if (!str.trim() && str !== ' ') continue;

          // Convert PDF coordinates to viewport coordinates (top-down)
          const tx = item.transform[4];
          const ty = item.transform[5];
          const [vx, vy] = unscaledViewport.convertToViewportPoint(tx, ty);

          // Calculate font size
          const fontHeight = Math.sqrt(
            item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]
          );
          const fontSize = Math.max(6, Math.round(fontHeight || item.height || 12));

          const fontName = ('fontName' in item && typeof item.fontName === 'string' ? item.fontName : '').toLowerCase();
          const isBold =
            fontName.includes('bold') ||
            fontName.includes('black') ||
            fontName.includes('heavy') ||
            fontName.includes('w7') ||
            fontName.includes('w8');
          const isItalic =
            fontName.includes('italic') ||
            fontName.includes('oblique') ||
            fontName.includes('slanted');

          textItems.push({
            str,
            vx,
            vy,
            width: item.width || 0,
            height: item.height || fontSize,
            fontSize,
            fontName,
            isBold,
            isItalic,
          });

          totalExtractedCharacters += str.trim().length;
        }
      }

      const paragraphs: Paragraph[] = [];

      if (textItems.length === 0) {
        // Page has no extractable text
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Page ${pageNum}: No selectable text detected]`,
                italics: true,
                color: '888888',
              }),
            ],
          })
        );
      } else {
        // Calculate median font size
        const sortedSizes = [...textItems.map(t => t.fontSize)].sort((a, b) => a - b);
        const medianFontSize = sortedSizes[Math.floor(sortedSizes.length / 2)] || 11;

        // Two-column layout detection:
        // Check if items cluster in two distinct X-regions with an empty center gutter
        let isTwoColumn = false;
        if (textItems.length >= 12) {
          const leftCluster = textItems.filter(t => t.vx + t.width < pageWidthPt * 0.48);
          const rightCluster = textItems.filter(t => t.vx > pageWidthPt * 0.52);
          const spanningItems = textItems.filter(
            t => t.vx < pageWidthPt * 0.45 && t.vx + t.width > pageWidthPt * 0.55
          );

          if (
            leftCluster.length >= 5 &&
            rightCluster.length >= 5 &&
            spanningItems.length <= 2 &&
            leftCluster.length + rightCluster.length >= textItems.length * 0.65
          ) {
            isTwoColumn = true;
          }
        }

        const buildParagraphsFromItems = (items: TextItemInfo[]): Paragraph[] => {
          if (items.length === 0) return [];

          // Group into lines by baseline Y with 3.5pt tolerance
          const lines: LineInfo[] = [];
          const sortedItems = [...items].sort((a, b) => {
            if (Math.abs(a.vy - b.vy) <= 3.5) {
              return a.vx - b.vx;
            }
            return a.vy - b.vy;
          });

          for (const it of sortedItems) {
            const existingLine = lines.find(l => Math.abs(l.vy - it.vy) <= 3.5);
            if (existingLine) {
              existingLine.items.push(it);
              existingLine.items.sort((a, b) => a.vx - b.vx);
              existingLine.minVx = Math.min(existingLine.minVx, it.vx);
              existingLine.maxVx = Math.max(existingLine.maxVx, it.vx + it.width);
              existingLine.fullText = existingLine.items.map(i => i.str).join(' ');
              existingLine.fontSize = Math.max(existingLine.fontSize, it.fontSize);
              if (it.isBold) existingLine.isBold = true;
            } else {
              lines.push({
                vy: it.vy,
                minVx: it.vx,
                maxVx: it.vx + it.width,
                items: [it],
                fullText: it.str,
                fontSize: it.fontSize,
                isBold: it.isBold,
              });
            }
          }

          // Sort lines top to bottom
          lines.sort((a, b) => a.vy - b.vy);

          const resultParas: Paragraph[] = [];
          let currentParagraphRuns: TextRun[] = [];
          let currentHeading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined = undefined;
          let currentIsBullet = false;
          let lastLineVy = -1;
          let lastLineHeight = 14;

          const flushParagraph = () => {
            if (currentParagraphRuns.length === 0) return;

            resultParas.push(
              new Paragraph({
                heading: currentHeading,
                bullet: currentIsBullet ? { level: 0 } : undefined,
                children: currentParagraphRuns,
                spacing: {
                  after: currentHeading ? 180 : 120, // Twips spacing after paragraph
                  line: 276, // 1.15 line spacing
                },
              })
            );

            currentParagraphRuns = [];
            currentHeading = undefined;
            currentIsBullet = false;
          };

          for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            const lineTextTrimmed = line.fullText.trim();
            if (!lineTextTrimmed) continue;

            const isHeading1 = line.fontSize >= medianFontSize * 1.6 || line.fontSize >= 20;
            const isHeading2 =
              !isHeading1 && (line.fontSize >= medianFontSize * 1.3 || (line.fontSize >= 15 && line.isBold));
            const isHeading3 =
              !isHeading1 && !isHeading2 && line.fontSize > medianFontSize * 1.15 && line.isBold;

            const headingToApply = isHeading1
              ? HeadingLevel.HEADING_1
              : isHeading2
              ? HeadingLevel.HEADING_2
              : isHeading3
              ? HeadingLevel.HEADING_3
              : undefined;

            // Detect list items: starts with •, -, *, 1., a)
            const isBulletLine =
              /^([•\-\*]|\d+[\.\)]|[a-zA-Z][\.\)])\s+/.test(lineTextTrimmed);

            // Vertical gap calculation
            const gap = lastLineVy >= 0 ? line.vy - lastLineVy : 0;
            const isNewParagraph =
              lastLineVy < 0 ||
              headingToApply !== undefined ||
              currentHeading !== undefined ||
              isBulletLine ||
              currentIsBullet ||
              gap > Math.max(18, lastLineHeight * 1.55);

            if (isNewParagraph && currentParagraphRuns.length > 0) {
              flushParagraph();
            }

            if (headingToApply) {
              currentHeading = headingToApply;
            }
            if (isBulletLine) {
              currentIsBullet = true;
            }

            // Convert line items to TextRuns
            let cleanLineText = lineTextTrimmed;
            if (isBulletLine) {
              // Strip the leading bullet character so Word's native bullet styling looks clean
              cleanLineText = cleanLineText.replace(/^([•\-\*]|\d+[\.\)]|[a-zA-Z][\.\)])\s+/, '');
            }

            // Add separator space between merged lines
            if (currentParagraphRuns.length > 0) {
              currentParagraphRuns.push(new TextRun({ text: ' ' }));
            }

            // If line has multiple font styles, create runs per item
            if (line.items.length > 1) {
              for (const it of line.items) {
                if (!it.str) continue;
                // In docx, size is in half-points (fontSizePt * 2)
                const runSize = Math.round(it.fontSize * 2);
                currentParagraphRuns.push(
                  new TextRun({
                    text: it.str,
                    bold: it.isBold,
                    italics: it.isItalic,
                    size: runSize,
                  })
                );
              }
            } else {
              const runSize = Math.round(line.fontSize * 2);
              currentParagraphRuns.push(
                new TextRun({
                  text: cleanLineText,
                  bold: line.isBold,
                  size: runSize,
                })
              );
            }

            lastLineVy = line.vy;
            lastLineHeight = line.fontSize;
          }

          flushParagraph();
          return resultParas;
        };

        if (isTwoColumn) {
          // Process header/banner items first, then Column 1 (Left), then Column 2 (Right)
          const headerItems = textItems.filter(
            t => t.vy < pageHeightPt * 0.22 && (t.width > pageWidthPt * 0.5 || t.fontSize >= medianFontSize * 1.3)
          );
          const col1Items = textItems.filter(
            t => !headerItems.includes(t) && t.vx + t.width * 0.5 < pageWidthPt * 0.5
          );
          const col2Items = textItems.filter(
            t => !headerItems.includes(t) && t.vx + t.width * 0.5 >= pageWidthPt * 0.5
          );

          paragraphs.push(...buildParagraphsFromItems(headerItems));
          paragraphs.push(...buildParagraphsFromItems(col1Items));
          paragraphs.push(...buildParagraphsFromItems(col2Items));
        } else {
          paragraphs.push(...buildParagraphsFromItems(textItems));
        }
      }

      // MODE B: If "Text + Images", also extract images and insert them
      if (mode === 'text-images') {
        try {
          onProgress?.(progressCurrent, totalPages, `Extracting embedded page images for page ${pageNum}...`);
          const opList = await page.getOperatorList();
          const imgIndexSet = new Set<string>();

          for (let i = 0; i < opList.fnArray.length; i++) {
            const fn = opList.fnArray[i];
            if (
              fn === pdfjsLib.OPS.paintImageXObject ||
              fn === pdfjsLib.OPS.paintInlineImageXObject ||
              fn === pdfjsLib.OPS.paintXObject
            ) {
              const imgName = opList.argsArray[i]?.[0];
              if (imgName && typeof imgName === 'string') {
                imgIndexSet.add(imgName);
              }
            }
          }

          for (const imgName of Array.from(imgIndexSet)) {
            try {
              // Retrieve image data from page object store
              const imgObj: any = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => resolve(null), 1200);
                try {
                  (page as any).objs.get(imgName, (obj: any) => {
                    clearTimeout(timeout);
                    resolve(obj);
                  });
                } catch {
                  clearTimeout(timeout);
                  resolve(null);
                }
              });

              if (imgObj && imgObj.width > 20 && imgObj.height > 20) {
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(imgObj.width, 1200);
                canvas.height = Math.min(imgObj.height, 1200);
                const ctx = canvas.getContext('2d');

                if (ctx) {
                  if (imgObj.bitmap || imgObj instanceof ImageBitmap) {
                    ctx.drawImage(imgObj.bitmap || imgObj, 0, 0, canvas.width, canvas.height);
                  } else if (imgObj.data) {
                    const imgData = ctx.createImageData(imgObj.width, imgObj.height);
                    if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                      imgData.data.set(imgObj.data);
                      ctx.putImageData(imgData, 0, 0);
                    } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                      for (let s = 0, d = 0; s < imgObj.data.length; s += 3, d += 4) {
                        imgData.data[d] = imgObj.data[s];
                        imgData.data[d + 1] = imgObj.data[s + 1];
                        imgData.data[d + 2] = imgObj.data[s + 2];
                        imgData.data[d + 3] = 255;
                      }
                      ctx.putImageData(imgData, 0, 0);
                    }
                  }

                  const imgBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
                  canvas.width = 0;
                  canvas.height = 0;

                  if (imgBlob) {
                    const ab = await imgBlob.arrayBuffer();
                    const uint8 = new Uint8Array(ab);
                    const maxDisplayW = Math.min(480, pageWidthPt - 72);
                    const displayW = Math.min(maxDisplayW, imgObj.width);
                    const displayH = Math.round(displayW * (imgObj.height / imgObj.width));

                    paragraphs.push(
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: uint8,
                            transformation: {
                              width: displayW,
                              height: Math.min(500, displayH),
                            },
                            type: 'png',
                          }),
                        ],
                        spacing: { before: 180, after: 180 },
                      })
                    );
                  }
                }
              }
            } catch {
              // Gracefully continue if an individual image can't be decoded
            }
          }
        } catch {
          // Continue document building without crashing
        }
      }

      // Add Word Section for this page
      const marginPt = 36; // 0.5 inch margins
      const marginTwips = Math.round(marginPt * 20);

      sections.push({
        properties: {
          page: {
            size: {
              width: pageWidthTwips,
              height: pageHeightTwips,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: marginTwips,
              bottom: marginTwips,
              left: marginTwips,
              right: marginTwips,
            },
          },
        },
        children: paragraphs,
      });
    }
  }

  onProgress?.(totalPages, totalPages, 'Compiling DOCX document package...');
  const doc = new Document({
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const isEmptyTextScan = mode !== 'page-image' && totalExtractedCharacters < 20;

  return {
    blob,
    isEmptyTextScan,
    totalExtractedCharacters,
  };
}
