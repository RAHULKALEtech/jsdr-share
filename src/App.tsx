import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SendView, SelectedFileItem } from './components/SendView';
import { SenderDashboard } from './components/SenderDashboard';
import { ReceiveView } from './components/ReceiveView';
import { ReceiverDashboard } from './components/ReceiverDashboard';
import { ToastContainer, ToastMessage } from './components/Toast';

export type ViewState = 'HOME' | 'SEND' | 'SENDER_DASHBOARD' | 'RECEIVE' | 'RECEIVER_DASHBOARD';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sender session data
  const [senderSession, setSenderSession] = useState<{
    sessionId: string;
    code: string;
    expiresAt: number;
    shareUrl: string;
  } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<SelectedFileItem[]>([]);

  // Receiver session data
  const [receiverSession, setReceiverSession] = useState<any | null>(null);
  const [initialReceiveCode, setInitialReceiveCode] = useState<string>('');

  useEffect(() => {
    // Check if theme stored in localStorage
    const savedTheme = localStorage.getItem('jsdr_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Check URL parameters for direct #receive?code=12345 link
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('receive')) {
        const match = hash.match(/code=(\d{5})/);
        if (match && match[1]) {
          setInitialReceiveCode(match[1]);
          setCurrentView('RECEIVE');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('jsdr_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
    };
    setToasts(prev => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSessionGenerated = (
    sessionData: { sessionId: string; code: string; expiresAt: number; shareUrl: string },
    files: SelectedFileItem[]
  ) => {
    setSenderSession(sessionData);
    setUploadedFiles(files);
    setCurrentView('SENDER_DASHBOARD');
    showToast('success', 'Transfer Created!', `Session active with 5-digit PIN ${sessionData.code}`);
  };

  const handleReceiverConnected = (sessionData: any) => {
    setReceiverSession(sessionData);
    setCurrentView('RECEIVER_DASHBOARD');
  };

  const resetToHome = () => {
    setCurrentView('HOME');
    setSenderSession(null);
    setUploadedFiles([]);
    setReceiverSession(null);
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Radiant Glow Blobs */}
      <div className="glow-blob glow-indigo w-[600px] h-[600px] -top-40 -left-40 animate-glow" />
      <div className="glow-blob glow-purple w-[500px] h-[500px] top-1/2 -right-40 animate-glow" style={{ animationDelay: '-3.5s' }} />

      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onGoHome={resetToHome}
        showHomeButton={currentView !== 'HOME'}
      />

      <main className="flex-1 relative z-10">
        {currentView === 'HOME' && (
          <HomeView
            onSelectSend={() => setCurrentView('SEND')}
            onSelectReceive={() => setCurrentView('RECEIVE')}
          />
        )}

        {currentView === 'SEND' && (
          <SendView
            onSessionGenerated={handleSessionGenerated}
            onCancel={resetToHome}
          />
        )}

        {currentView === 'SENDER_DASHBOARD' && senderSession && (
          <SenderDashboard
            sessionData={senderSession}
            files={uploadedFiles}
            onClose={resetToHome}
            onShowToast={showToast}
          />
        )}

        {currentView === 'RECEIVE' && (
          <ReceiveView
            initialCode={initialReceiveCode}
            onSessionConnected={handleReceiverConnected}
            onCancel={resetToHome}
            onShowToast={showToast}
          />
        )}

        {currentView === 'RECEIVER_DASHBOARD' && receiverSession && (
          <ReceiverDashboard
            sessionData={receiverSession}
            onClose={resetToHome}
            onShowToast={showToast}
          />
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <footer className="relative z-10 py-6 border-t border-white/10 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} JSDR Share. Secure Zero-Compression File Transfer.</p>
          <div className="flex items-center space-x-4">
            <span className="hover:text-slate-400">SHA-256 Bit Integrity</span>
            <span>•</span>
            <span className="hover:text-slate-400">Chunked Streaming</span>
            <span>•</span>
            <span className="hover:text-slate-400">Auto Storage Cleanup</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
