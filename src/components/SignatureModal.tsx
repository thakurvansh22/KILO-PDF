import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Type,
  Upload,
  X,
  RotateCcw,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySignature: (dataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onApplySignature,
}) => {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [drawColor, setDrawColor] = useState('#000000');
  const [typedName, setTypedName] = useState('');
  const [typedFont, setTypedFont] = useState<'Dancing Script' | 'Caveat'>('Dancing Script');
  const [typedColor, setTypedColor] = useState('#0f172a');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);

  // Saved signatures in session
  const [savedSignatures, setSavedSignatures] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pdf_toolkit_signatures');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = drawColor;
          ctx.lineWidth = 2.5;
        }
      }
    }
  }, [isOpen, tab, drawColor]);

  if (!isOpen) return null;

  const saveSignatureToStorage = (dataUrl: string) => {
    const updated = [dataUrl, ...savedSignatures.filter(s => s !== dataUrl)].slice(0, 5);
    setSavedSignatures(updated);
    try {
      localStorage.setItem('pdf_toolkit_signatures', JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    lastPointRef.current = { x, y };

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = drawColor;
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearDrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Generate PNG from typed text
  const generateTypedSignatureDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `64px "${typedFont}", cursive`;
    ctx.fillStyle = typedColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(typedName.trim() || 'Signature', canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  const handleApply = () => {
    let finalDataUrl = '';

    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      finalDataUrl = canvas.toDataURL('image/png');
    } else if (tab === 'type') {
      if (!typedName.trim()) return;
      finalDataUrl = generateTypedSignatureDataUrl();
    } else if (tab === 'upload') {
      if (!uploadedDataUrl) return;
      finalDataUrl = uploadedDataUrl;
    }

    if (finalDataUrl) {
      saveSignatureToStorage(finalDataUrl);
      onApplySignature(finalDataUrl);
      onClose();
    }
  };

  const handleSelectSaved = (sig: string) => {
    onApplySignature(sig);
    onClose();
  };

  const handleDeleteSaved = (sig: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSignatures.filter(s => s !== sig);
    setSavedSignatures(updated);
    try {
      localStorage.setItem('pdf_toolkit_signatures', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Add Signature
              </h3>
              <p className="text-xs text-zinc-500">
                Draw, type, or upload your signature to place on the PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700 text-xs">
            <button
              type="button"
              onClick={() => setTab('draw')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                tab === 'draw'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>(a) Draw</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('type')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                tab === 'type'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>(b) Type</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                tab === 'upload'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>(c) Upload</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {tab === 'draw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Sign with mouse, trackpad, or finger below:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {['#000000', '#1e3a8a', '#dc2626'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDrawColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                          drawColor === c ? 'scale-125 border-zinc-900 dark:border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={clearDrawCanvas}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative touch-none">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px] cursor-crosshair block"
                />
                <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-zinc-400 font-mono">
                  Sign here ✍️
                </div>
              </div>
            </div>
          )}

          {tab === 'type' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Type Your Full Name:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-600 dark:text-zinc-400 font-semibold">
                    Handwriting Font:
                  </label>
                  <select
                    value={typedFont}
                    onChange={e => setTypedFont(e.target.value as 'Dancing Script' | 'Caveat')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="Dancing Script">Dancing Script</option>
                    <option value="Caveat">Caveat</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-600 dark:text-zinc-400 font-semibold">
                    Ink Color:
                  </label>
                  <select
                    value={typedColor}
                    onChange={e => setTypedColor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="#0f172a">Classic Black</option>
                    <option value="#1e3a8a">Navy Blue</option>
                    <option value="#334155">Dark Slate</option>
                  </select>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center min-h-[100px]">
                <span
                  style={{
                    fontFamily: `"${typedFont}", cursive`,
                    color: typedColor,
                  }}
                  className="text-4xl text-center select-none"
                >
                  {typedName.trim() || 'Your Signature'}
                </span>
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Upload image of your signature (PNG with transparent background recommended):
              </label>

              <div
                onClick={() => {
                  const input = document.getElementById('signature-file-input') as HTMLInputElement;
                  input?.click();
                }}
                className="cursor-pointer border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 rounded-xl p-6 text-center bg-zinc-50 dark:bg-zinc-950 transition-colors"
              >
                <input
                  id="signature-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setUploadedDataUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {uploadedDataUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={uploadedDataUrl}
                      alt="Uploaded Signature"
                      className="max-h-24 max-w-full object-contain"
                    />
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      Click to choose another image
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <Upload className="w-7 h-7 text-zinc-400" />
                    <span className="text-xs font-semibold">Click to browse or drop signature image</span>
                    <span className="text-[10px] text-zinc-400">PNG, JPG, or WEBP</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Saved Signatures in Session */}
          {savedSignatures.length > 0 && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Saved Signatures:</span>
              </span>

              <div className="grid grid-cols-3 gap-2">
                {savedSignatures.map((sig, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSaved(sig)}
                    className="group relative p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 cursor-pointer transition-all flex items-center justify-center min-h-[60px]"
                  >
                    <img
                      src={sig}
                      alt={`Signature ${idx + 1}`}
                      className="max-h-10 max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={e => handleDeleteSaved(sig, e)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-white dark:bg-zinc-700 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete saved signature"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};
