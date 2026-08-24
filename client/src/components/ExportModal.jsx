import React, { useState, useMemo } from 'react';
import { X, Download, Copy, Check, FileSpreadsheet, FileCode, FileText, Layers, Sparkles } from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  allResults = [],
  deduplicatedResults = [],
  currentQuery = ''
}) {
  const [format, setFormat] = useState('URL_USER_PASS'); // 'URL_USER_PASS' | 'USER_PASS' | 'EMAIL_PASS' | 'CSV' | 'JSON' | 'MARKDOWN'
  const [useDeduplicated, setUseDeduplicated] = useState(true);
  const [copied, setCopied] = useState(false);

  const activeDataset = useDeduplicated ? deduplicatedResults : allResults;

  // Generate Export Payload
  const formattedContent = useMemo(() => {
    if (!activeDataset || activeDataset.length === 0) return 'No entries to export.';

    switch (format) {
      case 'URL_USER_PASS':
        return activeDataset
          .map(r => {
            const secret = r.token || r.password || '';
            const u = r.url && r.url !== 'N/A' ? r.url : (r.domain !== 'Unknown' ? `https://${r.domain}` : 'http://unknown');
            return `${u}:${r.username || ''}:${secret}`;
          })
          .join('\n');

      case 'USER_PASS':
        return activeDataset
          .map(r => `${r.username || ''}:${r.token || r.password || ''}`)
          .join('\n');

      case 'EMAIL_PASS':
        return activeDataset
          .filter(r => r.isEmail)
          .map(r => `${r.username}:${r.token || r.password || ''}`)
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
        const rows = activeDataset.slice(0, 500).map(r => 
          `| ${r.domain || 'N/A'} | ${r.username || 'N/A'} | \`${r.token || r.password || ''}\` | ${r.strength?.level || 'None'} | \`${r.filePath}:${r.lineNumber}\` |`
        );
        return [header, ...rows].join('\n') + (activeDataset.length > 500 ? '\n\n*(Truncated at 500 rows for Markdown preview)*' : '');
      }

      default:
        return '';
    }
  }, [activeDataset, format]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const extensions = {
      URL_USER_PASS: 'txt',
      USER_PASS: 'txt',
      EMAIL_PASS: 'txt',
      CSV: 'csv',
      JSON: 'json',
      MARKDOWN: 'md'
    };
    const ext = extensions[format] || 'txt';
    const filename = `cipherlog_${currentQuery || 'export'}_${Date.now()}.${ext}`;
    
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
    { id: 'URL_USER_PASS', label: 'URL:User:Pass', desc: 'Standard combo/stealer format', icon: FileText },
    { id: 'USER_PASS', label: 'User:Pass', desc: 'Login combinations only', icon: FileText },
    { id: 'EMAIL_PASS', label: 'Email:Pass', desc: 'Filter strictly valid email combos', icon: FileText },
    { id: 'CSV', label: 'CSV Spreadsheet', desc: 'Full metadata table with quotes', icon: FileSpreadsheet },
    { id: 'JSON', label: 'JSON Array', desc: 'Structured JSON objects for pipelines', icon: FileCode },
    { id: 'MARKDOWN', label: 'Markdown Table', desc: 'Formatted table for documentation', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-cyber-900 border border-cyber-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        
        {/* Modal Header */}
        <div className="p-4 bg-cyber-850 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Export & Bulk Copy Payload</h3>
              <p className="text-[11px] text-slate-400">
                {activeDataset.length.toLocaleString()} entries ready for export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-cyber-750 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Format Selector Grid */}
          <div>
            <label className="text-slate-400 block mb-2 font-semibold">Select Output Format:</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {formats.map(f => {
                const isSelected = format === f.id;
                const Icon = f.icon;
                return (
                  <div
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-violet-600/20 border-violet-500/80 text-violet-200 shadow-glow-violet'
                        : 'bg-cyber-850 border-cyber-border text-slate-400 hover:bg-cyber-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-400' : 'text-slate-500'}`} />
                      <span>{f.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-tight">{f.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scope Options: Deduplicated vs All */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-cyber-850 border border-cyber-border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyber-accent" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Deduplicate Extracted Entries</div>
                <div className="text-[10px] text-slate-400">
                  {useDeduplicated ? `Exporting ${deduplicatedResults.length} unique items` : `Exporting all ${allResults.length} raw matches`}
                </div>
              </div>
            </div>

            <button
              onClick={() => setUseDeduplicated(!useDeduplicated)}
              className={`px-3 py-1 rounded-lg border font-semibold text-xs transition-colors ${
                useDeduplicated
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-cyber-800 border-cyber-border text-slate-400'
              }`}
            >
              {useDeduplicated ? 'Unique Only' : 'Include Duplicates'}
            </button>
          </div>

          {/* Live Output Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-slate-400">
              <span>Preview (first 100 lines):</span>
              <span className="text-[10px] text-slate-500">{(formattedContent.length / 1024).toFixed(1)} KB</span>
            </div>
            <textarea
              readOnly
              value={formattedContent.split('\n').slice(0, 100).join('\n') + (formattedContent.split('\n').length > 100 ? '\n... [more entries]' : '')}
              className="w-full h-40 p-3 rounded-xl bg-cyber-950 border border-cyber-border text-cyan-200 font-mono text-[11px] select-text resize-none focus:outline-none"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-cyber-850 border-t border-cyber-border flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyber-800 hover:bg-cyber-750 text-slate-300 border border-cyber-border"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyber-750 hover:bg-cyber-700 text-cyan-300 border border-cyber-border transition-colors font-semibold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-glow-violet transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
