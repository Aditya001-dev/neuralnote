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
  notes: Note[];
  activeNoteId: string | null;
  addNote: (note: Note) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  setNotes: (notes: Note[]) => void;
  documents: Document[];
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  chatMessages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  activeTab: 'editor' | 'search' | 'chat' | 'docs';
  setActiveTab: (tab: 'editor' | 'search' | 'chat' | 'docs') => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSupabaseMode: boolean;
  setSupabaseMode: (v: boolean) => void;
}

const defaultNotes: Note[] = [
  {
    id: '1',
    title: 'Transformer Architecture',
    content: `# Transformer Architecture\n\nThe Transformer model, introduced in **"Attention is All You Need"** (Vaswani et al., 2017), revolutionized NLP by replacing recurrence with self-attention mechanisms.\n\n## Key Components\n\n- **Multi-head self-attention** allows the model to attend to different positions simultaneously\n- **Positional encodings** inject sequence order into token embeddings\n- **Feed-forward networks** process each position independently`,
    tags: ['Deep Learning', 'NLP', 'Architecture'],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000,
    wordCount: 180,
  },
  {
    id: '2',
    title: 'RAG Pipeline Design',
    content: `# RAG Pipeline Design\n\nRetrieval-Augmented Generation (RAG) combines a retrieval system with a language model to produce grounded, factual responses.`,
    tags: ['RAG', 'LangChain', 'Pinecone'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000 * 5,
    wordCount: 220,
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
    {
      name: 'neuralnote-store',
      partialize: (s) => ({ notes: s.notes, documents: s.documents }),
      skipHydration: true,
    }
  )
);