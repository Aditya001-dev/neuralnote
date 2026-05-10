import { NextRequest } from 'next/server';
import { getOpenAI, getEmbedding, getPineconeIndex } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, noteContext, useRAG = false } = await req.json();

    const openai = getOpenAI();
    let ragContext = '';
    let sources: { text: string; score: number }[] = [];

    // If RAG is enabled and we have documents, retrieve relevant chunks
    if (useRAG && process.env.PINECONE_API_KEY) {
      try {
        const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').at(-1)?.content || '';
        const queryEmbedding = await getEmbedding(lastUserMsg);
        const index = getPineconeIndex();

        const results = await index.query({
          vector: queryEmbedding,
          topK: 4,
          includeMetadata: true,
        });

        sources = results.matches
          .filter((m) => (m.score ?? 0) > 0.7)
          .map((m) => ({
            text: (m.metadata?.text as string) || '',
            score: m.score ?? 0,
          }));

        if (sources.length > 0) {
          ragContext = `\n\nRELEVANT DOCUMENT CHUNKS (retrieved via semantic search):\n${sources
            .map((s, i) => `[${i + 1}] ${s.text}`)
            .join('\n\n')}`;
        }
      } catch (e) {
        console.error('RAG retrieval failed:', e);
      }
    }

    const systemPrompt = `You are NeuralNote AI — an intelligent study companion embedded in a note-taking application. You help users understand, analyze, and learn from their notes and uploaded documents.

Your capabilities:
- Answer questions about the user's notes and uploaded documents
- Summarize complex topics clearly
- Generate study questions and quizzes
- Explain concepts at different levels of complexity
- Find connections between different notes
- Suggest related topics to explore

Tone: Knowledgeable, clear, and encouraging. Use markdown formatting for structured responses.

${noteContext ? `CURRENT NOTE:\nTitle: ${noteContext.title}\n\nContent:\n${noteContext.content}` : ''}${ragContext}

${sources.length > 0 ? 'You have access to retrieved document chunks above. Cite them when relevant using [1], [2], etc.' : ''}`;

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        // Send sources first if any
        if (sources.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`)
          );
        }

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
