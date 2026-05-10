import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const isSupabaseEnabled = !!supabase;

// ─── Notes CRUD ──────────────────────────────────────────────────────────────

export interface DBNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  word_count: number;
  source_doc?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchNotes(userId: string): Promise<DBNote[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) { console.error('fetchNotes error:', error); return []; }
  return data ?? [];
}

export async function upsertNote(note: {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  word_count: number;
  source_doc?: string;
}): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('notes').upsert({
    ...note,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('upsertNote error:', error);
}

export async function deleteNoteDB(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) console.error('deleteNote error:', error);
}
