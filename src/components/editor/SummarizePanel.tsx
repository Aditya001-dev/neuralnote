'use client';

import { useState, useRef } from 'react';
import { Note } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Sparkles, BookOpen, FlipHorizontal, Brain, Loader2 } from 'lucide-react';

const MODES = [
  { id: 'full', label: 'Full Summary', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: FlipHorizontal },
  { id: 'mindmap', label: 'Mind Map', icon: Brain },
  { id: 'eli5', label: 'Simplify', icon: Sparkles },
] as const;

export default function SummarizePanel({ note, onClose }: { note: Note; onClose: () => void }) {
  const [mode, setMode] = useState<'full' | 'flashcards' | 'mindmap' | 'eli5'>('full');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (loading) {
      abortRef.current?.abort();
      return;
    }

    setOutput('');
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: note.title, content: note.content, mode }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const { content } = JSON.parse(data);
              if (content) setOutput((prev) => prev + content);
            } catch {}
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setOutput('Failed to generate. Please check your API key.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 border-l border-nn-border bg-nn-surface flex flex-col flex-shrink-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-nn-border">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#00e5a0]" />
          <span className="text-sm font-medium text-nn-text">AI Tools</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md text-nn-muted hover:text-nn-text hover:bg-nn-card transition-all">
          <X size={13} />
        </button>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-1.5 p-3 border-b border-nn-border">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
              mode === id
                ? 'bg-[#00e5a015] text-[#00e5a0] border border-[#00e5a030]'
                : 'bg-nn-card text-nn-muted border border-nn-border hover:text-nn-text'
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <div className="px-3 py-2 border-b border-nn-border">
        <button
          onClick={generate}
          disabled={!note.content.trim()}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
            loading
              ? 'bg-[#00e5a010] text-[#00e5a0] border border-[#00e5a030]'
              : 'bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c88a] disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Generating... (click to stop)
            </>
          ) : (
            <>
              <Sparkles size={12} />
              Generate
            </>
          )}
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4">
        {!output && !loading ? (
          <div className="flex flex-col items-center gap-3 py-8 text-nn-muted">
            <Brain size={28} className="opacity-20" />
            <p className="text-xs text-center">Select a mode and click Generate to create AI-powered study materials from this note.</p>
          </div>
        ) : (
          <div className="prose-nn text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
            {loading && <span className="inline-block w-2 h-4 bg-[#00e5a0] animate-pulse ml-0.5 rounded-sm" />}
          </div>
        )}
      </div>
    </div>
  );
}
