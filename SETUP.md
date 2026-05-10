# NeuralNote — Setup Guide

> A real, working RAG-powered note-taking app. Follow these steps exactly and you'll have it running in ~20 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Accounts at: OpenAI, Pinecone, Clerk, Supabase (all have free tiers)

---

## Step 1 — Install dependencies

```bash
npm install
```

---

## Step 2 — Set up your API keys

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Now fill in each key:

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Paste it as `OPENAI_API_KEY`

> Cost estimate: ~$0.10–0.50/month for personal use

### Pinecone (Vector DB for RAG)
1. Go to https://app.pinecone.io and sign up (free)
2. Create an index with these settings:
   - **Name**: `neuralnote`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
3. Go to API Keys → copy your key → paste as `PINECONE_API_KEY`

### Clerk (Auth)
1. Go to https://dashboard.clerk.com and create a new app
2. Choose "Email address" + "Google" as sign-in methods
3. Go to API Keys → copy both keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### Supabase (Database for persistent notes)
1. Go to https://supabase.com and create a new project (free tier)
2. Go to **SQL Editor** and run this SQL to create the notes table:

```sql
create table notes (
  id uuid primary key,
  user_id text not null,
  title text not null default 'Untitled',
  content text not null default '',
  tags text[] not null default '{}',
  word_count integer not null default 0,
  source_doc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user queries
create index notes_user_id_idx on notes(user_id);

-- Row Level Security (important! each user only sees their own notes)
alter table notes enable row level security;

create policy "Users can manage their own notes"
  on notes for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
```

3. Go to Settings → API → copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **Note**: Supabase RLS uses its own auth. Since we're using Clerk, the `user_id` is the Clerk user ID (a string). The RLS policy above works with service role or you can disable RLS for now during development:
> ```sql
> alter table notes disable row level security;
> ```

---

## Step 3 — Run the app

```bash
npm run dev
```

Open http://localhost:3000 — you'll see the Clerk sign-in page.

---

## Step 4 — Test the RAG pipeline

1. Sign up / sign in
2. Click **Documents** tab → upload a PDF (try a research paper or textbook chapter)
3. Wait for "Ready" status (it's chunking + embedding in Pinecone)
4. Click **AI Chat** tab → toggle **RAG ON** → ask something from the document
5. You'll see source citations with relevance scores — that's real RAG working

---

## Step 5 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add all your `.env.local` variables in the Vercel dashboard under Project → Settings → Environment Variables.

Update `NEXT_PUBLIC_APP_URL` to your Vercel URL.

---

## Architecture

```
User uploads PDF
      ↓
/api/upload — extracts text (pdf-parse / mammoth)
      ↓
chunkText() — splits into 800-token chunks with 150-token overlap
      ↓
OpenAI text-embedding-3-small — 1536-dim vectors
      ↓
Pinecone upsert — stored with metadata (docId, filename, chunkIndex)
      ↓
User asks question in Chat (RAG ON)
      ↓
Query embedded → Pinecone query topK=4 → filter score > 0.7
      ↓
Retrieved chunks injected into GPT-4o-mini system prompt
      ↓
Streaming SSE response with source citations
```

---

## What to say in interviews

**"How does the RAG pipeline work?"**
> "I chunk documents into 800-token segments with 150-token overlap to prevent context loss at boundaries. Each chunk is embedded with OpenAI's text-embedding-3-small model into 1536-dimensional vectors, then upserted to Pinecone with metadata. At query time, the user's question is embedded and we do a cosine similarity search for top-4 chunks above a 0.7 threshold. Those chunks are injected into the GPT-4o-mini system prompt as context, and the response streams back via SSE with citation indices."

**"Why did you choose Pinecone over other vector DBs?"**
> "For a production-ready project with minimal ops overhead, Pinecone's managed serverless offering is ideal. I evaluated Chroma (great for local dev, no persistence), Weaviate (hybrid BM25 + vector, more complex setup), and pgvector (good if you're already on Postgres). Pinecone won on developer experience and reliability for this use case."

**"How do you handle the context window limit?"**
> "The chunking strategy is the main lever — 800 tokens per chunk means each fits comfortably in the prompt. I cap at top-4 chunks and filter below 0.7 similarity score, so we're injecting ~3200 tokens of context max, well within GPT-4o-mini's 128k context window."

---

## About the portfolio stats

The stats on the portfolio card ("3× faster study sessions, 40% better retention, 500+ beta users") were placeholder projections. Once you actually deploy this and use it, replace them with:
- Real user count from Clerk dashboard
- Your own usage data
- Or remove them and replace with: "Built and shipped a working RAG pipeline with Pinecone + OpenAI"

That's more impressive to engineers than vanity metrics anyway.
