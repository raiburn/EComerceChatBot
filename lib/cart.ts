import type { Message } from 'ai'

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

type Product = { id: number; name: string; price: number }

export function upsertItem(prev: CartItem[], incoming: Product): CartItem[] {
  const existing = prev.find((i) => i.id === incoming.id)
  if (existing) {
    return prev.map((i) => i.id === incoming.id ? { ...i, quantity: i.quantity + 1 } : i)
  }
  return [...prev, { ...incoming, quantity: 1 }]
}

// Returns add_to_cart results not seen before and marks them as seen. Messages re-render on
// every streamed token, so without `synced` each result would be added again on every update.
export function takeNewCartItems(messages: Pick<Message, 'toolInvocations'>[], synced: Set<string>): Product[] {
  const items: Product[] = []
  for (const msg of messages) {
    for (const inv of msg.toolInvocations ?? []) {
      if (inv.toolName === 'add_to_cart' && inv.state === 'result' && inv.result?.item && !synced.has(inv.toolCallId)) {
        synced.add(inv.toolCallId)
        items.push(inv.result.item as Product)
      }
    }
  }
  return items
}
