import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import FileExplorerSidebar from './components/FileExplorerSidebar';
import SearchControlBar from './components/SearchControlBar';
import ViewModeTabs from './components/ViewModeTabs';
import TableView from './components/views/TableView';
import RawStreamView from './components/views/RawStreamView';
import AnalyticsView from './components/views/AnalyticsView';
import ContextDrawer from './components/ContextDrawer';
import ExportModal from './components/ExportModal';
import ConfigModal from './components/ConfigModal';
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
  const [isLiveStreaming, setIsLiveStreaming] = useState(true); // Stream by default
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [invertMatch, setInvertMatch] = useState(false);
  const [targetField, setTargetField] = useState('ALL');
  const [autoSearch, setAutoSearch] = useState(false);

  // Stream Abort Ref
  const activeStreamAbortRef = useRef(null);

  // Results & Analytics State
  const [searchResults, setSearchResults] = useState([]);
  const [deduplicatedResults, setDeduplicatedResults] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isDeduplicated, setIsDeduplicated] = useState(false);
  const [maskPasswords, setMaskPasswords] = useState(false); // Visible by default
  const [hasSearched, setHasSearched] = useState(false);

  // View & UI State
  const [activeTab, setActiveTab] = useState('TABLE'); // 'TABLE' | 'RAW' | 'ANALYTICS'
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cipherlog_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [inspectTarget, setInspectTarget] = useState(null);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem('cipherlog_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  }, []);

  // Global Ctrl+B / Cmd+B shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSidebar]);

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
    setHasSearched(true);

    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current.abort();
      activeStreamAbortRef.current = null;
    }

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
        let lastFlushTime = Date.now();

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
                      : `${item.filePath}::${item.lineNumber}`;
                    if (!uniqueMap.has(key)) {
                      uniqueMap.set(key, item);
                    }
                  }

                  // Throttle UI re-renders to every 120ms to prevent React freezing on high throughput
                  const now = Date.now();
                  if (now - lastFlushTime > 120) {
                    setSearchResults([...allItems]);
                    setDeduplicatedResults(Array.from(uniqueMap.values()));
                    lastFlushTime = now;
                  }
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

        // Final flush on stream complete
        setSearchResults([...allItems]);
        setDeduplicatedResults(Array.from(uniqueMap.values()));
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
  }, [query, selectedFiles, isRegex, caseSensitive, invertMatch, targetField, isLiveStreaming]);

  // Initial Load: Fetch discovered files only (no automatic full scan on app opened)
  useEffect(() => {
    fetchFiles();
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
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
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
          onQuickInspectFile={(file) => handleInspectContext({ filePath: file.relativePath || file.name || (typeof file === 'string' ? file : ''), lineNumber: 1 })}
          isLoading={isLoadingFiles}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isDesktopCollapsed={isSidebarCollapsed}
          onToggleDesktopCollapse={handleToggleSidebar}
        />

        {/* Right Dashboard Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-cyber-950">
          
          {/* Query Execution Controls (with Fields, Unique, Mask, Export in 1 line) */}
          <SearchControlBar
            query={query}
            setQuery={setQuery}
            onExecuteSearch={handleExecuteSearch}
            isSearching={isSearching}
            targetField={targetField}
            setTargetField={setTargetField}
            isDeduplicated={isDeduplicated}
            setIsDeduplicated={setIsDeduplicated}
            maskPasswords={maskPasswords}
            setMaskPasswords={setMaskPasswords}
            onOpenExport={() => setIsExportModalOpen(true)}
            streamMatchCount={searchResults.length}
          />

          {/* View Mode Switcher Tabs with Speed & Results metrics beside tabs */}
          <ViewModeTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            totalResults={displayedList.length}
            metrics={metrics}
          />

          {/* Active View Container */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {activeTab === 'TABLE' && (
              <TableView
                results={displayedList}
                maskPasswords={maskPasswords}
                hasSearched={hasSearched}
                onInspectContext={handleInspectContext}
              />
            )}

            {activeTab === 'RAW' && (
              <RawStreamView
                results={displayedList}
                query={query}
                hasSearched={hasSearched}
                onInspectContext={handleInspectContext}
              />
            )}

            {activeTab === 'ANALYTICS' && (
              <AnalyticsView
                analytics={analytics}
                results={displayedList}
                hasSearched={hasSearched}
                onApplyDomainFilter={handleApplyDomainFilter}
              />
            )}
          </div>

        </main>

      </div>

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
      />

    </div>
  );
}
