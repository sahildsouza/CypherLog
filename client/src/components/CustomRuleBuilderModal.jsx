import React, { useState, useEffect } from 'react';
import { 
  Sliders, Plus, Trash2, Check, X, Play, Code, FileText, 
  HelpCircle, Sparkles, CheckCircle2, AlertCircle, Layers, ArrowRight
} from 'lucide-react';

const PRESET_TEMPLATES = [
  {
    id: 'pipe-combo',
    name: 'Pipe Delimited (URL|User|Pass)',
    type: 'delimiter',
    delimiter: '|',
    columns: ['url', 'username', 'password'],
    sample: 'https://admin.portal.com/login|sec_admin@portal.com|P@ssw0rd2026!'
  },
  {
    id: 'triple-colon',
    name: 'Triple Colon (User:::Pass:::Email)',
    type: 'delimiter',
    delimiter: ':::',
    columns: ['username', 'password', 'email'],
    sample: 'john_doe:::SecretPass#999:::john@enterprise.org'
  },
  {
    id: 'tab-separated',
    name: 'Tab Separated (TSV)',
    type: 'delimiter',
    delimiter: '\t',
    columns: ['url', 'username', 'password'],
    sample: 'https://vpn.corp.net\tcorp_user\tWinter2026!#$'
  },
  {
    id: 'semicolon-combo',
    name: 'Semicolon (Domain;User;Pass;Pin)',
    type: 'delimiter',
    delimiter: ';',
    columns: ['url', 'username', 'password', 'token'],
    sample: 'banking.app.com;account_7781;P@ssw0rd!;PIN_9912'
  },
  {
    id: 'regex-auth-token',
    name: 'Regex: Token & Secret Extractor',
    type: 'regex',
    pattern: '(?<url>https?://[^\\s]+)\\s+(?<username>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)\\s+(?<token>ey[A-Za-z0-9._-]+)',
    columns: [],
    sample: 'https://api.cloud.io/v1 user@cloud.io eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG'
  }
];

export default function CustomRuleBuilderModal({
  isOpen,
  onClose,
  customRules = [],
  onSaveRules
}) {
  const [rules, setRules] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState(null);

  // Form Editor State
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('delimiter'); // 'delimiter' | 'regex'
  const [delimiter, setDelimiter] = useState(':');
  const [columns, setColumns] = useState(['url', 'username', 'password']);
  const [regexPattern, setRegexPattern] = useState('');
  
  // Test State
  const [testLine, setTestLine] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState(null);

  useEffect(() => {
    if (customRules && customRules.length > 0) {
      setRules(customRules);
      if (!selectedRuleId) {
        loadRuleIntoEditor(customRules[0]);
      }
    } else {
      // Load first preset by default
      loadPreset(PRESET_TEMPLATES[0]);
    }
  }, [customRules]);

  const loadRuleIntoEditor = (rule) => {
    setSelectedRuleId(rule.id);
    setRuleName(rule.name || '');
    setRuleType(rule.type || 'delimiter');
    setDelimiter(rule.delimiter || ':');
    setColumns(rule.columns || ['url', 'username', 'password']);
    setRegexPattern(rule.pattern || '');
    setTestLine(rule.sample || '');
    setTestResult(null);
    setTestError(null);
  };

  const loadPreset = (preset) => {
    setSelectedRuleId(null);
    setRuleName(preset.name);
    setRuleType(preset.type);
    setDelimiter(preset.delimiter || ':');
    setColumns(preset.columns || ['url', 'username', 'password']);
    setRegexPattern(preset.pattern || '');
    setTestLine(preset.sample || '');
    setTestResult(null);
    setTestError(null);
  };

  const handleAddColumn = () => {
    setColumns(prev => [...prev, 'ignore']);
  };

  const handleRemoveColumn = (index) => {
    if (columns.length <= 2) return;
    setColumns(prev => prev.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index, val) => {
    setColumns(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRunTest = async () => {
    if (!testLine.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    const currentRuleConfig = {
      name: ruleName || 'Test Rule',
      type: ruleType,
      delimiter,
      columns,
      pattern: regexPattern
    };

    try {
      const res = await fetch('/api/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule: currentRuleConfig,
          sampleLine: testLine
        })
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setTestResult(data.parsed);
      } else {
        setTestError(data.error || 'Sample line did not match pattern');
      }
    } catch (err) {
      setTestError('Failed to run rule test: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCurrentRule = () => {
    if (!ruleName.trim()) {
      setTestError('Please provide a name for this custom rule.');
      return;
    }

    const newRule = {
      id: selectedRuleId || `rule-${Date.now()}`,
      name: ruleName.trim(),
      type: ruleType,
      delimiter: ruleType === 'delimiter' ? delimiter : undefined,
      columns: ruleType === 'delimiter' ? columns : [],
      pattern: ruleType === 'regex' ? regexPattern : undefined,
      sample: testLine,
      enabled: true
    };

    let updatedRules = [];
    if (selectedRuleId && rules.some(r => r.id === selectedRuleId)) {
      updatedRules = rules.map(r => r.id === selectedRuleId ? newRule : r);
    } else {
      updatedRules = [...rules, newRule];
    }

    setRules(updatedRules);
    setSelectedRuleId(newRule.id);
    onSaveRules(updatedRules);
  };

  const handleDeleteRule = (ruleId, e) => {
    e.stopPropagation();
    const updated = rules.filter(r => r.id !== ruleId);
    setRules(updated);
    onSaveRules(updated);
    if (selectedRuleId === ruleId) {
      if (updated.length > 0) {
        loadRuleIntoEditor(updated[0]);
      } else {
        loadPreset(PRESET_TEMPLATES[0]);
      }
    }
  };

  const handleToggleRule = (ruleId, e) => {
    e.stopPropagation();
    const updated = rules.map(r => {
      if (r.id === ruleId) return { ...r, enabled: !r.enabled };
      return r;
    });
    setRules(updated);
    onSaveRules(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-cyber-900 border border-cyber-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        
        {/* Modal Header */}
        <div className="p-4 bg-cyber-850 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Custom Regex & Delimiter Parser Rules
              </h3>
              <p className="text-[11px] text-slate-400">
                Define custom field mappings and patterns for proprietary stealer logs
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

        {/* Modal Body: Left Rules List & Right Rule Editor */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
          
          {/* Left Panel: Saved Rules & Presets (4 Cols) */}
          <div className="md:col-span-4 p-3 border-r border-cyber-border/70 bg-cyber-950/70 flex flex-col gap-3">
            
            {/* New Rule Action */}
            <button
              onClick={() => loadPreset({
                name: 'New Custom Parser',
                type: 'delimiter',
                delimiter: '|',
                columns: ['url', 'username', 'password'],
                sample: 'domain.com|user@mail.com|SecretP@ss123'
              })}
              className="w-full py-2 px-3 rounded-xl bg-cyber-850 hover:bg-cyber-800 border border-cyber-border text-cyan-300 font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Rule</span>
            </button>

            {/* Saved Rules List */}
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold px-1">
                Active Custom Rules ({rules.length})
              </div>

              {rules.length === 0 ? (
                <div className="p-4 rounded-xl bg-cyber-900 border border-cyber-border/60 text-slate-500 text-center text-[11px]">
                  No custom rules saved yet. Click below to load a preset template.
                </div>
              ) : (
                rules.map(r => {
                  const isSelected = selectedRuleId === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => loadRuleIntoEditor(r)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected 
                          ? 'bg-cyber-800 border-cyan-500/70 text-cyan-200 shadow-glow-cyan' 
                          : 'bg-cyber-900 border-cyber-border/70 text-slate-300 hover:bg-cyber-850'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={r.enabled !== false}
                          onChange={(e) => handleToggleRule(r.id, e)}
                          className="rounded border-cyber-border bg-cyber-950 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="truncate">
                          <div className="font-semibold truncate">{r.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {r.type === 'delimiter' ? `Delim: '${r.delimiter}' (${r.columns?.join(', ')})` : 'Custom Regex'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteRule(r.id, e)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}

              {/* Presets List */}
              <div className="pt-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold px-1 mb-1">
                  Preset Templates
                </div>
                <div className="space-y-1">
                  {PRESET_TEMPLATES.map(p => (
                    <div
                      key={p.id}
                      onClick={() => loadPreset(p)}
                      className="p-2 rounded-lg bg-cyber-900 hover:bg-cyber-850 border border-cyber-border/50 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors flex items-center justify-between text-[11px]"
                    >
                      <span className="truncate">{p.name}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Right Panel: Rule Configuration & Live Tester (8 Cols) */}
          <div className="md:col-span-8 p-4 sm:p-5 space-y-4 overflow-y-auto">
            
            {/* Rule Name & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">Rule Name:</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. RedLine Pipe Combos"
                  className="w-full px-3 py-2 rounded-xl bg-cyber-950 border border-cyber-border text-slate-100 placeholder-slate-600 focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Parser Type:</label>
                <div className="grid grid-cols-2 gap-1 bg-cyber-950 p-1 rounded-xl border border-cyber-border">
                  <button
                    onClick={() => setRuleType('delimiter')}
                    className={`py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      ruleType === 'delimiter' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Delimiter
                  </button>
                  <button
                    onClick={() => setRuleType('regex')}
                    className={`py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      ruleType === 'regex' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Regex
                  </button>
                </div>
              </div>
            </div>

            {/* Delimiter Configuration */}
            {ruleType === 'delimiter' && (
              <div className="p-3.5 rounded-xl bg-cyber-950 border border-cyber-border space-y-3">
                
                {/* Delimiter string */}
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <label className="text-slate-400 block mb-1 font-semibold">Delimiter:</label>
                    <input
                      type="text"
                      value={delimiter}
                      onChange={(e) => setDelimiter(e.target.value)}
                      placeholder="e.g. | or :::"
                      className="w-full px-3 py-1.5 rounded-lg bg-cyber-900 border border-cyber-border text-cyan-300 text-center font-bold"
                    />
                  </div>

                  <div className="flex-1 text-[11px] text-slate-400">
                    Characters separating each column in the log line (e.g. <code className="text-cyan-300">|</code>, <code className="text-cyan-300">:::</code>, <code className="text-cyan-300">\t</code>, or <code className="text-cyan-300">;</code>).
                  </div>
                </div>

                {/* Column Mapping Order */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 font-semibold">Column Order Mapping:</label>
                    <button
                      onClick={handleAddColumn}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Column
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {columns.map((col, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-cyber-900 p-1.5 rounded-lg border border-cyber-border">
                        <span className="text-[10px] text-slate-500 font-bold px-1">#{idx + 1}</span>
                        <select
                          value={col}
                          onChange={(e) => handleColumnChange(idx, e.target.value)}
                          className="bg-cyber-950 text-slate-200 border border-cyber-border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-cyan-400"
                        >
                          <option value="url">URL / Domain</option>
                          <option value="username">Username / Email</option>
                          <option value="password">Password / Secret</option>
                          <option value="token">Token / API Key</option>
                          <option value="ignore">-- Ignore --</option>
                        </select>
                        {columns.length > 2 && (
                          <button
                            onClick={() => handleRemoveColumn(idx)}
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                            title="Remove Column"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Regex Configuration */}
            {ruleType === 'regex' && (
              <div className="p-3.5 rounded-xl bg-cyber-950 border border-cyber-border space-y-2">
                <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-violet-400" />
                  <span>Regular Expression with Named Capture Groups:</span>
                </label>
                <input
                  type="text"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  placeholder="(?<url>https?://[^:]+):(?<username>[^:]+):(?<password>.*)"
                  className="w-full px-3 py-2 rounded-xl bg-cyber-900 border border-cyber-border text-violet-300 font-mono text-[11px] focus:border-violet-400"
                />
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Supported capture groups: <code className="text-violet-300">{'?<url>'}</code>, <code className="text-cyan-300">{'?<username>'}</code>, <code className="text-amber-300">{'?<password>'}</code>, <code className="text-blue-300">{'?<token>'}</code></span>
                </div>
              </div>
            )}

            {/* Interactive Live Tester */}
            <div className="p-3.5 rounded-xl bg-cyber-950 border border-cyber-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live Rule Validation Box:</span>
                </label>

                <button
                  onClick={handleRunTest}
                  disabled={isTesting || !testLine}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 font-bold transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>Test Pattern</span>
                </button>
              </div>

              <input
                type="text"
                value={testLine}
                onChange={(e) => { setTestLine(e.target.value); setTestResult(null); setTestError(null); }}
                placeholder="Paste a sample log line here to test parsing..."
                className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-cyber-border text-slate-200 placeholder-slate-600 font-mono text-[11px] focus:border-cyan-400"
              />

              {/* Test Output Preview */}
              {testResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Match Successful! Structured Payload:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    <div className="bg-cyber-900 p-2 rounded border border-cyber-border">
                      <span className="text-slate-500 block text-[10px]">URL / Domain:</span>
                      <span className="text-cyan-300 truncate block">{testResult.domain} ({testResult.url})</span>
                    </div>

                    <div className="bg-cyber-900 p-2 rounded border border-cyber-border">
                      <span className="text-slate-500 block text-[10px]">Username / Email:</span>
                      <span className="text-amber-300 truncate block">{testResult.username}</span>
                    </div>

                    <div className="bg-cyber-900 p-2 rounded border border-cyber-border">
                      <span className="text-slate-500 block text-[10px]">Password / Secret:</span>
                      <span className="text-slate-200 truncate block">{testResult.password || testResult.token || '<empty>'}</span>
                    </div>
                  </div>
                </div>
              )}

              {testError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-cyber-850 border-t border-cyber-border flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Rules apply automatically across both Batch & Live Streaming searches.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-cyber-800 hover:bg-cyber-750 text-slate-300 font-medium transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleSaveCurrentRule}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold tracking-wide shadow-glow-cyan transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Rule</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
