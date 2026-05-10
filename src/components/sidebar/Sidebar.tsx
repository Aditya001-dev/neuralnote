'use client';

import { useState, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useNeuralNoteStore, Note } from '@/lib/store';
import { upsertNote, deleteNoteDB } from '@/lib/supabase';
import { timeAgo, countWords } from '@/lib/ai';
import { v4 as uuid } from 'uuid';
import {
  FileText, Search, MessageSquare, Upload, Plus, Trash2,
  ChevronLeft, Brain, FolderOpen, Hash, LogOut, Cloud, HardDrive,
} from 'lucide-react';

export default function Sidebar() {
  const {
    notes, activeNoteId, setActiveNote, addNote, deleteNote,
    activeTab, setActiveTab, sidebarCollapsed, toggleSidebar,
    documents, isSupabaseMode,
  } = useNeuralNoteStore();

  const { user } = useUser();
  const { signOut } = useClerk();
  const [search, setSearch] = useState('');

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const createNote = useCallback(async () => {
    const note: Note = {
      id: uuid(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordCount: 0,
    };
    addNote(note);
    if (isSupabaseMode && user) {
      await upsertNote({
        id: note.id,
        user_id: user.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        word_count: note.wordCount,
      });
    }
  }, [addNote, isSupabaseMode, user]);

  const handleDelete = useCallback(async (id: string) => {
    deleteNote(id);
    if (isSupabaseMode) await deleteNoteDB(id);
  }, [deleteNote, isSupabaseMode]);

  const navItems = [
    { id: 'editor', icon: FileText, label: 'Notes' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
    { id: 'docs', icon: Upload, label: 'Documents' },
  ] as const;

  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col items-center w-14 border-r border-nn-border bg-nn-surface py-4 gap-2">
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-nn-card text-nn-muted hover:text-nn-text transition-all"
        >
          <Brain size={18} />
        </button>
        <div className="w-full h-px bg-nn-border my-1" />
        {navItems.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
              activeTab === id
                ? 'bg-[#00e5a015] text-[#00e5a0]'
                : 'text-nn-muted hover:text-nn-text hover:bg-nn-card'
            }`}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-64 border-r border-nn-border bg-nn-surface flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-nn-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00e5a015] border border-[#00e5a030] flex items-center justify-center">
            <Brain size={14} className="text-[#00e5a0]" />
          </div>
          <span className="font-display font-700 text-sm tracking-tight text-nn-text">NeuralNote</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Sync indicator */}
          <div title={isSupabaseMode ? 'Synced to cloud' : 'Local only'} className="flex items-center">
            {isSupabaseMode
              ? <Cloud size={11} className="text-[#00e5a0]" />
              : <HardDrive size={11} className="text-nn-muted" />
            }
          </div>
          <button
            onClick={toggleSidebar}
            className="w-7 h-7 flex items-center justify-center rounded-md text-nn-muted hover:text-nn-text hover:bg-nn-card transition-all"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 p-2 border-b border-nn-border">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={label}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === id
                ? 'bg-[#00e5a015] text-[#00e5a0] border border-[#00e5a030]'
                : 'text-nn-muted hover:text-nn-text hover:bg-nn-card'
            }`}
          >
            <Icon size={13} />
          </button>
        ))}
      </div>

      {/* Notes list */}
      {activeTab === 'editor' && (
        <>
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-nn-card rounded-lg border border-nn-border">
              <Search size={12} className="text-nn-muted flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter notes..."
                className="bg-transparent text-xs text-nn-text placeholder-nn-muted outline-none w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[10px] font-medium text-nn-muted uppercase tracking-widest">
              Notes ({filtered.length})
            </span>
            <button
              onClick={createNote}
              className="w-5 h-5 flex items-center justify-center rounded-md text-nn-muted hover:text-[#00e5a0] hover:bg-[#00e5a015] transition-all"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-nn-muted text-xs">No notes found</div>
            ) : (
              filtered.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  active={activeNoteId === note.id}
                  onSelect={() => setActiveNote(note.id)}
                  onDelete={() => handleDelete(note.id)}
                />
              ))
            )}
          </div>

          <div className="px-3 py-3 border-t border-nn-border">
            <button
              onClick={createNote}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-nn-border text-nn-muted text-xs hover:border-[#00e5a040] hover:text-[#00e5a0] hover:bg-[#00e5a008] transition-all"
            >
              <Plus size={12} />
              New note
            </button>
          </div>
        </>
      )}

      {activeTab !== 'editor' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-nn-muted p-6 text-center">
          {activeTab === 'search' && (
            <>
              <Search size={28} className="opacity-30" />
              <p className="text-xs">Semantic search across all notes and documents</p>
            </>
          )}
          {activeTab === 'chat' && (
            <>
              <MessageSquare size={28} className="opacity-30" />
              <p className="text-xs">Ask AI anything about your knowledge base</p>
            </>
          )}
          {activeTab === 'docs' && (
            <>
              <FolderOpen size={28} className="opacity-30" />
              <p className="text-xs">{documents.length} document{documents.length !== 1 ? 's' : ''} indexed</p>
            </>
          )}
        </div>
      )}

      {/* User footer */}
      <div className="px-3 py-2 border-t border-nn-border">
        {user ? (
          <div className="flex items-center gap-2">
            <img
              src={user.imageUrl}
              alt={user.firstName || 'User'}
              className="w-6 h-6 rounded-full border border-nn-border flex-shrink-0"
            />
            <span className="text-[10px] text-nn-muted truncate flex-1">
              {user.firstName || user.emailAddresses[0]?.emailAddress}
            </span>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="w-5 h-5 flex items-center justify-center rounded-md text-nn-muted hover:text-red-400 hover:bg-nn-card transition-all"
            >
              <LogOut size={11} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-nn-muted">
            <span>{notes.length} notes</span>
            <span>{documents.length} docs</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00e5a0]" />
              <span>AI ready</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteItem({ note, active, onSelect, onDelete }: {
  note: Note; active: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition-all ${
        active
          ? 'bg-[#00e5a010] border border-[#00e5a025]'
          : 'hover:bg-nn-card border border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`text-xs font-medium truncate leading-tight ${active ? 'text-[#00e5a0]' : 'text-nn-text'}`}>
          {note.title}
        </span>
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-nn-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
      <p className="text-[10px] text-nn-muted truncate">
        {note.content.replace(/[#*`]/g, '').slice(0, 50) || 'Empty note'}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] text-nn-muted">{timeAgo(note.updatedAt)}</span>
        {note.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[9px] text-[#00e5a080] flex items-center gap-0.5">
            <Hash size={8} />{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
