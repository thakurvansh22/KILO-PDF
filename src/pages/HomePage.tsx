import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Files,
  FileOutput,
  FileArchive,
  Image,
  FileImage,
  RotateCw,
  Lock,
  Unlock,
  Hash,
  Stamp,
  Layers,
  Sparkles,
  ArrowRight,
  Search,
  Shield,
  Zap,
  Globe,
  Trash2,
  FileText,
  FileEdit,
  FileType,
  BookOpen,
} from 'lucide-react';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { AdSlot } from '../components/AdSlot';
import { SEO } from '../components/SEO';
import { BLOG_POSTS } from '../data/blogPosts';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string;
  badge?: string;
  isAvailable: boolean;
  color: string;
}

const TOOLS: ToolItem[] = [
  {
    id: 'edit-pdf',
    title: 'Edit PDF & Sign',
    description: 'Add text annotations, insert images, and place hand-drawn or typed signatures on your pages.',
    icon: FileEdit,
    route: '/edit-pdf',
    badge: 'New',
    isAvailable: true,
    color: 'from-indigo-600 to-pink-600',
  },
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into one unified document with custom ordering.',
    icon: Files,
    route: '/merge',
    badge: 'Popular',
    isAvailable: true,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific page ranges (e.g. 1-3, 5) or separate all pages into a ZIP archive.',
    icon: FileOutput,
    route: '/split',
    badge: 'Popular',
    isAvailable: true,
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce PDF document file size with image rasterization or lossless stream compression.',
    icon: FileArchive,
    route: '/compress',
    badge: 'Popular',
    isAvailable: true,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) files with formatting.',
    icon: FileType,
    route: '/pdf-to-word',
    badge: 'Beta',
    isAvailable: true,
    color: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'pdf-to-img',
    title: 'PDF to Images',
    description: 'Convert PDF pages into high-resolution JPG or PNG images with ZIP export.',
    icon: Image,
    route: '/pdf-to-images',
    badge: 'Active',
    isAvailable: true,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'img-to-pdf',
    title: 'Images to PDF',
    description: 'Turn your JPG, PNG, and WEBP photos and scans into a clean PDF document.',
    icon: FileImage,
    route: '/images-to-pdf',
    badge: 'Active',
    isAvailable: true,
    color: 'from-pink-500 to-rose-600',
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to Text',
    description: 'Extract raw text, word and character counts, and export to formatted TXT file.',
    icon: FileText,
    route: '/pdf-to-text',
    badge: 'Active',
    isAvailable: true,
    color: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate individual pages or entire documents 90°, 180°, or 270° with visual thumbnails.',
    icon: RotateCw,
    route: '/rotate',
    badge: 'Active',
    isAvailable: true,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'delete',
    title: 'Delete Pages',
    description: 'Select and permanently remove unwanted pages with interactive thumbnail preview.',
    icon: Trash2,
    route: '/delete',
    badge: 'Active',
    isAvailable: true,
    color: 'from-rose-500 to-pink-600',
  },
  {
    id: 'reorder',
    title: 'Reorder Pages',
    description: 'Rearrange and organize pages in any order using intuitive drag-and-drop.',
    icon: Layers,
    route: '/reorder',
    badge: 'Active',
    isAvailable: true,
    color: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Encrypt documents with 128-bit security and custom permissions to prevent unauthorized viewing.',
    icon: Lock,
    route: '/protect-pdf',
    badge: 'Active',
    isAvailable: true,
    color: 'from-red-500 to-pink-600',
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Remove password restrictions and edit protections from your password-protected PDF files.',
    icon: Unlock,
    route: '/unlock-pdf',
    badge: 'Active',
    isAvailable: true,
    color: 'from-yellow-500 to-amber-600',
  },
  {
    id: 'numbering',
    title: 'Page Numbers',
    description: 'Insert dynamic page numbering, headers, and footers with custom placement.',
    icon: Hash,
    route: '/page-numbers',
    badge: 'Active',
    isAvailable: true,
    color: 'from-sky-500 to-cyan-600',
  },
  {
    id: 'watermark',
    title: 'Watermark',
    description: 'Stamp custom text or confidential logo watermarks across every page.',
    icon: Stamp,
    route: '/watermark',
    badge: 'Active',
    isAvailable: true,
    color: 'from-fuchsia-500 to-purple-600',
  },
  {
    id: 'ocr',
    title: 'OCR Text Recognition',
    description: 'Recognize text in scanned PDFs and images, export searchable PDFs or extract plain text.',
    icon: Sparkles,
    route: '/ocr',
    badge: 'New',
    isAvailable: true,
    color: 'from-teal-500 to-emerald-600',
  },
];

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = TOOLS.filter(tool =>
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Kilopdf',
    description:
      'Kilopdf is a free, privacy-first client-side PDF platform to merge, split, compress, OCR, edit, sign, convert, watermark, and protect PDFs locally in your browser.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    author: {
      '@type': 'Person',
      name: 'Vansh Thakur',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <div className="space-y-12 pb-16">
      <SEO
        title="Kilopdf — Free, Private & Client-Side PDF Tools"
        description="Kilopdf lets you merge, split, compress, OCR, edit, sign, convert, watermark, and protect PDFs 100% locally in your browser with zero server uploads."
        path="/"
        jsonLd={homeJsonLd}
      />
      {/* Hero Header */}
      <section className="text-center pt-8 md:pt-14 space-y-4 max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>100% Client-Side • Zero Server Uploads</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
          Every tool you need to work with{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 bg-clip-text text-transparent">
            PDFs privately.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl mx-auto">
          Merge, split, and manipulate PDF documents entirely within your browser memory.
          Fast, completely free, and guaranteed confidential.
        </p>

        {/* Quick Search */}
        <div className="pt-4 max-w-md mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PDF tools (e.g., merge, split)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Hero Banner Ad Slot */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slotId="home-hero-banner" format="banner" />
      </section>

      {/* Privacy Guarantee Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PrivacyBanner />
      </section>

      {/* Tools Grid + Desktop-only Sidebar Ad */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              All PDF Tools
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Select an active tool below to begin processing immediately
            </p>
          </div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Showing {filteredTools.length} tools
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTools.map(tool => {
            const Icon = tool.icon;

            if (tool.isAvailable && tool.route) {
              return (
                <Link
                  key={tool.id}
                  to={tool.route}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-500/80 dark:hover:border-indigo-500 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 transform hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {tool.badge && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {tool.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>Open tool</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            }

            // Disabled "Coming soon" card
            return (
              <div
                key={tool.id}
                className="relative flex flex-col justify-between p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 opacity-75 cursor-not-allowed select-none"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Coming soon
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                      {tool.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 line-clamp-3 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  <span>Under development</span>
                </div>
              </div>
            );
          })}
          </div>

          {/* Desktop-only Sidebar Ad Slot (hidden on mobile) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <AdSlot slotId="home-desktop-sidebar" format="sidebar" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white">Strict Local Privacy</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Documents are processed directly in your browser. Files never touch any server or cloud database, complying with strict enterprise privacy policies.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white">Blazing Fast Execution</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              No uploading or waiting for queue times. Client-side WebAssembly handles documents of any size with instant downloads.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white">Works Offline</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Once loaded, you can disconnect your internet and continue merging or splitting sensitive PDF files with zero disruption.
            </p>
          </div>
        </div>
      </section>

      {/* Guides & Tutorials Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Practical PDF Guides
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Learn best practices for merging, compressing, and converting documents locally
              </p>
            </div>
          </div>
          <Link
            to="/blog"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            <span>All articles</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BLOG_POSTS.map(post => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/80 dark:hover:border-indigo-500 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>{post.category}</span>
                  <span className="text-zinc-400 font-normal">{post.readTime}</span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-1">
                <span>Read guide</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
