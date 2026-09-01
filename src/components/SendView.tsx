import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, FileCheck, AlertCircle, ArrowRight, Plus, FolderPlus, Layers, Film, Music, FileText, Image as ImageIcon } from 'lucide-react';
import { formatBytes, getFileTypeCategory } from '../utils/formatters';
import { createSession, uploadFileChunked } from '../services/api';

export interface SelectedFileItem {
  id: string;
  file: File;
  progress: number;
  uploadedBytes: number;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'ERROR';
  sha256?: string;
  error?: string;
  thumbnailUrl?: string;
}

interface SendViewProps {
  onSessionGenerated: (
    sessionData: { sessionId: string; code: string; expiresAt: number; shareUrl: string },
    files: SelectedFileItem[]
  ) => void;
  onCancel: () => void;
}

export const SendView: React.FC<SendViewProps> = ({ onSessionGenerated, onCancel }) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [uploadBatchProgress, setUploadBatchProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach(item => {
        if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
      });
    };
  }, []);

  const handleFilesAdded = (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const incoming = Array.from(fileList);

    const filteredNewItems: SelectedFileItem[] = incoming
      .filter(newFile => !selectedFiles.some(existing => existing.file.name === newFile.name && existing.file.size === newFile.size))
      .map(file => {
        let thumbnailUrl: string | undefined = undefined;
        if (file.type.startsWith('image/')) {
          thumbnailUrl = URL.createObjectURL(file);
        }

        return {
          id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
          file,
          progress: 0,
          uploadedBytes: 0,
          status: 'PENDING',
          thumbnailUrl,
        };
      });

    if (filteredNewItems.length === 0 && incoming.length > 0) {
      setErrorMessage('Selected file(s) are already added.');
      return;
    }

    setSelectedFiles(prev => [...prev, ...filteredNewItems]);
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  const handleClearAll = () => {
    selectedFiles.forEach(item => {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    });
    setSelectedFiles([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleGenerateTransfer = async () => {
    if (selectedFiles.length === 0 || isCreatingSession) {
      return;
    }

    setIsCreatingSession(true);
    setErrorMessage(null);
    setUploadBatchProgress(0);

    try {
      // Step 1: Create Transfer Session on backend
      const sessionRes = await createSession();
      if (!sessionRes.success || !sessionRes.sessionId) {
        throw new Error(sessionRes.error || 'Failed to create transfer session.');
      }

      // Step 2: Parallel Batch Chunked Upload for fast multi-file processing
      const currentList = [...selectedFiles];
      let completedCount = 0;

      const uploadPromises = currentList.map(async item => {
        setSelectedFiles(prev =>
          prev.map(f => (f.id === item.id ? { ...f, status: 'UPLOADING' } : f))
        );

        const res = await uploadFileChunked(
          sessionRes.sessionId,
          item.id,
          item.file,
          (percent, uploadedBytes) => {
            setSelectedFiles(prev =>
              prev.map(f =>
                f.id === item.id
                  ? { ...f, progress: percent, uploadedBytes, status: 'UPLOADING' }
                  : f
              )
            );
          }
        );

        if (res.success) {
          completedCount++;
          setUploadBatchProgress(Math.round((completedCount / currentList.length) * 100));
          return {
            ...item,
            status: 'COMPLETED' as const,
            sha256: res.sha256,
            progress: 100,
          };
        } else {
          throw new Error(`Failed to upload ${item.file.name}: ${res.error}`);
        }
      });

      const uploadedResults = await Promise.all(uploadPromises);

      // Step 3: Launch Sender Dashboard with completed items
      onSessionGenerated(sessionRes, uploadedResults);
    } catch (err: any) {
      console.error('Session generation error:', err);
      setErrorMessage(err.message || 'An error occurred while preparing your multi-file transfer.');
      setIsCreatingSession(false);
    }
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.file.size, 0);

  return (
    <div className="app-view max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="surface-card glass-card rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl">
        {/* Header Alignment */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Layers className="w-3.5 h-3.5" /> Multi-File Transfer Enabled
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
              Upload Files to Share
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select multiple files simultaneously. Zero compression, 100% original binary accuracy.
            </p>
          </div>

          <button
            onClick={onCancel}
            disabled={isCreatingSession}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Dropzone Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isCreatingSession && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-white/15 bg-white/[0.02] hover:border-indigo-500/50 hover:bg-white/[0.04]'
          } ${isCreatingSession ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => e.target.files && handleFilesAdded(e.target.files)}
            multiple
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/10">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1 font-heading">
            Drag & Drop Multiple Files Here
          </h3>
          <p className="text-xs text-indigo-300 font-semibold mb-2">
            or <span className="underline">Click to Browse Files</span>
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select videos, audio tracks, photos, documents, ZIP archives, or code files. Add as many files as you need.
          </p>
        </div>

        {/* Multi-Files List & Stats Container */}
        {selectedFiles.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                <span>Selected Files ({selectedFiles.length})</span>
              </div>
              
              <div className="flex items-center gap-4">
                <span>Total Size: <strong className="text-indigo-300 font-mono">{formatBytes(totalSize)}</strong></span>
                {!isCreatingSession && (
                  <button
                    onClick={handleClearAll}
                    className="text-rose-400 hover:text-rose-300 hover:underline capitalize font-normal text-xs"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {selectedFiles.map(item => {
                const { category, color } = getFileTypeCategory(item.file.type, item.file.name);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 group transition-all hover:border-white/20"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Thumbnail or Category Icon */}
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.file.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          {category === 'VIDEO' && <Film className="w-5 h-5 text-purple-400" />}
                          {category === 'AUDIO' && <Music className="w-5 h-5 text-amber-400" />}
                          {category === 'IMAGE' && <ImageIcon className="w-5 h-5 text-emerald-400" />}
                          {!['VIDEO', 'AUDIO', 'IMAGE'].includes(category) && <FileText className="w-5 h-5 text-indigo-400" />}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${color}`}>
                            {category}
                          </span>
                          <p className="text-sm font-semibold text-white truncate">{item.file.name}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{formatBytes(item.file.size)}</p>

                        {item.status === 'UPLOADING' && (
                          <div className="mt-2.5 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'COMPLETED' && (
                        <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {!isCreatingSession && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveFile(item.id);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add More Files Button */}
            {!isCreatingSession && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-2xl border border-dashed border-white/20 hover:border-indigo-500/50 bg-white/[0.01] hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4 text-indigo-400" /> Add More Files to Batch
              </button>
            )}
          </div>
        )}

        {/* Global Batch Progress Indicator */}
        {isCreatingSession && (
          <div className="mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span>Uploading Batch Files...</span>
              <span>{uploadBatchProgress}%</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${uploadBatchProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onCancel}
            disabled={isCreatingSession}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerateTransfer}
            disabled={selectedFiles.length === 0 || isCreatingSession}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 transition-all duration-300 ${
              selectedFiles.length === 0 || isCreatingSession
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]'
            }`}
          >
            {isCreatingSession ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Multi-File Transfer...</span>
              </>
            ) : (
              <>
                <span>Generate Session ({selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
