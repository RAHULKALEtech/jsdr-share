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
    <header className="app-nav sticky top-0 z-50 backdrop-blur-xl bg-opacity-70 border-b border-white/10 px-4 sm:px-8 py-3.5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showHomeButton && onGoHome && (
            <button
              onClick={onGoHome}
              className="nav-back mr-1 sm:mr-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </button>
          )}

          <div
            onClick={onGoHome}
            className="brand-lockup flex items-center space-x-3 cursor-pointer group"
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ' ') && onGoHome) {
                e.preventDefault();
                onGoHome();
              }
            }}
          >
            <div className="brand-mark w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="brand-name text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent font-heading">
                JSDR<span className="text-indigo-400 font-normal ml-1">Share</span>
              </span>
              <span className="hidden sm:inline-block ml-2.5 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 tracking-wider">
                Zero Compression
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="status-pill hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>SHA-256 Verified</span>
          </div>

          <button
            onClick={onToggleTheme}
            className="theme-toggle p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all duration-200"
            aria-label="Toggle Dark/Light Mode"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
