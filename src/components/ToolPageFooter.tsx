import React, { useState } from 'react';
import { HelpCircle, ListOrdered, ChevronDown } from 'lucide-react';
import { TOOL_GUIDES } from '../data/toolGuides';
import { AdSlot } from './AdSlot';

interface ToolPageFooterProps {
  toolId: string;
}

export const ToolPageFooter: React.FC<ToolPageFooterProps> = ({ toolId }) => {
  const guide = TOOL_GUIDES[toolId];
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!guide) return null;

  return (
    <section className="pt-8 mt-10 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-8">
      {/* Bottom Ad Banner (outside upload/processing area) */}
      <AdSlot slotId={`${toolId}-bottom-banner`} format="banner" />

      {/* Content + Desktop Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="space-y-8">
          {/* How to Use Section */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ListOrdered className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {guide.howToTitle}
              </h2>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {guide.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/80 flex items-start gap-3"
                >
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* FAQ Section */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
              {guide.faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.question} className="py-3.5 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 text-left py-1 cursor-pointer group"
                    >
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-indigo-500' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop-only Sidebar Ad Slot (hidden on mobile) */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <AdSlot slotId={`${toolId}-desktop-sidebar`} format="sidebar" />
          </div>
        </div>
      </div>
    </section>
  );
};
