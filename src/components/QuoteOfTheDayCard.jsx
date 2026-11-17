import React from 'react';
import { Quote } from 'lucide-react';
import { getDailyQuote } from '../data/dailyQuotes';

export default function QuoteOfTheDayCard({ className = '' }) {
  const quote = getDailyQuote();

  return (
    <div
      className={`relative pt-8 pb-6 px-6 sm:px-10 bg-slate-900/90 hover:bg-slate-900/95 dark:bg-black/95 dark:hover:bg-black border border-slate-700/60 dark:border-white/15 rounded-3xl shadow-xl backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      {/* 1. Top-Left Quote Bubble Badge */}
      <div
        className="absolute -top-5 left-6 sm:left-8 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-on-primary ring-4 ring-slate-900 dark:ring-black shadow-md flex items-center justify-center transition-transform hover:scale-105"
        title="Quote of the Day"
      >
        <Quote className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
      </div>

      {/* 2. Card Title & Divider Line */}
      <div className="text-center select-none">
        <h3 className="text-xs sm:text-sm md:text-base font-serif font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-blue-400 dark:text-blue-400">
          Quote of the Day
        </h3>
        <div className="w-full max-w-xs sm:max-w-md h-[1.5px] bg-blue-500/30 mx-auto mt-2.5 mb-4 rounded-full" />
      </div>

      {/* 3. Quote Body & Bottom-Right Author */}
      <div className="max-w-3xl mx-auto space-y-2">
        <blockquote className="text-sm sm:text-base md:text-lg font-medium text-slate-100 dark:text-slate-100 leading-relaxed italic text-center px-2 sm:px-4">
          &ldquo;{quote.text}&rdquo;
        </blockquote>

        {quote.author && (
          <div className="flex justify-end pr-2 sm:pr-4">
            <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-400 font-semibold tracking-wide">
              &mdash; {quote.author}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
