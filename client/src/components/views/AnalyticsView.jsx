import React, { useMemo } from 'react';
import { Globe, HardDrive, FileText, BarChart3 } from 'lucide-react';

export default function AnalyticsView({
  analytics = {},
  results = [],
  hasSearched = false,
  onApplyDomainFilter
}) {
  const safeAnalytics = analytics || {};

  // 1. Extract or dynamically derive top domains from results
  const topDomains = useMemo(() => {
    if (Array.isArray(safeAnalytics.topDomains) && safeAnalytics.topDomains.length > 0) {
      return safeAnalytics.topDomains;
    }
    if (!results || results.length === 0) return [];
    const counts = {};
    for (const r of results) {
      const d = r.domain || 'Other';
      counts[d] = (counts[d] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([domain, count]) => ({ domain, count }));
  }, [safeAnalytics.topDomains, results]);

  // 2. Extract or dynamically derive file distribution from results
  const fileDistribution = useMemo(() => {
    if (Array.isArray(safeAnalytics.fileDistribution) && safeAnalytics.fileDistribution.length > 0) {
      return safeAnalytics.fileDistribution;
    }
    if (!results || results.length === 0) return [];
    const counts = {};
    for (const r of results) {
      const f = r.filePath || 'logs.txt';
      counts[f] = (counts[f] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([file, count]) => ({ file, count }));
  }, [safeAnalytics.fileDistribution, results]);

  // Early returns placed AFTER all hooks have executed unconditionally
  if (!results || results.length === 0) {
    if (!hasSearched) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 font-mono">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400 shadow-glow-cyan">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-200 mb-1">Analytics Ready</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            Execute a search query to analyze target domains and log file distribution.
          </p>
        </div>
      );
    }

    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        <BarChart3 className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p>No analytics data available for the current query.</p>
        <p className="text-xs text-slate-600 mt-1">Execute a search to view real-time log distribution insights.</p>
      </div>
    );
  }

  const maxDomainCount = topDomains.length > 0 ? Math.max(...topDomains.map(d => d.count || 0), 1) : 1;
  const maxFileCount = fileDistribution.length > 0 ? Math.max(...fileDistribution.map(f => f.count || 0), 1) : 1;
  const totalMatches = results.length;

  return (
    <div className="p-3 sm:p-6 overflow-y-auto h-full bg-cyber-950 font-mono">
      
      {/* 2 Focused, Clean & Responsive Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Card 1: Top Targeted Domains */}
        <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-cyber-border/80 bg-cyber-900/70 shadow-xl space-y-3 flex flex-col">
          
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-cyber-border/80 pb-3">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide truncate">
                  Top Targeted Domains
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Most targeted hosts in current search results</p>
              </div>
            </div>
          </div>

          {/* Domain List */}
          <div className="space-y-2 pt-1 flex-1">
            {topDomains.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No domain data extracted.
              </div>
            ) : (
              topDomains.map((item, idx) => {
                const pct = Math.round((item.count / maxDomainCount) * 100);
                const sharePct = totalMatches > 0 ? Math.round((item.count / totalMatches) * 100) : 0;

                return (
                  <div 
                    key={item.domain}
                    onClick={() => onApplyDomainFilter(item.domain)}
                    className="group cursor-pointer p-2 sm:p-2.5 rounded-xl bg-cyber-850/60 hover:bg-cyber-800/90 border border-cyber-border/60 hover:border-cyan-500/50 transition-all select-none shadow-sm hover:shadow-glow-cyan active:scale-[0.99]"
                    title={`Filter search by domain: ${item.domain}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-slate-500 text-[10px] sm:text-[11px] font-bold w-4 sm:w-5 text-right shrink-0">{idx + 1}.</span>
                        <span className="text-slate-200 group-hover:text-cyan-300 font-semibold truncate text-[11px] sm:text-xs">
                          {item.domain}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-cyan-400 font-bold text-xs">{item.count.toLocaleString()}</span>
                        <span className="text-slate-500 text-[10px]">({sharePct}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-cyber-950 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-glow-cyan transition-all duration-500" 
                        style={{ width: `${Math.max(pct, 2)}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 2: Match Distribution per File */}
        <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-cyber-border/80 bg-cyber-900/70 shadow-xl space-y-3 flex flex-col">
          
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-cyber-border/80 pb-3">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 shadow-glow-violet shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide truncate">
                  Match Distribution per File
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Hit density and volume per source log file</p>
              </div>
            </div>

            <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30 shrink-0">
              {fileDistribution.length} {fileDistribution.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {/* File List */}
          <div className="space-y-2 pt-1 flex-1">
            {fileDistribution.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No file distribution data available.
              </div>
            ) : (
              fileDistribution.map((item) => {
                const pct = Math.round((item.count / maxFileCount) * 100);
                const sharePct = totalMatches > 0 ? Math.round((item.count / totalMatches) * 100) : 0;

                return (
                  <div 
                    key={item.file} 
                    className="p-2 sm:p-2.5 bg-cyber-850/60 rounded-xl border border-cyber-border/60 hover:border-violet-500/50 transition-colors shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-slate-200 font-semibold truncate text-[11px] sm:text-xs" title={item.file}>
                          {item.file}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-violet-400 font-bold text-xs">{item.count.toLocaleString()}</span>
                        <span className="text-slate-500 text-[10px]">({sharePct}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-cyber-950 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 shadow-glow-violet transition-all duration-500" 
                        style={{ width: `${Math.max(pct, 2)}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
