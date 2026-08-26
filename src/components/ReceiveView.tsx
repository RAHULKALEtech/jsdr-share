import React, { useState, useEffect, useRef } from 'react';
import { QrCode, KeyRound, Camera, AlertCircle, ArrowRight, Upload, X, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { joinReceiverRoom } from '../services/socket';

interface ReceiveViewProps {
  onSessionConnected: (sessionData: any) => void;
  onCancel: () => void;
  initialCode?: string;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ReceiveView: React.FC<ReceiveViewProps> = ({
  onSessionConnected,
  onCancel,
  initialCode = '',
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'CODE' | 'QR'>('CODE');
  const [otpDigits, setOtpDigits] = useState<string[]>(
    initialCode.length === 5 ? initialCode.split('') : ['', '', '', '', '']
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const qrReaderContainerId = 'html5-qr-reader';

  // If initialCode passed via URL, automatically attempt connection
  useEffect(() => {
    if (initialCode && initialCode.length === 5) {
      handleConnectWithCode(initialCode);
    }
  }, [initialCode]);

  // Clean up camera scanner when switching tabs or unmounting
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance to next input field
    if (value && index < 4) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto connect when all 5 digits entered
    const fullCode = newDigits.join('');
    if (fullCode.length === 5) {
      handleConnectWithCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pasteData.length === 5) {
      const digits = pasteData.split('');
      setOtpDigits(digits);
      handleConnectWithCode(pasteData);
    }
  };

  const handleConnectWithCode = (code: string) => {
    if (code.length !== 5) return;
    setIsConnecting(true);
    setErrorMessage(null);

    joinReceiverRoom(code, response => {
      setIsConnecting(false);
      if (response.success && response.session) {
        onShowToast('success', 'Connected!', 'Joined transfer session successfully.');
        onSessionConnected(response.session);
      } else {
        setErrorMessage(response.error || 'Failed to connect. Please verify your 5-digit transfer code.');
        onShowToast('error', 'Connection Failed', response.error || 'Invalid 5-digit code.');
      }
    });
  };

  const startCameraScanner = async () => {
    setCameraPermissionError(null);
    setErrorMessage(null);

    try {
      if (html5QrcodeRef.current) {
        await stopCameraScanner();
      }

      const html5QrCode = new Html5Qrcode(qrReaderContainerId);
      html5QrcodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Successfully scanned QR code!
          stopCameraScanner();

          // Extract code or session ID from URL or payload
          let extractedCode = decodedText;
          if (decodedText.includes('code=')) {
            const match = decodedText.match(/code=(\d{5})/);
            if (match && match[1]) {
              extractedCode = match[1];
            }
          }

          if (extractedCode) {
            setOtpDigits(extractedCode.split(''));
            setActiveTab('CODE');
            onShowToast('success', 'QR Code Scanned!', 'Connecting to transfer session...');
            handleConnectWithCode(extractedCode);
          }
        },
        () => {
          // Scanning frame error ignored
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera QR scan error:', err);
      setCameraPermissionError('Camera access unavailable. You can enter the 5-digit code or upload a QR image.');
      setIsCameraActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping QR scanner', e);
      }
    }
    setIsCameraActive(false);
  };

  const handleTabSwitch = (tab: 'CODE' | 'QR') => {
    setActiveTab(tab);
    setErrorMessage(null);
    if (tab === 'QR') {
      setTimeout(() => startCameraScanner(), 200);
    } else {
      stopCameraScanner();
    }
  };

  const handleQrFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const html5QrCode = new Html5Qrcode('qr-file-scanner');
        const decodedText = await html5QrCode.scanFile(file, true);
        let extractedCode = decodedText;
        if (decodedText.includes('code=')) {
          const match = decodedText.match(/code=(\d{5})/);
          if (match && match[1]) {
            extractedCode = match[1];
          }
        }
        if (extractedCode) {
          setActiveTab('CODE');
          onShowToast('success', 'QR Image Read Successfully!', 'Connecting...');
          handleConnectWithCode(extractedCode);
        }
      } catch (err) {
        setErrorMessage('Could not read valid QR code from uploaded image.');
      }
    }
  };

  const isCodeComplete = otpDigits.join('').length === 5;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-extrabold text-white font-heading">Receive Files</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Scan QR Code or enter the 5-digit PIN.</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mb-8">
          <button
            onClick={() => handleTabSwitch('CODE')}
            className={`py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'CODE'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" /> 5-Digit Code
          </button>

          <button
            onClick={() => handleTabSwitch('QR')}
            className={`py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'QR'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> QR Scanner
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* TAB 1: 5-DIGIT CODE ENTRY */}
        {activeTab === 'CODE' && (
          <div className="space-y-8 text-center">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-widest block mb-4">
                Enter 5-Digit Transfer PIN
              </label>

              <div className="flex items-center justify-center gap-2 sm:gap-3.5" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(idx, e.target.value)}
                    onKeyDown={e => handleKeyDown(idx, e)}
                    className="otp-input w-12 h-16 sm:w-14 sm:h-18 rounded-2xl bg-black/30 border border-white/20 text-center font-heading text-2xl sm:text-3xl font-extrabold text-white focus:outline-none transition-all duration-200"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => handleConnectWithCode(otpDigits.join(''))}
              disabled={!isCodeComplete || isConnecting}
              className={`w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all duration-300 ${
                !isCodeComplete || isConnecting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-[1.01] hover:shadow-indigo-500/30 active:scale-[0.99]'
              }`}
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Transfer...</span>
                </>
              ) : (
                <>
                  <span>Connect & View Files</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: QR SCANNER CAMERA FEED */}
        {activeTab === 'QR' && (
          <div className="space-y-6 text-center">
            {cameraPermissionError ? (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-4">
                <Camera className="w-8 h-8 text-amber-400 mx-auto" />
                <p>{cameraPermissionError}</p>

                <div className="pt-2">
                  <label className="px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" /> Upload QR Image File
                    <input type="file" accept="image/*" onChange={handleQrFileScan} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-inner max-w-sm mx-auto aspect-square flex items-center justify-center">
                  <div id={qrReaderContainerId} className="w-full h-full" />
                  <div id="qr-file-scanner" className="hidden" />

                  {/* Visual Scanner Frame Overlay */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/50 rounded-3xl flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-indigo-400 rounded-2xl relative">
                        <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent qr-scan-line shadow-lg shadow-indigo-500" />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-4">
                  Point your camera directly at the sender's QR code.
                </p>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <label className="text-xs text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1.5 font-semibold">
                    <Upload className="w-3.5 h-3.5" /> Upload QR Image from Gallery
                    <input type="file" accept="image/*" onChange={handleQrFileScan} className="hidden" />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
