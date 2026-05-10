import { NextRequest } from 'next/server';
import { getOpenAI } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { title, content, mode = 'full' } = await req.json();

    const openai = getOpenAI();

    const prompts: Record<string, string> = {
      full: `Create a comprehensive study summary of this note. Structure it as:

## TL;DR
2-3 sentence executive summary.

## Key Concepts
Bullet points of the most important ideas (5-8 points).

## Deep Dive
Detailed explanation of the most complex or important concept from the note.

## Study Questions
5 questions to test understanding (mix of recall and application).

## Related Topics
3-4 topics worth exploring next, with a brief reason why each is relevant.`,

      flashcards: `Generate 8-10 flashcards from this note in this exact format:

**Q:** [Question]
**A:** [Concise answer]

---

Make questions varied: definitions, explanations, comparisons, and application questions.`,

      mindmap: `Create a text-based mind map outline of this note. Use indentation to show hierarchy:

**[Central Topic]**
  → [Main branch 1]
    → [Sub-point]
    → [Sub-point]
  → [Main branch 2]
    → [Sub-point]
  → [Main branch 3]

Include all key concepts from the note.`,

      eli5: `Explain the key concepts in this note as if explaining to a complete beginner with no background knowledge. Use:
- Simple language (no jargon without explanation)
- Concrete real-world analogies
- Short paragraphs
- A building-block approach (simple → complex)`,
    };

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are NeuralNote AI — an expert study companion. Generate precise, educational, well-structured content.',
        },
        {
          role: 'user',
          content: `Note Title: "${title}"\n\nNote Content:\n${content}\n\n---\n\n${prompts[mode] || prompts.full}`,
        },
      ],
      stream: true,
      max_tokens: 2500,
      temperature: 0.6,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
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
    const message = error instanceof Error ? error.message : 'Summarization failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
