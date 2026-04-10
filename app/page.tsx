import Chat from '@/components/Chat'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">ShopBot</h1>
          <p className="text-xs text-gray-400 mt-0.5">AI-powered shopping assistant</p>
        </div>
        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Online</span>
      </header>

      {/* Intro banner */}
      <div className="bg-gray-800 text-gray-300 text-sm px-6 py-3 text-center">
        Ask me about waterproof jackets, hiking boots, price ranges, or anything in our catalog.
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-6">
        <Chat />
      </div>
    </main>
  )
}
