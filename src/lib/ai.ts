import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');
  return new GoogleGenerativeAI(apiKey);
}

export function getGeminiModel(model = 'gemini-1.5-flash') {
  return getGemini().getGenerativeModel({ model });
}

export function getPinecone(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return pineconeClient;
}

export function getPineconeIndex() {
  return getPinecone().index(process.env.PINECONE_INDEX || 'neuralnote');
}

export async function getEmbedding(text: string): Promise<number[]> {
  const model = getGemini().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text.slice(0, 8000));
  return result.embedding.values;
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const model = getGemini().getGenerativeModel({ model: 'text-embedding-004' });
  const results = await Promise.all(texts.map((t) => model.embedContent(t.slice(0, 8000))));
  return results.map((r) => r.embedding.values);
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('. ', end);
      const newlineEnd = text.lastIndexOf('\n', end);
      const boundary = Math.max(sentenceEnd, newlineEnd);
      if (boundary > start + chunkSize * 0.5) end = boundary + 1;
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