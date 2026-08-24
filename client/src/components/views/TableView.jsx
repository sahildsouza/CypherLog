import React, { useState, useMemo } from 'react';
import { Copy, Check, ExternalLink, ShieldAlert, Key, Globe, FileText, ChevronLeft, ChevronRight, Hash, Search } from 'lucide-react';

export default function TableView({
  results = [],
  maskPasswords = false,
  hasSearched = false,
  onInspectContext
}) {
  const [copiedKeys, setCopiedKeys] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState('domain');
  const [sortAsc, setSortAsc] = useState(true);

  const handleCopy = (text, idx, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    const key = `${idx}-${fieldName}`;
    setCopiedKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // Sorting (Memoized for high performance with up to 50k rows)
  const sorted = useMemo(() => {
    if (!results || results.length === 0) return [];
    return [...results].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [results, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentRows = sorted.slice(startIndex, startIndex + pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (results.length === 0) {
    if (!hasSearched) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 font-mono">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400 shadow-glow-cyan">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-200 mb-1">Ready to Search</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            Enter a search term, domain, username, or credential query above and click <span className="text-cyan-400 font-bold">SEARCH</span>.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-cyber-800 border border-cyber-border text-slate-400 font-mono">/</kbd> Focus Search</span>
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-cyber-800 border border-cyber-border text-slate-400 font-mono">Enter</kbd> Execute</span>
          </div>
        </div>
      );
    }

    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        <FileText className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p>No results found for current query and filters.</p>
        <p className="text-xs text-slate-600 mt-1">Try broadening your search term or choosing "Global Search".</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-cyber-950">
      
      {/* Table Container */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-cyber-900/95 sticky top-0 z-10 border-b border-cyber-border text-slate-400 select-none">
            <tr className="h-10">
              <th className="px-3 font-semibold w-12 min-w-[48px] text-center whitespace-nowrap align-middle">#</th>
              <th 
                onClick={() => handleSort('domain')}
                className="px-3 font-semibold min-w-[220px] whitespace-nowrap cursor-pointer hover:text-cyan-300 transition-colors align-middle"
              >
                Target URL / Domain {sortField === 'domain' && (sortAsc ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('username')}
                className="px-3 font-semibold min-w-[200px] whitespace-nowrap cursor-pointer hover:text-cyan-300 transition-colors align-middle"
              >
                Username / Email {sortField === 'username' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-3 font-semibold min-w-[180px] whitespace-nowrap align-middle">
                Password / Secret
              </th>
              <th 
                onClick={() => handleSort('filePath')}
                className="px-3 font-semibold min-w-[180px] whitespace-nowrap cursor-pointer hover:text-cyan-300 transition-colors align-middle"
              >
                Source File & Line {sortField === 'filePath' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-3 font-semibold text-left w-36 min-w-[140px] whitespace-nowrap align-middle">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-cyber-border/40">
            {currentRows.map((row, idx) => {
              const globalIdx = startIndex + idx;
              const isPasswordRevealed = !maskPasswords;
              const isToken = !!row.token;
              const displaySecret = isToken ? row.token : row.password;

              const isUserCopied = copiedKeys.has(`${globalIdx}-user`);
              const isPassCopied = copiedKeys.has(`${globalIdx}-pass`);
              const isUrlCopied = copiedKeys.has(`${globalIdx}-url`);
              const isComboCopied = copiedKeys.has(`${globalIdx}-combo`);

              return (
                <tr 
                  key={`${row.filePath}-${row.lineNumber}-${idx}`}
                  className="hover:bg-cyber-850/60 transition-colors group h-9"
                >
                  {/* Row Number */}
                  <td className="px-3 text-slate-500 text-center font-mono text-[11px] whitespace-nowrap align-middle">
                    {globalIdx + 1}
                  </td>

                  {/* Target URL / Domain */}
                  <td className="px-3 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-1.5 max-w-xs md:max-w-sm truncate">
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span 
                        className={`font-medium cursor-pointer transition-colors truncate ${
                          isUrlCopied ? 'text-emerald-300 font-semibold' : 'text-slate-200 hover:text-cyan-300'
                        }`} 
                        title={row.url}
                        onClick={() => handleCopy(row.url, globalIdx, 'url')}
                      >
                        {row.domain || row.url || 'N/A'}
                      </span>
                      {row.url && row.url.startsWith('http') && (
                        <a 
                          href={row.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-0.5 text-slate-500 hover:text-cyan-300 transition-colors shrink-0"
                          title="Open URL in new tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Username / Email */}
                  <td className="px-3 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-1.5 max-w-xs truncate">
                      <span 
                        className={`truncate cursor-pointer transition-colors ${
                          isUserCopied 
                            ? 'text-emerald-300 font-semibold' 
                            : (row.isEmail ? 'text-amber-300 hover:text-amber-200' : 'text-slate-200 hover:text-white')
                        }`}
                        title={row.username}
                        onClick={() => handleCopy(row.username, globalIdx, 'user')}
                      >
                        {row.username || '<empty>'}
                      </span>
                      {row.username && (
                        <button
                          onClick={() => handleCopy(row.username, globalIdx, 'user')}
                          className={`p-1 rounded transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                            isUserCopied
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-glow-emerald'
                              : 'bg-cyber-850 hover:bg-cyber-800 text-slate-400 hover:text-cyan-300 border border-cyber-border'
                          }`}
                          title={isUserCopied ? "Copied to clipboard" : "Copy Username / Email"}
                        >
                          {isUserCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Password / Secret */}
                  <td className="px-3 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-1.5 max-w-xs md:max-w-sm truncate">
                      <Key className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span 
                        className={`truncate font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          isPassCopied
                            ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/60 shadow-glow-emerald font-semibold'
                            : (displaySecret 
                                ? 'text-cyan-200 bg-cyber-900/80 border-cyber-border hover:border-cyan-400' 
                                : 'text-slate-600 border-transparent')
                        }`}
                        title={displaySecret}
                        onClick={() => handleCopy(displaySecret, globalIdx, 'pass')}
                      >
                        {displaySecret ? (
                          isPasswordRevealed ? displaySecret : '••••••••••••'
                        ) : (
                          '<empty>'
                        )}
                      </span>

                      {displaySecret && (
                        <button
                          onClick={() => handleCopy(displaySecret, globalIdx, 'pass')}
                          className={`p-1 rounded transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                            isPassCopied
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-glow-emerald'
                              : 'bg-cyber-850 hover:bg-cyber-800 text-slate-400 hover:text-cyan-300 border border-cyber-border'
                          }`}
                          title={isPassCopied ? "Copied to clipboard" : "Copy Password / Secret"}
                        >
                          {isPassCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Source File & Line */}
                  <td className="px-3 text-slate-400 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-1 max-w-[180px] truncate" title={`${row.filePath} : Line ${row.lineNumber}`}>
                      <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate text-slate-300">{row.filePath}</span>
                      <span className="text-cyan-400 font-semibold shrink-0">:{row.lineNumber}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 text-left whitespace-nowrap align-middle">
                    <div className="flex items-center justify-start gap-1.5">
                      {/* Copy Combo (url:user:pass or user:pass) */}
                      <button
                        onClick={() => {
                          const combo = row.url && row.url !== 'N/A' 
                            ? `${row.url}:${row.username}:${displaySecret}` 
                            : `${row.username}:${displaySecret}`;
                          handleCopy(combo, globalIdx, 'combo');
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          isComboCopied
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-glow-emerald font-semibold'
                            : 'bg-cyber-800 hover:bg-cyber-750 text-slate-300 hover:text-cyan-300 border border-cyber-border'
                        }`}
                        title={isComboCopied ? "Copied Combo to clipboard" : "Copy Combo format"}
                      >
                        {isComboCopied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{isComboCopied ? 'Copied' : 'Combo'}</span>
                      </button>

                      {/* Inspect Context */}
                      <button
                        onClick={() => onInspectContext(row)}
                        className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyber-accent/30 text-[10px] font-mono transition-colors flex items-center gap-1 shrink-0"
                        title="Inspect raw log context lines"
                      >
                        <Hash className="w-3 h-3 text-cyber-accent" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky Pagination Footer */}
      <div className="shrink-0 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-cyber-900/95 backdrop-blur-md border-t border-cyber-border sticky bottom-0 z-20 flex items-center justify-between gap-3 text-xs font-mono text-slate-300 shadow-2xl">
        {/* Left: Range and Page Size Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-200">{startIndex + 1}–{Math.min(startIndex + pageSize, sorted.length)}</span>
            <span className="text-slate-500 font-normal">of</span>
            <span className="font-bold text-cyan-400">{sorted.length.toLocaleString()}</span>
          </div>

          <span className="text-slate-700 hidden xs:inline">|</span>

          {/* Rows Dropdown with touch-friendly padding */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 hidden sm:inline text-xs">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-cyber-850 hover:bg-cyber-800 border border-cyber-border/90 text-cyan-300 font-semibold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {/* Right: Touch-Friendly Page Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-cyber-850 hover:bg-cyber-800 disabled:opacity-25 disabled:cursor-not-allowed border border-cyber-border text-slate-200 hover:text-cyan-300 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="px-2.5 py-1 rounded-lg bg-cyber-850/90 border border-cyber-border text-xs font-semibold text-slate-200 shadow-inner flex items-center gap-1">
            <span className="text-cyan-300 font-bold">{currentPage}</span>
            <span className="text-slate-600 font-normal">/</span>
            <span className="text-slate-400">{totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-cyber-850 hover:bg-cyber-800 disabled:opacity-25 disabled:cursor-not-allowed border border-cyber-border text-slate-200 hover:text-cyan-300 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
