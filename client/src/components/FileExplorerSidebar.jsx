import React, { useState } from 'react';
import { 
  FileText, Folder, FolderOpen, CheckSquare, Square, Search, Layers, 
  ChevronRight, ChevronDown, HardDrive, Eye, AlertCircle, X, Check, RotateCcw
} from 'lucide-react';

export default function FileExplorerSidebar({
  files = [],
  selectedFiles = [],
  onToggleSelectFile,
  onSelectAllFiles,
  onClearFileSelection,
  onQuickInspectFile,
  isLoading,
  isMobileOpen = false,
  onCloseMobile
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({ root: true });

  const isGlobalSearch = selectedFiles.length === 0;

  // Filter files by name/path
  const filteredFiles = files.filter(f => 
    f.relativePath.toLowerCase().includes(filterQuery.toLowerCase()) ||
    f.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Group files by top-level or relative directory
  const groupedTree = {};
  filteredFiles.forEach(file => {
    const parts = file.relativePath.split('/');
    if (parts.length === 1) {
      if (!groupedTree['Root']) groupedTree['Root'] = [];
      groupedTree['Root'].push(file);
    } else {
      const folderName = parts.slice(0, -1).join('/');
      if (!groupedTree[folderName]) groupedTree[folderName] = [];
      groupedTree[folderName].push(file);
    }
  });

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const getTagBadge = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('stealer') || lower.includes('redline') || lower.includes('combo')) {
      return <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">Stealer</span>;
    }
    if (lower.includes('token') || lower.includes('secret') || lower.includes('key')) {
      return <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0">Tokens</span>;
    }
    if (lower.includes('syslog') || lower.includes('auth') || lower.includes('server')) {
      return <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">Server</span>;
    }
    if (lower.includes('massive') || lower.includes('100k')) {
      return <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">25k+</span>;
    }
    return null;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden bg-cyber-900 font-mono text-xs">
      
      {/* Scope Header */}
      <div className="p-3 border-b border-cyber-border bg-cyber-850/90 space-y-2.5">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold tracking-wider text-slate-100 uppercase text-[11px]">
            <HardDrive className="w-4 h-4 text-cyber-accent" />
            <span>Scope & Log Files</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyber-950 text-slate-400 border border-cyber-border/80 font-semibold">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
            {/* Mobile Drawer Close */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg hover:bg-cyber-750 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search Master Selector */}
        <div 
          onClick={onClearFileSelection}
          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border select-none ${
            isGlobalSearch 
              ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border-cyan-500/50 shadow-glow-cyan text-cyan-200' 
              : 'bg-cyber-950/60 border-cyber-border text-slate-400 hover:bg-cyber-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg ${isGlobalSearch ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyber-800 text-slate-400'}`}>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-slate-100 truncate">Global Search</div>
              <div className="text-[10px] text-slate-400 truncate">Search all files recursively</div>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isGlobalSearch 
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' 
              : 'text-slate-500'
          }`}>
            {isGlobalSearch ? 'Active' : 'Select'}
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter files by name..."
            className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg glass-input text-slate-200 placeholder-slate-500 shadow-inner"
          />
          {filterQuery && (
            <button 
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Scope Status & Quick Action Bar */}
      <div className="px-3 py-1.5 bg-cyber-950/90 border-b border-cyber-border flex items-center justify-between text-[11px]">
        <span className="text-slate-400 truncate">
          Scope: <span className="text-cyan-300 font-semibold">{isGlobalSearch ? 'Global (All)' : `${selectedFiles.length} Selected`}</span>
        </span>
        {!isGlobalSearch && (
          <button
            onClick={onClearFileSelection}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset file selection to Global Search"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Modern Sleek Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && files.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <div className="animate-spin w-5 h-5 border-2 border-cyber-accent border-t-transparent rounded-full mx-auto mb-2.5" />
            Scanning log directory...
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-500/70" />
            No .txt log files found.
          </div>
        ) : (
          Object.entries(groupedTree).map(([folder, folderFiles]) => {
            const isExpanded = expandedFolders[folder] ?? true;
            return (
              <div key={folder} className="space-y-0.5">
                
                {/* Folder Row */}
                <div
                  onClick={() => toggleFolder(folder)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-cyber-850/70 cursor-pointer select-none transition-colors group"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-semibold truncate text-[11px] text-slate-300 group-hover:text-white">
                    {folder}
                  </span>
                  <span className="text-[10px] text-slate-600 ml-auto font-mono">
                    {folderFiles.length}
                  </span>
                </div>

                {/* Nested Tree Files */}
                {isExpanded && (
                  <div className="pl-3.5 space-y-0.5 border-l border-cyan-500/20 ml-3 py-0.5">
                    {folderFiles.map(file => {
                      const isSelected = selectedFiles.includes(file.relativePath);
                      const tagBadge = getTagBadge(file.name);

                      return (
                        <div
                          key={file.relativePath}
                          className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg transition-all cursor-pointer select-none border ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-sm'
                              : 'bg-cyber-950/40 hover:bg-cyber-850/80 border-transparent hover:border-cyber-border text-slate-300'
                          }`}
                          onClick={() => onToggleSelectFile(file.relativePath)}
                        >
                          {/* Left: Checkbox + Icon + Name & Meta */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelectFile(file.relativePath);
                              }}
                              className="text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400" />
                              )}
                            </button>

                            <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`} />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span 
                                  className={`truncate font-medium text-xs whitespace-nowrap ${isSelected ? 'text-cyan-200 font-semibold' : 'text-slate-200 group-hover:text-white'}`}
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                <span className="shrink-0">{file.formattedSize}</span>
                                <span className="text-slate-600 shrink-0">•</span>
                                <span className="text-emerald-400 font-semibold shrink-0">{file.lines.toLocaleString()} lines</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Tag Badge & Quick Inspect */}
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {tagBadge}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickInspectFile(file);
                              }}
                              title="Preview file context"
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cyber-700 rounded text-slate-400 hover:text-cyan-300 transition-all shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-84 xl:w-90 flex-col border-r border-cyber-border bg-cyber-900/60 shrink-0 h-full max-h-[calc(100vh-65px)] overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-84 max-w-[90vw] h-full shadow-2xl border-r border-cyber-border bg-cyber-900 animate-in slide-in-from-left duration-200 flex flex-col">
            {sidebarContent}
          </div>
          <div className="flex-1 cursor-pointer" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
}
