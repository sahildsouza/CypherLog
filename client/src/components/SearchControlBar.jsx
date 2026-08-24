import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Filter, X, ArrowRight, CornerDownLeft, ShieldCheck, KeyRound, Globe, AtSign, Zap, Sliders, ChevronDown } from 'lucide-react';

export default function SearchControlBar({
  query,
  setQuery,
  onExecuteSearch,
  isSearching,
  isRegex,
  setIsRegex,
  caseSensitive,
  setCaseSensitive,
  invertMatch,
  setInvertMatch,
  targetField,
  setTargetField,
  autoSearch,
  setAutoSearch,
  isLiveStreaming = false,
  setIsLiveStreaming,
  onOpenRules,
  rulesCount = 0
}) {
  const inputRef = useRef(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const activeModifiersCount = 
    (isRegex ? 1 : 0) + 
    (caseSensitive ? 1 : 0) + 
    (invertMatch ? 1 : 0) + 
    (isLiveStreaming ? 1 : 0) + 
    (targetField !== 'ALL' ? 1 : 0) + 
    (rulesCount > 0 ? 1 : 0);

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

  const sampleChips = [
    { label: 'Google', query: 'google' },
    { label: 'PayPal', query: 'paypal.com' },
    { label: 'Admin', query: 'admin' },
    { label: 'Microsoft / Azure', query: 'microsoft' },
    { label: 'API Keys', query: 'api_key' },
    { label: 'JWT Tokens', query: 'Bearer ey' },
    { label: 'ProtonMail', query: 'proton' },
    { label: 'Password2026', query: '2026' }
  ];

  return (
    <div className="p-3 sm:p-4 border-b border-cyber-border bg-cyber-900/90 backdrop-blur-md">
      <div className="flex flex-col gap-2.5 sm:gap-3">
        
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

          {/* Mobile Filter Toggle Button */}
          <button
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className={`sm:hidden flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
              isMobileFiltersOpen || activeModifiersCount > 0
                ? 'bg-cyber-800 border-cyan-500/60 text-cyan-300 shadow-glow-cyan'
                : 'bg-cyber-850 hover:bg-cyber-800 border-cyber-border text-slate-400'
            }`}
            title="Toggle Search Modifiers & Filters"
          >
            <Filter className="w-4 h-4" />
            {activeModifiersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/40">
                {activeModifiersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileFiltersOpen ? 'rotate-180 text-cyan-300' : 'text-slate-500'}`} />
          </button>

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

        {/* Modifiers & Field Filters Bar (Collapsible on Mobile, Persistent on Desktop) */}
        <div className={`${isMobileFiltersOpen ? 'flex animate-in fade-in slide-in-from-top-1 duration-150' : 'hidden'} sm:flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 text-xs font-mono pt-1 sm:pt-0`}>
          
          {/* Search Flags & Field Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 text-[11px] mr-1 hidden sm:inline-flex items-center gap-1">
              <Filter className="w-3 h-3" /> Modifiers:
            </span>

            {/* Regex Mode */}
            <button
              onClick={() => setIsRegex(!isRegex)}
              title="Toggle Regular Expression mode"
              className={`px-2 sm:px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 font-bold text-[11px] ${
                isRegex
                  ? 'bg-violet-500/20 border-violet-500/70 text-violet-300 shadow-glow-violet'
                  : 'bg-cyber-850 border-cyber-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>.*</span>
              <span>Regex</span>
            </button>

            {/* Case Sensitive */}
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Match Case sensitive"
              className={`px-2 sm:px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 font-bold text-[11px] ${
                caseSensitive
                  ? 'bg-cyan-500/20 border-cyan-500/70 text-cyan-300 shadow-glow-cyan'
                  : 'bg-cyber-850 border-cyber-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Aa</span>
              <span className="hidden xs:inline">Case</span>
            </button>

            {/* Invert Match */}
            <button
              onClick={() => setInvertMatch(!invertMatch)}
              title="Invert Match: Exclude lines matching query"
              className={`px-2 sm:px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 text-[11px] ${
                invertMatch
                  ? 'bg-rose-500/20 border-rose-500/70 text-rose-300'
                  : 'bg-cyber-850 border-cyber-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>!</span>
              <span>Invert</span>
            </button>

            <span className="text-slate-700 mx-0.5">|</span>

            {/* Live Streaming Mode Toggle */}
            <button
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              title="Live Stream Search: Stream matching lines progressively in real-time"
              className={`px-2 sm:px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 font-bold text-[11px] ${
                isLiveStreaming
                  ? 'bg-amber-500/20 border-amber-500/70 text-amber-300 shadow-glow-amber'
                  : 'bg-cyber-850 border-cyber-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Stream</span>
            </button>

            {/* Custom Rules Builder Trigger */}
            <button
              onClick={onOpenRules}
              title="Custom Delimiter & Regex Parser Rules"
              className="px-2 sm:px-2.5 py-1 rounded-md bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px] font-medium"
            >
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span className="hidden xs:inline">Rules</span>
              {rulesCount > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/40">
                  {rulesCount}
                </span>
              )}
            </button>

            <span className="text-slate-700 mx-0.5 hidden sm:inline">|</span>

            {/* Target Field Filter Selector */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-cyber-850 p-0.5 rounded-lg border border-cyber-border">
              <span className="text-[10px] text-slate-500 px-1 uppercase hidden sm:inline">Field:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'URL', label: 'URL' },
                { id: 'USER', label: 'User' },
                { id: 'PASS', label: 'Pass' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTargetField(tab.id)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition-colors ${
                    targetField === tab.id
                      ? 'bg-cyber-700 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Query Chips (Scrollable on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <span className="text-slate-500 text-[10px] sm:text-[11px] shrink-0">Quick:</span>
            {sampleChips.map(chip => (
              <button
                key={chip.label}
                onClick={() => {
                  setQuery(chip.query);
                  setTimeout(() => onExecuteSearch(chip.query), 50);
                }}
                className="px-2 py-0.5 rounded bg-cyber-800/90 hover:bg-cyber-750 text-slate-300 hover:text-cyan-300 border border-cyber-border text-[10px] sm:text-[11px] transition-colors shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
