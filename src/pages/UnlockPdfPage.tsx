import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt-lite';
import {
  Unlock,
  Lock,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Download,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  FileText,
  KeyRound,
  XCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { formatBytes } from '../utils/pdfUtils';
import { clearThumbnailCache } from '../utils/pdfViewer';

export const UnlockPdfPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCheckingEncryption, setIsCheckingEncryption] = useState<boolean>(false);
  const [isEncryptedFile, setIsEncryptedFile] = useState<boolean | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  // Password Input
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result States
  const [unlockedData, setUnlockedData] = useState<Uint8Array | null>(null);
  const [unlockedFileName, setUnlockedFileName] = useState<string>('');
  const [usedFallbackMethod, setUsedFallbackMethod] = useState<boolean>(false);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setPasswordError(null);
    setIsCheckingEncryption(true);
    setIsEncryptedFile(null);
    setUnlockedData(null);
    setPassword('');
    clearThumbnailCache();

    try {
      const buffer = await file.arrayBuffer();

      // Check whether PDF is password protected via pdfjs-dist
      let needsPassword = false;
      let count = 0;

      try {
        const loadingTask = pdfjsLib.getDocument({
          data: buffer,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
          cMapPacked: true,
        });

        const proxy = await loadingTask.promise;
        count = proxy.numPages;
        needsPassword = false;
      } catch (err: unknown) {
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        const errName = err instanceof Error ? err.name : '';
        if (
          errName === 'PasswordException' ||
          msg.includes('password') ||
          msg.includes('encrypted')
        ) {
          needsPassword = true;
        } else {
          throw err;
        }
      }

      setSelectedFile(file);
      setIsEncryptedFile(needsPassword);
      setPageCount(count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Could not read file: ${msg}`);
      setSelectedFile(null);
      setIsEncryptedFile(null);
    } finally {
      setIsCheckingEncryption(false);
    }
  };

  const handleStartUnlock = async () => {
    if (!selectedFile || !password) return;

    setPasswordError(null);
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressStatus('Verifying password...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdfBytes = new Uint8Array(buffer);

      // 1. Verify password validity using pdfjs-dist
      let authenticatedProxy: pdfjsLib.PDFDocumentProxy | null = null;
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: buffer.slice(0),
          password: password,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
          cMapPacked: true,
        });
        authenticatedProxy = await loadingTask.promise;
      } catch (authErr: unknown) {
        const msg = authErr instanceof Error ? authErr.message : String(authErr);
        const name = authErr instanceof Error ? authErr.name : '';
        if (
          name === 'PasswordException' ||
          msg.toLowerCase().includes('password') ||
          msg.toLowerCase().includes('incorrect')
        ) {
          setPasswordError('Wrong password. Please check and try again.');
          setIsProcessing(false);
          return;
        }
        throw authErr;
      }

      const totalPages = authenticatedProxy.numPages;
      setPageCount(totalPages);

      // 2. Attempt direct vector decryption via @pdfsmaller/pdf-decrypt-lite
      setProgressStatus('Decrypting document structure...');
      let decryptedBytes: Uint8Array | null = null;
      let usedFallback = false;

      try {
        decryptedBytes = await decryptPDF(pdfBytes, password);
        usedFallback = false;
      } catch (decryptErr) {
        console.warn('Direct RC4 decryption fallback engaged:', decryptErr);
        // Fallback: For AES-256 or proprietary encryption, reconstruct using authenticated pdfjs-dist canvas
        usedFallback = true;
      }

      if (usedFallback || !decryptedBytes) {
        setProgressStatus('Rebuilding unprotected document...');
        const newDoc = await PDFDocument.create();

        for (let i = 1; i <= totalPages; i++) {
          setProgressStatus(`Extracting page ${i} of ${totalPages}...`);
          const page = await authenticatedProxy.getPage(i);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const viewport = page.getViewport({ scale: 2.0 });

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

          const jpgBlob = await new Promise<Blob | null>(res =>
            canvas.toBlob(res, 'image/jpeg', 0.9)
          );

          canvas.width = 0;
          canvas.height = 0;

          if (!jpgBlob) throw new Error(`Failed to render page ${i}`);

          const imgBuffer = await jpgBlob.arrayBuffer();
          const embeddedJpg = await newDoc.embedJpg(new Uint8Array(imgBuffer));

          const origW = unscaledViewport.width;
          const origH = unscaledViewport.height;
          const newPage = newDoc.addPage([origW, origH]);
          newPage.drawImage(embeddedJpg, {
            x: 0,
            y: 0,
            width: origW,
            height: origH,
          });
        }

        decryptedBytes = await newDoc.save({ useObjectStreams: true });
      }

      setUnlockedData(decryptedBytes);
      setUsedFallbackMethod(usedFallback);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setUnlockedFileName(`${baseName}_unlocked.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to unlock PDF: ${msg}`);
      setUnlockedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!unlockedData || !unlockedFileName) return;
    const blob = new Blob([unlockedData.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = unlockedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIsEncryptedFile(null);
    setPageCount(0);
    setPassword('');
    setPasswordError(null);
    setUnlockedData(null);
    setUnlockedFileName('');
    setErrorMessage(null);
    setIsProcessing(false);
    setUsedFallbackMethod(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <SEO
        title={TOOL_GUIDES['unlock-pdf'].seoTitle}
        description={TOOL_GUIDES['unlock-pdf'].seoDescription}
        path={TOOL_GUIDES['unlock-pdf'].route}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <Unlock className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Unlock Password-Protected PDF
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Remove password restrictions from your document to save a clean, unencrypted copy.
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

      {/* Mandatory Decryption Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="space-y-0.5">
          <span className="font-bold text-amber-950 dark:text-amber-100">
            Important Authorization Notice:
          </span>
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            You must know the password. This tool cannot crack or bypass unknown passwords. It securely decrypts the document using your authorized credentials in your browser memory.
          </p>
        </div>
      </div>

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
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {!selectedFile && (
        <div className="space-y-6">
          <FileDropzone
            onFilesSelected={handleFileSelected}
            title="Select password-protected PDF to unlock"
            subtitle="Upload an encrypted PDF document to remove password restrictions"
            disabled={isCheckingEncryption}
            showSampleOption={false}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Client-Side Security
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Decryption occurs entirely in your browser. Passwords never travel across the internet.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <KeyRound className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Permanent Restriction Removal
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Saves a standard, unencrypted PDF that opens in any viewer without asking for a password.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Universal Compatibility
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Includes native RC4 decryption and visual page reconstruction fallback for high security files.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Inspection Result (Unprotected vs Protected) */}
      {selectedFile && !unlockedData && (
        <div className="max-w-xl mx-auto space-y-6">
          {/* File summary pill */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>

            {isEncryptedFile ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Lock className="w-3.5 h-3.5" />
                <span>Protected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Unprotected</span>
              </span>
            )}
          </div>

          {/* Case A: File is NOT password protected */}
          {isEncryptedFile === false && (
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-5 animate-in fade-in duration-200">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  This PDF is not password protected.
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  The document has no encryption or viewing restrictions applied. You can already open, read, edit, and print it freely.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Choose Another File</span>
                </button>
              </div>
            </div>
          )}

          {/* Case B: File IS password protected */}
          {isEncryptedFile === true && (
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Enter Password to Decrypt</span>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleStartUnlock();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Document Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      autoFocus
                      placeholder="Enter the PDF password"
                      className={`w-full pl-3.5 pr-10 py-3 rounded-xl border bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 ${
                        passwordError
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 focus:ring-amber-500/30'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {passwordError && (
                    <p className="text-xs font-semibold text-red-500 flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !password}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isProcessing ? progressStatus || 'Unlocking Document...' : 'Unlock Document'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Success & Download */}
      {unlockedData && selectedFile && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                PDF Successfully Unlocked!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                All password viewing restrictions have been removed.
              </p>
            </div>

            {usedFallbackMethod && (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-300 text-left">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                  Decrypted using page reconstruction:
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Because this PDF was protected with modern AES-256 encryption, the unlocked copy was rendered to crisp high-resolution images. Text will not be selectable.
                </span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {unlockedFileName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {formatBytes(unlockedData.byteLength)} • Unprotected PDF
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Unlocked PDF</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Unlock Another</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="unlock-pdf" />
    </div>
  );
};
