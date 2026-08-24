import React from 'react';
import { Timer, CheckCircle, Copy, Download, Layers, Eye, EyeOff, Sparkles, Database, FileSpreadsheet } from 'lucide-react';

export default function MetricsBar({
  metrics,
  isDeduplicated,
  setIsDeduplicated,
  maskPasswords,
  setMaskPasswords,
  onOpenExport,
  displayedCount
}) {
  if (!metrics) return null;

  return (
    <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-cyber-950/95 border-b border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
      
      {/* Top / Left: Execution Speed & Performance Counters */}
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
        
        {/* Speed Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold shadow-glow-emerald text-[11px] sm:text-xs shrink-0">
          <Timer className="w-3.5 h-3.5" />
          <span>{metrics.executionTimeMs} ms</span>
        </div>

        {/* Results Counter */}
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px] sm:text-xs">
          <span>
            <strong className="text-cyan-300 font-bold">{displayedCount.toLocaleString()}</strong> results
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">
            {metrics.totalMatches.toLocaleString()} raw
          </span>
        </div>

        {/* Files Scanned & Throughput (Tablet & Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[11px]">
          <span className="text-slate-700">•</span>
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>{metrics.filesScanned} files</span>
          {metrics.throughputMBs > 0 && (
            <>
              <span className="text-slate-700">•</span>
              <span className="text-slate-500">{metrics.throughputMBs} MB/s</span>
            </>
          )}
        </div>
      </div>

      {/* Bottom / Right: Controls Action Strip */}
      <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2">
        
        {/* Deduplication Switch */}
        <button
          onClick={() => setIsDeduplicated(!isDeduplicated)}
          title="Toggle deduplication to remove duplicate combos"
          className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
            isDeduplicated
              ? 'bg-cyber-accent/15 border-cyber-accent/50 text-cyan-200 shadow-glow-cyan'
              : 'bg-cyber-850 hover:bg-cyber-800 border-cyber-border text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyber-accent shrink-0" />
          <span className="truncate">Unique</span>
        </button>

        {/* Global Password Masking Toggle */}
        <button
          onClick={() => setMaskPasswords(!maskPasswords)}
          title="Mask or unmask passwords across the interface"
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-300 hover:text-slate-100 transition-colors text-[11px]"
        >
          {maskPasswords ? (
            <>
              <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Reveal</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Mask</span>
            </>
          )}
        </button>

        {/* Export & Bulk Action Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-glow-violet transition-all text-[11px]"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Export</span>
        </button>

      </div>

    </div>
  );
}
