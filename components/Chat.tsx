'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'

const SUGGESTED_QUESTIONS = [
  'Do you have waterproof jackets under $100?',
  'What are your best hiking boots?',
  'I need warm pants for winter camping.',
  'What gear do you recommend for beginners?',
]

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6">
            <div>
              <p className="text-gray-500 text-sm mb-1">How can I help you today?</p>
              <p className="text-gray-400 text-xs">Try one of these to get started:</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTED_QUESTIONS.map((q) => (
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
              <ChatMessage key={m.id} role={m.role as 'user' | 'assistant'} content={m.content} />
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
