import React, { useRef, useEffect } from 'react';
import { Search, Sparkles, X, CornerDownLeft, Zap, Sliders } from 'lucide-react';

export default function SearchControlBar({
  query,
  setQuery,
  onExecuteSearch,
  isSearching,
  targetField,
  setTargetField,
  isLiveStreaming = false,
  setIsLiveStreaming,
  onOpenRules,
  rulesCount = 0,
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
      <div className="p-3 sm:p-4 flex flex-col gap-2.5">
        
        {/* Main Search Input Row */}
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1 min-w-0">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-cyber-accent" />
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search domains, users, passwords, tokens..."
              className="w-full pl-9 sm:pl-11 pr-8 sm:pr-20 py-2.5 sm:py-3 rounded-xl glass-input text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 shadow-inner focus:shadow-glow-cyan transition-all"
            />

            {/* Clear Button & Shortcut Badge inside Input */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
            className="flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs sm:text-sm tracking-wide transition-all shadow-glow-cyan disabled:opacity-50 shrink-0 select-none cursor-pointer"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>SEARCH</span>
                <CornerDownLeft className="hidden sm:inline w-3.5 h-3.5 opacity-70" />
              </>
            )}
          </button>
        </div>

        {/* Clean Controls Row: Target Field Tabs on Left, Stream & Rules on Right */}
        <div className="flex items-center justify-between gap-2 text-xs font-mono">
          
          {/* Target Field Filter Selector */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-cyber-850 p-0.5 rounded-lg border border-cyber-border">
            <span className="text-[10px] text-slate-500 px-1 uppercase hidden xs:inline">Field:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'URL', label: 'URL' },
              { id: 'USER', label: 'User' },
              { id: 'PASS', label: 'Pass' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTargetField(tab.id)}
                className={`px-2 sm:px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  targetField === tab.id
                    ? 'bg-cyber-700 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Action Buttons: Stream & Rules */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live Streaming Mode Toggle */}
            <button
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              title="Live Stream Search: Stream matching lines progressively in real-time"
              className={`px-2.5 sm:px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 font-bold text-[11px] cursor-pointer ${
                isLiveStreaming
                  ? 'bg-amber-500/20 border-amber-500/70 text-amber-300 shadow-glow-amber'
                  : 'bg-cyber-850 hover:bg-cyber-800 border-cyber-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Stream</span>
            </button>

            {/* Custom Rules Builder Trigger */}
            <button
              onClick={onOpenRules}
              title="Custom Delimiter & Regex Parser Rules"
              className="px-2.5 sm:px-3 py-1 rounded-lg bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1.5 text-[11px] font-medium cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rules</span>
              {rulesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/40">
                  {rulesCount}
                </span>
              )}
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
          <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 bg-cyber-950/90 border-t border-cyber-border/60 text-[11px] font-mono text-cyan-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-semibold text-slate-200">
                {isLiveStreaming ? 'Streaming matching records in real-time...' : 'Scanning dataset with ripgrep multi-threaded engine...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isLiveStreaming && streamMatchCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                  {streamMatchCount.toLocaleString()} matches streamed
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">Searching...</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
