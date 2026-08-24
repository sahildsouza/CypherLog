import React, { useState, useEffect } from 'react';
import { X, FileText, Copy, Check, Hash, Sliders, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';

export default function ContextDrawer({
  isOpen,
  onClose,
  targetItem
}) {
  const [contextData, setContextData] = useState(null);
  const [radius, setRadius] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !targetItem) return;

    const fetchContext = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          filePath: targetItem.filePath,
          lineNumber: targetItem.lineNumber,
          radius: String(radius)
        });
        const res = await fetch(`/api/file/context?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setContextData(data);
        } else {
          setError(data.error || 'Failed to load file context');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContext();
  }, [isOpen, targetItem, radius]);

  if (!isOpen || !targetItem) return null;

  const handleCopyAll = () => {
    if (!contextData?.lines) return;
    const text = contextData.lines.map(l => `${l.lineNumber}: ${l.content}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      
      {/* Slide-in Drawer Container */}
      <div className="w-full max-w-2xl bg-cyber-900 border-l border-cyber-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-cyber-border bg-cyber-850 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-cyber-800 text-cyan-400 border border-cyber-border">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono text-slate-100 truncate">
                  Raw Log Context Inspector
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Line {targetItem.lineNumber}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate" title={targetItem.filePath}>
                {targetItem.filePath}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cyber-750 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Controls Bar */}
        <div className="px-4 py-2 bg-cyber-950/80 border-b border-cyber-border flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Context Radius:</span>
            <div className="flex items-center gap-1">
              {[3, 7, 15, 25].map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    radius === r
                      ? 'bg-cyber-accent/20 border-cyber-accent text-cyan-300 shadow-glow-cyan'
                      : 'bg-cyber-850 border-cyber-border text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ±{r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-800 hover:bg-cyber-750 text-slate-300 hover:text-cyan-300 border border-cyber-border text-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Block</span>
          </button>
        </div>

        {/* Drawer Content: Surrounding Log Lines */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-cyber-950 space-y-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="animate-spin w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2" />
              Loading file context...
            </div>
          ) : error ? (
            <div className="p-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          ) : contextData?.lines ? (
            contextData.lines.map(line => {
              const isTarget = line.isTarget;
              return (
                <div
                  key={line.lineNumber}
                  className={`flex items-start gap-3 p-1.5 rounded transition-all ${
                    isTarget
                      ? 'bg-cyan-500/20 border border-cyan-400/80 shadow-glow-cyan text-cyan-100 font-bold'
                      : 'hover:bg-cyber-900 text-slate-300 border border-transparent'
                  }`}
                >
                  {/* Line Number */}
                  <span className={`w-12 text-right shrink-0 select-none ${isTarget ? 'text-cyan-300 font-bold' : 'text-slate-600'}`}>
                    {line.lineNumber}
                  </span>

                  {/* Marker */}
                  <span className="shrink-0 select-none">
                    {isTarget ? '👉' : '  '}
                  </span>

                  {/* Line Content */}
                  <span className="flex-1 break-all select-text font-mono">
                    {line.content || <span className="text-slate-600">&lt;empty line&gt;</span>}
                  </span>
                </div>
              );
            })
          ) : null}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-cyber-900 border-t border-cyber-border flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Target Payload: <span className="text-cyan-300">{targetItem.domain || targetItem.url}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-cyber-800 hover:bg-cyber-750 text-slate-200 border border-cyber-border"
          >
            Close
          </button>
        </div>

      </div>

    </div>
  );
}
