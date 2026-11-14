import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { BLOG_POSTS } from '../data/blogPosts';
import { SEO } from '../components/SEO';
import { AdSlot } from '../components/AdSlot';

export const BlogArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const otherPosts = BLOG_POSTS.filter(p => p.slug !== post.slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-20">
      <SEO
        title={post.seoTitle}
        description={post.seoDescription}
        path={`/blog/${post.slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.seoDescription,
          author: {
            '@type': 'Person',
            name: 'Vansh Thakur',
          },
        }}
      />

      <div>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Articles</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <article className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8">
          <header className="space-y-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              {post.category}
            </span>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>By Vansh Thakur</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{post.date}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.readTime}</span>
              </span>
            </div>
          </header>

          <div className="space-y-6 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {post.sections.map((section, idx) => (
              <section key={idx} className="space-y-3">
                {section.heading && (
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white pt-2">
                    {section.heading}
                  </h2>
                )}

                {section.paragraphs.map((para, pIdx) => (
                  <p key={pIdx}>{para}</p>
                ))}

                {section.bullets && (
                  <ul className="space-y-2 pl-5 list-disc text-zinc-700 dark:text-zinc-300">
                    {section.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Try the related tool CTA */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Ready to try it yourself?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                All processing stays 100% locally inside your browser with zero uploads.
              </p>
            </div>

            <Link
              to={post.relatedTool.route}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors shrink-0"
            >
              <span>{post.relatedTool.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </article>

        {/* Desktop-only Sidebar */}
        <aside className="hidden lg:block space-y-6 sticky top-24">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>More Guides</span>
            </div>
            <ul className="space-y-3 text-xs">
              {otherPosts.map(other => (
                <li key={other.slug}>
                  <Link
                    to={`/blog/${other.slug}`}
                    className="font-semibold text-zinc-800 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 block leading-snug"
                  >
                    {other.title}
                  </Link>
                  <span className="text-[11px] text-zinc-400">{other.readTime}</span>
                </li>
              ))}
            </ul>
          </div>

          <AdSlot slotId={`blog-${post.slug}-sidebar`} format="sidebar" />
        </aside>
      </div>

      <AdSlot slotId={`blog-${post.slug}-bottom`} format="banner" />
    </div>
  );
};
