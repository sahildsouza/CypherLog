import React from 'react';
import { Shield, FolderTree, RefreshCw, Sliders, Database, Zap, Cpu, Menu, Layers } from 'lucide-react';

export default function Header({
  baseDir,
  totalFiles,
  formattedTotalSize,
  totalLines,
  selectedCount = 0,
  onRefreshFiles,
  onOpenConfig,
  onToggleMobileSidebar,
  isSearching,
  engineType = 'ripgrep'
}) {
  return (
    <header className="border-b border-cyber-border bg-cyber-900/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 transition-all shadow-lg">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Mobile Menu Button + Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Scope / Sidebar Drawer Button */}
          <button
            onClick={onToggleMobileSidebar}
            title="Open Log Files Explorer"
            className="lg:hidden flex items-center justify-center p-2 rounded-xl bg-cyber-850 hover:bg-cyber-800 text-cyan-400 border border-cyber-accent/30 shadow-glow-cyan shrink-0 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-cyber-accent/40 shadow-glow-cyan shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-cyber-accent" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyber-emerald border-2 border-cyber-950 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-bold tracking-wider text-slate-100 uppercase truncate">
                Cipher<span className="text-cyber-accent text-glow-cyan">Log</span>
              </h1>
              <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-mono font-semibold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/30 tracking-widest uppercase">
                v2.6
              </span>
            </div>
            <p className="hidden md:flex text-xs text-slate-400 font-mono items-center gap-2 truncate">
              <span>Log & Credential Inspector</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Sub-second {engineType}
              </span>
            </p>
          </div>
        </div>

        {/* Center Live Directory Indicator (Desktop & Tablet) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-850 border border-cyber-border/80 max-w-xs lg:max-w-md truncate">
          <FolderTree className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="truncate text-xs font-mono">
            <span className="text-slate-500">ROOT: </span>
            <span className="text-slate-300 font-medium hover:text-cyan-300 transition-colors" title={baseDir}>
              {baseDir || 'Scanning...'}
            </span>
          </div>
          <button
            onClick={onOpenConfig}
            title="Configure target logs directory"
            className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyber-750 hover:bg-cyber-700 text-slate-300 hover:text-cyan-300 transition-colors border border-cyber-border shrink-0 flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
          </button>
        </div>

        {/* Global Stats & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden xl:flex items-center gap-3 text-xs font-mono px-3 py-1.5 rounded-lg bg-cyber-850/60 border border-cyber-border/60">
            <div className="flex items-center gap-1 text-slate-400">
              <Database className="w-3.5 h-3.5 text-violet-400" />
              <span>{totalFiles || 0} files</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="text-slate-400">
              <span className="text-slate-200">{formattedTotalSize || '0 B'}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="text-slate-400">
              <span className="text-emerald-400">{(totalLines || 0).toLocaleString()}</span> lines
            </div>
          </div>

          {/* Directory change on mobile */}
          <button
            onClick={onOpenConfig}
            title="Configure target directory"
            className="md:hidden flex items-center justify-center p-2 rounded-lg bg-cyber-850 hover:bg-cyber-800 text-slate-300 border border-cyber-border transition-colors text-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Refresh Files Button */}
          <button
            onClick={onRefreshFiles}
            disabled={isSearching}
            title="Scan logs directory for new .txt files"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyber-accent border border-cyber-accent/30 text-xs font-mono font-medium transition-all shadow-glow-cyan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Rescan</span>
          </button>
        </div>

      </div>
    </header>
  );
}
