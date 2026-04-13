interface Product {
  id: number
  name: string
  description: string
  category: string
  price: number
  tags: string
}

// ToolInvocation shape from Vercel AI SDK
interface ToolInvocation {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any
  state: 'partial-call' | 'call' | 'result'
}

interface Props {
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: ToolInvocation[]
  onAddToCart?: (product: { id: number; name: string; price: number }) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Jackets:      'bg-blue-50 text-blue-700 border-blue-200',
  Pants:        'bg-green-50 text-green-700 border-green-200',
  Footwear:     'bg-orange-50 text-orange-700 border-orange-200',
  Accessories:  'bg-purple-50 text-purple-700 border-purple-200',
  'Base Layers':'bg-yellow-50 text-yellow-700 border-yellow-200',
  Bags:         'bg-pink-50 text-pink-700 border-pink-200',
  Shorts:       'bg-teal-50 text-teal-700 border-teal-200',
  Tops:         'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function categoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-600 border-gray-200'
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product
  onAddToCart?: (p: { id: number; name: string; price: number }) => void
}) {
  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-semibold text-gray-900 leading-snug">{product.name}</span>
        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
          ${product.price.toFixed(2)}
        </span>
      </div>
      <span
        className={`self-start text-xs px-2 py-0.5 rounded-full border mb-2 ${categoryColor(product.category)}`}
      >
        {product.category}
      </span>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
        {product.description}
      </p>
      <button
        onClick={() => onAddToCart?.({ id: product.id, name: product.name, price: product.price })}
        className="mt-auto w-full text-xs font-medium bg-gray-900 text-white py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Add to cart
      </button>
    </div>
  )
}

function ToolBadge({
  inv,
  onAddToCart,
}: {
  inv: ToolInvocation
  onAddToCart?: (p: { id: number; name: string; price: number }) => void
}) {
  const isDone = inv.state === 'result'

  if (inv.toolName === 'add_to_cart') {
    if (!isDone) {
      return (
        <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 text-gray-500 rounded-lg px-3 py-2 mb-2">
          <span className="animate-spin inline-block">↻</span>
          <span>Adding to cart…</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 mb-2">
        <span>✓</span>
        <span>{inv.result?.message ?? 'Added to cart'}</span>
      </div>
    )
  }

  if (inv.toolName === 'filter_by_price' || inv.toolName === 'filter_by_category') {
    if (!isDone) {
      const action = inv.toolName === 'filter_by_price' ? 'Filtering by price' : 'Browsing category'
      return (
        <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 text-gray-500 rounded-lg px-3 py-2 mb-2">
          <span className="animate-spin inline-block">↻</span>
          <span>{action}…</span>
        </div>
      )
    }

    const label: string = inv.result?.label ?? 'Results'
    const products: Product[] = inv.result?.products ?? []

    if (products.length === 0) {
      return (
        <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 text-gray-500 rounded-lg px-3 py-2 mb-2">
          <span>🔍</span>
          <span>{label} — no products found</span>
        </div>
      )
    }

    return (
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-2">
          🔍 {label} — {products.length} product{products.length !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
          ))}
        </div>
      </div>
    )
  }

  return null
}

export default function ChatMessage({ role, content, toolInvocations, onAddToCart }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? '' : 'flex flex-col'}`}>
        {/* Tool call output — shown above the text response */}
        {!isUser && toolInvocations && toolInvocations.length > 0 && (
          <div className="mb-1">
            {toolInvocations.map((inv) => (
              <ToolBadge key={inv.toolCallId} inv={inv} onAddToCart={onAddToCart} />
            ))}
          </div>
        )}

        {/* Text bubble — only render if there's actual content */}
        {content && (
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? 'bg-gray-900 text-white rounded-br-sm'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
            }`}
          >
            {content}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0 mt-1">
          You
        </div>
      )}
    </div>
  )
}
