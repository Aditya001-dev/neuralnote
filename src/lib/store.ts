import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  sourceDoc?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'error';
  summary?: string;
  topics?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: { text: string; score: number }[];
}

interface NeuralNoteStore {
  // Notes
  notes: Note[];
  activeNoteId: string | null;
  addNote: (note: Note) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  setNotes: (notes: Note[]) => void;

  // Documents
  documents: Document[];
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  deleteDocument: (id: string) => void;

  // Chat
  chatMessages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // UI
  activeTab: 'editor' | 'search' | 'chat' | 'docs';
  setActiveTab: (tab: 'editor' | 'search' | 'chat' | 'docs') => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Supabase
  isSupabaseMode: boolean;
  setSupabaseMode: (v: boolean) => void;
}

const defaultNotes: Note[] = [
  {
    id: '1',
    title: 'Transformer Architecture',
    content: `# Transformer Architecture

The Transformer model, introduced in **"Attention is All You Need"** (Vaswani et al., 2017), revolutionized NLP by replacing recurrence with self-attention mechanisms.

## Key Components

- **Multi-head self-attention** allows the model to attend to different positions simultaneously
- **Positional encodings** inject sequence order into token embeddings
- **Feed-forward networks** process each position independently
- **Layer normalization** stabilizes training across deep networks
- **Residual connections** enable gradient flow through many layers

## Architecture Overview

The encoder maps input sequences to continuous representations using stacked self-attention layers. The decoder generates output sequences auto-regressively, attending to both encoder output and previous tokens.

## Why It Matters

Scaling laws show that model performance improves predictably with compute, data, and parameters. This insight enabled GPT-3, GPT-4, Claude, and the modern AI revolution.

> "Attention is all you need" — and it turns out, they were right.

## Complexity

- Self-attention: O(n²·d) per layer
- Scales quadratically with sequence length — hence why long context is hard
- Modern solutions: sparse attention, FlashAttention, linear attention variants`,
    tags: ['Deep Learning', 'NLP', 'Architecture'],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000,
    wordCount: 180,
  },
  {
    id: '2',
    title: 'RAG Pipeline Design',
    content: `# RAG Pipeline Design

Retrieval-Augmented Generation (RAG) combines a retrieval system with a language model to produce grounded, factual responses.

## Pipeline Stages

1. **Document Ingestion** — split documents into semantic chunks (512-1024 tokens)
2. **Embedding** — encode chunks using OpenAI \`text-embedding-3-small\` or similar
3. **Indexing** — store embeddings in Pinecone vector database
4. **Retrieval** — find top-k most similar chunks at query time (cosine similarity)
5. **Augmentation** — inject retrieved context into the LLM prompt
6. **Generation** — LLM produces a grounded, cited response

## Key Design Decisions

- **Chunk size**: smaller = more precise retrieval; larger = more context
- **Overlap**: 10-20% overlap prevents context loss at chunk boundaries
- **Embedding model**: OpenAI \`text-embedding-3-small\` offers great cost/quality
- **Top-k**: typically 3-5 chunks; more = more context but also more noise`,
    tags: ['RAG', 'LangChain', 'Pinecone'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000 * 5,
    wordCount: 220,
  },
  {
    id: '3',
    title: 'Vector DB Comparison',
    content: `# Vector Database Comparison

| Database | Type | Best For | Free Tier |
|----------|------|----------|-----------| 
| Pinecone | Managed | Production | Yes (2GB) |
| Weaviate | Open Source | Hybrid search | Self-host |
| Chroma | Open Source | Local dev | Yes |
| Qdrant | Open Source | Speed + filtering | Self-host |
| pgvector | Extension | Existing PG | Yes |

## Recommendation

\`\`\`
Dev/Prototype  → Chroma (zero setup)
Production     → Pinecone (managed, reliable)
Hybrid Search  → Weaviate
High Perf      → Qdrant
Already on PG  → pgvector
\`\`\``,
    tags: ['Vector DB', 'Infrastructure', 'Comparison'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000 * 2,
    wordCount: 190,
  },
];

export const useNeuralNoteStore = create<NeuralNoteStore>()(
  persist(
    (set) => ({
      notes: defaultNotes,
      activeNoteId: '1',
      addNote: (note) => set((s) => ({ notes: [note, ...s.notes], activeNoteId: note.id })),
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
        })),
      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
          activeNoteId: s.activeNoteId === id ? (s.notes[0]?.id ?? null) : s.activeNoteId,
        })),
      setActiveNote: (id) => set({ activeNoteId: id }),
      setNotes: (notes) => set({ notes, activeNoteId: notes[0]?.id ?? null }),

      documents: [],
      addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      deleteDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      chatMessages: [],
      addMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      clearChat: () => set({ chatMessages: [] }),

      activeTab: 'editor',
      setActiveTab: (tab) => set({ activeTab: tab }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      isSupabaseMode: false,
      setSupabaseMode: (v) => set({ isSupabaseMode: v }),
    }),
    { name: 'neuralnote-store', partialize: (s) => ({ notes: s.notes, documents: s.documents }) }
  )
);
