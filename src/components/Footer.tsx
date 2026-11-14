import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Cpu, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Privacy */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                K
              </div>
              <span className="font-bold text-zinc-900 dark:text-white tracking-tight">
                Kilopdf
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
              Free, private PDF manipulation utilities powered by local JavaScript and WebAssembly. Built by Vansh Thakur.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Your files never leave your browser. Zero cloud uploads.</span>
            </div>
          </div>

          {/* Popular Tools */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Popular Tools
            </h4>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link to="/edit-pdf" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium text-indigo-600 dark:text-indigo-400">
                  Edit PDF &amp; Sign
                </Link>
              </li>
              <li>
                <Link to="/merge" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link to="/split" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Split PDF
                </Link>
              </li>
              <li>
                <Link to="/compress" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Compress PDF
                </Link>
              </li>
              <li>
                <Link to="/pdf-to-word" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  PDF to Word
                </Link>
              </li>
              <li>
                <Link to="/ocr" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  OCR Text Recognition
                </Link>
              </li>
              <li>
                <Link to="/protect-pdf" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Protect &amp; Unlock PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Guides & Company */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Resources &amp; Legal
            </h4>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link to="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Blog &amp; Guides
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy & Tech Specs */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Privacy Architecture
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <li className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>100% Client-Side Engine</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Zero Storage / In-Memory only</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Privacy-first by design</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-4">
          <p>© {new Date().getFullYear()} Kilopdf by Vansh Thakur. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Contact
            </Link>
            <span className="inline-flex items-center gap-1">
              <span>Built for speed &amp; privacy</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline mx-0.5" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
