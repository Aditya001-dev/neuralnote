import { NextRequest } from 'next/server';
import { getOpenAI, getEmbedding, getPineconeIndex } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { query, notes, topK = 5 } = await req.json();

    if (!query?.trim()) {
      return Response.json({ error: 'Query required' }, { status: 400 });
    }

    const results: {
      id: string;
      title: string;
      snippet: string;
      score: number;
      source: 'note' | 'document';
      tags?: string[];
    }[] = [];

    // Search within local notes using OpenAI embeddings + cosine similarity
    if (notes && notes.length > 0) {
      const openai = getOpenAI();

      // Get query embedding + all note embeddings in one batch
      const allTexts = [query, ...notes.map((n: { title: string; content: string }) => `${n.title}\n${n.content.slice(0, 500)}`)];

      const embedRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: allTexts,
      });

      const queryVec = embedRes.data[0].embedding;
      const noteVecs = embedRes.data.slice(1).map((d) => d.embedding);

      const cosineSim = (a: number[], b: number[]): number => {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          normA += a[i] ** 2;
          normB += b[i] ** 2;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
      };

      notes.forEach((note: { id: string; title: string; content: string; tags?: string[] }, i: number) => {
        const score = cosineSim(queryVec, noteVecs[i]);
        if (score > 0.5) {
          // Find best matching snippet
          const sentences = note.content.split(/[.\n]+/).filter((s) => s.trim().length > 20);
          const snippet = sentences.find((s) => s.toLowerCase().includes(query.toLowerCase().slice(0, 8))) || sentences[0] || '';

          results.push({
            id: note.id,
            title: note.title,
            snippet: snippet.trim().slice(0, 150) + '...',
            score,
            source: 'note',
            tags: note.tags,
          });
        }
      });
    }

    // Also search Pinecone for document chunks
    if (process.env.PINECONE_API_KEY) {
      try {
        const queryVec = await getEmbedding(query);
        const index = getPineconeIndex();
        const pineconeResults = await index.query({
          vector: queryVec,
          topK: Math.max(topK, 5),
          includeMetadata: true,
        });

        pineconeResults.matches
          .filter((m) => (m.score ?? 0) > 0.65)
          .forEach((m) => {
            results.push({
              id: m.id,
              title: (m.metadata?.documentName as string) || 'Document',
              snippet: ((m.metadata?.text as string) || '').slice(0, 150) + '...',
              score: m.score ?? 0,
              source: 'document',
            });
          });
      } catch (e) {
        console.error('Pinecone search error:', e);
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.score - a.score);

    return Response.json({ results: results.slice(0, topK) });
  } catch (error: unknown) {
    console.error('Search API error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
