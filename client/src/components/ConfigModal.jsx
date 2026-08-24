import React, { useState } from 'react';
import { X, FolderTree, Check, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function ConfigModal({
  isOpen,
  onClose,
  currentDir,
  onUpdateDir,
  onReseedLogs
}) {
  const [newPath, setNewPath] = useState(currentDir || '');
  const [statusMsg, setStatusMsg] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPath.trim()) return;

    setIsUpdating(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/config/dir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDir: newPath.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Directory successfully set to: ${data.baseDir}` });
        onUpdateDir(data.baseDir);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update directory' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-cyber-900 border border-cyber-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-mono">
        
        {/* Header */}
        <div className="p-4 bg-cyber-850 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Configure Target Log Directory</h3>
              <p className="text-[11px] text-slate-400">Path isolation & traversal guard active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-cyber-750 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold block">Target Directory Path:</label>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="e.g. ~/logs or ./logs or C:\my_logs"
              className="w-full p-2.5 rounded-xl glass-input text-slate-100 placeholder-slate-500 font-mono text-xs"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Quick Paths:</span>
            <button
              type="button"
              onClick={() => setNewPath('~/logs')}
              className="px-2 py-1 rounded bg-cyber-800 hover:bg-cyber-750 text-slate-300 border border-cyber-border text-[11px]"
            >
              ~/logs
            </button>
            <button
              type="button"
              onClick={() => setNewPath('./logs')}
              className="px-2 py-1 rounded bg-cyber-800 hover:bg-cyber-750 text-slate-300 border border-cyber-border text-[11px]"
            >
              ./logs
            </button>
          </div>

          {/* Security Note */}
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
            <span>
              <strong>Security Guard Active:</strong> All queries and file previews are strictly jailed inside the chosen directory. Any path traversal attempt (e.g. <code>../</code>) is rejected with 403 Forbidden.
            </span>
          </div>

          {/* Status feedback */}
          {statusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-cyber-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onReseedLogs();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyber-800 hover:bg-cyber-750 text-amber-300 border border-cyber-border text-xs transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Reseed Sample Logs</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-cyber-800 hover:bg-cyber-750 text-slate-300 border border-cyber-border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save & Rescan'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
