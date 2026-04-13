'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef, useState, useMemo } from 'react'
import ChatMessage from './ChatMessage'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

const CART_STORAGE_KEY = 'ecomerce-chatbot-cart'

const INITIAL_QUESTIONS = [
  'Do you have waterproof jackets under $100?',
  'What are your best hiking boots?',
  'I need warm pants for winter camping.',
  'What gear do you recommend for beginners?',
]

// Generate contextual follow-up suggestions based on what the assistant just discussed
function getFollowUps(lastAssistantMessage: string): string[] {
  const msg = lastAssistantMessage.toLowerCase()

  if (msg.includes('jacket') || msg.includes('coat')) {
    return ['Show me jackets under $100', 'Do you have rain jackets?', 'Add it to my cart']
  }
  if (msg.includes('boot') || msg.includes('shoe') || msg.includes('footwear')) {
    return ['Are these waterproof?', 'Show me all footwear', 'What socks go with hiking boots?']
  }
  if (msg.includes('pant') || msg.includes('legging') || msg.includes('short')) {
    return ['Show me pants under $80', "Do you have women's pants?", 'Add it to my cart']
  }
  if (msg.includes('backpack') || msg.includes('bag') || msg.includes('pole')) {
    return ['Show me all accessories', 'What else do I need for hiking?', 'Add it to my cart']
  }
  if (msg.includes('base layer') || msg.includes('fleece') || msg.includes('merino')) {
    return ['Show me all base layers', "What about women's options?", 'Add it to my cart']
  }
  if (msg.includes('cart') || msg.includes('added')) {
    return ['What else would pair well?', 'Show me accessories', 'Do you have anything under $50?']
  }
  return ["What's under $50?", 'Show me all jackets', 'What do you recommend for beginners?']
}

function upsertItem(prev: CartItem[], incoming: { id: number; name: string; price: number }): CartItem[] {
  const existing = prev.find((i) => i.id === incoming.id)
  if (existing) {
    return prev.map((i) => i.id === incoming.id ? { ...i, quantity: i.quantity + 1 } : i)
  }
  return [...prev, { ...incoming, quantity: 1 }]
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) setCart(JSON.parse(stored))
    } catch {
      // ignore parse errors
    }
  }, [])

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync add_to_cart tool results into local cart state
  useEffect(() => {
    for (const msg of messages) {
      if (!msg.toolInvocations) continue
      for (const inv of msg.toolInvocations) {
        if (
          inv.toolName === 'add_to_cart' &&
          inv.state === 'result' &&
          inv.result?.item
        ) {
          const item = inv.result.item as { id: number; name: string; price: number }
          setCart((prev) => upsertItem(prev, item))
        }
      }
    }
  }, [messages])

  // Contextual follow-ups — derived from the last assistant message
  const followUps = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!lastAssistant?.content) return []
    return getFollowUps(lastAssistant.content)
  }, [messages])

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function changeQuantity(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0)
    )
  }

  function addToCartDirect(item: { id: number; name: string; price: number }) {
    setCart((prev) => upsertItem(prev, item))
  }

  function handleCheckout() {
    setOrderPlaced(true)
    setCart([])
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  function closeCheckout() {
    setCheckoutOpen(false)
    setOrderPlaced(false)
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">

      {/* Cart button — appears once something is added */}
      {cart.length > 0 && (
        <button
          onClick={() => { setCartOpen((o) => !o); setCheckoutOpen(false) }}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full hover:bg-gray-700 transition-colors"
        >
          <span>🛒</span>
          <span>{totalQuantity} item{totalQuantity !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && !checkoutOpen && (
        <div className="absolute top-12 left-4 right-4 sm:left-auto sm:w-72 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Cart</h3>
          <div className="flex flex-col gap-3 max-h-56 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {/* +/− controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => changeQuantity(item.id, -1)}
                    className="w-5 h-5 rounded border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center text-xs leading-none"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-xs font-medium text-gray-700">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => changeQuantity(item.id, +1)}
                    className="w-5 h-5 rounded border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center text-xs leading-none"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Name */}
                <span className="flex-1 text-gray-700 truncate">{item.name}</span>

                {/* Line total */}
                <span className="text-gray-900 font-medium whitespace-nowrap flex-shrink-0">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={() => { setCheckoutOpen(true); setCartOpen(false) }}
            className="mt-3 w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Checkout
          </button>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            {orderPlaced ? (
              <div className="text-center">
                <div className="text-4xl mb-3">✓</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Order placed!</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Thanks for your purchase. Your gear is on its way.
                </p>
                <button
                  onClick={closeCheckout}
                  className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Order Summary</h3>
                  <button
                    onClick={closeCheckout}
                    className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate mr-2">
                        {item.quantity > 1 && (
                          <span className="text-gray-400 mr-1">×{item.quantity}</span>
                        )}
                        {item.name}
                      </span>
                      <span className="text-gray-900 font-medium whitespace-nowrap">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold mb-5">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gray-900 text-white text-sm py-2.5 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  Place Order
                </button>
                <button
                  onClick={closeCheckout}
                  className="mt-2 w-full text-sm py-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back to cart
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6">
            <div>
              <p className="text-gray-500 text-sm mb-1">How can I help you today?</p>
              <p className="text-gray-400 text-xs">Try one of these to get started:</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {INITIAL_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => append({ role: 'user', content: q })}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-colors text-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role as 'user' | 'assistant'}
                content={m.content}
                toolInvocations={m.toolInvocations}
                onAddToCart={addToCartDirect}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                  AI
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Contextual follow-up suggestion chips */}
      {!isLoading && followUps.length > 0 && messages.length > 0 && (
        <div className="px-6 pb-3 flex gap-2 flex-wrap border-t border-gray-50 pt-3">
          {followUps.map((q) => (
            <button
              key={q}
              onClick={() => append({ role: 'user', content: q })}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-colors text-gray-600 whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about products, prices, or recommendations..."
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gray-900 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
