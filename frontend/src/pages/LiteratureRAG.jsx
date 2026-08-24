/**
 * Literature RAG & PubMed Research Explorer
 * =========================================
 * Semantic search and exploration over scientific publications on Alzheimer's & Microbiome.
 */
import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  Sparkles,
  Layers,
  Dna,
  CheckCircle2,
  Bookmark,
  Filter,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const TOPIC_CHIPS = [
  'All Publications',
  'Phocaeicola dorei',
  'Short-Chain Fatty Acids',
  'Alpha Diversity',
  'Machine Learning & SHAP',
  'Proton Pump Inhibitors',
];

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export default function LiteratureRAG() {
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('All Publications');

  // Initial load: fetch all indexed PubMed articles
  async function loadAllArticles() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ai/literature/articles`);
      if (!res.ok) throw new Error('Failed to load indexed literature');
      const data = await res.json();
      setArticles(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllArticles();
  }, []);

  async function handleSearch(searchQuery) {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q.trim()) {
      loadAllArticles();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ai/literature/search?q=${encodeURIComponent(q.trim())}&top_k=6`);
      if (!res.ok) throw new Error('Literature semantic search failed');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleTopicClick(topic) {
    setSelectedTopic(topic);
    if (topic === 'All Publications') {
      setQuery('');
      loadAllArticles();
    } else {
      setQuery(topic);
      handleSearch(topic);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">Scientific Literature &amp; RAG Store</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-600/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              PubMed Indexed
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Explore curated PubMed literature with semantic vector cosine search and topic filtering.
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadAllArticles} />}

      {/* ── Search Bar & Filter Chips ── */}
      <div className="card p-5 bg-gradient-to-r from-surface-800/80 to-surface-900/80 border border-surface-700/60 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-3 text-surface-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search literature semantic embeddings (e.g., 'neuroinflammation microglial activation', 'butyrate barrier integrity')..."
              className="w-full bg-surface-900 border border-surface-600 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-surface-400 focus:outline-none focus:border-accent-500 shadow-inner"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="btn-primary text-xs px-5 shadow-md shadow-accent-950/40"
          >
            Semantic Search
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter size={11} className="text-accent-400" /> Curated Topics:
          </span>
          {TOPIC_CHIPS.map((topic) => (
            <button
              key={topic}
              onClick={() => handleTopicClick(topic)}
              className={`shrink-0 text-[11px] px-3 py-1 rounded-full border transition-all ${
                selectedTopic === topic
                  ? 'bg-accent-600/30 border-accent-500 text-white font-semibold shadow-sm'
                  : 'bg-surface-800 border-surface-700 text-surface-300 hover:text-white'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* ── Articles List ── */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <LoadingSpinner message="Searching indexed PubMed semantic embeddings..." />
        </div>
      ) : articles.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 text-sm">
          No publications matched your semantic search query. Try broadening your terms.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((art) => (
            <div
              key={art.pmid}
              className="card p-5 bg-surface-800/70 hover:bg-surface-800/90 border border-surface-700/60 hover:border-surface-600 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                {/* Meta Top Bar */}
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-mono text-accent-300 font-semibold bg-accent-600/20 border border-accent-500/30 px-2 py-0.5 rounded">
                    {art.pmid}
                  </span>
                  {art.similarity_score !== undefined && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-success-600/20 text-success-300 border border-success-500/30">
                      {Math.round(art.similarity_score * 100)}% Semantic Match
                    </span>
                  )}
                  <span className="text-surface-400 text-[11px]">{art.year}</span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white leading-snug hover:text-accent-300 transition-colors">
                  {art.title}
                </h3>

                {/* Journal & Authors */}
                <p className="text-[11px] text-surface-400">
                  <span className="font-medium text-surface-300">{art.authors}</span> — <em>{art.journal}</em>
                </p>

                {/* Abstract Preview */}
                <p className="text-xs text-surface-300 leading-relaxed line-clamp-4">
                  {art.abstract}
                </p>
              </div>

              {/* Bottom Tags */}
              <div className="space-y-3 pt-2 border-t border-surface-700/40">
                {art.key_taxa && art.key_taxa.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Dna size={12} className="text-accent-400 shrink-0" />
                    {art.key_taxa.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-surface-900 border border-surface-700 text-surface-300 italic"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-surface-400">Keywords: {art.keywords}</span>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/?term=${art.pmid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-400 hover:text-accent-300 flex items-center gap-1 font-semibold"
                  >
                    PubMed <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
