import React from 'react';
import { Globe, HardDrive, Filter, BarChart3, Layers, FileText } from 'lucide-react';

export default function AnalyticsView({
  analytics,
  results = [],
  onApplyDomainFilter
}) {
  if (!analytics || results.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        <BarChart3 className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p>No analytics data available for the current query.</p>
        <p className="text-xs text-slate-600 mt-1">Execute a search to view domain and file distribution insights.</p>
      </div>
    );
  }

  const { topDomains = [], fileDistribution = [] } = analytics;
  const maxDomainCount = Math.max(...topDomains.map(d => d.count), 1);
  const maxFileCount = Math.max(...fileDistribution.map(f => f.count), 1);
  const totalMatches = results.length;

  return (
    <div className="p-3 sm:p-6 overflow-y-auto h-full bg-cyber-950 font-mono space-y-4 sm:space-y-6">
      
      {/* Analytics Main Grid Layout: 2 Focused Panels (Domains & File Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* 1. Top 10 Targeted Domains & Services */}
        <div className="glass-panel p-4 sm:p-5 rounded-xl border border-cyber-border space-y-3">
          
          <div className="flex items-center justify-between border-b border-cyber-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Top 10 Targeted Domains & Services
                </h3>
                <p className="text-[10px] text-slate-500">Most targeted hosts in current search results</p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Click to filter
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {topDomains.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
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
                    className="group cursor-pointer p-2 rounded-lg bg-cyber-900/60 hover:bg-cyber-850 border border-cyber-border/60 hover:border-cyan-500/40 transition-all select-none"
                    title={`Filter search by domain: ${item.domain}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-500 text-[11px] w-4 text-right shrink-0">{idx + 1}.</span>
                        <span className="text-slate-200 group-hover:text-cyan-300 font-semibold truncate">
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

        {/* 2. Match Distribution across Files */}
        <div className="glass-panel p-4 sm:p-5 rounded-xl border border-cyber-border space-y-3">
          
          <div className="flex items-center justify-between border-b border-cyber-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400 shadow-glow-violet">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Match Distribution across Files
                </h3>
                <p className="text-[10px] text-slate-500">Hit density and match volumes per source file</p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30">
              {fileDistribution.length} {fileDistribution.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {fileDistribution.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No file distribution data available.
              </div>
            ) : (
              fileDistribution.map((item) => {
                const pct = Math.round((item.count / maxFileCount) * 100);
                const sharePct = totalMatches > 0 ? Math.round((item.count / totalMatches) * 100) : 0;

                return (
                  <div 
                    key={item.file} 
                    className="p-2 bg-cyber-900/60 rounded-lg border border-cyber-border/60 hover:border-violet-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-slate-200 font-semibold truncate" title={item.file}>
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
