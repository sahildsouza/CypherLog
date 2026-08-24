import React, { useState } from 'react';
import { 
  FileText, Folder, CheckSquare, Square, Search, Layers, 
  ChevronRight, ChevronDown, HardDrive, Filter, Eye, AlertCircle, X
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
      return <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">Stealer</span>;
    }
    if (lower.includes('token') || lower.includes('secret') || lower.includes('key')) {
      return <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">Tokens</span>;
    }
    if (lower.includes('syslog') || lower.includes('auth') || lower.includes('server')) {
      return <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Server</span>;
    }
    if (lower.includes('massive') || lower.includes('100k')) {
      return <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">25k+ Dataset</span>;
    }
    return null;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden bg-cyber-900">
      {/* Scope Header */}
      <div className="p-3.5 border-b border-cyber-border bg-cyber-850/95">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-200">
            <HardDrive className="w-4 h-4 text-cyber-accent" />
            <span>Scope & Log Files</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyber-800 text-slate-400 border border-cyber-border">
              {files.length} Files
            </span>
            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded hover:bg-cyber-750 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>


        {/* Global Search Master Toggle */}
        <div 
          onClick={onClearFileSelection}
          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
            isGlobalSearch 
              ? 'bg-cyber-accent/15 border-cyber-accent/60 shadow-glow-cyan text-cyan-200' 
              : 'bg-cyber-800/60 border-cyber-border text-slate-300 hover:bg-cyber-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className={`w-4 h-4 ${isGlobalSearch ? 'text-cyber-accent' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-medium font-mono">Global Search</div>
              <div className="text-[10px] text-slate-400">All log files recursively</div>
            </div>
          </div>
          <div className="text-[11px] font-mono font-bold text-cyber-accent">
            {isGlobalSearch ? 'ACTIVE' : 'SELECT'}
          </div>
        </div>

        {/* Quick Filter Input */}
        <div className="mt-2.5 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter files by name..."
            className="w-full text-xs font-mono pl-8 pr-2.5 py-1.5 rounded-lg glass-input text-slate-200 placeholder-slate-500"
          />
          {filterQuery && (
            <button 
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Selected Scope Indicator */}
      <div className="px-3.5 py-2 bg-cyber-950/80 border-b border-cyber-border/70 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">
          Target Scope: <span className="text-cyan-300 font-semibold">{isGlobalSearch ? 'Global (All Files)' : `${selectedFiles.length} Selected`}</span>
        </span>
        {!isGlobalSearch && (
          <button
            onClick={onClearFileSelection}
            className="text-xs text-cyber-rose hover:underline"
          >
            Reset to Global
          </button>
        )}
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {isLoading && files.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs font-mono">
            <div className="animate-spin w-5 h-5 border-2 border-cyber-accent border-t-transparent rounded-full mx-auto mb-2" />
            Scanning log directory...
          </div>
        ) : files.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs font-mono">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-500/70" />
            No .txt log files found in directory.
          </div>
        ) : (
          Object.entries(groupedTree).map(([folder, folderFiles]) => {
            const isExpanded = expandedFolders[folder] ?? true;
            return (
              <div key={folder} className="space-y-1">
                {/* Folder Header */}
                <div
                  onClick={() => toggleFolder(folder)}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-semibold text-slate-400 hover:text-slate-200 cursor-pointer rounded hover:bg-cyber-800/40 select-none"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">{folder}</span>
                  <span className="text-[10px] text-slate-600 ml-auto">({folderFiles.length})</span>
                </div>

                {/* File items */}
                {isExpanded && (
                  <div className="pl-3 space-y-1 border-l border-cyber-border/40 ml-2.5">
                    {folderFiles.map(file => {
                      const isSelected = selectedFiles.includes(file.relativePath);
                      return (
                        <div
                          key={file.relativePath}
                          className={`group flex items-start gap-2 p-2 rounded-lg text-xs font-mono transition-all border ${
                            isSelected
                              ? 'bg-cyber-accent/10 border-cyber-accent/50 text-cyan-200'
                              : 'bg-cyber-850/40 border-cyber-border/40 text-slate-300 hover:bg-cyber-800/70 hover:border-cyber-border'
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => onToggleSelectFile(file.relativePath)}
                            className="mt-0.5 text-slate-400 hover:text-cyber-accent transition-colors shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-cyber-accent" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          {/* File Details */}
                          <div 
                            onClick={() => onToggleSelectFile(file.relativePath)}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-slate-200 group-hover:text-cyan-300 transition-colors" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span>{file.formattedSize}</span>
                              <span>•</span>
                              <span className="text-emerald-400">{file.lines.toLocaleString()} lines</span>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {getTagBadge(file.name)}
                            </div>
                          </div>

                          {/* Quick Inspect Raw */}
                          <button
                            onClick={() => onQuickInspectFile(file)}
                            title="Preview file contents"
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cyber-700 rounded text-slate-400 hover:text-cyan-300 transition-all shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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
      <aside className="hidden lg:flex lg:w-80 flex-col border-r border-cyber-border bg-cyber-900/60 shrink-0 h-full max-h-[calc(100vh-65px)] overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-80 max-w-[85vw] h-full shadow-2xl border-r border-cyber-border bg-cyber-900 animate-in slide-in-from-left duration-200 flex flex-col">
            {sidebarContent}
          </div>
          <div className="flex-1 cursor-pointer" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
}

