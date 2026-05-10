# NeuralNote ⚡

> AI-powered note-taking with semantic search, RAG pipelines, and LLM-assisted summarization.

![NeuralNote](https://img.shields.io/badge/stack-Next.js%2014-black?style=flat-square)
![OpenAI](https://img.shields.io/badge/AI-OpenAI%20GPT--4o-green?style=flat-square)
![Pinecone](https://img.shields.io/badge/vector--db-Pinecone-blue?style=flat-square)
![LangChain](https://img.shields.io/badge/RAG-LangChain-yellow?style=flat-square)
![Vercel](https://img.shields.io/badge/deploy-Vercel-black?style=flat-square)

**Upload any document → it becomes your personal AI tutor.**

NeuralNote transforms static documents into a queryable knowledge base. Upload a PDF research paper, your lecture notes, or a textbook chapter — then ask questions, get summaries, generate flashcards, and search semantically across everything you've ever saved.

---

## Features

- **Rich Note Editor** — Markdown-powered editor with live preview, tagging, and auto-save
- **AI Chat with Context** — GPT-4o mini chat grounded in your current note or full knowledge base
- **Semantic Search** — OpenAI embeddings + cosine similarity to find notes by meaning, not keywords
- **RAG Pipeline** — Upload PDFs/DOCX → auto-chunked → embedded → indexed in Pinecone → queryable
- **AI Summarization** — Full summary, flashcards, mind map, or ELI5 modes with streaming output
- **Document Management** — Upload and manage your indexed knowledge base

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| AI/LLM | OpenAI GPT-4o mini, text-embedding-3-small |
| RAG | LangChain, Pinecone vector database |
| Parsing | pdf-parse, mammoth (DOCX) |
| State | Zustand (with localStorage persistence) |
| Fonts | Syne (display), Space Grotesk (body) |
| Deploy | Vercel |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/neuralnote.git
cd neuralnote
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
OPENAI_API_KEY=sk-...        # https://platform.openai.com/api-keys
PINECONE_API_KEY=...         # https://app.pinecone.io
PINECONE_INDEX=neuralnote    # Create this index in Pinecone dashboard
```

#### Creating a Pinecone index

1. Go to [app.pinecone.io](https://app.pinecone.io)
2. Create a new index named `neuralnote`
3. Dimensions: **1536** (matches OpenAI text-embedding-3-small)
4. Metric: **cosine**
5. Copy your API key to `.env.local`

> **Note**: The app works without Pinecone (notes-only mode). You only need Pinecone for document upload + RAG chat.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

Add environment variables in the Vercel dashboard under **Settings → Environment Variables**.

Or use the Vercel CLI:

```bash
vercel env add OPENAI_API_KEY
vercel env add PINECONE_API_KEY
vercel env add PINECONE_INDEX
```

---

## How the RAG Pipeline Works

```
User uploads PDF
      │
      ▼
Extract text (pdf-parse / mammoth)
      │
      ▼
Chunk into ~800 token segments (with 150 token overlap)
      │
      ▼
Batch embed via OpenAI text-embedding-3-small (1536 dims)
      │
      ▼
Upsert vectors + metadata into Pinecone
      │
      ▼
At query time: embed query → search Pinecone → retrieve top-k chunks
      │
      ▼
Inject retrieved chunks into GPT-4o mini prompt → stream response
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # Streaming chat with RAG
│   │   ├── search/route.ts     # Semantic search endpoint
│   │   ├── summarize/route.ts  # AI summarization (streaming)
│   │   └── upload/route.ts     # Document ingestion + Pinecone indexing
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── sidebar/Sidebar.tsx
│   ├── editor/
│   │   ├── NoteEditor.tsx
│   │   └── SummarizePanel.tsx
│   ├── chat/ChatPanel.tsx
│   └── search/
│       ├── SearchPanel.tsx
│       └── DocsPanel.tsx
└── lib/
    ├── ai.ts                   # OpenAI + Pinecone clients, chunking utils
    └── store.ts                # Zustand state management
```

---

## License

MIT
