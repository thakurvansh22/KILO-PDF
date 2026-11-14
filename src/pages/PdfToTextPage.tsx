import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileText,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Download,
  Search,
  ScanText,
  FileCheck2,
  Sparkles,
  AlignLeft,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressLoader } from '../components/ProgressLoader';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { formatBytes, readPdfFile, createSamplePDF } from '../utils/pdfUtils';
import { getPdfDocumentProxy, extractTextFromPDF, PageTextResult } from '../utils/pdfViewer';

export const PdfToTextPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [fileSize, setFileSize] = useState<number>(0);
  const [extractedPages, setExtractedPages] = useState<PageTextResult[]>([]);
  const [fullText, setFullText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Search in extracted text
  const [searchQuery, setSearchQuery] = useState('');

  // Execution states
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);
    setExtractedPages([]);
    setFullText('');

    try {
      const { pageCount: count } = await readPdfFile(file);
      const proxy = await getPdfDocumentProxy(file);

      setSelectedFile(file);
      setPageCount(count);
      setFileSize(file.size);

      // Start text extraction
      setIsExtracting(true);
      const results = await extractTextFromPDF(proxy, (prog, stat) => {
        setProgressPercent(prog);
        setProgressStatus(stat);
      });

      setExtractedPages(results);

      // Assemble unified text with clear page separators
      const unifiedText = results
        .map(
          p =>
            `--- Page ${p.pageNumber} of ${count} ---\n\n${
              p.text ? p.text : '[No selectable text found on this page]'
            }\n`
        )
        .join('\n');

      setFullText(unifiedText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setSelectedFile(null);
    } finally {
      setIsLoadingFile(false);
      setIsExtracting(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePDF('Demonstration Document with Text', 4);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate sample PDF.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedPages([]);
    setFullText('');
    setErrorMessage(null);
    setSearchQuery('');
  };

  const handleCopyToClipboard = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!fullText || !selectedFile) return;
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_extracted_text.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Text metrics
  const rawTextContent = extractedPages.map(p => p.text).join(' ').trim();
  const wordCount = rawTextContent ? rawTextContent.split(/\s+/).filter(Boolean).length : 0;
  const charCount = rawTextContent.length;

  // Scanned PDF detection
  const isScannedPdf = extractedPages.length > 0 && wordCount < 5 && charCount < 30;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={TOOL_GUIDES['pdf-to-text'].seoTitle}
        description={TOOL_GUIDES['pdf-to-text'].seoDescription}
        path={TOOL_GUIDES['pdf-to-text'].route}
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
              <span className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                <FileText className="w-6 h-6" />
              </span>
              <span>PDF to Text</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Extract raw text content from PDF pages with page separators, word counts, and TXT export.
            </p>
          </div>

          <PrivacyBanner compact />
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Error Extracting Text</span>
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

      {isExtracting ? (
        /* Progress View */
        <div className="py-12">
          <ProgressLoader
            progress={progressPercent}
            status={progressStatus}
            title="Extracting Text from PDF..."
          />
        </div>
      ) : !selectedFile ? (
        /* Dropzone Upload View */
        <div className="space-y-6">
          <FileDropzone
            multiple={false}
            title="Drop PDF file here to extract text"
            subtitle="Upload any text-based PDF to extract text and download as .txt"
            onFilesSelected={handleFileSelected}
            disabled={isLoadingFile}
            sampleDocumentTitle="Demonstration Document with Text"
          />

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingFile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Load demo PDF document to test text extraction</span>
            </button>
          </div>

          <PrivacyBanner />
        </div>
      ) : (
        /* Extracted Text Viewer Workspace */
        <div className="space-y-6">
          {/* Metadata & Actions Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                  {selectedFile.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {pageCount} Pages
                  </span>
                  <span>•</span>
                  <span className="font-mono">{formatBytes(fileSize)}</span>
                  <span>•</span>
                  <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">
                    {wordCount.toLocaleString()} words
                  </span>
                  <span>•</span>
                  <span className="font-mono text-zinc-500">
                    {charCount.toLocaleString()} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Copy, Download, Reset */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                disabled={!fullText}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-teal-500" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!fullText}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs shadow-teal-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New File</span>
              </button>
            </div>
          </div>

          {/* Scanned PDF Alert Banner */}
          {isScannedPdf && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 animate-in fade-in">
              <ScanText className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  This looks like a scanned PDF.
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  No digital selectable text was found inside this document. The pages appear to be scanned images.{' '}
                  <Link
                    to="/ocr"
                    className="font-bold underline text-amber-900 dark:text-amber-200 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1"
                  >
                    <span>Use the OCR Text Recognition tool →</span>
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Filter / Search within text */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Find in extracted text..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
            <div className="text-xs text-zinc-400">
              Showing {extractedPages.length} {extractedPages.length === 1 ? 'page' : 'pages'}
            </div>
          </div>

          {/* Scrollable Text Viewer Box */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-teal-500" />
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Text Content Preview</span>
              </div>
              <span className="font-mono text-[11px]">{selectedFile.name}</span>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto space-y-6 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 select-text whitespace-pre-wrap">
              {extractedPages.map(page => {
                const matchesSearch =
                  !searchQuery ||
                  page.text.toLowerCase().includes(searchQuery.toLowerCase());

                if (!matchesSearch) return null;

                return (
                  <div key={page.pageNumber} className="space-y-3 pb-6 border-b border-zinc-100 dark:border-zinc-800/80 last:border-0 last:pb-0">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[11px] select-none">
                      <span>--- Page {page.pageNumber} of {pageCount} ---</span>
                    </div>

                    <div className="pl-1">
                      {page.text ? (
                        searchQuery ? (
                          // Highlight matches
                          <span>
                            {page.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((chunk, idx) =>
                              chunk.toLowerCase() === searchQuery.toLowerCase() ? (
                                <mark
                                  key={idx}
                                  className="bg-yellow-200 dark:bg-yellow-900/80 text-zinc-900 dark:text-zinc-100 rounded px-0.5"
                                >
                                  {chunk}
                                </mark>
                              ) : (
                                chunk
                              )
                            )}
                          </span>
                        ) : (
                          page.text
                        )
                      ) : (
                        <span className="text-zinc-400 italic">[No text found on this page]</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="pdf-to-text" />
    </div>
  );
};
