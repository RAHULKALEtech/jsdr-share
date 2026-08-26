import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Download, Eye, ShieldCheck, Clock, CheckSquare, Square, Package, ArrowLeft } from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';
import { formatBytes, formatTimeRemaining, formatHash, getFileTypeCategory } from '../utils/formatters';
import { getDownloadUrl, getZipDownloadUrl } from '../services/api';
import { notifyReceiverAction } from '../services/socket';

interface FileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  sha256?: string;
}

interface ReceiverDashboardProps {
  sessionData: {
    sessionId: string;
    code: string;
    expiresAt: number;
    files: FileInfo[];
  };
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ReceiverDashboard: React.FC<ReceiverDashboardProps> = ({ sessionData, onClose, onShowToast }) => {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
    sessionData.files.map(f => f.id)
  );
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(
    sessionData.expiresAt - Date.now()
  );

  useEffect(() => {
    // Notify sender that receiver is viewing files
    notifyReceiverAction(sessionData.sessionId, 'VIEWING');

    const timer = setInterval(() => {
      setTimeRemaining(sessionData.expiresAt - Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionData.sessionId, sessionData.expiresAt]);

  const handleToggleSelect = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedFileIds.length === sessionData.files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(sessionData.files.map(f => f.id));
    }
  };

  const handleDownloadSingle = (fileId: string) => {
    setDownloadingFileId(fileId);
    notifyReceiverAction(sessionData.sessionId, 'DOWNLOADING');

    const downloadUrl = getDownloadUrl(sessionData.sessionId, fileId);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('info', 'Download Started', 'Streaming uncompressed original binary...');

    setTimeout(() => {
      setDownloadingFileId(null);
      notifyReceiverAction(sessionData.sessionId, 'COMPLETED');
      onShowToast('success', 'Download Complete!', 'File saved with 100% original quality.');
      triggerConfetti();
    }, 1000);
  };

  const handleDownloadAllSelected = () => {
    setIsDownloadingAll(true);
    notifyReceiverAction(sessionData.sessionId, 'DOWNLOADING');

    const zipUrl = getZipDownloadUrl(sessionData.sessionId);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `JSDR_Share_${sessionData.code}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('info', 'Preparing ZIP Archive...', 'Packaging selected files with zero compression.');

    setTimeout(() => {
      setIsDownloadingAll(false);
      notifyReceiverAction(sessionData.sessionId, 'COMPLETED');
      onShowToast('success', 'ZIP Package Downloaded!', 'All selected files downloaded successfully.');
      triggerConfetti();
    }, 1500);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const totalSelectedSize = sessionData.files
    .filter(f => selectedFileIds.includes(f.id))
    .reduce((acc, f) => acc + f.size, 0);

  const isAllSelected = selectedFileIds.length === sessionData.files.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-semibold border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-extrabold">
            PIN: {sessionData.code}
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatTimeRemaining(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Main Receiver Content Container */}
      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Uncompressed Original Binary
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight flex items-center gap-3">
              Transfer Package ({sessionData.files.length} {sessionData.files.length === 1 ? 'File' : 'Files'})
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select specific files or download all files together in a single ZIP package.
            </p>
          </div>

          {/* Batch ZIP Download Action Button */}
          <button
            onClick={handleDownloadAllSelected}
            disabled={selectedFileIds.length === 0 || isDownloadingAll}
            className={`px-7 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 transition-all duration-300 ${
              selectedFileIds.length === 0 || isDownloadingAll
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]'
            }`}
          >
            {isDownloadingAll ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Package ZIP...</span>
              </>
            ) : (
              <>
                <Package className="w-4.5 h-4.5" />
                <span>Download Selected ({selectedFileIds.length}) • {formatBytes(totalSelectedSize)}</span>
              </>
            )}
          </button>
        </div>

        {/* Multi-Select Action Bar */}
        <div className="flex items-center justify-between px-3.5 py-3 mb-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
          <button
            onClick={handleSelectAllToggle}
            className="flex items-center gap-2.5 font-semibold hover:text-white transition-colors cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4.5 h-4.5 text-indigo-400" />
            ) : (
              <Square className="w-4.5 h-4.5 text-slate-500" />
            )}
            <span>{isAllSelected ? 'Deselect All Files' : 'Select All Files'}</span>
          </button>

          <span className="text-slate-400 font-mono text-[11px]">
            {selectedFileIds.length} of {sessionData.files.length} selected
          </span>
        </div>

        {/* File Cards List */}
        <div className="space-y-3">
          {sessionData.files.map(file => {
            const isSelected = selectedFileIds.includes(file.id);
            const { category, color } = getFileTypeCategory(file.mimeType, file.originalName);

            return (
              <div
                key={file.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/30 shadow-md'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleSelect(file.id)}
                    className="text-slate-400 hover:text-white transition-colors shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase shrink-0 ${color}`}>
                    {category}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{file.originalName}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>{formatBytes(file.size)}</span>
                      <span className="text-emerald-400/90 font-mono text-[10px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> SHA-256: {formatHash(file.sha256)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Preview file"
                  >
                    <Eye className="w-4 h-4 text-purple-400" /> Preview
                  </button>

                  <button
                    onClick={() => handleDownloadSingle(file.id)}
                    disabled={downloadingFileId === file.id}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    {downloadingFileId === file.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          sessionId={sessionData.sessionId}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownloadSingle}
        />
      )}
    </div>
  );
};
