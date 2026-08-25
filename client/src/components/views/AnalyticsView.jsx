import React, { useMemo } from 'react';
import { 
  Globe, HardDrive, Filter, BarChart3, Layers, FileText, 
  ShieldAlert, ShieldCheck, Key, Lock, Mail, Cpu, Flame,
  TrendingUp, CheckCircle2, AlertTriangle, Hash, Sparkles,
  Database, Timer
} from 'lucide-react';

export default function AnalyticsView({
  analytics = {},
  results = [],
  hasSearched = false,
  onApplyDomainFilter
}) {
  const safeAnalytics = analytics || {};

  // 1. Compute in-depth credential and security telemetry from results in memory
  const computedMetrics = useMemo(() => {
    if (!results || results.length === 0) return null;

    let emailCount = 0;
    let usernameCount = 0;
    let tokenCount = 0;
    let weakPassCount = 0;
    let mediumPassCount = 0;
    let strongPassCount = 0;
    let totalPassLen = 0;
    let passCountWithLen = 0;

    const emailProvidersMap = {};
    const commonPasswordsMap = {};
    const domainSet = new Set();
    const uniqueCombosSet = new Set();

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.domain && r.domain !== 'Other') domainSet.add(r.domain.toLowerCase());

      const comboKey = `${r.domain || ''}::${r.username || ''}::${r.password || r.token || ''}`;
      uniqueCombosSet.add(comboKey);

      if (r.token) {
        tokenCount++;
      }

      if (r.username) {
        if (r.username.includes('@')) {
          emailCount++;
          const domainPart = r.username.split('@')[1]?.toLowerCase().trim();
          if (domainPart) {
            emailProvidersMap[domainPart] = (emailProvidersMap[domainPart] || 0) + 1;
          }
        } else {
          usernameCount++;
        }
      }

      const pass = r.password;
      if (pass) {
        const len = pass.length;
        totalPassLen += len;
        passCountWithLen++;

        if (len < 8) weakPassCount++;
        else if (len <= 12) mediumPassCount++;
        else strongPassCount++;

        // Track frequent passwords (exclude ultra-long tokens)
        if (len < 40) {
          commonPasswordsMap[pass] = (commonPasswordsMap[pass] || 0) + 1;
        }
      }
    }

    const topEmailProviders = Object.entries(emailProvidersMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([provider, count]) => ({ provider, count }));

    const topCommonPasswords = Object.entries(commonPasswordsMap)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pass, count]) => ({ pass, count }));

    const avgPassLen = passCountWithLen > 0 ? (totalPassLen / passCountWithLen).toFixed(1) : 0;
    const uniquenessPct = results.length > 0 ? Math.round((uniqueCombosSet.size / results.length) * 100) : 100;

    return {
      totalRecords: results.length,
      uniqueCombos: uniqueCombosSet.size,
      uniquenessPct,
      distinctDomainsCount: domainSet.size,
      emailCount,
      usernameCount,
      tokenCount,
      weakPassCount,
      mediumPassCount,
      strongPassCount,
      avgPassLen,
      topEmailProviders,
      topCommonPasswords
    };
  }, [results]);

  // 2. Extract or dynamically derive top domains from results
  const topDomains = useMemo(() => {
    if (Array.isArray(safeAnalytics.topDomains) && safeAnalytics.topDomains.length > 0) {
      return safeAnalytics.topDomains;
    }
    if (!results || results.length === 0) return [];
    // Fallback: derive from active results
    const counts = {};
    for (const r of results) {
      const d = r.domain || 'Other';
      counts[d] = (counts[d] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));
  }, [safeAnalytics.topDomains, results]);

  // 3. Extract or dynamically derive file distribution from results
  const fileDistribution = useMemo(() => {
    if (Array.isArray(safeAnalytics.fileDistribution) && safeAnalytics.fileDistribution.length > 0) {
      return safeAnalytics.fileDistribution;
    }
    if (!results || results.length === 0) return [];
    // Fallback: derive from active results
    const counts = {};
    for (const r of results) {
      const f = r.filePath || 'logs.txt';
      counts[f] = (counts[f] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
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
          <h3 className="text-lg font-bold text-slate-200 mb-1">Telemetry & Insights Ready</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            Execute a search to view domain intelligence, password complexity distributions, and source log metrics.
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
    <div className="p-3 sm:p-6 overflow-y-auto h-full bg-cyber-950 font-mono space-y-4 sm:space-y-6">
      
      {/* 1. Top KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* KPI 1: Total Volume */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl border border-cyber-border bg-cyber-900/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Records</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-100 tracking-tight">
            {totalMatches.toLocaleString()}
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Active match volume</span>
          </div>
        </div>

        {/* KPI 2: Unique Combos */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl border border-cyber-border bg-cyber-900/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Unique Combos</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-300 tracking-tight">
            {computedMetrics?.uniqueCombos.toLocaleString() || '0'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{computedMetrics?.uniquenessPct}%</span>
            <span>uniqueness ratio</span>
          </div>
        </div>

        {/* KPI 3: Targeted Domains */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl border border-cyber-border bg-cyber-900/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 rounded-full blur-xl group-hover:bg-violet-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Target Hosts</span>
            <Globe className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-violet-300 tracking-tight">
            {computedMetrics?.distinctDomainsCount || topDomains.length || 0}
          </div>
          <div className="text-[10px] text-violet-400/80 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Distinct target hosts</span>
          </div>
        </div>

        {/* KPI 4: Security Exposure */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl border border-cyber-border bg-cyber-900/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Pass Avg Length</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-amber-300 tracking-tight">
            {computedMetrics?.avgPassLen || '0'} <span className="text-xs text-slate-400 font-normal">chars</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-rose-400 font-semibold">{computedMetrics?.weakPassCount.toLocaleString()}</span>
            <span>weak passwords (&lt;8)</span>
          </div>
        </div>

      </div>

      {/* 2. Main Analytics Grid (Top Targeted Domains & Source File Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Top 10 Targeted Domains & Services */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyber-border/80 bg-cyber-900/70 shadow-xl space-y-3">
          
          <div className="flex items-center justify-between border-b border-cyber-border/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Top Targeted Domains
                </h3>
                <p className="text-[10px] text-slate-500">Most targeted hosts in current search results</p>
              </div>
            </div>

            <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Click to Filter
            </span>
          </div>

          <div className="space-y-2 pt-1">
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
                    className="group cursor-pointer p-2 sm:p-2.5 rounded-xl bg-cyber-850/60 hover:bg-cyber-800/90 border border-cyber-border/60 hover:border-cyan-500/50 transition-all select-none shadow-sm hover:shadow-glow-cyan"
                    title={`Filter search by domain: ${item.domain}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-500 text-[10px] sm:text-[11px] font-bold w-4 text-right shrink-0">{idx + 1}.</span>
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

        {/* Match Distribution across Files */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyber-border/80 bg-cyber-900/70 shadow-xl space-y-3">
          
          <div className="flex items-center justify-between border-b border-cyber-border/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 shadow-glow-violet shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Match Distribution per File
                </h3>
                <p className="text-[10px] text-slate-500">Hit density and match volume per source log file</p>
              </div>
            </div>

            <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30">
              {fileDistribution.length} {fileDistribution.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {fileDistribution.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No file distribution data available.
              </div>
            ) : (
              fileDistribution.map((item, idx) => {
                const pct = Math.round((item.count / maxFileCount) * 100);
                const sharePct = totalMatches > 0 ? Math.round((item.count / totalMatches) * 100) : 0;

                return (
                  <div 
                    key={item.file} 
                    className="p-2 sm:p-2.5 bg-cyber-850/60 rounded-xl border border-cyber-border/60 hover:border-violet-500/50 transition-colors shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
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

      {/* 3. Secondary Telemetry Grid: Password Strength & Email Providers Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Card A: Password Complexity Distribution */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyber-border/80 bg-cyber-900/70 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-cyber-border/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-glow-amber shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Password Complexity Health
                </h3>
                <p className="text-[10px] text-slate-500">Security distribution by character length</p>
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Avg: {computedMetrics?.avgPassLen} chars
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Weak */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Weak (&lt; 8 chars)
                </span>
                <span className="text-slate-300 font-bold">
                  {computedMetrics?.weakPassCount.toLocaleString()}{' '}
                  <span className="text-slate-500 text-[10px]">
                    ({totalMatches > 0 ? Math.round(((computedMetrics?.weakPassCount || 0) / totalMatches) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-cyber-950 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-600 shadow-glow-rose"
                  style={{ width: `${totalMatches > 0 ? ((computedMetrics?.weakPassCount || 0) / totalMatches) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Medium */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Medium (8 – 12 chars)
                </span>
                <span className="text-slate-300 font-bold">
                  {computedMetrics?.mediumPassCount.toLocaleString()}{' '}
                  <span className="text-slate-500 text-[10px]">
                    ({totalMatches > 0 ? Math.round(((computedMetrics?.mediumPassCount || 0) / totalMatches) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-cyber-950 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-glow-amber"
                  style={{ width: `${totalMatches > 0 ? ((computedMetrics?.mediumPassCount || 0) / totalMatches) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Strong */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Strong (13+ chars)
                </span>
                <span className="text-slate-300 font-bold">
                  {computedMetrics?.strongPassCount.toLocaleString()}{' '}
                  <span className="text-slate-500 text-[10px]">
                    ({totalMatches > 0 ? Math.round(((computedMetrics?.strongPassCount || 0) / totalMatches) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-cyber-950 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-glow-emerald"
                  style={{ width: `${totalMatches > 0 ? ((computedMetrics?.strongPassCount || 0) / totalMatches) * 100 : 0}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Card B: Top Email Providers & Auth Identity */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyber-border/80 bg-cyber-900/70 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-cyber-border/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-glow-emerald shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Email Providers & Identity
                </h3>
                <p className="text-[10px] text-slate-500">Distribution of user email services</p>
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              {computedMetrics?.emailCount.toLocaleString()} emails
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {(!computedMetrics?.topEmailProviders || computedMetrics.topEmailProviders.length === 0) ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No email domain records found.
              </div>
            ) : (
              computedMetrics.topEmailProviders.map((item) => {
                const maxProvCount = computedMetrics.topEmailProviders[0]?.count || 1;
                const pct = Math.round((item.count / maxProvCount) * 100);

                return (
                  <div 
                    key={item.provider}
                    className="p-2 sm:p-2.5 bg-cyber-850/60 rounded-xl border border-cyber-border/60 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-200 font-semibold truncate text-[11px] sm:text-xs">
                          @{item.provider}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold text-xs">{item.count.toLocaleString()}</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-cyber-950 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-glow-emerald"
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
