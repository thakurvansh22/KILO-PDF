import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Calendar, Clock, ArrowLeft, Sparkles } from 'lucide-react';
import { BLOG_POSTS } from '../data/blogPosts';
import { SEO } from '../components/SEO';
import { AdSlot } from '../components/AdSlot';

export const BlogPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-20">
      <SEO
        title="PDF Guides & Tips Blog – Kilopdf"
        description="Read practical tutorials from Kilopdf on merging PDFs privately, compressing large scanned files, and converting PDF to Word in your browser."
        path="/blog"
      />

      <div className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Tools</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Kilopdf Blog
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Guides, privacy tips, and practical workflows for working with PDF documents in your browser.
            </p>
          </div>
        </div>
      </div>

      <AdSlot slotId="blog-index-banner" format="banner" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BLOG_POSTS.map(post => (
            <article
              key={post.slug}
              className="group flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{post.date}</span>
                </span>

                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Read article</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Desktop-only Sidebar */}
        <aside className="hidden lg:block space-y-6 sticky top-24">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Popular Tools</span>
            </div>
            <ul className="space-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <li>
                <Link to="/merge" className="hover:text-indigo-600 dark:hover:text-indigo-400 block py-1">
                  → Merge PDF Files
                </Link>
              </li>
              <li>
                <Link to="/compress" className="hover:text-indigo-600 dark:hover:text-indigo-400 block py-1">
                  → Compress PDF Size
                </Link>
              </li>
              <li>
                <Link to="/pdf-to-word" className="hover:text-indigo-600 dark:hover:text-indigo-400 block py-1">
                  → PDF to Word (Beta)
                </Link>
              </li>
              <li>
                <Link to="/ocr" className="hover:text-indigo-600 dark:hover:text-indigo-400 block py-1">
                  → OCR Text Recognition
                </Link>
              </li>
            </ul>
          </div>

          <AdSlot slotId="blog-index-sidebar" format="sidebar" />
        </aside>
      </div>
    </div>
  );
};
