# ⚡ CypherLog Pro
> High-Performance Stealer Log & Credential Intelligence Inspector

CypherLog is an ultra-fast, modern log analysis and credential inspection platform built for security researchers, penetration testers, and threat intelligence analysts. It offers sub-second searches across gigabytes of combo dumps and stealer logs with real-time streaming, automated credential extraction, delimiter rule customization, and full mobile/Termux support.

---

## ✨ Features

- ⚡ **Blazing Fast Searches**: Powered by native Ripgrep (`rg`) search binaries with sub-50ms execution across millions of lines.
- 📡 **Live Streaming Search (SSE)**: Stream matching results in real time with Server-Sent Events as files are being scanned.
- 🎛️ **Custom Regex & Delimiter Parser**: Interactive rule builder with presets (`URL|User|Pass`, `User:::Pass:::Email`, CSV, Named Regex groups) and a live validation sandbox.
- 📱 **Mobile-First Responsive Interface**: 
  - Dynamic Viewport Lock (`100dvh`) with sticky bottom pagination footer (no page scrolling needed).
  - Slide-in File Explorer drawer and collapsible search modifiers.
- 👁️ **Deep Context Inspector**: Inspect surrounding lines (+/- 3 to +/- 25 lines) around any matched line with neon target highlighting.
- 📊 **Security & Threat Analytics**: Real-time domain frequency charts, email vs username breakdown, and entropy analysis.
- 📤 **Multi-Format Bulk Exporter**: Export filtered or deduplicated credentials in formats:
  - `URL:User:Pass`
  - `User:Pass`
  - `Domain,Username,Password` (CSV)
  - Full Structured JSON
- 🔒 **Path Security Guard**: Built-in strict path traversal safeguards preventing access outside configured directories.

---

## 🚀 Quick Start (Local & Termux)

### Option 1: Desktop / Laptop (Single-Command Run)

1. Clone the repository:
   ```bash
   git clone https://github.com/sahildsouza/CypherLog.git
   cd CypherLog
   ```

2. Install dependencies & build client:
   ```bash
   npm run install:all
   npm run build
   ```

3. Launch unified server:
   ```bash
   npm start
   ```

4. Open [http://localhost:4000](http://localhost:4000) in your browser.

---

### Option 2: Android (Termux)

1. **Install Prerequisites in Termux**:
   ```bash
   pkg update -y && pkg upgrade -y
   pkg install -y nodejs ripgrep git
   termux-setup-storage
   ```

2. **Clone & Install**:
   ```bash
   git clone https://github.com/sahildsouza/CypherLog.git
   cd CypherLog
   npm run install:all
   npm run build
   ```

3. **Start**:
   ```bash
   npm start
   ```
   *(Or point to phone storage: `LOGS_DIR="/sdcard/Download/Logs" npm start`)*

4. Open `http://localhost:4000` in Android Chrome / Brave.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons, Chart.js / Recharts
- **Backend**: Node.js, Express, Server-Sent Events (SSE)
- **Search Engine**: Native Ripgrep (`rg`) + Streaming Node.js Fallback
- **Security**: Real-time path sanitization & traversal defense

---

## 📄 License
MIT License. Created for authorized threat intelligence and security research purposes.
