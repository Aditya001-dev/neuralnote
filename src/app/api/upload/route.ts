import { NextRequest } from 'next/server';
import { getGeminiModel, getEmbedding, getPineconeIndex } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, noteContext, useRAG = false } = await req.json();
    let ragContext = '';
    let sources: { text: string; score: number }[] = [];

    if (useRAG && process.env.PINECONE_API_KEY) {
      try {
        const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').at(-1)?.content || '';
        const queryEmbedding = await getEmbedding(lastUserMsg);
        const index = getPineconeIndex();
        const results = await index.query({ vector: queryEmbedding, topK: 4, includeMetadata: true });
        sources = results.matches.filter((m) => (m.score ?? 0) > 0.6).map((m) => ({ text: (m.metadata?.text as string) || '', score: m.score ?? 0 }));
        if (sources.length > 0) ragContext = `\n\nRELEVANT CHUNKS:\n${sources.map((s, i) => `[${i + 1}] ${s.text}`).join('\n\n')}`;
      } catch (e) { console.error('RAG error:', e); }
    }

    const systemPrompt = `You are NeuralNote AI — an intelligent study companion. Help users understand their notes and documents. Use markdown formatting.\n${noteContext ? `CURRENT NOTE:\nTitle: ${noteContext.title}\n\nContent:\n${noteContext.content}` : ''}${ragContext}`;
    const model = getGeminiModel('gemini-1.5-flash');
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const lastMessage = messages.at(-1)?.content || '';
    const chat = model.startChat({ history, systemInstruction: systemPrompt });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (sources.length > 0) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`));
          const result = await chat.sendMessageStream(lastMessage);
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: text })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) { controller.error(e); }
      },
    });

    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}