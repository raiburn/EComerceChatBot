import { beforeEach, describe, expect, it, vi } from 'vitest'

// Records every query-builder call so tests can check which filters were applied.
const { calls, rpc, state } = vi.hoisted(() => ({
  calls: [] as unknown[][],
  rpc: vi.fn(),
  state: { result: { data: [] as unknown, error: null as { message: string } | null } },
}))

vi.mock('@/lib/supabase', () => {
  const builder: Record<string, unknown> = {}
  for (const method of ['from', 'select', 'order', 'gte', 'lte', 'ilike']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args])
      return builder
    }
  }
  builder.then = (resolve: (r: unknown) => void) => resolve(state.result)
  return { getSupabase: () => ({ ...builder, rpc }) }
})
vi.mock('openai', () => ({
  default: class {
    embeddings = { create: async () => ({ data: [{ embedding: [0.1, 0.2] }] }) }
  },
}))

import { buildProductContext, filterProductsByPrice, searchProducts } from '@/lib/rag'

const product = { id: 1, name: 'Rain Jacket', description: 'Seam-sealed.', category: 'Jackets', price: 79.99, tags: 'rain' }

beforeEach(() => {
  calls.length = 0
  state.result = { data: [], error: null }
})

describe('filterProductsByPrice', () => {
  it('filters by price range and category together', async () => {
    await filterProductsByPrice(undefined, 100, 'Jackets')

    expect(calls).toContainEqual(['lte', 'price', 100])
    expect(calls).toContainEqual(['ilike', 'category', '%Jackets%'])
    expect(calls.some(([m]) => m === 'gte')).toBe(false)
  })

  it('does not filter by category when none is given', async () => {
    await filterProductsByPrice(50, 100)

    expect(calls).toContainEqual(['gte', 'price', 50])
    expect(calls.some(([m]) => m === 'ilike')).toBe(false)
  })
})

describe('searchProducts', () => {
  it('throws when the catalog is unreachable instead of reporting no matches', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection refused' } })

    await expect(searchProducts('rain jacket')).rejects.toThrow('connection refused')
  })

  it('returns the matched products', async () => {
    rpc.mockResolvedValue({ data: [product], error: null })

    expect(await searchProducts('rain jacket')).toEqual([product])
  })
})

describe('buildProductContext', () => {
  it('lists each product with its price and category', () => {
    expect(buildProductContext([{ ...product, similarity: 0.8 }])).toBe(
      '- Rain Jacket | $79.99 | Category: Jackets\n  Seam-sealed.',
    )
  })

  it('says when nothing matched', () => {
    expect(buildProductContext([])).toBe('No matching products found in our catalog.')
  })
})
