import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, FileUp, Sparkles, ShieldCheck } from 'lucide-react';
import { createSamplePDF } from '../utils/pdfUtils';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  showSampleOption?: boolean;
  sampleDocumentTitle?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  multiple = false,
  title = 'Select PDF files',
  subtitle = 'or drag and drop them here',
  disabled = false,
  showSampleOption = true,
  sampleDocumentTitle = 'Sample Document',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (droppedFiles.length > 0) {
        onFilesSelected(multiple ? droppedFiles : [droppedFiles[0]]);
      }
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(
        f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (files.length > 0) {
        onFilesSelected(multiple ? files : [files[0]]);
      }
      e.target.value = '';
    }
  };

  const handleLoadSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isGeneratingSample) return;
    try {
      setIsGeneratingSample(true);
      const sample = await createSamplePDF(sampleDocumentTitle, 4);
      onFilesSelected([sample]);
    } catch (err) {
      console.error('Failed to create sample PDF', err);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40'
            : isDragging
            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 scale-[1.01] shadow-lg shadow-indigo-500/10'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
              isDragging
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {isDragging ? <FileUp className="w-8 h-8 animate-bounce" /> : <Upload className="w-8 h-8" />}
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all">
            <Upload className="w-4 h-4" />
            <span>Choose {multiple ? 'PDF Files' : 'PDF File'}</span>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Files remain strictly offline in your browser memory</span>
          </div>
        </div>
      </div>

      {showSampleOption && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>No PDF file ready?</span>
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={disabled || isGeneratingSample}
            className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingSample ? 'Creating sample...' : 'Load generated sample PDF'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
