# ECommerce ChatBot — AI Shopping Assistant

A RAG-powered shopping assistant built with **Next.js**, **Vercel AI SDK**, **OpenAI**, and **Supabase pgvector**.

## How It Works

1. Product catalog is loaded into Supabase with vector embeddings (via OpenAI)
2. When a user asks a question, it is embedded and matched against the catalog using cosine similarity
3. The top matching products are injected as context into the LLM prompt
4. The response streams back to the UI in real time

## Tech Stack

- **Next.js 14** — App Router, Edge Runtime
- **Vercel AI SDK** — streaming chat with `useChat` + `streamText`
- **OpenAI** — `gpt-4o-mini` for chat, `text-embedding-3-small` for embeddings
- **Supabase** — PostgreSQL + pgvector for semantic product search
- **Tailwind CSS** — styling

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

You need:
- `OPENAI_API_KEY` — from https://platform.openai.com/api-keys
- `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project settings

### 3. Set up Supabase

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Products table
create table products (
  id bigint primary key,
  name text not null,
  description text,
  category text,
  price numeric,
  tags text,
  embedding vector(1536)
);

-- Semantic search function
create or replace function match_products(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  name text,
  description text,
  category text,
  price numeric,
  tags text,
  similarity float
)
language sql stable
as $$
  select
    id, name, description, category, price, tags,
    1 - (embedding <=> query_embedding) as similarity
  from products
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### 4. Ingest the product catalog

```bash
npm run ingest
```

This reads `data/products.json`, generates embeddings for each product, and stores them in Supabase.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # Streaming chat endpoint with RAG
│   │   └── ingest/route.ts     # HTTP endpoint to trigger ingestion
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Chat.tsx                # Chat UI with useChat hook
│   └── ChatMessage.tsx         # Individual message bubble
├── lib/
│   ├── supabase.ts             # Supabase client setup
│   └── rag.ts                  # Embedding + vector search logic
├── data/
│   └── products.json           # Sample product catalog
└── scripts/
    └── ingest.ts               # One-time ingestion script
```

---

## Testing

```bash
npm test             # unit tests (Vitest): cart, catalog search and filters, chat API guards
npm run eval:topic   # topic-filter eval against the real model (needs OPENAI_API_KEY)
```

Unit tests mock OpenAI and Supabase, so they run offline and in CI. The eval sends 32 labeled
messages (shopping questions, follow-ups, off-topic requests and prompt-injection attempts)
through the topic filter and fails if any is misclassified.

---

## Deploying to Vercel

```bash
npx vercel
```

Add your environment variables in the Vercel dashboard under Project Settings > Environment Variables.
