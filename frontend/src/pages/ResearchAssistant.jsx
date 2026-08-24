/**
 * Research Assistant (AIRA) Chat Interface
 * ========================================
 * Interactive conversational interface backed by the ADAM-1 RAG & LLM Engine.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  BookOpen,
  Bot,
  User,
  RefreshCw,
  Cpu,
  HelpCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const SUGGESTED_PROMPTS = [
  'What is the role of Phocaeicola dorei in Alzheimer’s pathology?',
  'How do butyrate producers like Eubacterium rectale confer neuroprotection?',
  'Compare XGBoost vs Random Forest on the 30-seed ADAM benchmark.',
  'How do Clinical Frailty Scale and PPI medication alter gut microbiome diversity?',
  'What are the key bacterial mechanisms linking gut dysbiosis to amyloid burden?',
];

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export default function ResearchAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am **AIRA (Artificial Intelligence Research Assistant)** for the ADAM-1 Enhanced platform.\n\nI can help you analyze the **335-sample metagenomic cohort**, interpret **XGBoost & TreeSHAP biomarker rankings**, and retrieve **evidence-based biomedical literature** on the gut-brain axis in Alzheimer’s disease. How can I assist your research today?',
      provider: 'ADAM-1 Biomedical Expert Engine',
      citations: [
        { pmid: 'PMC8472911', title: 'Gut Microbiota Composition in Alzheimer’s Pathology' },
        { pmid: 'PMC9284102', title: 'Machine Learning Biomarkers in Longitudinal Cohorts' },
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeProvider, setActiveProvider] = useState('ADAM-1 Biomedical Expert Engine');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load AI Layer Status
  useEffect(() => {
    fetch(`${API_BASE}/ai/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.active_provider) {
          setActiveProvider(data.active_provider);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSend(textToSend) {
    const query = textToSend || inputQuery;
    if (!query.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.content,
          include_literature: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate response from AI Assistant');
      const data = await res.json();

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        provider: data.provider,
        citations: data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-8rem)]">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">AI Research Assistant (AIRA)</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-600/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              RAG &amp; Multi-Omics
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Conversational reasoning across metagenomics, ML model benchmarks, and PubMed literature.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="card px-3 py-1.5 flex items-center gap-2 bg-surface-900 border-surface-700 text-xs text-surface-400">
            <Cpu size={13} className="text-accent-500" />
            <span className="font-medium">Engine:</span>
            <span className="font-mono text-accent-600 dark:text-accent-300 font-bold">{activeProvider}</span>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => handleSend()} />}

      {/* ── Chat Canvas ── */}
      <div className="card flex-1 flex flex-col p-4 bg-gradient-to-b from-surface-800/60 to-surface-900/90 border border-surface-700/60 overflow-hidden min-h-0">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m) => {
            const isAssistant = m.role === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex gap-3 text-sm ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isAssistant
                      ? 'bg-accent-600/30 text-accent-300 border border-accent-500/40 shadow-sm'
                      : 'bg-primary-600/30 text-primary-300 border border-primary-500/40 shadow-sm'
                  }`}
                >
                  {isAssistant ? <Bot size={16} /> : <User size={16} />}
                </div>

                {/* Message Body */}
                <div className={`max-w-3xl space-y-2 ${isAssistant ? 'text-left' : 'text-right'}`}>
                  <div
                    className={`p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                      isAssistant
                        ? 'bg-surface-800/90 border border-surface-700/80 text-surface-100 shadow-md'
                        : 'bg-accent-600/25 border border-accent-500/40 text-white shadow-md'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Citations & Meta (Assistant only) */}
                  {isAssistant && m.citations && m.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.citations.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-surface-900 border border-surface-700/60 text-accent-300"
                        >
                          <BookOpen size={10} />
                          <span className="font-semibold">[{c.pmid}]</span>
                          <span className="text-surface-400 truncate max-w-[200px]">{c.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-surface-400">
                    <span>{m.timestamp}</span>
                    {isAssistant && m.provider && (
                      <>
                        <span>•</span>
                        <span className="text-accent-400">{m.provider}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-sm text-surface-400">
              <div className="w-8 h-8 rounded-lg bg-accent-600/20 text-accent-400 border border-accent-500/30 flex items-center justify-center shrink-0 animate-pulse">
                <Bot size={16} />
              </div>
              <div className="p-3 bg-surface-800/80 border border-surface-700/80 rounded-xl flex items-center gap-2">
                <LoadingSpinner message="AIRA is analyzing datasets and literature..." />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggested Prompts Chips ── */}
        <div className="pt-3 pb-2 border-t border-surface-700/40">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles size={11} className="text-warning-400" /> Suggested:
            </span>
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-surface-800/80 hover:bg-surface-700 border border-surface-700 text-surface-300 hover:text-white transition-all whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* ── Input Box ── */}
        <div className="relative pt-1">
          <textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AIRA anything about gut microbiome, Alzheimer's biomarkers, or model results... (Press Enter to send)"
            rows={2}
            disabled={loading}
            className="w-full bg-surface-900 border border-surface-600 rounded-xl px-4 py-2.5 text-xs text-white placeholder-surface-400 focus:outline-none focus:border-accent-500 resize-none pr-12 shadow-inner"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || loading}
            className="absolute right-3 bottom-4 p-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-40 disabled:hover:bg-accent-600 text-white transition-all shadow-md shadow-accent-950/40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
