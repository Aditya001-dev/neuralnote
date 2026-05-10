import { NextRequest } from 'next/server';
import { getOpenAI, getPineconeIndex, chunkText, getEmbeddingsBatch } from '@/lib/ai';
import { v4 as uuid } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 120;

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    const docId = uuid();
    const text = await extractText(file);

    if (!text.trim()) {
      return Response.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    // Generate a summary of the document
    const openai = getOpenAI();
    const summaryRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Summarize this document in 2-3 sentences and extract 5 key topics as a JSON object: {"summary": "...", "topics": ["...", "..."]}. Document: ${text.slice(0, 3000)}`,
        },
      ],
      max_tokens: 300,
    });

    let summary = '';
    let topics: string[] = [];
    try {
      const raw = summaryRes.choices[0].message.content || '{}';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      summary = parsed.summary || '';
      topics = parsed.topics || [];
    } catch {
      summary = text.slice(0, 200);
    }

    // Chunk the text
    const chunks = chunkText(text);
    const chunkCount = chunks.length;

    // If Pinecone is configured, embed and index
    if (process.env.PINECONE_API_KEY) {
      const BATCH_SIZE = 20;
      const index = getPineconeIndex();

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await getEmbeddingsBatch(batch);

        const vectors = batch.map((chunk, j) => ({
          id: `${docId}-chunk-${i + j}`,
          values: embeddings[j],
          metadata: {
            documentId: docId,
            documentName: file.name,
            chunkIndex: i + j,
            text: chunk,
            topics: topics.join(', '),
          },
        }));

        await index.upsert(vectors);
      }
    }

    return Response.json({
      id: docId,
      name: file.name,
      type: file.type,
      size: file.size,
      chunkCount,
      summary,
      topics,
      status: 'ready',
    });
  } catch (error: unknown) {
    console.error('Upload API error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
