import OpenAI from 'openai'
import { getSupabase } from './supabase'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface Product {
  id: number
  name: string
  description: string
  category: string
  price: number
  tags: string
  similarity: number
}

// Generate a vector embedding for a given text string
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

// Search the product catalog using vector similarity (RAG retrieval step)
export async function searchProducts(query: string, limit = 5): Promise<Product[]> {
  const queryEmbedding = await generateEmbedding(query)

  const { data, error } = await getSupabase().rpc('match_products', {
    query_embedding: queryEmbedding,
    match_threshold: 0.4,
    match_count: limit,
  })

  if (error) {
    console.error('Supabase search error:', error)
    return []
  }

  return data as Product[]
}

// Format retrieved products into a readable context block for the LLM
export function buildProductContext(products: Product[]): string {
  if (products.length === 0) return 'No matching products found in our catalog.'

  return products
    .map(
      (p) =>
        `- ${p.name} | $${p.price.toFixed(2)} | Category: ${p.category}\n  ${p.description}`
    )
    .join('\n\n')
}
