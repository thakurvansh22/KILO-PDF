import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Send,
  ArrowLeft,
  User,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { AdSlot } from '../components/AdSlot';

const OWNER_EMAIL = 'Vanshthakur50568@gmail.com';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [launchedMail, setLaunchedMail] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please complete all fields before sending your message.');
      return;
    }

    const bodyLines = [
      `Name: ${name.trim()}`,
      `Reply Email: ${email.trim()}`,
      '',
      message.trim(),
    ].join('\n');

    const mailtoHref = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(
      subject.trim()
    )}&body=${encodeURIComponent(bodyLines)}`;

    setLaunchedMail(true);
    window.location.href = mailtoHref;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-20">
      <SEO
        title="Contact Us – Kilopdf"
        description="Get in touch with Vansh Thakur regarding Kilopdf support, bug reports, feature requests, or privacy inquiries."
        path="/contact"
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
          Contact Us
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-2xl">
          Have a question, bug report, or suggestion for a new PDF tool? Reach out directly by email or use the form below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Direct Email Card */}
        <div className="md:col-span-5 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Direct Email</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Maintained by Vansh Thakur</p>
            </div>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            You can email us directly for support, partnership inquiries, or feedback about any tool on Kilopdf:
          </p>

          <a
            href={`mailto:${OWNER_EMAIL}`}
            className="flex items-center gap-2.5 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs break-all hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>{OWNER_EMAIL}</span>
          </a>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Note on Document Support:</p>
            <p className="leading-relaxed">
              Because all PDFs are processed locally on your device, we never have access to your files. If reporting an issue, please describe the PDF type and steps to reproduce.
            </p>
          </div>
        </div>

        {/* Mailto Contact Form */}
        <div className="md:col-span-7 p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-white">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            <span>Send a Message</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {launchedMail && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                Your email app has been opened with your message addressed to{' '}
                <strong>{OWNER_EMAIL}</strong>. Hit Send in your mail client to complete delivery.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                  Your Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                  Your Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-subject" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Feature request or feedback"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Open Email App & Send</span>
            </button>
          </form>
        </div>
      </div>

      <AdSlot slotId="contact-bottom" format="banner" />
    </div>
  );
};
