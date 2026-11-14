import React from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ArrowLeft, Mail } from 'lucide-react';
import { SEO } from '../components/SEO';
import { AdSlot } from '../components/AdSlot';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-20">
      <SEO
        title="Terms of Use – Kilopdf"
        description="Read the terms of use for Kilopdf, operated by Vansh Thakur. Free client-side PDF tools provided as-is in your browser."
        path="/terms"
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
          Terms of Use
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          Last updated: November 2026 • Site Owner: Vansh Thakur
        </p>
      </div>

      <article className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-500" />
            <span>1. Acceptance of Terms</span>
          </h2>
          <p>
            By accessing and using Kilopdf (owned and maintained by <strong>Vansh Thakur</strong>), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please discontinue using the website.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            2. Client-Side Service & Your Responsibility
          </h2>
          <p>
            All PDF manipulation tools—including merging, splitting, compressing, converting, editing, OCR, encrypting, and unlocking—run entirely inside your web browser. You retain 100% ownership and responsibility for the documents you process. You agree to use these tools lawfully and only on files you own or are authorized to modify.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            3. Backup & Data Loss Disclaimer
          </h2>
          <p>
            Although Kilopdf operates non-destructively in browser memory and creates new files for download, you are solely responsible for maintaining backups of important original files and passwords. For password-protected PDFs created with our Protect PDF tool, forgotten passwords cannot be recovered by us or anyone else.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            4. Disclaimer of Warranties
          </h2>
          <p>
            Kilopdf is provided free of charge on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, whether express or implied. While we strive for accuracy across all tools (including Beta features such as PDF to Word), we do not guarantee uninterrupted operation or exact layout reproduction for every PDF structure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            5. Limitation of Liability
          </h2>
          <p>
            In no event shall <strong>Vansh Thakur</strong> or Kilopdf be liable for any direct, indirect, incidental, or consequential damages arising from the use or inability to use the utilities provided on this site.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500" />
            <span>6. Contact</span>
          </h2>
          <p>
            Questions about these Terms of Use can be sent to <strong>Vansh Thakur</strong> at{' '}
            <a
              href="mailto:Vanshthakur50568@gmail.com"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Vanshthakur50568@gmail.com
            </a>
            .
          </p>
        </section>
      </article>

      <AdSlot slotId="terms-bottom" format="banner" />
    </div>
  );
};
