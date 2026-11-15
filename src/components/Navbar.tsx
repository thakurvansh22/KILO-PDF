import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Files, FileOutput, Moon, Sun, ShieldCheck, RotateCw, Trash2, Layers, Image as ImageIcon, FileImage, FileText, FileEdit, Stamp, Hash, Sparkles, FileArchive, FileType, Lock, Unlock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'All Tools' },
    { to: '/protect-pdf', label: 'Protect', icon: Lock },
    { to: '/unlock-pdf', label: 'Unlock', icon: Unlock },
    { to: '/pdf-to-word', label: 'PDF to Word', icon: FileType },
    { to: '/ocr', label: 'OCR', icon: Sparkles },
    { to: '/compress', label: 'Compress', icon: FileArchive },
    { to: '/edit-pdf', label: 'Edit & Sign', icon: FileEdit },
    { to: '/watermark', label: 'Watermark', icon: Stamp },
    { to: '/page-numbers', label: 'Page Numbers', icon: Hash },
    { to: '/merge', label: 'Merge', icon: Files },
    { to: '/split', label: 'Split', icon: FileOutput },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-lg tracking-tighter">K</span>
            </div>
            <div>
              <span className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Kilopdf
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  Private
                </span>
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100/70 dark:bg-zinc-900/70 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
            {navLinks.map(link => {
              const isActive = location.pathname === link.to;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions: Install App button + Privacy badge + Theme toggle */}
          <div className="flex items-center gap-2.5">
            <PWAInstallButton />

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Offline & Private</span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Dark/Light Mode"
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto py-2 px-3 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50 scrollbar-none">
        {navLinks.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};
