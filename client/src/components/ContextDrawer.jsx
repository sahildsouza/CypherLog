import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Copy, Check, Hash, Sliders, ExternalLink, 
  ChevronUp, ChevronDown, Search, WrapText, AlignLeft, Eye, Target
} from 'lucide-react';

/**
 * Intelligent syntax highlighting for credential combos and raw log lines
 */
function HighlightedLogLine({ content, isTarget, queryFilter }) {
  if (!content) {
    return <span className="text-slate-600 italic">&lt;empty line&gt;</span>;
  }

  // Try standard combo split: URL:User:Pass or User:Pass
  const parts = content.split(':');
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

  if (parts.length === 2 && !parts[0].startsWith('http')) {
    return (
      <span className="font-mono">
        <span className="text-amber-300">{parts[0]}</span>
        <span className="text-slate-600 mx-0.5">:</span>
        <span className="text-violet-300 font-mono bg-violet-950/40 px-1 py-0.2 rounded border border-violet-500/20">{parts[1]}</span>
      </span>
    );
  }

  // Key: Value pairs
  const kvMatch = content.match(/^([^:]+):\s*(.+)$/);
  if (kvMatch) {
    return (
      <span className="font-mono">
        <span className="text-slate-400 font-medium">{kvMatch[1]}</span>
        <span className="text-slate-600">: </span>
        <span className="text-cyan-200">{kvMatch[2]}</span>
      </span>
    );
  }

  // Default raw with optional search filter highlight
  if (queryFilter && queryFilter.trim()) {
    try {
      const escaped = queryFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const fragments = content.split(regex);
      return (
        <span>
          {fragments.map((frag, i) =>
            frag.toLowerCase() === queryFilter.toLowerCase() ? (
              <mark key={i} className="bg-amber-400/40 text-amber-200 font-bold px-0.5 rounded border-b border-amber-400">
                {frag}
              </mark>
            ) : (
              frag
            )
          )}
        </span>
      );
    } catch {
      return <span>{content}</span>;
    }
  }

  return <span>{content}</span>;
}

export default function ContextDrawer({
  isOpen,
  onClose,
  targetItem
}) {
  const [contextData, setContextData] = useState(null);
  const [radius, setRadius] = useState(7);
  const [wrapLines, setWrapLines] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedBlock, setCopiedBlock] = useState(false);
  const [copiedLineIdx, setCopiedLineIdx] = useState(null);

  const targetPath = typeof targetItem === 'string' 
    ? targetItem 
    : (targetItem?.filePath || targetItem?.relativePath || targetItem?.name || '');
  const targetLineNumber = typeof targetItem === 'object' && targetItem?.lineNumber ? targetItem.lineNumber : 1;

  useEffect(() => {
    if (!isOpen || !targetPath) return;

    const fetchContext = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          filePath: targetPath,
          lineNumber: String(targetLineNumber),
          radius: String(radius)
        });
        const res = await fetch(`/api/file/context?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setContextData(data);
        } else {
          setError(data.error || 'Failed to load file context');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContext();
  }, [isOpen, targetPath, targetLineNumber, radius]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !targetItem) return null;

  const handleCopyBlock = (includeLineNumbers = false) => {
    if (!contextData?.lines) return;
    const text = contextData.lines
      .map(l => includeLineNumbers ? `${l.lineNumber}: ${l.content}` : l.content)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedBlock(true);
    setTimeout(() => setCopiedBlock(false), 1500);
  };

  const handleCopySingleLine = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedLineIdx(idx);
    setTimeout(() => setCopiedLineIdx(null), 1500);
  };

  const filteredLines = (contextData?.lines || []).filter(l => 
    !filterText || l.content.toLowerCase().includes(filterText.toLowerCase()) || String(l.lineNumber).includes(filterText)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      
      {/* Drawer Outer Card */}
      <div className="w-full max-w-3xl bg-cyber-950 border-l border-cyber-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        
        {/* 1. Header */}
        <div className="p-3.5 sm:p-4 border-b border-cyber-border bg-cyber-900/95 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-300 shadow-glow-cyan shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold font-mono text-slate-100 tracking-wide uppercase">
                  Raw Log Context Inspector
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan">
                  Target Line {targetLineNumber}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={targetPath}>
                <span className="text-slate-500">File: </span>
                <span className="text-slate-200 font-medium">{targetPath}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-cyber-850 hover:bg-cyber-750 text-slate-400 hover:text-slate-200 border border-cyber-border transition-colors cursor-pointer shrink-0"
            title="Close Inspector (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 2. Control Toolbar */}
        <div className="px-3 sm:px-4 py-2 bg-cyber-900 border-b border-cyber-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
          
          {/* Radius Selector */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[11px] text-slate-500 hidden xs:inline">Radius:</span>
            <div className="flex items-center gap-1 bg-cyber-950 p-0.5 rounded-lg border border-cyber-border">
              {[3, 7, 15, 25, 50].map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                    radius === r
                      ? 'bg-cyan-500/25 border border-cyan-500/50 text-cyan-300 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  ±{r}
                </button>
              ))}
            </div>
          </div>

          {/* Wrap & Copy Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Wrap Toggle */}
            <button
              onClick={() => setWrapLines(!wrapLines)}
              title={wrapLines ? "Switch to No-Wrap (Horizontal Scroll)" : "Switch to Soft Line Wrap"}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                wrapLines 
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' 
                  : 'bg-cyber-850 hover:bg-cyber-800 border-cyber-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <WrapText className="w-3 h-3" />
              <span className="hidden sm:inline">{wrapLines ? 'Wrap: ON' : 'Wrap: OFF'}</span>
            </button>

            {/* Copy Full Block */}
            <button
              onClick={() => handleCopyBlock(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-200 hover:text-cyan-300 text-[11px] font-medium transition-all shadow-sm cursor-pointer"
              title="Copy entire context window to clipboard"
            >
              {copiedBlock ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copiedBlock ? 'Copied Block!' : 'Copy Block'}</span>
            </button>
          </div>
        </div>

        {/* 3. Search / Filter within Context */}
        <div className="px-3 sm:px-4 py-1.5 bg-cyber-950/90 border-b border-cyber-border flex items-center gap-2 text-xs font-mono shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter within surrounding lines..."
            className="w-full bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none text-[11px] font-mono"
          />
          {filterText && (
            <button 
              onClick={() => setFilterText('')}
              className="text-slate-500 hover:text-slate-300 text-xs px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* 4. Code & Surrounding Lines Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-cyber-950 font-mono text-xs select-text">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-mono">Loading surrounding log lines...</p>
            </div>
          ) : error ? (
            <div className="m-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️ Context Load Error</span>
              </div>
              <p>{error}</p>
            </div>
          ) : filteredLines.length > 0 ? (
            <div className="divide-y divide-cyber-border/20 min-w-full">
              {filteredLines.map((line, idx) => {
                const isTarget = line.isTarget;
                const isCopied = copiedLineIdx === idx;

                return (
                  <div
                    key={`${line.lineNumber}-${idx}`}
                    className={`group flex items-center transition-all ${
                      isTarget
                        ? 'bg-cyan-500/15 border-l-4 border-cyan-400 shadow-glow-cyan text-cyan-100 font-bold'
                        : 'hover:bg-cyber-900/80 text-slate-300 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Gutter: Line Number */}
                    <div className={`w-14 sm:w-16 py-1.5 px-2 text-right shrink-0 select-none font-mono text-[11px] border-r border-cyber-border/40 ${
                      isTarget ? 'text-cyan-300 font-bold bg-cyan-500/20' : 'text-slate-600 group-hover:text-slate-400 bg-cyber-900/30'
                    }`}>
                      {line.lineNumber}
                    </div>

                    {/* Target Indicator / Match Badge */}
                    <div className="w-8 shrink-0 flex items-center justify-center select-none text-[10px]">
                      {isTarget ? (
                        <span title="Target Line Match" className="text-cyan-400 animate-pulse font-bold">🎯</span>
                      ) : (
                        <span className="text-slate-700 font-mono">·</span>
                      )}
                    </div>

                    {/* Line Content */}
                    <div className={`flex-1 py-1.5 pr-2 font-mono text-[11px] sm:text-xs leading-relaxed ${
                      wrapLines ? 'break-all whitespace-pre-wrap' : 'whitespace-pre overflow-x-visible'
                    }`}>
                      <HighlightedLogLine 
                        content={line.content} 
                        isTarget={isTarget} 
                        queryFilter={filterText}
                      />
                    </div>

                    {/* Line Copy Action (Hover) */}
                    <div className="px-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopySingleLine(line.content, idx)}
                        title="Copy this line"
                        className="p-1 rounded bg-cyber-800 hover:bg-cyber-700 text-slate-400 hover:text-cyan-300 border border-cyber-border transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No lines match your active filter within this context window.
            </div>
          )}
        </div>

        {/* 5. Footer Bar */}
        <div className="p-3 bg-cyber-900 border-t border-cyber-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-500">Payload:</span>
            <span className="text-cyan-300 font-bold truncate max-w-xs sm:max-w-md">
              {targetItem.domain || targetItem.url || targetItem.username || 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Showing {filteredLines.length} lines (lines {contextData?.startLine || 1}–{contextData?.endLine || 1})
            </span>
            <button
              onClick={onClose}
              className="px-3.5 py-1 rounded-lg bg-cyber-800 hover:bg-cyber-750 text-slate-200 hover:text-white border border-cyber-border font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
