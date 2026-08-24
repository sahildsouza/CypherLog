import React, { useState, useMemo } from 'react';
import { 
  X, Download, Copy, Check, FileSpreadsheet, FileCode, 
  FileText, Layers, Sparkles, Sliders, Terminal
} from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  allResults = [],
  deduplicatedResults = [],
  currentQuery = ''
}) {
  const [format, setFormat] = useState('URL_USER_PASS'); // 'URL_USER_PASS' | 'USER_PASS' | 'EMAIL_PASS' | 'CSV' | 'JSON' | 'MARKDOWN' | 'CUSTOM'
  const [delimiter, setDelimiter] = useState(':'); // ':' | '|' | ';' | '\t' | ','
  const [useDeduplicated, setUseDeduplicated] = useState(true);
  const [copied, setCopied] = useState(false);

  // Custom field toggles when in CUSTOM format
  const [customFields, setCustomFields] = useState({
    url: true,
    domain: false,
    username: true,
    password: true,
    filePath: false,
    lineNumber: false
  });

  const activeDataset = useDeduplicated ? deduplicatedResults : allResults;

  // Generate Export Payload
  const formattedContent = useMemo(() => {
    if (!activeDataset || activeDataset.length === 0) return 'No entries to export.';

    const sep = delimiter === '\\t' ? '\t' : delimiter;

    switch (format) {
      case 'URL_USER_PASS':
        return activeDataset
          .map(r => {
            const secret = r.token || r.password || '';
            const u = r.url && r.url !== 'N/A' ? r.url : (r.domain && r.domain !== 'Unknown' && r.domain !== 'Generic Auth' ? `https://${r.domain}` : 'http://unknown');
            return `${u}${sep}${r.username || ''}${sep}${secret}`;
          })
          .join('\n');

      case 'USER_PASS':
        return activeDataset
          .map(r => `${r.username || ''}${sep}${r.token || r.password || ''}`)
          .join('\n');

      case 'EMAIL_PASS':
        return activeDataset
          .filter(r => r.isEmail)
          .map(r => `${r.username}${sep}${r.token || r.password || ''}`)
          .join('\n');

      case 'CUSTOM':
        return activeDataset
          .map(r => {
            const parts = [];
            if (customFields.url) parts.push(r.url || 'N/A');
            if (customFields.domain) parts.push(r.domain || 'N/A');
            if (customFields.username) parts.push(r.username || 'N/A');
            if (customFields.password) parts.push(r.token || r.password || '');
            if (customFields.filePath) parts.push(r.filePath || '');
            if (customFields.lineNumber) parts.push(String(r.lineNumber || ''));
            return parts.join(sep);
          })
          .join('\n');

      case 'CSV': {
        const headers = ['URL', 'Domain', 'Username', 'Password/Secret', 'IsEmail', 'Strength', 'Entropy', 'SourceFile', 'LineNumber'];
        const rows = activeDataset.map(r => [
          `"${(r.url || '').replace(/"/g, '""')}"`,
          `"${(r.domain || '').replace(/"/g, '""')}"`,
          `"${(r.username || '').replace(/"/g, '""')}"`,
          `"${(r.token || r.password || '').replace(/"/g, '""')}"`,
          r.isEmail ? 'true' : 'false',
          `"${r.strength?.level || 'None'}"`,
          r.strength?.entropy || 0,
          `"${(r.filePath || '').replace(/"/g, '""')}"`,
          r.lineNumber
        ]);
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      }

      case 'JSON':
        return JSON.stringify(
          activeDataset.map(r => ({
            url: r.url,
            domain: r.domain,
            username: r.username,
            password: r.token || r.password,
            type: r.type,
            isEmail: r.isEmail,
            strength: r.strength,
            filePath: r.filePath,
            lineNumber: r.lineNumber
          })),
          null,
          2
        );

      case 'MARKDOWN': {
        const header = '| Domain | Username / Email | Password | Strength | Source File |\n| :--- | :--- | :--- | :--- | :--- |';
        const rows = activeDataset.slice(0, 300).map(r => 
          `| ${r.domain || 'N/A'} | ${r.username || 'N/A'} | \`${r.token || r.password || ''}\` | ${r.strength?.level || 'None'} | \`${r.filePath}:${r.lineNumber}\` |`
        );
        return [header, ...rows].join('\n') + (activeDataset.length > 300 ? '\n\n*(Truncated at 300 rows for Markdown preview)*' : '');
      }

      default:
        return '';
    }
  }, [activeDataset, format, delimiter, customFields]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getExtension = () => {
    switch (format) {
      case 'CSV': return 'csv';
      case 'JSON': return 'json';
      case 'MARKDOWN': return 'md';
      default: return 'txt';
    }
  };

  const handleDownload = () => {
    const ext = getExtension();
    const cleanQ = currentQuery ? currentQuery.replace(/[^a-zA-Z0-9_-]/g, '_') : 'export';
    const filename = `cipherlog_${cleanQ}_${Date.now()}.${ext}`;
    
    const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formats = [
    { id: 'URL_USER_PASS', label: 'URL:User:Pass', ext: 'txt' },
    { id: 'USER_PASS', label: 'User:Pass', ext: 'txt' },
    { id: 'EMAIL_PASS', label: 'Email:Pass', ext: 'txt' },
    { id: 'CSV', label: 'CSV', ext: 'csv' },
    { id: 'JSON', label: 'JSON', ext: 'json' },
    { id: 'MARKDOWN', label: 'Markdown', ext: 'md' },
    { id: 'CUSTOM', label: 'Custom', ext: 'txt' }
  ];

  const totalLines = formattedContent ? formattedContent.split('\n').length : 0;
  const payloadSizeKB = (formattedContent.length / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-mono">
      
      {/* Ultra-Compact Modal Container */}
      <div 
        className="bg-cyber-900 border border-cyber-border rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 1. Slim Header */}
        <div className="px-3.5 py-2.5 bg-cyber-850 border-b border-cyber-border flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide truncate">
              Export Payload
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold whitespace-nowrap">
              {activeDataset.length.toLocaleString()} entries
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-cyber-750 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Compact Body */}
        <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto flex-1 text-xs">
          
          {/* Format Selector Pills (Single row on desktop, 2 rows on mobile) */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Output Format
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {formats.map(f => {
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-glow-cyan font-bold'
                        : 'bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-cyan-500/30 text-cyan-200' : 'bg-cyber-900 text-slate-500'}`}>
                      .{f.ext}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope & Delimiter Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-cyber-850/90 border border-cyber-border text-[11px]">
            
            {/* Scope */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[10px] uppercase">Scope:</span>
              <div className="flex items-center bg-cyber-950 p-0.5 rounded-md border border-cyber-border">
                <button
                  onClick={() => setUseDeduplicated(true)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    useDeduplicated
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unique ({deduplicatedResults.length.toLocaleString()})
                </button>
                <button
                  onClick={() => setUseDeduplicated(false)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    !useDeduplicated
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-glow-violet'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({allResults.length.toLocaleString()})
                </button>
              </div>
            </div>

            {/* Delimiters */}
            {(format === 'URL_USER_PASS' || format === 'USER_PASS' || format === 'EMAIL_PASS' || format === 'CUSTOM') && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">Delimiter:</span>
                {[
                  { label: ':', val: ':' },
                  { label: '|', val: '|' },
                  { label: ';', val: ';' },
                  { label: '\\t', val: '\\t' },
                  { label: ',', val: ',' }
                ].map(d => (
                  <button
                    key={d.val}
                    onClick={() => setDelimiter(d.val)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                      delimiter === d.val
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/60 shadow-glow-cyan'
                        : 'bg-cyber-900 border border-cyber-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Custom Field Selector (Only for CUSTOM format) */}
          {format === 'CUSTOM' && (
            <div className="p-2.5 rounded-lg bg-cyber-850 border border-cyber-border space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-300 uppercase">Include Fields:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {[
                  { key: 'url', label: 'URL' },
                  { key: 'domain', label: 'Domain' },
                  { key: 'username', label: 'User / Email' },
                  { key: 'password', label: 'Password' },
                  { key: 'filePath', label: 'File Path' },
                  { key: 'lineNumber', label: 'Line Number' }
                ].map(field => (
                  <label 
                    key={field.key} 
                    className="flex items-center gap-1.5 p-1 rounded bg-cyber-900 border border-cyber-border/80 cursor-pointer select-none text-[10px]"
                  >
                    <input
                      type="checkbox"
                      checked={customFields[field.key]}
                      onChange={(e) => setCustomFields({ ...customFields, [field.key]: e.target.checked })}
                      className="accent-cyan-400 rounded"
                    />
                    <span className="text-slate-300">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Live Code Preview (No-wrap horizontal scrolling code box) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1 font-semibold">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>Payload Preview</span>
                <span className="text-slate-500 font-normal">
                  ({totalLines.toLocaleString()} lines • {payloadSizeKB} KB)
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer font-semibold"
                title="Quick copy entire payload"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Preview'}</span>
              </button>
            </div>

            {/* Compact Code Box with Horizontal Scroll */}
            <div className="rounded-lg bg-cyber-950 border border-cyber-border p-2 overflow-x-auto max-h-36 sm:max-h-40 shadow-inner">
              <pre className="font-mono text-[11px] text-cyan-200 whitespace-pre select-text leading-tight">
                {formattedContent.split('\n').slice(0, 50).join('\n') + (formattedContent.split('\n').length > 50 ? `\n... [and ${formattedContent.split('\n').length - 50} more entries]` : '')}
              </pre>
            </div>
          </div>

        </div>

        {/* 3. Slim Footer */}
        <div className="px-3.5 py-2.5 bg-cyber-850 border-t border-cyber-border flex items-center justify-between gap-2 shrink-0 text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-cyber-800 hover:bg-cyber-750 text-slate-400 hover:text-slate-200 border border-cyber-border font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-750 hover:bg-cyber-700 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 font-bold transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy All'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-glow-violet active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{getExtension()}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
