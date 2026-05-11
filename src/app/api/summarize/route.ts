import { NextRequest } from 'next/server';
import { getGeminiModel } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { title, content, mode = 'full' } = await req.json();
    const prompts: Record<string, string> = {
      full: `Create a comprehensive study summary:\n## TL;DR\n2-3 sentence summary.\n## Key Concepts\n5-8 bullet points.\n## Study Questions\n5 questions to test understanding.`,
      flashcards: `Generate 8-10 flashcards:\n**Q:** [Question]\n**A:** [Answer]\n---`,
      mindmap: `Create a text mind map:\n**[Central Topic]**\n  → [Branch]\n    → [Sub-point]`,
      eli5: `Explain to a complete beginner using simple language and real-world analogies.`,
    };
    const model = getGeminiModel('gemini-1.5-flash');
    const prompt = `Note Title: "${title}"\n\nContent:\n${content}\n\n---\n\n${prompts[mode] || prompts.full}`;
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const result = await model.generateContentStream(prompt);
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) { controller.error(e); }
      },
    });
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Summarization failed';
    return Response.json({ error: message }, { status: 500 });
  }
}