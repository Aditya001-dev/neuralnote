import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

let openaiClient: OpenAI | null = null;
let pineconeClient: Pinecone | null = null;

export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export function getPinecone(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export function getPineconeIndex() {
  const pc = getPinecone();
  return pc.index(process.env.PINECONE_INDEX || 'neuralnote');
}

export async function getEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map((t) => t.slice(0, 8000)),
  });
  return res.data.map((d) => d.embedding);
}

export function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at a sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('. ', end);
      const newlineEnd = text.lastIndexOf('\n', end);
      const boundary = Math.max(sentenceEnd, newlineEnd);
      if (boundary > start + chunkSize * 0.5) {
        end = boundary + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start = end - overlap;
  }

  return chunks;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
