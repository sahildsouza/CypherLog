import React from 'react';
import { BarChart3, Globe, Shield, HardDrive, KeyRound, Sparkles, Filter } from 'lucide-react';

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
      </div>
    );
  }

  const { topDomains = [], strengthDistribution = {}, fileDistribution = [] } = analytics;
  const total = results.length;

  // Calculate Credential Types
  let emailCount = 0;
  let userCount = 0;
  let tokenCount = 0;
  let stealerBlockCount = 0;

  results.forEach(r => {
    if (r.type === 'JWT_TOKEN' || r.type === 'API_KEY') tokenCount++;
    else if (r.type === 'STEALER_MULTILINE') stealerBlockCount++;
    else if (r.isEmail) emailCount++;
    else userCount++;
  });

  const maxDomainCount = Math.max(...topDomains.map(d => d.count), 1);
  const maxFileCount = Math.max(...fileDistribution.map(f => f.count), 1);

  const strengthOrder = [
    { key: 'Very Strong', label: 'Very Strong (>45 bits)', color: 'bg-emerald-500', text: 'text-emerald-400' },
    { key: 'Strong', label: 'Strong (>28 bits)', color: 'bg-cyan-500', text: 'text-cyan-400' },
    { key: 'Medium', label: 'Medium', color: 'bg-amber-500', text: 'text-amber-400' },
    { key: 'Weak', label: 'Weak / Common', color: 'bg-rose-500', text: 'text-rose-400' },
    { key: 'Cryptographic', label: 'JWT / Cryptographic', color: 'bg-violet-500', text: 'text-violet-400' },
    { key: 'API Key', label: 'API Key / Secret', color: 'bg-blue-500', text: 'text-blue-400' },
    { key: 'None', label: 'None / Generic Log', color: 'bg-slate-600', text: 'text-slate-400' }
  ];

  return (
    <div className="p-3 sm:p-6 overflow-y-auto h-full bg-cyber-950 font-mono space-y-4 sm:space-y-6">
      
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="glass-panel p-4 rounded-xl border border-cyber-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Email Credentials</span>
            <Globe className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{emailCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {total > 0 ? Math.round((emailCount / total) * 100) : 0}% of matches
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-cyber-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Standard Usernames</span>
            <KeyRound className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{userCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {total > 0 ? Math.round((userCount / total) * 100) : 0}% of matches
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-cyber-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Leaked Tokens & Keys</span>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{tokenCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {total > 0 ? Math.round((tokenCount / total) * 100) : 0}% of matches
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-cyber-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Stealer Blocks</span>
            <Shield className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{stealerBlockCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Multi-line dumps parsed
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Targeted Domains */}
        <div className="glass-panel p-5 rounded-xl border border-cyber-border space-y-3">
          <div className="flex items-center justify-between border-b border-cyber-border pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyber-accent" />
              <span>Top 10 Targeted Domains & Services</span>
            </h3>
            <span className="text-xs text-slate-500">Click to filter</span>
          </div>

          <div className="space-y-2.5 pt-2">
            {topDomains.map(item => {
              const pct = Math.round((item.count / maxDomainCount) * 100);
              return (
                <div 
                  key={item.domain}
                  onClick={() => onApplyDomainFilter(item.domain)}
                  className="group cursor-pointer p-1.5 rounded hover:bg-cyber-850 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 group-hover:text-cyan-300 font-medium truncate max-w-xs">
                      {item.domain}
                    </span>
                    <span className="text-cyan-400 font-bold">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-cyber-900 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Password Strength & Entropy Breakdown */}
        <div className="glass-panel p-5 rounded-xl border border-cyber-border space-y-3">
          <div className="flex items-center justify-between border-b border-cyber-border pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Password Strength & Entropy Distribution</span>
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {strengthOrder.map(s => {
              const count = strengthDistribution[s.key] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={s.text}>{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-bold">{count.toLocaleString()}</span>
                      <span className="text-slate-500 text-[10px]">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-cyber-900 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${s.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* File Match Distribution */}
        <div className="glass-panel p-5 rounded-xl border border-cyber-border space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-cyber-border pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-violet-400" />
              <span>Match Distribution across Files</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {fileDistribution.map(item => {
              const pct = Math.round((item.count / maxFileCount) * 100);
              return (
                <div key={item.file} className="p-2 bg-cyber-900/70 rounded-lg border border-cyber-border/70">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 truncate max-w-[280px]" title={item.file}>
                      {item.file}
                    </span>
                    <span className="text-violet-400 font-bold">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-cyber-950 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
