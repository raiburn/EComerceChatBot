import { describe, expect, it } from 'vitest'
import { takeNewCartItems, upsertItem } from '@/lib/cart'

const jacket = { id: 7, name: 'Packable Rain Jacket', price: 79.99 }
const added = (toolCallId: string, item = jacket) => ({
  toolInvocations: [{ toolCallId, toolName: 'add_to_cart', state: 'result' as const, args: {}, result: { item } }],
})

describe('takeNewCartItems', () => {
  it('adds an item once, however many times the messages re-render', () => {
    // useChat hands back the full message list on every streamed token.
    const messages = [added('call-1')]
    const synced = new Set<string>()
    const rerenders = Array.from({ length: 38 }, () => takeNewCartItems(messages, synced))

    expect(rerenders.flat()).toEqual([jacket])
  })

  it('adds the same product again when the customer asks again', () => {
    const synced = new Set<string>()
    takeNewCartItems([added('call-1')], synced)

    expect(takeNewCartItems([added('call-1'), added('call-2')], synced)).toEqual([jacket])
  })

  it('ignores tool calls that are still running and other tools', () => {
    const messages = [
      { toolInvocations: [{ toolCallId: 'a', toolName: 'add_to_cart', state: 'call' as const, args: {} }] },
      { toolInvocations: [{ toolCallId: 'b', toolName: 'filter_by_price', state: 'result' as const, args: {}, result: { products: [] } }] },
      { toolInvocations: undefined },
    ]

    expect(takeNewCartItems(messages, new Set())).toEqual([])
  })
})

describe('upsertItem', () => {
  it('adds a new product with quantity 1', () => {
    expect(upsertItem([], jacket)).toEqual([{ ...jacket, quantity: 1 }])
  })

  it('increments the quantity of a product already in the cart', () => {
    expect(upsertItem([{ ...jacket, quantity: 2 }], jacket)).toEqual([{ ...jacket, quantity: 3 }])
  })
})
