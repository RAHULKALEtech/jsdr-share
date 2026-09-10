import React from 'react';
import { Upload, Download, QrCode, Lock, Zap, FileCheck, ArrowRight } from 'lucide-react';

interface HomeViewProps {
  onSelectSend: () => void;
  onSelectReceive: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectSend, onSelectReceive }) => {
  return (
    <div className="app-view max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center space-y-4 mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wider uppercase">
          <Zap className="w-3.5 h-3.5 text-indigo-400" /> Direct Device-to-Device Transfer
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] font-heading">
          Transfer Any File with <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Original 100% Quality
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed px-2">
          Zero compression, no quality loss, no limits. Share videos, photos, audio, and documents across any phone, tablet, or desktop using a secure <strong className="text-slate-200">5-digit code</strong> or <strong className="text-slate-200">QR scan</strong>.
        </p>
      </div>

      {/* Main Action Cards: SEND & RECEIVE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
        {/* SEND CARD */}
        <div
          onClick={onSelectSend}
          className="group relative cursor-pointer glass-card rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden border border-white/10 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.99]"
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectSend();
            }
          }}
        >
          {/* Background Glow Accent */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all" />

          <div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2.5 flex items-center justify-between font-heading">
              SEND
              <span className="text-indigo-400 text-xl group-hover:translate-x-1.5 transition-transform duration-300">
                <ArrowRight className="w-6 h-6" />
              </span>
            </h2>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              Upload multiple files of any format. Generate a secure 5-digit PIN and QR code to share instantly with any receiving device.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-indigo-300">
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              <FileCheck className="w-4 h-4 text-emerald-400" /> Bit-for-Bit Verified
            </span>
            <span className="px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25 group-hover:bg-indigo-500 transition-colors flex items-center gap-1">
              Select Files
            </span>
          </div>
        </div>

        {/* RECEIVE CARD */}
        <div
          onClick={onSelectReceive}
          className="group relative cursor-pointer glass-card rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden border border-white/10 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.99]"
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectReceive();
            }
          }}
        >
          {/* Background Glow Accent */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all" />

          <div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Download className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2.5 flex items-center justify-between font-heading">
              RECEIVE
              <span className="text-purple-400 text-xl group-hover:translate-x-1.5 transition-transform duration-300">
                <ArrowRight className="w-6 h-6" />
              </span>
            </h2>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              Scan the sender's QR code using your mobile camera or enter their 5-digit PIN code to view and download files.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-purple-300">
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              <QrCode className="w-4 h-4 text-purple-400" /> QR & 5-Digit PIN
            </span>
            <span className="px-4 py-2 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/25 group-hover:bg-purple-500 transition-colors flex items-center gap-1">
              Connect
            </span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-white/10 flex items-start gap-3.5 hover:border-white/20 transition-all">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5 font-heading">Zero Quality Loss</h4>
            <p className="text-xs text-slate-400 leading-relaxed">Original video resolution, frame rate, audio bitrates & metadata preserved.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 flex items-start gap-3.5 hover:border-white/20 transition-all">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5 font-heading">Secure Auto-Cleanup</h4>
            <p className="text-xs text-slate-400 leading-relaxed">Sessions expire after 30 mins. Files are automatically purged from storage.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 flex items-start gap-3.5 hover:border-white/20 transition-all">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5 font-heading">Large File Streaming</h4>
            <p className="text-xs text-slate-400 leading-relaxed">Chunked progressive uploads & streaming downloads without RAM overload.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
