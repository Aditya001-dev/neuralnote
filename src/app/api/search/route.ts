import { NextRequest } from 'next/server';
import { getEmbedding, getEmbeddingsBatch, getPineconeIndex, cosineSim } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { query, notes, topK = 5 } = await req.json();
    if (!query?.trim()) return Response.json({ error: 'Query required' }, { status: 400 });
    const results: { id: string; title: string; snippet: string; score: number; source: 'note' | 'document'; tags?: string[]; }[] = [];

    if (notes && notes.length > 0) {
      const allTexts = [query, ...notes.map((n: { title: string; content: string }) => `${n.title}\n${n.content.slice(0, 500)}`)];
      const allEmbeddings = await getEmbeddingsBatch(allTexts);
      const queryVec = allEmbeddings[0];
      const noteVecs = allEmbeddings.slice(1);
      notes.forEach((note: { id: string; title: string; content: string; tags?: string[] }, i: number) => {
        const score = cosineSim(queryVec, noteVecs[i]);
        if (score > 0.5) {
          const sentences = note.content.split(/[.\n]+/).filter((s) => s.trim().length > 20);
          const snippet = sentences[0] || '';
          results.push({ id: note.id, title: note.title, snippet: snippet.trim().slice(0, 150) + '...', score, source: 'note', tags: note.tags });
        }
      });
    }

    if (process.env.PINECONE_API_KEY) {
      try {
        const queryVec = await getEmbedding(query);
        const index = getPineconeIndex();
        const pineconeResults = await index.query({ vector: queryVec, topK: Math.max(topK, 5), includeMetadata: true });
        pineconeResults.matches.filter((m) => (m.score ?? 0) > 0.6).forEach((m) => {
          results.push({ id: m.id, title: (m.metadata?.documentName as string) || 'Document', snippet: ((m.metadata?.text as string) || '').slice(0, 150) + '...', score: m.score ?? 0, source: 'document' });
        });
      } catch (e) { console.error('Pinecone error:', e); }
    }

    results.sort((a, b) => b.score - a.score);
    return Response.json({ results: results.slice(0, topK) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return Response.json({ error: message }, { status: 500 });
  }
}