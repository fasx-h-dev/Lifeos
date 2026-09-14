import { describe, it, expect, vi } from 'vitest'
import { AIProvider } from './provider'
import { estimateCostUsd, estimateTokens, MODELS } from './cost'
import { buildContext } from './context'

function fakeClient(response: { content: string; usage?: { prompt_tokens: number; completion_tokens: number } }) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: response.content } }],
          usage: response.usage
        })
      }
    }
  }
}

describe('AIProvider — never fabricates, always reports real state', () => {
  it('reports AI_PROVIDER_NOT_CONFIGURED and makes no network call when no key/client is given', async () => {
    const provider = new AIProvider({ apiKey: undefined })
    expect(provider.isConfigured).toBe(false)
    const result = await provider.generate({ prompt: 'draft something', context: 'x' })
    expect(result).toEqual({ status: 'AI_PROVIDER_NOT_CONFIGURED', reason: 'OPENAI_API_KEY is not set' })
  })

  it('generate() returns OK with usage computed from real reported token counts', async () => {
    const client = fakeClient({ content: 'hello world', usage: { prompt_tokens: 40, completion_tokens: 10 } })
    const provider = new AIProvider({ client })
    const result = await provider.generate({ prompt: 'say hi', context: 'ctx' })
    expect(result.status).toBe('OK')
    if (result.status === 'OK') {
      expect(result.data).toBe('hello world')
      expect(result.usage.model).toBe(MODELS.cheap)
      expect(result.usage.promptTokensEst).toBe(40)
      expect(result.usage.costEstUsd).toBeCloseTo(estimateCostUsd(MODELS.cheap, 40, 10))
    }
  })

  it('extract() parses valid JSON into typed data', async () => {
    const client = fakeClient({ content: JSON.stringify({ subject: 'Physics', dueDate: null }) })
    const provider = new AIProvider({ client })
    const result = await provider.extract<{ subject: string; dueDate: string | null }>({
      text: 'Physics lab due sometime',
      schemaDescription: '{subject: string, dueDate: string|null}'
    })
    expect(result.status).toBe('OK')
    if (result.status === 'OK') {
      expect(result.data.subject).toBe('Physics')
      expect(result.data.dueDate).toBeNull()
    }
  })

  it('extract() fails cleanly (not a guess) when the model returns malformed JSON', async () => {
    const client = fakeClient({ content: 'not json at all' })
    const provider = new AIProvider({ client })
    const result = await provider.extract({ text: 'x', schemaDescription: '{}' })
    expect(result.status).toBe('FAILED')
  })

  it('classify() rejects a response missing label/confidence instead of coercing one', async () => {
    const client = fakeClient({ content: JSON.stringify({ notLabel: 'x' }) })
    const provider = new AIProvider({ client })
    const result = await provider.classify({ text: 'x', labels: ['a', 'b'] })
    expect(result.status).toBe('FAILED')
  })

  it('a thrown API error becomes a typed FAILED result, never a fabricated success', async () => {
    const client = {
      chat: { completions: { create: vi.fn().mockRejectedValue(new Error('rate limited')) } }
    }
    const provider = new AIProvider({ client })
    const result = await provider.summarize({ text: 'long text' })
    expect(result).toEqual({ status: 'FAILED', error: 'rate limited' })
  })

  it('invokes onUsage exactly once per successful call, carrying real usage', async () => {
    const client = fakeClient({ content: 'ok', usage: { prompt_tokens: 5, completion_tokens: 5 } })
    const onUsage = vi.fn()
    const provider = new AIProvider({ client, onUsage })
    await provider.generate({ prompt: 'p', context: 'c' })
    expect(onUsage).toHaveBeenCalledTimes(1)
    expect(onUsage.mock.calls[0][0].model).toBe(MODELS.cheap)
  })

  it('analyze() defaults to the reasoning tier; generate() defaults to the cheap tier', async () => {
    const client = fakeClient({ content: 'x' })
    const provider = new AIProvider({ client })
    await provider.analyze({ question: 'q', context: 'c' })
    await provider.generate({ prompt: 'p', context: 'c' })
    const calls = (client.chat.completions.create as any).mock.calls
    expect(calls[0][0].model).toBe(MODELS.reasoning)
    expect(calls[1][0].model).toBe(MODELS.cheap)
  })
})

describe('token/cost estimation (deterministic, no AI involved)', () => {
  it('estimateTokens scales with text length', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100)
    expect(estimateTokens('')).toBeGreaterThanOrEqual(1)
  })

  it('estimateCostUsd is proportional to token counts and falls back for unknown models', () => {
    const known = estimateCostUsd('gpt-4o-mini', 1_000_000, 0)
    expect(known).toBeCloseTo(0.15)
    const fallback = estimateCostUsd('some-future-model', 1_000_000, 0)
    expect(fallback).toBeCloseTo(known)
  })
})

describe('buildContext', () => {
  it('joins labeled parts and drops empty ones', () => {
    const ctx = buildContext([
      { label: 'Assignment', content: 'Physics lab, due Friday' },
      { label: 'Empty', content: '   ' }
    ])
    expect(ctx).toContain('## Assignment')
    expect(ctx).not.toContain('## Empty')
  })

  it('truncates context past the budget cap instead of sending an unbounded prompt', () => {
    const ctx = buildContext([{ label: 'Huge', content: 'x'.repeat(20000) }])
    expect(ctx.length).toBeLessThan(20000)
    expect(ctx).toContain('truncated')
  })
})
