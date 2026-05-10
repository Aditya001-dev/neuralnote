'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNeuralNoteStore } from '@/lib/store';
import { upsertNote } from '@/lib/supabase';
import { countWords } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit3, Sparkles, Tag, X, Clock, Hash, FileText, Download } from 'lucide-react';
import SummarizePanel from './SummarizePanel';

export default function NoteEditor() {
  const { notes, activeNoteId, updateNote, isSupabaseMode } = useNeuralNoteStore();
  const { user } = useUser();
  const note = notes.find((n) => n.id === activeNoteId);

  const [previewMode, setPreviewMode] = useState(false);
  const [showSummarize, setShowSummarize] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (field: 'title' | 'content', value: string) => {
      if (!note) return;
      setSaveStatus('unsaved');
      clearTimeout(saveTimeout.current);

      // Optimistic local update immediately
      updateNote(note.id, {
        [field]: value,
        wordCount: field === 'content' ? countWords(value) : note.wordCount,
      });

      // Debounced cloud save
      saveTimeout.current = setTimeout(async () => {
        setSaveStatus('saving');
        if (isSupabaseMode && user) {
          const updated = { ...note, [field]: value };
          await upsertNote({
            id: note.id,
            user_id: user.id,
            title: updated.title,
            content: updated.content,
            tags: updated.tags,
            word_count: field === 'content' ? countWords(value) : note.wordCount,
          });
        }
        setSaveStatus('saved');
      }, 800);
    },
    [note, updateNote, isSupabaseMode, user]
  );

  const addTag = async () => {
    if (!note || !tagInput.trim()) return;
    const newTag = tagInput.trim();
    if (!note.tags.includes(newTag)) {
      const newTags = [...note.tags, newTag];
      updateNote(note.id, { tags: newTags });
      if (isSupabaseMode && user) {
        await upsertNote({ id: note.id, user_id: user.id, title: note.title, content: note.content, tags: newTags, word_count: note.wordCount });
      }
    }
    setTagInput('');
    setShowTagInput(false);
  };

  const removeTag = async (tag: string) => {
    if (!note) return;
    const newTags = note.tags.filter((t) => t !== tag);
    updateNote(note.id, { tags: newTags });
    if (isSupabaseMode && user) {
      await upsertNote({ id: note.id, user_id: user.id, title: note.title, content: note.content, tags: newTags, word_count: note.wordCount });
    }
  };

  const exportMarkdown = () => {
    if (!note) return;
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [note?.title]);

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-nn-muted">
        <FileText size={40} className="opacity-20" />
        <p className="text-sm">Select a note or create a new one</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-nn-border flex-shrink-0">
        <div className="flex items-center gap-1 bg-nn-card rounded-lg p-1 border border-nn-border">
          <button
            onClick={() => setPreviewMode(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
              !previewMode ? 'bg-[#00e5a015] text-[#00e5a0] border border-[#00e5a030]' : 'text-nn-muted hover:text-nn-text'
            }`}
          >
            <Edit3 size={11} /> Edit
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
              previewMode ? 'bg-[#00e5a015] text-[#00e5a0] border border-[#00e5a030]' : 'text-nn-muted hover:text-nn-text'
            }`}
          >
            <Eye size={11} /> Preview
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-[10px] text-nn-muted">
          <Clock size={10} />
          <span className={saveStatus === 'saving' ? 'text-amber-400' : saveStatus === 'unsaved' ? 'text-nn-muted' : 'text-[#00e5a080]'}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : isSupabaseMode ? 'Synced' : 'Saved'}
          </span>
          <span className="text-nn-border">·</span>
          <span>{note.wordCount} words</span>
        </div>

        <button
          onClick={exportMarkdown}
          title="Export as Markdown"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-nn-card border border-nn-border text-nn-muted hover:text-nn-text hover:border-[#00e5a030] transition-all"
        >
          <Download size={11} />
          Export
        </button>

        <button
          onClick={() => setShowSummarize(!showSummarize)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showSummarize
              ? 'bg-[#00e5a020] text-[#00e5a0] border border-[#00e5a040]'
              : 'bg-nn-card border border-nn-border text-nn-muted hover:text-nn-text hover:border-[#00e5a030]'
          }`}
        >
          <Sparkles size={11} />
          AI Summary
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor / Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title */}
          <div className="px-8 pt-6 pb-0 flex-shrink-0">
            <textarea
              ref={titleRef}
              defaultValue={note.title}
              key={note.id + '-title'}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Untitled"
              rows={1}
              className="w-full bg-transparent text-2xl font-display font-semibold text-nn-text placeholder-nn-muted outline-none resize-none leading-tight overflow-hidden"
              style={{ fontFamily: 'var(--font-display)' }}
            />

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {note.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#00e5a010] text-[#00e5a080] border border-[#00e5a020]">
                  <Hash size={8} />{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-[#00e5a0] ml-0.5">
                    <X size={8} />
                  </button>
                </span>
              ))}
              {showTagInput ? (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setShowTagInput(false); }}
                  onBlur={addTag}
                  autoFocus
                  placeholder="tag name..."
                  className="text-[10px] px-2 py-0.5 rounded-full bg-nn-card border border-[#00e5a040] text-[#00e5a0] outline-none w-24"
                />
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-dashed border-nn-border text-nn-muted hover:border-[#00e5a040] hover:text-[#00e5a080] transition-all"
                >
                  <Tag size={8} /> add tag
                </button>
              )}
            </div>

            <div className="w-full h-px bg-nn-border mt-4" />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-8 py-4">
            {previewMode ? (
              <div className="prose-nn max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content || '*Nothing here yet. Switch to edit mode to start writing.*'}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                ref={contentRef}
                key={note.id + '-content'}
                defaultValue={note.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Start writing... (supports Markdown)"
                className="w-full h-full bg-transparent text-[15px] text-[#c8c8d8] placeholder-nn-muted outline-none resize-none leading-relaxed"
                style={{ fontFamily: 'var(--font-sans)', minHeight: '400px' }}
              />
            )}
          </div>
        </div>

        {/* Summarize panel */}
        {showSummarize && (
          <SummarizePanel note={note} onClose={() => setShowSummarize(false)} />
        )}
      </div>
    </div>
  );
}
