import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Cpu,
  ArrowRight,
  Lock,
  Sparkles,
  Mail,
  ArrowLeft,
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { AdSlot } from '../components/AdSlot';

const AVAILABLE_TOOLS = [
  { name: 'Edit PDF & Sign', route: '/edit-pdf', desc: 'Add text, edit existing lines, insert images, and place signatures.' },
  { name: 'Merge PDF', route: '/merge', desc: 'Combine multiple PDF documents into a single file in custom order.' },
  { name: 'Split PDF', route: '/split', desc: 'Extract custom page ranges or split every page into a ZIP archive.' },
  { name: 'Compress PDF', route: '/compress', desc: 'Reduce file size using image rasterization or lossless stream compression.' },
  { name: 'PDF to Word (Beta)', route: '/pdf-to-word', desc: 'Convert PDFs into editable Microsoft Word (.docx) files.' },
  { name: 'OCR Text Recognition', route: '/ocr', desc: 'Extract searchable text from scanned PDFs in English, Hindi, and Punjabi.' },
  { name: 'PDF to Images', route: '/pdf-to-images', desc: 'Render PDF pages into JPG or PNG images with ZIP download.' },
  { name: 'Images to PDF', route: '/images-to-pdf', desc: 'Convert JPG, PNG, and WEBP photos into clean PDF documents.' },
  { name: 'PDF to Text', route: '/pdf-to-text', desc: 'Extract raw text page by page with search and .txt export.' },
  { name: 'Rotate PDF', route: '/rotate', desc: 'Rotate individual pages or entire documents 90°, 180°, or 270°.' },
  { name: 'Delete Pages', route: '/delete', desc: 'Visually pick and permanently remove unwanted pages.' },
  { name: 'Reorder Pages', route: '/reorder', desc: 'Drag, swap, move to exact positions, or replace pages across PDFs.' },
  { name: 'Watermark PDF', route: '/watermark', desc: 'Add customizable text or image watermarks with drag-and-drop placement.' },
  { name: 'Page Numbers', route: '/page-numbers', desc: 'Insert dynamic numbering and headers/footers across pages.' },
  { name: 'Protect PDF', route: '/protect-pdf', desc: 'Encrypt PDFs with 128-bit password protection and permissions.' },
  { name: 'Unlock PDF', route: '/unlock-pdf', desc: 'Remove password restrictions using your authorized password.' },
];

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-20">
      <SEO
        title="About Kilopdf – Privacy-First Browser PDF Tools"
        description="Learn about Kilopdf, created by developer Vansh Thakur to provide fast, free, and 100% client-side PDF tools with zero server uploads."
        path="/about"
      />

      <div className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Tools</span>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          About Kilopdf
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-300 max-w-3xl leading-relaxed">
          A completely client-side, privacy-first suite of PDF utilities built so sensitive documents never have to leave your computer.
        </p>
      </div>

      {/* Developer Intro & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Meet the Creator</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Vansh Thakur • Developer</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Hi, I am <strong>Vansh Thakur</strong>, a software developer who built Kilopdf to make everyday document tasks fast, straightforward, and genuinely private. Every feature runs inside your web browser using modern JavaScript and WebAssembly, meaning your files stay on your device at all times.
          </p>
        </div>

        <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Why It Was Built</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Zero Uploads • Zero Paywalls</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Most online PDF websites ask you to upload tax forms, contracts, IDs, and resumes to remote cloud servers just to merge two pages or rotate a scan—often adding file-size caps, waiting queues, or watermarks. Kilopdf solves that by shifting 100% of the processing to local browser memory.
          </p>
        </div>
      </div>

      {/* Key Architecture Highlights */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-violet-50/60 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-200/60 dark:border-indigo-900/50 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Cpu className="w-4 h-4" />
            <span>In-Browser Processing</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Powered by pdf-lib, pdf.js, Tesseract.js, and docx directly on your device hardware.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <Lock className="w-4 h-4" />
            <span>Confidential by Design</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Because no documents leave your computer, you stay in full control of private and business files.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Completely Free</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            No account sign-ups, no daily task limits, and no hidden subscription traps.
          </p>
        </div>
      </div>

      {/* Complete List of Available Tools */}
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Available Tools ({AVAILABLE_TOOLS.length})
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Explore all active browser-based PDF tools included on Kilopdf:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_TOOLS.map(tool => (
            <Link
              key={tool.route}
              to={tool.route}
              className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group flex flex-col justify-between gap-2 shadow-xs"
            >
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                  <span>{tool.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Have feedback or a feature suggestion?
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Reach out anytime to Vansh Thakur at{' '}
            <a
              href="mailto:Vanshthakur50568@gmail.com"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Vanshthakur50568@gmail.com
            </a>
          </p>
        </div>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
        >
          <Mail className="w-4 h-4" />
          <span>Contact Us</span>
        </Link>
      </div>

      <AdSlot slotId="about-bottom" format="banner" />
    </div>
  );
};
