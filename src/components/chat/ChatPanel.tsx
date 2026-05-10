'use client';

import { useState, useRef, useEffect } from 'react';
import { useNeuralNoteStore, ChatMessage } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Trash2, Bot, User, Loader2, Zap, Database } from 'lucide-react';
import { v4 as uuid } from 'uuid';

const QUICK_PROMPTS = [
  'Summarize my notes on transformers',
  'What are the key differences between RAG approaches?',
  'Generate 5 quiz questions from my notes',
  'What should I study next based on my notes?',
];

export default function ChatPanel() {
  const { chatMessages, addMessage, clearChat, notes, activeNoteId, documents } = useNeuralNoteStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingContent]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setLoading(true);
    setStreamingContent('');
    abortRef.current = new AbortController();

    const apiMessages = [...chatMessages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          noteContext: activeNote ? { title: activeNote.title, content: activeNote.content } : null,
          useRAG: useRAG && documents.length > 0,
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let sources: { text: string; score: number }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'sources') sources = parsed.sources;
              if (parsed.type === 'delta') {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch {}
          }
        }
      }

      addMessage({
        id: uuid(),
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
        sources: sources.length > 0 ? sources : undefined,
      });
      setStreamingContent('');
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        addMessage({
          id: uuid(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please check your API key in `.env.local`.',
          timestamp: Date.now(),
        });
        setStreamingContent('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-nn-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Bot size={15} className="text-[#00e5a0]" />
            <span className="text-sm font-medium text-nn-text">AI Chat</span>
          </div>
          {activeNote && (
            <span className="text-xs text-nn-muted px-2 py-0.5 rounded-full bg-nn-card border border-nn-border">
              Context: {activeNote.title.slice(0, 25)}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {documents.length > 0 && (
            <button
              onClick={() => setUseRAG(!useRAG)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                useRAG
                  ? 'bg-[#00e5a015] text-[#00e5a0] border border-[#00e5a030]'
                  : 'bg-nn-card text-nn-muted border border-nn-border hover:text-nn-text'
              }`}
            >
              <Database size={10} />
              RAG {useRAG ? 'ON' : 'OFF'}
            </button>
          )}
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nn-muted hover:text-red-400 hover:bg-nn-card border border-transparent hover:border-nn-border transition-all"
            >
              <Trash2 size={10} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chatMessages.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-12 h-12 rounded-2xl bg-[#00e5a015] border border-[#00e5a030] flex items-center justify-center">
              <Bot size={22} className="text-[#00e5a0]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-nn-text mb-1">NeuralNote AI</p>
              <p className="text-xs text-nn-muted">Ask anything about your notes and documents.</p>
            </div>
            <div className="w-full grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg bg-nn-card border border-nn-border text-nn-muted hover:text-nn-text hover:border-[#00e5a030] transition-all leading-relaxed"
                >
                  <Zap size={10} className="inline mr-1.5 text-[#00e5a080]" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {loading && streamingContent && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#00e5a015] border border-[#00e5a030] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={13} className="text-[#00e5a0]" />
            </div>
            <div className="flex-1 bg-nn-card border border-nn-border rounded-xl rounded-tl-sm px-4 py-3">
              <div className="prose-nn text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                <span className="inline-block w-2 h-4 bg-[#00e5a0] animate-pulse ml-0.5 rounded-sm align-middle" />
              </div>
            </div>
          </div>
        )}

        {loading && !streamingContent && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#00e5a015] border border-[#00e5a030] flex items-center justify-center flex-shrink-0">
              <Loader2 size={13} className="text-[#00e5a0] animate-spin" />
            </div>
            <div className="bg-nn-card border border-nn-border rounded-xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#00e5a060] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-nn-border flex-shrink-0">
        <div className="flex gap-2 bg-nn-card rounded-xl border border-nn-border p-1 focus-within:border-[#00e5a040] transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your notes... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-nn-text placeholder-nn-muted outline-none resize-none px-3 py-2 leading-relaxed"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 m-0.5 flex items-center justify-center rounded-lg bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c88a] disabled:opacity-40 disabled:cursor-not-allowed transition-all self-end"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-nn-muted mt-1.5 text-center">
          Powered by GPT-4o mini · {useRAG ? 'RAG enabled — searching documents' : 'Using note context'}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-slide-up`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? 'bg-nn-card border border-nn-border' : 'bg-[#00e5a015] border border-[#00e5a030]'
      }`}>
        {isUser ? <User size={13} className="text-nn-muted" /> : <Bot size={13} className="text-[#00e5a0]" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-xl text-sm ${
          isUser
            ? 'bg-[#00e5a015] border border-[#00e5a030] text-nn-text rounded-tr-sm'
            : 'bg-nn-card border border-nn-border rounded-tl-sm'
        }`}>
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-nn">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-[9px] text-nn-muted">Sources:</span>
            {message.sources.map((s, i) => (
              <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-nn-card border border-nn-border text-nn-muted">
                [{i + 1}] {Math.round(s.score * 100)}% match
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
