import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, Clock, ShieldCheck, Users, Download, ArrowLeft, CheckCircle2, PackageCheck } from 'lucide-react';
import { SelectedFileItem } from './SendView';
import { formatBytes, formatTimeRemaining, formatHash, getFileTypeCategory } from '../utils/formatters';
import { socket, joinSenderRoom } from '../services/socket';

interface SenderDashboardProps {
  sessionData: {
    sessionId: string;
    code: string;
    expiresAt: number;
    shareUrl: string;
  };
  files: SelectedFileItem[];
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const SenderDashboard: React.FC<SenderDashboardProps> = ({
  sessionData,
  files,
  onClose,
  onShowToast,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [receiverStatus, setReceiverStatus] = useState<
    'WAITING' | 'CONNECTED' | 'DOWNLOADING' | 'COMPLETED'
  >('WAITING');
  const [receiverActivity, setReceiverActivity] = useState<string>('Waiting for receiver to connect...');
  const [timeRemaining, setTimeRemaining] = useState<number>(
    sessionData.expiresAt - Date.now()
  );

  useEffect(() => {
    // Join Socket room as Sender
    joinSenderRoom(sessionData.sessionId);

    // Socket Event Listeners
    socket.on('receiver_connected', () => {
      setReceiverStatus('CONNECTED');
      setReceiverActivity('Receiver connected! Viewing files...');
      onShowToast('info', 'Receiver Connected', 'Receiver is now connected to your transfer session.');
    });

    socket.on('receiver_status_update', (data: { action: string }) => {
      if (data.action === 'DOWNLOADING') {
        setReceiverStatus('DOWNLOADING');
        setReceiverActivity('Receiver is downloading files...');
      } else if (data.action === 'COMPLETED') {
        setReceiverStatus('COMPLETED');
        setReceiverActivity('Receiver has downloaded all files successfully!');
        onShowToast('success', 'Transfer Completed!', 'Receiver successfully downloaded the files.');
      } else if (data.action === 'RECEIVER_DISCONNECTED') {
        setReceiverStatus('WAITING');
        setReceiverActivity('Receiver disconnected. Waiting for reconnect...');
      }
    });

    // Expiration Countdown Timer
    const timer = setInterval(() => {
      const remaining = sessionData.expiresAt - Date.now();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      socket.off('receiver_connected');
      socket.off('receiver_status_update');
    };
  }, [sessionData.sessionId, sessionData.expiresAt, onShowToast]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionData.code);
    setCopiedCode(true);
    onShowToast('success', 'PIN Copied!', `Transfer code ${sessionData.code} copied to clipboard.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sessionData.shareUrl);
    setCopiedUrl(true);
    onShowToast('success', 'Link Copied!', 'Direct receiver link copied to clipboard.');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadQr = () => {
    const svgElement = document.getElementById('sender-qr-code') as unknown as SVGElement;
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `JSDR_Share_QR_${sessionData.code}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        onShowToast('success', 'QR Code Saved!', 'QR code image downloaded to your device.');
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const totalPackageSize = files.reduce((acc, item) => acc + item.file.size, 0);

  return (
    <div className="app-view max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-semibold border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> End Session
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Expires in: {formatTimeRemaining(timeRemaining)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 5-Digit PIN & QR Code Card */}
        <div className="lg:col-span-6 space-y-6">
          {/* 5-Digit Transfer PIN Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 text-center relative overflow-hidden">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              5-Digit Transfer Code
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3 my-4">
              {sessionData.code.split('').map((digit, idx) => (
                <span
                  key={idx}
                  className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-200 font-heading text-3xl font-extrabold flex items-center justify-center shadow-lg shadow-indigo-500/10"
                >
                  {digit}
                </span>
              ))}
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full mt-3 py-3.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Copied 5-Digit PIN!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy 5-Digit Code
                </>
              )}
            </button>
          </div>

          {/* QR Code Container */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 text-center flex flex-col items-center">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-purple-400" /> Scan QR Code to Connect Device
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-xl shadow-purple-500/10 mb-4 inline-block">
              <QRCodeSVG
                id="sender-qr-code"
                value={sessionData.shareUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={handleCopyUrl}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? 'Copied Link' : 'Copy Link'}
              </button>

              <button
                onClick={handleDownloadQr}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" /> Save QR Image
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Connection Status & Files Package */}
        <div className="lg:col-span-6 space-y-6">
          {/* Live Receiver Status */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Live Connection Status
              </h3>

              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    receiverStatus === 'WAITING'
                      ? 'bg-amber-400 animate-ping'
                      : receiverStatus === 'CONNECTED'
                      ? 'bg-emerald-400'
                      : receiverStatus === 'DOWNLOADING'
                      ? 'bg-indigo-400 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="text-xs font-bold text-white">
                  {receiverStatus === 'WAITING' && 'Waiting for Receiver'}
                  {receiverStatus === 'CONNECTED' && 'Receiver Connected'}
                  {receiverStatus === 'DOWNLOADING' && 'Downloading Files...'}
                  {receiverStatus === 'COMPLETED' && 'Transfer Completed'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                {receiverStatus === 'COMPLETED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
              </div>
              <p className="font-semibold leading-relaxed">{receiverActivity}</p>
            </div>
          </div>

          {/* Files Package List */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-heading">
                  <PackageCheck className="w-4 h-4 text-indigo-400" /> Batch Files Package ({files.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Total Size: {formatBytes(totalPackageSize)}</p>
              </div>
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SHA-256 Verified
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {files.map(item => {
                const { category, color } = getFileTypeCategory(item.file.type, item.file.name);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs hover:border-white/20 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${color}`}>
                          {category}
                        </span>
                        <p className="font-semibold text-white truncate">{item.file.name}</p>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <span>{formatBytes(item.file.size)}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          SHA: {formatHash(item.sha256)}
                        </span>
                      </div>
                    </div>

                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
