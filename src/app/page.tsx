'use client';

import { useEffect } from 'react';
import { useNeuralNoteStore } from '@/lib/store';
import Sidebar from '@/components/sidebar/Sidebar';
import NoteEditor from '@/components/editor/NoteEditor';
import ChatPanel from '@/components/chat/ChatPanel';
import SearchPanel from '@/components/search/SearchPanel';
import DocsPanel from '@/components/search/DocsPanel';

export default function Home() {
  const { activeTab } = useNeuralNoteStore();

  useEffect(() => {
    useNeuralNoteStore.persist.rehydrate();
  }, []);

  return (
    <div className="flex h-screen bg-nn-bg overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div
        className="fixed top-0 left-0 w-96 h-96 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, #00e5a008 0%, transparent 70%)' }}
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