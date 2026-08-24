import React, { useEffect } from 'react';
import { Table, Terminal, BarChart3, AlignJustify, AlignLeft } from 'lucide-react';

export default function ViewModeTabs({
  activeTab,
  setActiveTab,
  isCompact,
  setIsCompact,
  totalResults = 0
}) {
  const tabs = [
    { id: 'TABLE', label: 'Structured Table', shortLabel: 'Table', icon: Table, shortcut: '1' },
    { id: 'RAW', label: 'Raw Log Stream', shortLabel: 'Raw', icon: Terminal, shortcut: '2' },
    { id: 'ANALYTICS', label: 'Analytics & Insights', shortLabel: 'Analytics', icon: BarChart3, shortcut: '3' }
  ];

  // Shortcut switching: 1, 2, 3
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (e.key === '1') setActiveTab('TABLE');
      if (e.key === '2') setActiveTab('RAW');
      if (e.key === '3') setActiveTab('ANALYTICS');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-cyber-border bg-cyber-900 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
      
      {/* Tab Switchers */}
      <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-xs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium transition-all text-xs shrink-0 ${
                isActive
                  ? 'bg-cyber-800 text-cyan-300 border border-cyber-accent/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-cyber-850 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyber-accent' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-cyber-950/80 text-slate-500 border border-cyber-border">
                {tab.shortcut}
              </kbd>
            </button>
          );
        })}
      </div>

      {/* Density Toggle (for Table View) */}
      {activeTab === 'TABLE' && (
        <div className="flex items-center gap-1 text-xs font-mono text-slate-400">
          <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">Density:</span>
          <button
            onClick={() => setIsCompact(false)}
            title="Comfortable row density"
            className={`p-1 rounded ${!isCompact ? 'bg-cyber-800 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCompact(true)}
            title="Compact high-density view"
            className={`p-1 rounded ${isCompact ? 'bg-cyber-800 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
