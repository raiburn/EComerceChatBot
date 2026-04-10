export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/rag'
import products from '@/data/products.json'

// POST /api/ingest
// Call this once to load all products into Supabase with their embeddings.
// Protect this route in production (e.g. check a secret header).
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.INGEST_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = []

  for (const product of products) {
    const textToEmbed = `${product.name}. ${product.description}. Tags: ${product.tags}`
    const embedding = await generateEmbedding(textToEmbed)

    const { error } = await supabaseAdmin.from('products').upsert({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      tags: product.tags,
      embedding,
    })

    if (error) {
      results.push({ id: product.id, status: 'error', error: error.message })
    } else {
      results.push({ id: product.id, status: 'ok' })
    }
  }

  return NextResponse.json({ ingested: results.length, results })
}
