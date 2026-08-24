import React, { useState } from 'react';
import { Terminal, Copy, Check, Hash, FileText, Download } from 'lucide-react';

export default function RawStreamView({
  results = [],
  query = '',
  onInspectContext
}) {
  const [copiedLine, setCopiedLine] = useState(null);

  const handleCopyRaw = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedLine(idx);
    setTimeout(() => setCopiedLine(null), 1500);
  };

  const highlightMatch = (text, q) => {
    if (!q || !text) return text;
    try {
      const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-cyan-500/30 text-cyan-200 font-bold px-0.5 rounded border-b border-cyan-400">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  if (results.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        <Terminal className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p>No matching raw log lines found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-cyber-950 font-mono text-xs overflow-hidden">
      
      {/* Stream Header */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-cyber-900 border-b border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyber-accent" />
          <span className="font-semibold text-slate-200">Raw Log Stream ({results.length.toLocaleString()} lines)</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Tap line to copy • Click [Inspect] for context
        </div>
      </div>

      {/* Lines Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-1 select-text">
        {results.map((item, idx) => {
          return (
            <div
              key={`${item.filePath}-${item.lineNumber}-${idx}`}
              className="p-2.5 sm:p-1.5 rounded-lg sm:rounded bg-cyber-900/60 sm:bg-transparent hover:bg-cyber-850/80 transition-colors group border border-cyber-border/60 sm:border-transparent sm:hover:border-cyber-border/60 flex flex-col sm:flex-row sm:items-start gap-2"
            >
              {/* Header / File Origin (Mobile Top Bar / Desktop Left Column) */}
              <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0 text-slate-500 text-[11px] sm:min-w-[180px] sm:max-w-[220px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-500 shrink-0" />
                  <span className="text-slate-300 truncate max-w-[140px] sm:max-w-[130px]" title={item.filePath}>
                    {item.filePath}
                  </span>
                  <span className="text-cyan-400 font-semibold shrink-0">:{item.lineNumber}</span>
                </div>

                {/* Mobile Action Buttons (Visible inline on small screens) */}
                <div className="flex sm:hidden items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopyRaw(item.raw, idx)}
                    className="px-2 py-0.5 rounded bg-cyber-800 hover:bg-cyber-750 text-slate-300 hover:text-cyan-300 border border-cyber-border text-[10px] transition-colors flex items-center gap-1"
                    title="Copy raw log line"
                  >
                    {copiedLine === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={() => onInspectContext(item)}
                    className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyber-accent/30 text-[10px] transition-colors flex items-center gap-1"
                    title="Inspect raw log context"
                  >
                    <Hash className="w-3 h-3" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>

              {/* Raw Log Line Content (Full width on mobile code block) */}
              <div 
                className="flex-1 min-w-0 p-2 sm:p-0 rounded bg-cyber-950/80 sm:bg-transparent border sm:border-0 border-cyber-border/40 text-slate-200 break-all leading-relaxed hover:text-white cursor-pointer select-all"
                onClick={() => handleCopyRaw(item.raw, idx)}
              >
                {highlightMatch(item.raw, query)}
              </div>

              {/* Desktop Action Buttons on Hover */}
              <div className="hidden sm:flex opacity-0 group-hover:opacity-100 items-center gap-1.5 shrink-0 transition-opacity">
                <button
                  onClick={() => handleCopyRaw(item.raw, idx)}
                  className="px-2 py-0.5 rounded bg-cyber-800 hover:bg-cyber-750 text-slate-300 hover:text-cyan-300 border border-cyber-border text-[10px] transition-colors flex items-center gap-1"
                  title="Copy raw log line"
                >
                  {copiedLine === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>

                <button
                  onClick={() => onInspectContext(item)}
                  className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyber-accent/30 text-[10px] transition-colors flex items-center gap-1"
                  title="Inspect raw log context"
                >
                  <Hash className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
