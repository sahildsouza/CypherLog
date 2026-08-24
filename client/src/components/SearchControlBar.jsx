import React, { useRef, useEffect } from 'react';
import { Search, Sparkles, X, CornerDownLeft, Layers, Eye, EyeOff, Download } from 'lucide-react';

export default function SearchControlBar({
  query,
  setQuery,
  onExecuteSearch,
  isSearching,
  targetField,
  setTargetField,
  isDeduplicated,
  setIsDeduplicated,
  maskPasswords,
  setMaskPasswords,
  onOpenExport,
  streamMatchCount = 0
}) {
  const inputRef = useRef(null);

  // Global keyboard shortcuts: '/' to focus search, 'Escape' to clear
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onExecuteSearch();
    }
  };

  return (
    <div className="relative border-b border-cyber-border bg-cyber-900/90 backdrop-blur-md">
      
      {/* Search Bar Controls Body */}
      <div className="p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-2.5">
        
        {/* Main Search Input Row */}
        <div className="flex items-stretch gap-1.5 sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <Search className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-cyber-accent" />
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search domains, users, passwords, tokens..."
              className="w-full pl-8 sm:pl-11 pr-7 sm:pr-20 py-2 sm:py-3 rounded-xl glass-input text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 shadow-inner focus:shadow-glow-cyan transition-all"
            />

            {/* Clear Button & Shortcut Badge inside Input */}
            <div className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="p-1 rounded hover:bg-cyber-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Clear (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyber-800 text-slate-400 border border-cyber-border">
                /
              </kbd>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={() => onExecuteSearch()}
            disabled={isSearching}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs sm:text-sm tracking-wide transition-all shadow-glow-cyan disabled:opacity-50 shrink-0 select-none cursor-pointer"
          >
            {isSearching ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">SEARCH</span>
                <CornerDownLeft className="hidden sm:inline w-3.5 h-3.5 opacity-70" />
              </>
            )}
          </button>
        </div>

        {/* Guaranteed Single-Line Control Strip for Mobile & Desktop (No Wrapping) */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono w-full overflow-hidden flex-nowrap">
          
          {/* Target Field Filter Selector */}
          <div className="flex items-center gap-0.5 bg-cyber-850 p-0.5 rounded-lg border border-cyber-border shrink-0">
            {[
              { id: 'ALL', full: 'All Fields', short: 'All' },
              { id: 'URL', full: 'URL', short: 'URL' },
              { id: 'USER', full: 'User', short: 'User' },
              { id: 'PASS', full: 'Pass', short: 'Pass' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTargetField(tab.id)}
                className={`px-1.5 sm:px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  targetField === tab.id
                    ? 'bg-cyber-700 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.full}</span>
              </button>
            ))}
          </div>

          {/* Right Action Buttons: Unique + Mask + Export in 1 Line */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Deduplication Toggle Button */}
            <button
              onClick={() => setIsDeduplicated(!isDeduplicated)}
              title="Toggle deduplication to remove duplicate combos"
              className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-lg border text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer shrink-0 ${
                isDeduplicated
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 shadow-glow-cyan'
                  : 'bg-cyber-850 hover:bg-cyber-800 border-cyber-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyber-accent shrink-0" />
              <span>Unique</span>
            </button>

            {/* Global Password Masking Toggle Button */}
            <button
              onClick={() => setMaskPasswords(!maskPasswords)}
              title="Mask or unmask passwords across the interface"
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-lg bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-300 hover:text-slate-100 transition-colors text-[10px] sm:text-[11px] cursor-pointer shrink-0"
            >
              {maskPasswords ? (
                <>
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                  <span>Reveal</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
                  <span>Mask</span>
                </>
              )}
            </button>

            {/* Export Modal Trigger Button */}
            <button
              onClick={onOpenExport}
              title="Export search results to CSV / JSON / TXT"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-glow-violet transition-all text-[10px] sm:text-[11px] cursor-pointer shrink-0"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Export</span>
            </button>
          </div>

        </div>

      </div>

      {/* Real-time Search Progress Bar & Activity HUD */}
      {isSearching && (
        <div className="w-full">
          {/* Animated Neon Cyber Progress Laser Line */}
          <div className="relative h-1 w-full bg-cyber-950 overflow-hidden">
            <div className="animate-cyber-progress" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-cyber-shimmer pointer-events-none" />
          </div>

          {/* Search Activity Status Readout */}
          <div className="flex items-center justify-between gap-2 px-2.5 sm:px-4 py-1.5 bg-cyber-950/90 border-t border-cyber-border/60 text-[10px] sm:text-[11px] font-mono text-cyan-300 whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-semibold text-slate-200 truncate">
                <span className="sm:hidden">Streaming records...</span>
                <span className="hidden sm:inline">Streaming matching records in real-time...</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {streamMatchCount > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold whitespace-nowrap shrink-0">
                  <span className="sm:hidden">{streamMatchCount.toLocaleString()} streamed</span>
                  <span className="hidden sm:inline">{streamMatchCount.toLocaleString()} matches streamed</span>
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden md:inline">Searching...</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
