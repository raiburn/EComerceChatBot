/**
 * Run this script once to load all products into Supabase with their embeddings.
 * Usage: npm run ingest
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import products from '../data/products.json'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

async function main() {
  console.log(`Ingesting ${products.length} products...\n`)

  for (const product of products) {
    const textToEmbed = `${product.name}. ${product.description}. Tags: ${product.tags}`
    const embedding = await generateEmbedding(textToEmbed)

    const { error } = await supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      tags: product.tags,
      embedding,
    })

    if (error) {
      console.error(`  [ERROR] ${product.name}:`, error.message)
    } else {
      console.log(`  [OK] ${product.name}`)
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)
