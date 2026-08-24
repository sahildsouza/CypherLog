import React, { useState, useMemo } from 'react';
import { 
  Terminal, Copy, Check, Hash, FileText, Download, 
  Search, WrapText, ChevronLeft, ChevronRight, Eye, Sparkles
} from 'lucide-react';

/**
 * Intelligent syntax highlighter for raw stream lines
 */
function HighlightedRawLine({ raw, queryFilter }) {
  if (!raw) {
    return <span className="text-slate-600 italic">&lt;empty line&gt;</span>;
  }

  // 1. Key=Value format (e.g. JWT_BEARER_TOKEN=Bearer eyJ..., OPENAI_API_KEY=sk-..., STRIPE_KEY=sk_live_...)
  const eqIndex = raw.indexOf('=');
  if (eqIndex > 0 && eqIndex < 40 && !raw.slice(0, eqIndex).includes(' ')) {
    const key = raw.slice(0, eqIndex);
    const value = raw.slice(eqIndex + 1);

    let formattedVal = <span className="text-slate-200">{value}</span>;

    if (value.startsWith('Bearer eyJ') || value.startsWith('eyJ')) {
      formattedVal = (
        <span>
          {value.startsWith('Bearer ') && <span className="text-violet-400 font-semibold">Bearer </span>}
          <span className="text-violet-300 bg-violet-950/50 px-1 py-0.5 rounded border border-violet-500/30 font-mono">
            {value.startsWith('Bearer ') ? value.slice(7) : value}
          </span>
        </span>
      );
    } else if (value.startsWith('sk-') || value.startsWith('sk_') || value.startsWith('ghp_') || value.startsWith('xoxb-')) {
      formattedVal = (
        <span className="text-emerald-300 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-500/30 font-mono">
          {value}
        </span>
      );
    } else if (value.startsWith('postgres://') || value.startsWith('mysql://') || value.startsWith('mongodb://') || value.startsWith('http://') || value.startsWith('https://')) {
      formattedVal = (
        <span className="text-cyan-300 hover:underline font-mono">
          {value}
        </span>
      );
    } else if (value.length > 20) {
      formattedVal = (
        <span className="text-amber-200 font-mono">
          {value}
        </span>
      );
    }

    return (
      <span className="font-mono">
        <span className="text-cyan-400 font-semibold">{key}</span>
        <span className="text-slate-600 font-bold mx-0.5">=</span>
        {formattedVal}
      </span>
    );
  }

  // 2. Standard URL:User:Pass or User:Pass
  const parts = raw.split(':');
  if (parts.length >= 3 && (parts[0].startsWith('http') || parts[0].includes('.'))) {
    const url = parts.slice(0, parts[0].startsWith('http') ? 2 : 1).join(':');
    const remaining = parts.slice(parts[0].startsWith('http') ? 2 : 1);
    const user = remaining[0] || '';
    const pass = remaining.slice(1).join(':') || '';

    return (
      <span className="font-mono">
        <span className="text-cyan-300 font-semibold hover:underline">{url}</span>
        <span className="text-slate-600 mx-0.5">:</span>
        <span className="text-amber-300">{user}</span>
        <span className="text-slate-600 mx-0.5">:</span>
        <span className="text-violet-300 font-mono bg-violet-950/40 px-1 py-0.2 rounded border border-violet-500/20">{pass}</span>
      </span>
    );
  }

  // 3. Search query highlight fallback
  if (queryFilter && queryFilter.trim()) {
    try {
      const escaped = queryFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const fragments = raw.split(regex);
      return (
        <span className="font-mono text-slate-200">
          {fragments.map((frag, i) =>
            frag.toLowerCase() === queryFilter.toLowerCase() ? (
              <mark key={i} className="bg-cyan-500/30 text-cyan-200 font-bold px-0.5 rounded border-b border-cyan-400">
                {frag}
              </mark>
            ) : (
              frag
            )
          )}
        </span>
      );
    } catch {
      return <span className="font-mono text-slate-200">{raw}</span>;
    }
  }

  return <span className="font-mono text-slate-200">{raw}</span>;
}

export default function RawStreamView({
  results = [],
  query = '',
  onInspectContext
}) {
  const [copiedLine, setCopiedLine] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Filtered dataset
  const filtered = useMemo(() => {
    if (!filterText.trim()) return results;
    const lower = filterText.toLowerCase();
    return results.filter(item => 
      (item.raw && item.raw.toLowerCase().includes(lower)) ||
      (item.filePath && item.filePath.toLowerCase().includes(lower)) ||
      String(item.lineNumber).includes(lower)
    );
  }, [results, filterText]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  const handleCopyRaw = (text, idx) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLine(idx);
    setTimeout(() => setCopiedLine(null), 1500);
  };

  const handleCopyAll = () => {
    if (filtered.length === 0) return;
    const allText = filtered.map(r => r.raw || '').join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const handleDownloadTxt = () => {
    if (filtered.length === 0) return;
    const allText = filtered.map(r => r.raw || '').join('\n');
    const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cipherlog_raw_stream_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (results.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        <Terminal className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p>No matching raw log lines found.</p>
        <p className="text-xs text-slate-600 mt-1">Try executing a search query or selecting a file in the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-cyber-950 font-mono text-xs overflow-hidden">
      
      {/* 1. Terminal Header & Toolbar */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-cyber-900/95 border-b border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400 shrink-0">
        
        {/* Left: Terminal Badge & Line Count */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyber-850 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan shrink-0">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-200 text-xs sm:text-sm whitespace-nowrap">
              Raw Log Stream
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold whitespace-nowrap">
              {filtered.length.toLocaleString()} lines
            </span>
          </div>

          {/* Mobile-only quick wrap toggle */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className="sm:hidden px-2 py-1 rounded-md bg-cyber-850 border border-cyber-border text-slate-300 text-[10px] flex items-center gap-1"
          >
            <WrapText className="w-3 h-3" />
            <span>{wrapLines ? 'Wrap: ON' : 'Wrap: OFF'}</span>
          </button>
        </div>

        {/* Right: Controls (Filter, Wrap Toggle, Copy All, Download) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Quick Search within stream */}
          <div className="relative flex-1 sm:flex-initial flex items-center min-w-[120px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1); }}
              placeholder="Filter stream..."
              className="w-full sm:w-36 md:w-44 pl-7 pr-6 py-1 rounded-lg bg-cyber-950 border border-cyber-border text-slate-200 placeholder-slate-500 text-[11px] focus:border-cyan-400 transition-all focus:outline-none shadow-inner"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-1.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Desktop Wrap Toggle */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            title={wrapLines ? "Switch to No-Wrap (Horizontal Scroll)" : "Switch to Line Wrap"}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
              wrapLines 
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-glow-cyan' 
                : 'bg-cyber-850 hover:bg-cyber-800 border-cyber-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>{wrapLines ? 'Wrap: ON' : 'Wrap: OFF'}</span>
          </button>

          {/* Copy All */}
          <button
            onClick={handleCopyAll}
            title="Copy all lines in current stream"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-300 hover:text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
          >
            {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden xs:inline">{copiedAll ? 'Copied!' : 'Copy All'}</span>
          </button>

          {/* Download Raw */}
          <button
            onClick={handleDownloadTxt}
            title="Download raw stream as .txt file"
            className="px-2.5 py-1 rounded-lg bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-300 hover:text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Download className="w-3 h-3" />
            <span className="hidden xs:inline">Export</span>
          </button>

        </div>
      </div>

      {/* 2. Main Stream Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto select-text bg-cyber-950">
        
        {/* ================= DESKTOP VIEW ================= */}
        {/* If wrapLines is true: w-full (no horizontal scroll, wraps perfectly). If false: min-w-full w-max (horizontal scroll with sticky left gutter) */}
        <div className={`hidden sm:block ${wrapLines ? 'w-full divide-y divide-cyber-border/20' : 'min-w-full w-max divide-y divide-cyber-border/20'}`}>
          {pageRows.map((item, idx) => {
            const globalIdx = startIndex + idx;
            const isCopied = copiedLine === globalIdx;

            return (
              <div
                key={`desktop-${item.filePath}-${item.lineNumber}-${globalIdx}`}
                className={`group flex hover:bg-cyber-900/80 transition-colors border-l-2 border-transparent hover:border-cyan-400 py-1.5 px-3 gap-2.5 ${
                  wrapLines ? 'w-full items-start' : 'items-center'
                }`}
              >
                {/* 1. Left Pinned Gutter & Controls (ALWAYS on the left - never scrolled off!) */}
                <div className={`flex items-center gap-2 shrink-0 select-none ${
                  !wrapLines ? 'sticky left-0 bg-cyber-950/95 z-10 py-0.5 pr-2.5 border-r border-cyber-border/40 shadow-sm' : 'pt-0.5'
                }`}>
                  {/* Line Number */}
                  <span className="w-8 text-right text-slate-600 group-hover:text-slate-400 text-[11px] font-mono">
                    {globalIdx + 1}
                  </span>

                  {/* File Origin Badge */}
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyber-900 border border-cyber-border/80 text-slate-400 text-[10px] w-48 md:w-56 truncate"
                    title={`${item.filePath} : Line ${item.lineNumber}`}
                  >
                    <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate text-slate-300 font-medium">{item.filePath}</span>
                    <span className="text-cyan-400 font-bold shrink-0">:{item.lineNumber}</span>
                  </div>

                  {/* Left Quick Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyRaw(item.raw, globalIdx)}
                      title="Copy raw line"
                      className="p-1 rounded bg-cyber-850 hover:bg-cyber-750 text-slate-400 hover:text-cyan-300 border border-cyber-border text-[10px] transition-colors cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={() => onInspectContext(item)}
                      title="Inspect raw log context lines"
                      className="px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <Hash className="w-3 h-3 text-cyber-accent" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>

                {/* 2. Raw Code Line Content */}
                <div 
                  className={`font-mono text-xs leading-relaxed py-0.5 cursor-pointer pl-1.5 ${
                    wrapLines ? 'flex-1 min-w-0 whitespace-pre-wrap break-all pr-4' : 'whitespace-pre pr-6'
                  }`}
                  onClick={() => handleCopyRaw(item.raw, globalIdx)}
                  title="Click to copy line"
                >
                  <HighlightedRawLine 
                    raw={item.raw} 
                    queryFilter={filterText || query}
                  />
                </div>

              </div>
            );
          })}
        </div>

        {/* ================= MOBILE VIEW (Structured Card with Scrollable Code Box) ================= */}
        <div className="sm:hidden p-2 space-y-2">
          {pageRows.map((item, idx) => {
            const globalIdx = startIndex + idx;
            const isCopied = copiedLine === globalIdx;

            return (
              <div
                key={`mobile-${item.filePath}-${item.lineNumber}-${globalIdx}`}
                className="p-2.5 rounded-xl bg-cyber-900/90 border border-cyber-border/70 shadow-md space-y-2"
              >
                {/* Mobile Card Header: File Info on Left, Actions on Right */}
                <div className="flex items-center justify-between gap-2 border-b border-cyber-border/40 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 select-none">#{globalIdx + 1}</span>
                    <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-slate-300 text-[11px] font-semibold truncate max-w-[150px]" title={item.filePath}>
                      {item.filePath}
                    </span>
                    <span className="text-cyan-400 font-bold text-[11px] shrink-0">:{item.lineNumber}</span>
                  </div>

                  {/* Actions Header (Cleanly separated from code box) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyRaw(item.raw, globalIdx)}
                      className="px-2 py-0.5 rounded bg-cyber-800 hover:bg-cyber-750 text-slate-300 hover:text-cyan-300 border border-cyber-border text-[10px] font-mono flex items-center gap-1 transition-colors"
                      title="Copy raw line"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={() => onInspectContext(item)}
                      className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono flex items-center gap-1 transition-colors"
                      title="Inspect context"
                    >
                      <Hash className="w-3 h-3 text-cyan-400" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Card Body: Code Box */}
                <div 
                  className={`p-2 rounded-lg bg-cyber-950 border border-cyber-border/50 text-[11px] font-mono leading-relaxed select-text ${
                    wrapLines ? 'break-all whitespace-pre-wrap' : 'overflow-x-auto whitespace-pre'
                  }`}
                  onClick={() => handleCopyRaw(item.raw, globalIdx)}
                >
                  <HighlightedRawLine 
                    raw={item.raw} 
                    queryFilter={filterText || query}
                  />
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* 3. Sticky Pagination Footer */}
      {filtered.length > pageSize && (
        <div className="shrink-0 px-3 sm:px-5 py-2 bg-cyber-900/95 backdrop-blur-md border-t border-cyber-border sticky bottom-0 z-20 flex items-center justify-between gap-2 text-xs font-mono text-slate-300 shadow-2xl">
          
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-semibold text-slate-200">{startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)}</span>
              <span className="text-slate-500 font-normal">of</span>
              <span className="font-bold text-cyan-400">{filtered.length.toLocaleString()}</span>
            </div>

            <span className="text-slate-700 hidden xs:inline">|</span>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 hidden sm:inline text-xs">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-cyber-850 hover:bg-cyber-800 border border-cyber-border/90 text-cyan-300 font-semibold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-cyber-850 hover:bg-cyber-800 disabled:opacity-25 disabled:cursor-not-allowed border border-cyber-border text-slate-200 hover:text-cyan-300 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="px-2 py-0.5 rounded-lg bg-cyber-850/90 border border-cyber-border text-xs font-semibold text-slate-200 shadow-inner flex items-center gap-1">
              <span className="text-cyan-300 font-bold">{currentPage}</span>
              <span className="text-slate-600 font-normal">/</span>
              <span className="text-slate-400">{totalPages}</span>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-cyber-850 hover:bg-cyber-800 disabled:opacity-25 disabled:cursor-not-allowed border border-cyber-border text-slate-200 hover:text-cyan-300 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
