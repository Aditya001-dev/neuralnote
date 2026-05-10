'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNeuralNoteStore } from '@/lib/store';
import { fetchNotes } from '@/lib/supabase';
import Sidebar from '@/components/sidebar/Sidebar';
import NoteEditor from '@/components/editor/NoteEditor';
import ChatPanel from '@/components/chat/ChatPanel';
import SearchPanel from '@/components/search/SearchPanel';
import DocsPanel from '@/components/search/DocsPanel';

export default function Home() {
  const { activeTab } = useNeuralNoteStore();
  const { user, isLoaded } = useUser();
  const { setNotes, isSupabaseMode, setSupabaseMode } = useNeuralNoteStore();

  // On mount: if Supabase is configured, load user's notes from DB
  useEffect(() => {
    if (!isLoaded || !user) return;

    const loadNotes = async () => {
      const dbNotes = await fetchNotes(user.id);
      if (dbNotes.length > 0) {
        setSupabaseMode(true);
        setNotes(dbNotes.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: n.tags,
          wordCount: n.word_count,
          sourceDoc: n.source_doc,
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at).getTime(),
        })));
      }
    };

    loadNotes();
  }, [isLoaded, user, setNotes, setSupabaseMode]);

  return (
    <div className="flex h-screen bg-nn-bg overflow-hidden">
      {/* Subtle grid background */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Accent glow top left */}
      <div
        className="fixed top-0 left-0 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top left, #00e5a008 0%, transparent 70%)',
        }}
      />

      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'editor' && <NoteEditor />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'search' && <SearchPanel />}
        {activeTab === 'docs' && <DocsPanel />}
      </main>
    </div>
  );
}
