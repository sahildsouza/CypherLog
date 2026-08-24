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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-cyber-900 border border-cyber-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-xs">
        
        {/* Header */}
        <div className="p-4 bg-cyber-850 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Configure Target Log Directory</h3>
              <p className="text-[11px] text-slate-400">Path isolation & traversal guard active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-cyber-750 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          
          {/* Path Input */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold block text-xs">Target Directory Path:</label>
            <div className="relative">
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="e.g. ~/logs, ./logs, /sdcard/Logs, or C:\logs"
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-950 border border-cyber-border text-slate-100 placeholder-slate-500 font-mono text-xs focus:border-cyan-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] font-medium block">Quick Paths:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: './logs', path: './logs' },
                { label: '~/logs', path: '~/logs' },
                { label: '/sdcard/Download', path: '/sdcard/Download' }
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setNewPath(item.path)}
                  className="px-2.5 py-1 rounded-lg bg-cyber-850 hover:bg-cyber-800 text-slate-300 hover:text-cyan-300 border border-cyber-border text-[11px] transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <strong className="text-cyan-200">Security Guard Active:</strong> All queries and file previews are strictly jailed inside the chosen directory. Path traversal attempts (e.g. <code>../</code>) are rejected with 403 Forbidden.
            </div>
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

          {/* Footer Actions: Clean 2-Tier Mobile & Desktop Layout */}
          <div className="pt-3 border-t border-cyber-border space-y-2">
            
            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyber-800 hover:bg-cyber-750 text-slate-300 font-medium text-xs transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50 text-center whitespace-nowrap"
              >
                {isUpdating ? 'Saving...' : 'Save & Rescan'}
              </button>
            </div>

            {/* Utility: Reseed Logs Button */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Need test logs?</span>
              <button
                type="button"
                onClick={() => {
                  onReseedLogs();
                  onClose();
                }}
                className="flex items-center gap-1 text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>Reseed Sample Logs</span>
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
}
