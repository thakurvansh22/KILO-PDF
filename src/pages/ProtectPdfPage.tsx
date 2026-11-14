import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { encryptPDF, EncryptPDFOptions } from '@pdfsmaller/pdf-encrypt-lite';
import {
  Lock,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Download,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Printer,
  Copy,
  Edit3,
  FileText,
  KeyRound,
  Check,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { SEO } from '../components/SEO';
import { ToolPageFooter } from '../components/ToolPageFooter';
import { TOOL_GUIDES } from '../data/toolGuides';
import { formatBytes, readPdfFile, createSamplePDF } from '../utils/pdfUtils';
import { getPdfDocumentProxy, clearThumbnailCache } from '../utils/pdfViewer';

interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Too Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
}

function calculatePasswordStrength(pass: string): PasswordStrength {
  if (!pass) return { score: 0, label: 'Too Weak', color: 'bg-zinc-300 dark:bg-zinc-700' };

  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
  if (/\d/.test(pass)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3 || score === 4) return { score: 3, label: 'Good', color: 'bg-blue-500' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
}

export const ProtectPdfPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  // Password Inputs
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Permissions
  const [allowPrinting, setAllowPrinting] = useState<boolean>(true);
  const [allowCopying, setAllowCopying] = useState<boolean>(true);
  const [allowModifying, setAllowModifying] = useState<boolean>(false);
  const [allowAnnotating, setAllowAnnotating] = useState<boolean>(false);

  // Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result States
  const [protectedData, setProtectedData] = useState<Uint8Array | null>(null);
  const [protectedFileName, setProtectedFileName] = useState<string>('');

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsLoadingFile(true);
    clearThumbnailCache();

    try {
      const { pageCount: count } = await readPdfFile(file);
      await getPdfDocumentProxy(file);

      setSelectedFile(file);
      setPageCount(count);
      setProtectedData(null);
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setSelectedFile(null);
      setPageCount(0);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePDF('Confidential Financial Report', 3);
      await handleFileSelected([sample]);
    } catch {
      setErrorMessage('Failed to generate sample PDF.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleStartProtect = async () => {
    if (!selectedFile) return;

    if (!password) {
      setErrorMessage('Please enter a password to protect the document.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter both passwords.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);

      const options: EncryptPDFOptions = {
        allowPrinting,
        allowCopying,
        allowModifying,
        allowAnnotating,
        allowFillingForms: allowAnnotating,
      };

      // Perform RC4 128-bit encryption purely in the browser
      const encryptedBytes = await encryptPDF(pdfBytes, password, options);

      setProtectedData(encryptedBytes);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setProtectedFileName(`${baseName}_protected.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already encrypted') || msg.includes('ALREADY_ENCRYPTED')) {
        setErrorMessage('This PDF is already encrypted. Please unlock it first if you wish to change its password.');
      } else {
        setErrorMessage(`Failed to protect PDF: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!protectedData || !protectedFileName) return;
    const blob = new Blob([protectedData.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = protectedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPageCount(0);
    setPassword('');
    setConfirmPassword('');
    setProtectedData(null);
    setProtectedFileName('');
    setErrorMessage(null);
    setIsProcessing(false);
  };

  const strength = calculatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <SEO
        title={TOOL_GUIDES['protect-pdf'].seoTitle}
        description={TOOL_GUIDES['protect-pdf'].seoDescription}
        path={TOOL_GUIDES['protect-pdf'].route}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Protect PDF with Password
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Encrypt your document with 128-bit security so only recipients with the password can open and view it.
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

      {/* Critical Security Warning */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="space-y-0.5">
          <span className="font-bold text-amber-900 dark:text-amber-100">
            Important Security Notice:
          </span>
          <p className="text-[11px] leading-relaxed">
            If you forget the password, the file cannot be recovered. Ensure you securely store your password before encrypting.
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
            title="Select PDF file to protect"
            subtitle="Upload a PDF document to encrypt with password"
            sampleDocumentTitle="Confidential Report"
            disabled={isLoadingFile}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <ShieldCheck className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  RC4 128-bit Standard
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Standard PDF security algorithm recognized by all PDF readers (Adobe Acrobat, Chrome, Preview).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <KeyRound className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Permission Controls
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Granularly toggle printing, text/image copying, and editing permissions.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Zero Server Uploads
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Passwords and document bytes are processed strictly in browser memory. Never sent over network.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure Password & Permissions */}
      {selectedFile && !protectedData && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* File summary pill */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {formatBytes(selectedFile.size)} • {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </p>
              </div>
            </div>
          </div>

          {/* Password Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <KeyRound className="w-4 h-4 text-red-500" />
              <span>Set Document Password</span>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Password:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="pt-1.5 space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">Password strength:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1.5">
                    {[1, 2, 3, 4].map(idx => (
                      <div
                        key={idx}
                        className={`rounded-full transition-colors ${
                          idx <= strength.score ? strength.color : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Confirm Password:
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 ${
                    confirmPassword.length > 0 && confirmPassword !== password
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 focus:ring-red-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <p className="text-[11px] font-medium pt-0.5">
                  {passwordsMatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-red-500">Passwords do not match</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Permissions Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>Document Permissions</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure what authorized readers are permitted to do with this document:
            </p>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-zinc-500" />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Allow Printing
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Users can print copies of this PDF
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowPrinting}
                  onChange={e => setAllowPrinting(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 border-zinc-300 focus:ring-red-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-zinc-500" />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Allow Copying Content
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Users can select and copy text or graphics
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowCopying}
                  onChange={e => setAllowCopying(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 border-zinc-300 focus:ring-red-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-4 h-4 text-zinc-500" />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Allow Editing & Modifying
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Permits modifying document contents and structure
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowModifying}
                  onChange={e => setAllowModifying(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 border-zinc-300 focus:ring-red-500"
                />
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col items-center justify-center pt-2">
            <button
              type="button"
              onClick={handleStartProtect}
              disabled={isProcessing || !password || !passwordsMatch}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-red-600/40 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isProcessing ? 'Encrypting Document...' : 'Encrypt & Protect PDF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success & Download */}
      {protectedData && selectedFile && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                PDF Successfully Protected!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Your document is now encrypted with 128-bit password protection.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {protectedFileName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {formatBytes(protectedData.byteLength)} • Encrypted PDF
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-red-600/40 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Protected PDF</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Protect Another</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolPageFooter toolId="protect-pdf" />
    </div>
  );
};
