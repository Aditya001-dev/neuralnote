'use client';

import { useState } from 'react';
import { useNeuralNoteStore } from '@/lib/store';
import { Search, FileText, File, Loader2, Hash, TrendingUp } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
  source: 'note' | 'document';
  tags?: string[];
}

const EXAMPLE_QUERIES = [
  'attention mechanism in transformers',
  'how does vector search work',
  'study plan for embeddings',
  'production vs development database',
];

export default function SearchPanel() {
  const { notes, setActiveNote, setActiveTab } = useNeuralNoteStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const doSearch = async (q?: string) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;
    if (q) setQuery(q);

    setLoading(true);
    setSearched(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, notes, topK: 8 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const openNote = (id: string) => {
    setActiveNote(id);
    setActiveTab('editor');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-nn-border flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-3 bg-nn-card rounded-xl border border-nn-border px-4 py-2.5 focus-within:border-[#00e5a040] transition-all">
            <Search size={15} className="text-nn-muted flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="Search semantically across notes and documents..."
              className="flex-1 bg-transparent text-sm text-nn-text placeholder-nn-muted outline-none"
              autoFocus
            />
            {loading && <Loader2 size={14} className="text-nn-muted animate-spin flex-shrink-0" />}
          </div>
          <button
            onClick={() => doSearch()}
            disabled={!query.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-[#00e5a0] text-[#0a0a0f] text-sm font-medium hover:bg-[#00c88a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Search
          </button>
        </div>

        {/* How it works badge */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-nn-muted">
            Powered by OpenAI embeddings + cosine similarity · searches notes {notes.length > 0 ? `(${notes.length})` : ''} and indexed documents
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!searched && (
          <div>
            <p className="text-xs text-nn-muted mb-3 uppercase tracking-widest font-medium">Example searches</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => doSearch(q)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg bg-nn-card border border-nn-border text-nn-muted hover:text-nn-text hover:border-[#00e5a030] transition-all"
                >
                  <Search size={9} className="inline mr-1.5 opacity-50" />
                  {q}
                </button>
              ))}
            </div>

            <div className="bg-nn-card border border-nn-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-nn-text">How semantic search works</p>
              <div className="space-y-2">
                {[
                  ['Your query', 'Gets embedded into a 1536-dim vector using OpenAI'],
                  ['All notes', 'Are also embedded and compared via cosine similarity'],
                  ['Documents', 'Are chunked, embedded, and indexed in Pinecone'],
                  ['Results', 'Ranked by semantic relevance, not just keyword matches'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00e5a0] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-nn-muted"><span className="text-nn-text">{title}</span> — {desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {searched && !loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-12 text-nn-muted">
            <Search size={32} className="opacity-20" />
            <p className="text-sm">No results found for &quot;{query}&quot;</p>
            <p className="text-xs">Try different keywords or upload more documents</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 text-sm text-red-300">
            {error}
            {error.includes('API') && (
              <p className="text-xs mt-1 text-red-400">Make sure OPENAI_API_KEY is set in .env.local</p>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={12} className="text-[#00e5a0]" />
              <p className="text-xs text-nn-muted">{results.length} results for &quot;{query}&quot;</p>
            </div>
            <div className="space-y-2">
              {results.map((result, i) => (
                <SearchResultCard
                  key={result.id + i}
                  result={result}
                  rank={i + 1}
                  onOpen={result.source === 'note' ? () => openNote(result.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({ result, rank, onOpen }: {
  result: SearchResult; rank: number; onOpen?: () => void;
}) {
  const score = Math.round(result.score * 100);

  return (
    <div
      onClick={onOpen}
      className={`group p-4 rounded-xl bg-nn-card border border-nn-border transition-all ${
        onOpen ? 'hover:border-[#00e5a030] cursor-pointer' : ''
      } animate-slide-up`}
      style={{ animationDelay: `${rank * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          result.source === 'note'
            ? 'bg-[#00e5a015] border border-[#00e5a030]'
            : 'bg-[#5850ec15] border border-[#5850ec30]'
        }`}>
          {result.source === 'note'
            ? <FileText size={13} className="text-[#00e5a0]" />
            : <File size={13} className="text-indigo-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-nn-muted font-mono">#{rank}</span>
            <span className="text-sm font-medium text-nn-text truncate">{result.title}</span>
            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
              score >= 80 ? 'bg-[#00e5a015] text-[#00e5a0]' :
              score >= 65 ? 'bg-amber-900/30 text-amber-400' :
              'bg-nn-surface text-nn-muted'
            }`}>
              {score}%
            </span>
          </div>
          <p className="text-xs text-nn-muted leading-relaxed">{result.snippet}</p>
          {result.tags && result.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {result.tags.map((tag) => (
                <span key={tag} className="text-[9px] text-[#00e5a080] flex items-center gap-0.5">
                  <Hash size={8} />{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
