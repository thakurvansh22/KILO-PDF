import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Cookie, Cpu, Mail } from 'lucide-react';
import { SEO } from '../components/SEO';
import { AdSlot } from '../components/AdSlot';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-20">
      <SEO
        title="Privacy Policy – Kilopdf"
        description="Read Kilopdf's privacy policy. Documents are processed locally in your browser and never uploaded. Learn how third-party ad cookies work."
        path="/privacy-policy"
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
          Privacy Policy
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          Last updated: November 2026 • Site Owner: Vansh Thakur
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
          <strong>Zero-Upload Guarantee:</strong> All PDF files, images, and passwords you open in Kilopdf are processed strictly locally in your web browser. Your documents are never uploaded, transmitted, or stored on any server.
        </div>
      </div>

      <article className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span>1. Local Browser File Processing</span>
          </h2>
          <p>
            Kilopdf (operated by <strong>Vansh Thakur</strong>) is engineered as a 100% client-side web application. When you merge, split, compress, edit, convert, OCR, protect, or unlock documents, every operation takes place inside your device&apos;s RAM using browser APIs and WebAssembly. Because no files leave your browser, we cannot view, access, log, or retain copies of your documents or any passwords you enter.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            2. Local Preferences & Browser Storage
          </h2>
          <p>
            We may store basic interface preferences locally in your browser (such as your Light or Dark theme selection) using <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">localStorage</code>. This information stays on your device and is not used to track you across websites.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Cookie className="w-4 h-4 text-amber-500" />
            <span>3. Advertising & Third-Party Cookies (Google AdSense)</span>
          </h2>
          <p>
            To keep Kilopdf free for everyone, we may display advertisements served by third-party advertising partners, including <strong>Google AdSense</strong>. Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to this website or other websites on the internet.
          </p>
          <p>
            Google&apos;s use of advertising cookies enables it and its partners to serve ads to you based on your visit to our site and/or other sites on the Internet. You may opt out of personalized advertising by visiting{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Google Ads Settings
            </a>
            , or by opting out of third-party vendors&apos; use of cookies for personalized advertising at{' '}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              aboutads.info
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            4. External Language & Font Resources
          </h2>
          <p>
            Certain optional features—such as client-side OCR language models (Tesseract traineddata) or font character maps—may download static asset files directly into your browser cache from public CDNs. Your personal PDF files are never included in these requests.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            5. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy periodically to reflect improvements or legal requirements. Any revisions will be posted on this page with an updated revision date.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500" />
            <span>6. Contact Information</span>
          </h2>
          <p>
            If you have any questions regarding this Privacy Policy or how Kilopdf handles privacy, please contact <strong>Vansh Thakur</strong> at{' '}
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

      <AdSlot slotId="privacy-bottom" format="banner" />
    </div>
  );
};
