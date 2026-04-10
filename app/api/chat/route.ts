import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { searchProducts, buildProductContext } from '@/lib/rag'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Extract the latest user message for semantic search
  const lastUserMessage = messages
    .filter((m: { role: string }) => m.role === 'user')
    .at(-1)?.content ?? ''

  // RAG: retrieve relevant products from Supabase
  const products = await searchProducts(lastUserMessage)
  const context = buildProductContext(products)

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: `You are a friendly and knowledgeable shopping assistant for an outdoor clothing and gear store.
Your job is to help customers find the right products based on their needs, budget, and preferences.

Use ONLY the products listed below to answer questions. If a customer asks about something not in the catalog, say you don't carry it.
Be concise, friendly, and always mention the price when recommending a product.

Current catalog context:
${context}`,
    messages,
  })

  return result.toDataStreamResponse()
}
