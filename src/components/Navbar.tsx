import React from 'react';
import { ShieldCheck, Sun, Moon, Share2, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onGoHome?: () => void;
  showHomeButton?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  onGoHome,
  showHomeButton = false,
}) => {
  return (
    <header className="app-nav sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Left Lockup */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {showHomeButton && onGoHome && (
            <button
              onClick={onGoHome}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 active:scale-95 cursor-pointer"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Home</span>
            </button>
          )}

          <div
            onClick={onGoHome}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ' ') && onGoHome) {
                e.preventDefault();
                onGoHome();
              }
            }}
          >
            <div className="brand-mark w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="brand-name text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent font-heading truncate">
                JSDR<span className="text-indigo-400 font-semibold ml-1">Share</span>
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 tracking-wider shrink-0">
                Zero Loss
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SHA-256 Bit-for-Bit</span>
          </div>

          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all duration-200 flex items-center justify-center active:scale-95 cursor-pointer"
            aria-label="Toggle Dark/Light Mode"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-fadeIn" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 animate-fadeIn" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
