# 🚀 JSDR Share - Secure Real-Time Device File Transfer Web App

JSDR Share is a modern, high-performance, responsive web application designed for secure, zero-compression file transfers between devices using a **QR Code** or a **unique 5-digit PIN**. 

Built with **React (TypeScript), Vite, Node.js, Express, Socket.IO, and Web Crypto API (SHA-256)**, JSDR Share guarantees **100% original binary quality** with bit-for-bit file integrity verification.

---

## 🌟 Features

- ⚡ **Zero Compression & Bit-for-Bit Integrity**: Files are stored and streamed byte-for-byte with zero conversion or re-encoding. Verified using SHA-256 hashes.
- 📲 **Dual Pairing Modes**:
  - **5-Digit PIN Entry**: 5-slot OTP numeric input with auto-advance and paste support.
  - **Mobile QR Code Scanner**: Built-in HTML5 camera scanner with image file upload fallback.
- 📦 **Multi-File Batch Transfer**:
  - Drag-and-drop file dropzone with "Add More Files" support.
  - Multi-select checkboxes for receivers + **Download All Selected (ZIP)** archive generation.
- 🚀 **Chunked Progressive Uploads & Range Streaming**:
  - 5MB slice buffer streaming prevents browser RAM overload during large file transfers (videos, audio, zip, documents).
- 🔒 **Security & Auto-Cleanup**:
  - 30-minute session TTL with automatic server-side storage cleanup.
  - Brute-force PIN protection limiting failed attempts.
- 🎨 **Modern Glassmorphic UI/UX**:
  - Dark/Light mode theme toggle, toast notifications, responsive controls optimized for iOS, Android, Tablets, and Desktops.

---

## 🛠️ Technology Stack

- **Frontend**: Vite, React 19, TypeScript, Lucide React Icons, QRCode.react, Html5-Qrcode, JSZip, Canvas-Confetti, Tailwind CSS.
- **Backend**: Node.js, Express, Socket.IO (WebSockets), Multer, Express-Rate-Limit, Crypto (SHA-256).

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- `npm` or `yarn`

### Installation

```bash
# Clone the repository
git clone https://github.com/RAHULKALEtech/jsdr-share.git

# Navigate to project directory
cd jsdr-share

# Install dependencies
npm install
```

### Development Mode

```bash
# Build frontend bundle
npm run build

# Launch server
npx tsx server/server.ts
```

Open [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 📁 Repository Structure

```
jsdr-share/
├── server/
│   ├── server.ts           # Express & Socket.IO server entry
│   ├── sessionManager.ts   # Session TTL, PIN generation, & disk cleanup
│   ├── uploadHandler.ts    # Chunked upload endpoints & Range download streams
│   ├── socketHandler.ts    # WebSocket real-time pairing events
│   └── types.ts            # Server type definitions
├── src/
│   ├── components/         # React UI components (Home, Send, Receive, Dashboards)
│   ├── services/           # API and Socket.IO client handlers
│   ├── utils/              # Web Crypto SHA-256 & byte formatters
│   ├── App.tsx             # Root router & theme manager
│   ├── index.css           # Glassmorphism design tokens & keyframes
│   └── main.tsx            # React root mount
├── package.json
└── vite.config.ts
```

---

## 📄 License

Distributed under the MIT License.
