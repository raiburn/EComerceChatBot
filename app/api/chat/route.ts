import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import {
  searchProducts,
  filterProductsByPrice,
  filterProductsByCategory,
  buildProductContext,
} from '@/lib/rag'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages } = await req.json()

  // (#2) Conversation memory: combine the last 3 user messages for richer RAG retrieval.
  // This keeps context across turns — e.g. "jacket" then "waterproof?" still finds waterproof jackets.
  const recentContext = messages
    .filter((m: { role: string }) => m.role === 'user')
    .slice(-3)
    .map((m: { content: string }) => m.content)
    .join(' ')

  const products = await searchProducts(recentContext, 5)
  const context = buildProductContext(products)

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: `You are a friendly and knowledgeable shopping assistant for an outdoor clothing and gear store.
Your job is to help customers find the right products based on their needs, budget, and preferences.

Use ONLY the products listed below to answer questions. If a customer asks about something not in the catalog, say you don't carry it.
Be concise, friendly, and always mention the price when recommending a product.

When a customer asks about products within a price range or mentions a budget, call filter_by_price.
When a customer asks to browse a specific category (jackets, pants, footwear, etc.), call filter_by_category.
When a customer says they want to buy, add, or purchase something, call add_to_cart.

Current catalog context:
${context}`,
    messages,
    // (#1) Tool calling: model can now filter by price, category, and add items to cart
    tools: {
      filter_by_price: tool({
        description: 'Filter products by price range. Use when the customer mentions a budget or price limit.',
        parameters: z.object({
          minPrice: z.number().optional().describe('Minimum price in USD'),
          maxPrice: z.number().optional().describe('Maximum price in USD'),
        }),
        execute: async ({ minPrice, maxPrice }) => {
          const filtered = await filterProductsByPrice(minPrice, maxPrice)
          const label = minPrice && maxPrice
            ? `Products $${minPrice}–$${maxPrice}`
            : maxPrice
            ? `Products under $${maxPrice}`
            : `Products over $${minPrice}`
          return {
            products: filtered,
            context: buildProductContext(filtered),
            label,
          }
        },
      }),

      filter_by_category: tool({
        description: 'Filter products by category such as Jackets, Pants, Footwear, Accessories, Base Layers, Bags, Shorts.',
        parameters: z.object({
          category: z.string().describe('The product category to filter by'),
        }),
        execute: async ({ category }) => {
          const filtered = await filterProductsByCategory(category)
          return {
            products: filtered,
            context: buildProductContext(filtered),
            label: `${category}`,
          }
        },
      }),

      add_to_cart: tool({
        description: "Add a product to the customer's cart when they express intent to buy or add an item.",
        parameters: z.object({
          productId: z.number().describe('The product ID'),
          productName: z.string().describe('The full product name'),
          price: z.number().describe('The product price in USD'),
        }),
        execute: async ({ productId, productName, price }) => {
          return {
            success: true,
            item: { id: productId, name: productName, price },
            message: `Added "${productName}" ($${price.toFixed(2)}) to your cart.`,
          }
        },
      }),
    },
    maxSteps: 5,
  })

  return result.toDataStreamResponse()
}
