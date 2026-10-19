import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isOnTopic, searchProducts, streamText } = vi.hoisted(() => ({
  isOnTopic: vi.fn(),
  searchProducts: vi.fn(),
  streamText: vi.fn(),
}))

vi.mock('@/lib/guard', () => ({ isOnTopic, OFF_TOPIC_REPLY: 'I can only help with shopping.' }))
vi.mock('@/lib/rag', () => ({
  searchProducts,
  filterProductsByPrice: vi.fn(),
  filterProductsByCategory: vi.fn(),
  buildProductContext: () => 'catalog',
}))
vi.mock('ai', async (importOriginal) => ({ ...(await importOriginal<typeof import('ai')>()), streamText }))

import { POST } from '@/app/api/chat/route'

const SITE = 'https://shop.example.com'
let ip = 0

function chat(messages: unknown[], { origin = SITE, from = `10.0.0.${++ip}` } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', host: 'shop.example.com', 'x-forwarded-for': from }
  if (origin) headers.origin = origin
  return POST(new Request(`${SITE}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ messages }) }))
}

const ask = (content: string) => [{ role: 'user', content }]

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {}) // outage tests log on purpose
  isOnTopic.mockResolvedValue(true)
  searchProducts.mockResolvedValue([])
  streamText.mockResolvedValue({ toDataStreamResponse: () => new Response('streamed') })
})

describe('POST /api/chat', () => {
  it('answers shopping questions with the catalog in context', async () => {
    const res = await chat(ask('waterproof jacket?'))

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('streamed')
    expect(streamText.mock.calls[0][0].system).toContain('catalog')
  })

  it('rejects requests from other sites', async () => {
    expect((await chat(ask('hi'), { origin: 'https://evil.example' })).status).toBe(403)
    expect((await chat(ask('hi'), { origin: '' })).status).toBe(403)
  })

  it('rejects messages over 500 characters', async () => {
    const res = await chat(ask('a'.repeat(501)))

    expect(res.status).toBe(400)
    expect(await res.text()).toContain('500 characters')
  })

  it('rejects conversations over 20 messages', async () => {
    const res = await chat(Array.from({ length: 21 }, () => ({ role: 'user', content: 'hi' })))

    expect(res.status).toBe(400)
  })

  it('rejects malformed requests', async () => {
    expect((await chat([])).status).toBe(400)
  })

  it('rate-limits a single IP after 20 requests a minute', async () => {
    const statuses = []
    for (let i = 0; i < 21; i++) statuses.push((await chat(ask('hi'), { from: '10.9.9.9' })).status)

    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true)
    expect(statuses[20]).toBe(429)
  })

  it('answers off-topic messages with a fixed reply, without searching or calling the assistant', async () => {
    isOnTopic.mockResolvedValue(false)

    const res = await chat(ask('write me a python script'))

    expect(res.status).toBe(200)
    expect(await res.text()).toContain('I can only help with shopping.')
    expect(searchProducts).not.toHaveBeenCalled()
    expect(streamText).not.toHaveBeenCalled()
  })

  it('reports an outage when the topic check fails', async () => {
    isOnTopic.mockRejectedValue(new Error('OpenAI down'))

    expect((await chat(ask('hi'))).status).toBe(503)
    expect(streamText).not.toHaveBeenCalled()
  })

  it('says the catalog is unavailable instead of answering without it', async () => {
    searchProducts.mockRejectedValue(new Error('Supabase down'))

    const res = await chat(ask('rain jacket'))

    expect(res.status).toBe(503)
    expect(await res.text()).toContain('catalog is unavailable')
    expect(streamText).not.toHaveBeenCalled()
  })

  it('searches with the last three customer messages, so follow-ups keep their context', async () => {
    await chat([
      { role: 'user', content: 'boots' },
      { role: 'user', content: 'rain jacket' },
      { role: 'assistant', content: 'We have the Storm Shell.' },
      { role: 'user', content: 'waterproof?' },
      { role: 'user', content: 'smaller size?' },
    ])

    expect(searchProducts).toHaveBeenCalledWith('rain jacket waterproof? smaller size?', 5)
  })
})
