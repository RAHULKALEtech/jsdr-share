import React from 'react';
import { X, Download, ShieldCheck, FileText } from 'lucide-react';
import { formatBytes, formatHash, getFileTypeCategory } from '../utils/formatters';
import { getDownloadUrl } from '../services/api';

interface FilePreviewModalProps {
  sessionId: string;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    sha256?: string;
  };
  onClose: () => void;
  onDownload: (fileId: string) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  sessionId,
  file,
  onClose,
  onDownload,
}) => {
  const inlineUrl = getDownloadUrl(sessionId, file.id, true);
  const { category } = getFileTypeCategory(file.mimeType, file.originalName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-base font-bold text-white truncate font-heading">{file.originalName}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span>{formatBytes(file.size)}</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> SHA-256: {formatHash(file.sha256)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(file.id)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content Viewer */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/40 min-h-[300px]">
          {category === 'VIDEO' && (
            <video
              src={inlineUrl}
              controls
              autoPlay
              className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-2xl"
            />
          )}

          {category === 'AUDIO' && (
            <div className="text-center space-y-6 max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 animate-pulse">
                <FileText className="w-10 h-10" />
              </div>
              <p className="text-sm font-semibold text-white truncate">{file.originalName}</p>
              <audio src={inlineUrl} controls autoPlay className="w-full" />
            </div>
          )}

          {category === 'IMAGE' && (
            <img
              src={inlineUrl}
              alt={file.originalName}
              className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
          )}

          {category === 'PDF' && (
            <iframe
              src={inlineUrl}
              title={file.originalName}
              className="w-full h-[65vh] rounded-2xl border border-white/10 bg-white"
            />
          )}

          {!['VIDEO', 'AUDIO', 'IMAGE', 'PDF'].includes(category) && (
            <div className="text-center space-y-4 p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-semibold text-white">Preview not available for this format</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                You can download the original binary file below with 100% untouched quality.
              </p>
              <button
                onClick={() => onDownload(file.id)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Exact Original Binary
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
