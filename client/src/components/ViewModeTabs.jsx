import React, { useEffect } from 'react';
import { Table, Terminal, BarChart3, Timer, Database } from 'lucide-react';

/**
 * Format execution time dynamically:
 * - < 1s: "45 ms"
 * - 1s - 59s: "2.35 s"
 * - 1m - 59m: "1m 14s"
 * - >= 1hr: "1h 22m"
 */
function formatExecutionTime(ms) {
  if (ms === undefined || ms === null || isNaN(ms)) return '0 ms';
  if (ms < 1000) {
    return `${Math.round(ms * 10) / 10} ms`;
  }
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)} s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.round(totalSeconds % 60);
  if (totalMinutes < 60) {
    return remainingSeconds > 0 ? `${totalMinutes}m ${remainingSeconds}s` : `${totalMinutes}m`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalHours}h`;
}

export default function ViewModeTabs({
  activeTab,
  setActiveTab,
  totalResults = 0,
  metrics = null
}) {
  const tabs = [
    { id: 'TABLE', label: 'Structured Table', shortLabel: 'Table', icon: Table, shortcut: '1' },
    { id: 'RAW', label: 'Raw Log Stream', shortLabel: 'Raw', icon: Terminal, shortcut: '2' },
    { id: 'ANALYTICS', label: 'Analytics & Insights', shortLabel: 'Analytics', icon: BarChart3, shortcut: '3' }
  ];

  // Shortcut switching: 1, 2, 3
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (e.key === '1') setActiveTab('TABLE');
      if (e.key === '2') setActiveTab('RAW');
      if (e.key === '3') setActiveTab('ANALYTICS');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-cyber-border bg-cyber-900/95 backdrop-blur-md flex items-center justify-between gap-2 overflow-x-auto no-scrollbar font-mono text-xs">
      
      {/* Left: View Mode Tab Switchers */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium transition-all text-xs shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-cyber-800 text-cyan-300 border border-cyber-accent/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-cyber-850 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyber-accent' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-cyber-950/80 text-slate-500 border border-cyber-border">
                {tab.shortcut}
              </kbd>
            </button>
          );
        })}
      </div>

      {/* Right: Search Execution Speed & Results Count Strip */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-[11px] sm:text-xs">
        {metrics ? (
          <>
            {/* Speed Badge */}
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold shadow-glow-emerald"
              title={`Total query execution time: ${metrics.executionTimeMs} ms`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{formatExecutionTime(metrics.executionTimeMs)}</span>
            </div>

            {/* Results Count */}
            <div className="flex items-center gap-1 text-slate-300">
              <span>
                <strong className="text-cyan-300 font-bold">{totalResults.toLocaleString()}</strong> results
              </span>
              {metrics.totalMatches !== undefined && metrics.totalMatches !== totalResults && (
                <>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-400 hidden xs:inline">
                    {metrics.totalMatches.toLocaleString()} raw
                  </span>
                </>
              )}
            </div>

            {/* Files Scanned & Throughput (Hidden on mobile) */}
            {metrics.filesScanned > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span className="text-slate-700">•</span>
                <Database className="w-3 h-3 text-slate-500" />
                <span>{metrics.filesScanned} files</span>
                {metrics.throughputMBs > 0 && (
                  <>
                    <span className="text-slate-700">•</span>
                    <span className="text-slate-500">{metrics.throughputMBs} MB/s</span>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          totalResults > 0 && (
            <div className="flex items-center gap-1 text-slate-300">
              <strong className="text-cyan-300 font-bold">{totalResults.toLocaleString()}</strong>
              <span className="text-slate-400">items</span>
            </div>
          )
        )}
      </div>

    </div>
  );
}
