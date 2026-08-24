import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import FileExplorerSidebar from './components/FileExplorerSidebar';
import SearchControlBar from './components/SearchControlBar';
import MetricsBar from './components/MetricsBar';
import ViewModeTabs from './components/ViewModeTabs';
import TableView from './components/views/TableView';
import RawStreamView from './components/views/RawStreamView';
import AnalyticsView from './components/views/AnalyticsView';
import ContextDrawer from './components/ContextDrawer';
import ExportModal from './components/ExportModal';
import ConfigModal from './components/ConfigModal';
import CustomRuleBuilderModal from './components/CustomRuleBuilderModal';
import { Shield, Sparkles, Terminal, HardDrive, RefreshCw } from 'lucide-react';

export default function App() {
  // Directory & Files State
  const [baseDir, setBaseDir] = useState('');
  const [files, setFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [formattedTotalSize, setFormattedTotalSize] = useState('0 B');
  const [totalLines, setTotalLines] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]); // Empty array = Global Search
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Search State
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [invertMatch, setInvertMatch] = useState(false);
  const [targetField, setTargetField] = useState('ALL');
  const [autoSearch, setAutoSearch] = useState(false);

  // Custom Rules State (persisted in localStorage)
  const [customRules, setCustomRules] = useState(() => {
    try {
      const saved = localStorage.getItem('cipherlog_custom_rules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Stream Abort Ref
  const activeStreamAbortRef = useRef(null);

  // Results & Analytics State
  const [searchResults, setSearchResults] = useState([]);
  const [deduplicatedResults, setDeduplicatedResults] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isDeduplicated, setIsDeduplicated] = useState(false);
  const [maskPasswords, setMaskPasswords] = useState(true);

  // View & UI State
  const [activeTab, setActiveTab] = useState('TABLE'); // 'TABLE' | 'RAW' | 'ANALYTICS'
  const [isCompact, setIsCompact] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // 1. Fetch Discovered Files
  const fetchFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.success) {
        setBaseDir(data.baseDir);
        setFiles(data.files || []);
        setTotalFiles(data.totalFiles || 0);
        setFormattedTotalSize(data.formattedTotalSize || '0 B');
        setTotalLines(data.totalLines || 0);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // 2. Execute Search (Batch or Live Stream)
  const handleExecuteSearch = useCallback(async (customQuery) => {
    const activeQuery = customQuery !== undefined ? customQuery : query;
    setIsSearching(true);

    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current.abort();
      activeStreamAbortRef.current = null;
    }

    const enabledRules = customRules.filter(r => r.enabled !== false);

    // Live Streaming Mode via Server-Sent Events (SSE)
    if (isLiveStreaming) {
      const abortController = new AbortController();
      activeStreamAbortRef.current = abortController;

      setSearchResults([]);
      setDeduplicatedResults([]);
      setMetrics(null);

      const params = new URLSearchParams({
        query: activeQuery,
        targetFiles: JSON.stringify(selectedFiles),
        isRegex: String(isRegex),
        caseSensitive: String(caseSensitive),
        invertMatch: String(invertMatch),
        targetField,
        customRules: JSON.stringify(enabledRules),
        maxResults: '50000'
      });

      try {
        const response = await fetch(`/api/search/stream?${params.toString()}`, {
          signal: abortController.signal
        });

        if (!response.body) {
          throw new Error('ReadableStream not supported on this browser');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        const allItems = [];
        const uniqueMap = new Map();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || ''; // Keep incomplete trailing fragment

          for (const block of blocks) {
            const eventMatch = block.match(/event:\s*([^\n]+)/);
            const dataMatch = block.match(/data:\s*([\s\S]+)/);
            const event = eventMatch ? eventMatch[1].trim() : 'message';
            const dataStr = dataMatch ? dataMatch[1].trim() : '';

            if (event === 'chunk') {
              try {
                const chunk = JSON.parse(dataStr);
                if (Array.isArray(chunk)) {
                  allItems.push(...chunk);
                  for (const item of chunk) {
                    const key = item.username && item.password 
                      ? `${item.domain}::${item.username}::${item.password}`
                      : `${item.filePath}::${item.lineNumber}::${item.raw}`;
                    if (!uniqueMap.has(key)) uniqueMap.set(key, item);
                  }
                  setSearchResults([...allItems]);
                  setDeduplicatedResults(Array.from(uniqueMap.values()));
                }
              } catch (e) {
                console.error('Error parsing stream chunk:', e);
              }
            } else if (event === 'done') {
              try {
                const summary = JSON.parse(dataStr);
                setMetrics(summary.metrics);
                setAnalytics(summary.analytics);
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Stream error:', err);
        }
      } finally {
        setIsSearching(false);
      }
      return;
    }

    // Standard Batch Mode
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          targetFiles: selectedFiles,
          isRegex,
          caseSensitive,
          invertMatch,
          targetField,
          customRules: enabledRules,
          maxResults: 50000
        })
      });

      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
        setDeduplicatedResults(data.deduplicatedResults || []);
        setMetrics(data.metrics);
        setAnalytics(data.analytics);
      } else {
        console.error('Search error:', data.error);
      }
    } catch (err) {
      console.error('Search request failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedFiles, isRegex, caseSensitive, invertMatch, targetField, customRules, isLiveStreaming]);

  const handleSaveCustomRules = (newRules) => {
    setCustomRules(newRules);
    try {
      localStorage.setItem('cipherlog_custom_rules', JSON.stringify(newRules));
    } catch {}
  };

  // Initial Load: Fetch files and run default search for immediate data display
  useEffect(() => {
    fetchFiles().then(() => {
      // Execute initial search to populate dashboard
      handleExecuteSearch('');
    });
  }, [fetchFiles]);

  // Scope selection handlers
  const handleToggleSelectFile = (relPath) => {
    setSelectedFiles(prev => {
      if (prev.includes(relPath)) {
        return prev.filter(p => p !== relPath);
      } else {
        return [...prev, relPath];
      }
    });
  };

  const handleClearFileSelection = () => {
    setSelectedFiles([]);
  };

  const handleInspectContext = (item) => {
    setInspectTarget(item);
    setIsContextDrawerOpen(true);
  };

  const handleReseedLogs = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchFiles();
        handleExecuteSearch();
      }
    } catch (err) {
      console.error('Failed to reseed logs:', err);
    }
  };

  const handleApplyDomainFilter = (domain) => {
    setQuery(domain);
    setTargetField('URL');
    handleExecuteSearch(domain);
    setActiveTab('TABLE');
  };

  const displayedList = isDeduplicated ? deduplicatedResults : searchResults;

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden flex flex-col bg-cyber-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Header */}
      <Header
        baseDir={baseDir}
        totalFiles={totalFiles}
        formattedTotalSize={formattedTotalSize}
        totalLines={totalLines}
        selectedCount={selectedFiles.length}
        onRefreshFiles={fetchFiles}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onReseed={handleReseedLogs}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isSearching={isSearching || isLoadingFiles}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar: File Discovery & Scope Picker */}
        <FileExplorerSidebar
          files={files}
          selectedFiles={selectedFiles}
          onToggleSelectFile={handleToggleSelectFile}
          onClearFileSelection={handleClearFileSelection}
          onQuickInspectFile={(file) => handleInspectContext({ filePath: file.relativePath, lineNumber: 1 })}
          isLoading={isLoadingFiles}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Right Dashboard Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-cyber-950">
          
          {/* Query Execution Controls */}
          <SearchControlBar
            query={query}
            setQuery={setQuery}
            onExecuteSearch={handleExecuteSearch}
            isSearching={isSearching}
            isRegex={isRegex}
            setIsRegex={setIsRegex}
            caseSensitive={caseSensitive}
            setCaseSensitive={setCaseSensitive}
            invertMatch={invertMatch}
            setInvertMatch={setInvertMatch}
            targetField={targetField}
            setTargetField={setTargetField}
            autoSearch={autoSearch}
            setAutoSearch={setAutoSearch}
            isLiveStreaming={isLiveStreaming}
            setIsLiveStreaming={setIsLiveStreaming}
            onOpenRules={() => setIsRulesModalOpen(true)}
            rulesCount={customRules.filter(r => r.enabled !== false).length}
          />

          {/* Performance HUD & Metrics Bar */}
          <MetricsBar
            metrics={metrics}
            isDeduplicated={isDeduplicated}
            setIsDeduplicated={setIsDeduplicated}
            maskPasswords={maskPasswords}
            setMaskPasswords={setMaskPasswords}
            onOpenExport={() => setIsExportModalOpen(true)}
            displayedCount={displayedList.length}
          />

          {/* View Mode Switcher Tabs */}
          <ViewModeTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCompact={isCompact}
            setIsCompact={setIsCompact}
            totalResults={displayedList.length}
          />

          {/* Active View Container */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {activeTab === 'TABLE' && (
              <TableView
                results={displayedList}
                maskPasswords={maskPasswords}
                onInspectContext={handleInspectContext}
                isCompact={isCompact}
              />
            )}

            {activeTab === 'RAW' && (
              <RawStreamView
                results={displayedList}
                query={query}
                onInspectContext={handleInspectContext}
              />
            )}

            {activeTab === 'ANALYTICS' && (
              <AnalyticsView
                analytics={analytics}
                results={displayedList}
                onApplyDomainFilter={handleApplyDomainFilter}
              />
            )}
          </div>

        </main>

      </div>

      {/* Custom Regex & Delimiter Rule Builder Modal */}
      <CustomRuleBuilderModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        customRules={customRules}
        onSaveRules={handleSaveCustomRules}
      />

      {/* Raw Context Inspector Drawer */}
      <ContextDrawer
        isOpen={isContextDrawerOpen}
        onClose={() => setIsContextDrawerOpen(false)}
        targetItem={inspectTarget}
      />

      {/* Bulk Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allResults={searchResults}
        deduplicatedResults={deduplicatedResults}
        currentQuery={query}
      />

      {/* Directory Config Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentDir={baseDir}
        onUpdateDir={(newDir) => {
          setBaseDir(newDir);
          fetchFiles();
        }}
        onReseedLogs={handleReseedLogs}
      />

    </div>
  );
}
