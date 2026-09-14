import OpenAI from 'openai'
import { estimateTokens, estimateCostUsd, MODELS } from './cost'
import type { AIResult, AIUsage, ModelTier } from './types'

export type UsageSink = (usage: AIUsage) => Promise<void> | void

/** Only the surface this module actually calls — decoupled from OpenAI's internal class shape so a plain test double satisfies it. */
export type MinimalOpenAIClient = {
  chat: {
    completions: {
      create: (params: {
        model: string
        messages: { role: 'system' | 'user'; content: string }[]
        response_format?: { type: 'json_object' }
      }) => Promise<{
        choices?: { message?: { content?: string | null } }[]
        usage?: { prompt_tokens?: number; completion_tokens?: number }
      }>
    }
  }
}

export type AIProviderOptions = {
  apiKey?: string
  /** injected for tests — a fake with a chat.completions.create stub, never a real network call */
  client?: MinimalOpenAIClient
  onUsage?: UsageSink
}

const SAFETY_PREAMBLE =
  'You are a careful assistant inside LifeOS, a personal student/business operating system. ' +
  'Only use facts present in the given context. Never invent a deadline, an eligibility requirement, ' +
  'a contact, a name, or a "success" that is not backed by the context. If the context is insufficient, say so.'

export class AIProvider {
  private readonly client: MinimalOpenAIClient | null

  constructor(private readonly opts: AIProviderOptions = {}) {
    if (opts.client) {
      this.client = opts.client
    } else {
      const key = opts.apiKey ?? process.env.OPENAI_API_KEY
      this.client = key ? new OpenAI({ apiKey: key }) : null
    }
  }

  get isConfigured(): boolean {
    return this.client !== null
  }

  private async complete(params: {
    system: string
    user: string
    tier: ModelTier
    jsonMode?: boolean
  }): Promise<AIResult<string>> {
    if (!this.client) {
      return { status: 'AI_PROVIDER_NOT_CONFIGURED', reason: 'OPENAI_API_KEY is not set' }
    }
    const model = MODELS[params.tier]
    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user }
        ],
        ...(params.jsonMode ? { response_format: { type: 'json_object' as const } } : {})
      })
      const text = completion.choices?.[0]?.message?.content ?? ''
      const promptTokens = completion.usage?.prompt_tokens ?? estimateTokens(params.system + params.user)
      const completionTokens = completion.usage?.completion_tokens ?? estimateTokens(text)
      const usage: AIUsage = {
        model,
        promptTokensEst: promptTokens,
        completionTokensEst: completionTokens,
        costEstUsd: estimateCostUsd(model, promptTokens, completionTokens)
      }
      await this.opts.onUsage?.(usage)
      return { status: 'OK', data: text, usage }
    } catch (err) {
      return { status: 'FAILED', error: err instanceof Error ? err.message : String(err) }
    }
  }

  async generate(input: { prompt: string; context: string; tier?: ModelTier }): Promise<AIResult<string>> {
    return this.complete({
      system: SAFETY_PREAMBLE,
      user: `Context:\n${input.context}\n\nTask:\n${input.prompt}`,
      tier: input.tier ?? 'cheap'
    })
  }

  async classify(input: {
    text: string
    labels: string[]
    context?: string
    tier?: ModelTier
  }): Promise<AIResult<{ label: string; confidence: number }>> {
    const result = await this.complete({
      system: `${SAFETY_PREAMBLE}\nClassify the input into exactly one of: ${input.labels.join(
        ', '
      )}. Respond as JSON: {"label": string, "confidence": number between 0 and 1}.`,
      user: `${input.context ? `Context:\n${input.context}\n\n` : ''}Text:\n${input.text}`,
      tier: input.tier ?? 'cheap',
      jsonMode: true
    })
    if (result.status !== 'OK') return result
    try {
      const parsed = JSON.parse(result.data)
      if (typeof parsed.label !== 'string' || typeof parsed.confidence !== 'number') {
        return { status: 'FAILED', error: 'classify() response missing label/confidence' }
      }
      return { status: 'OK', data: { label: parsed.label, confidence: parsed.confidence }, usage: result.usage }
    } catch {
      return { status: 'FAILED', error: 'Model returned non-JSON output for a classify() call' }
    }
  }

  async extract<T = Record<string, unknown>>(input: {
    text: string
    schemaDescription: string
    context?: string
    tier?: ModelTier
  }): Promise<AIResult<T>> {
    const result = await this.complete({
      system: `${SAFETY_PREAMBLE}\nExtract structured data as JSON matching: ${input.schemaDescription}. If a field is not present in the text, set it to null — never guess. Respond with JSON only.`,
      user: `${input.context ? `Context:\n${input.context}\n\n` : ''}Text:\n${input.text}`,
      tier: input.tier ?? 'cheap',
      jsonMode: true
    })
    if (result.status !== 'OK') return result
    try {
      return { status: 'OK', data: JSON.parse(result.data) as T, usage: result.usage }
    } catch {
      return { status: 'FAILED', error: 'Model returned non-JSON output for an extract() call' }
    }
  }

  async summarize(input: { text: string; context?: string; tier?: ModelTier }): Promise<AIResult<string>> {
    return this.complete({
      system: `${SAFETY_PREAMBLE}\nSummarize the given text concisely and factually. Do not add information that is not present in it.`,
      user: `${input.context ? `Context:\n${input.context}\n\n` : ''}Text:\n${input.text}`,
      tier: input.tier ?? 'cheap'
    })
  }

  async analyze(input: { question: string; context: string; tier?: ModelTier }): Promise<AIResult<string>> {
    return this.complete({
      system: `${SAFETY_PREAMBLE}\nAnswer using only the provided context. If it's insufficient to answer reliably, say so explicitly instead of guessing.`,
      user: `Context:\n${input.context}\n\nQuestion:\n${input.question}`,
      tier: input.tier ?? 'reasoning'
    })
  }
}
