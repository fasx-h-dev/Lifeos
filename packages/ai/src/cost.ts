import type { ModelTier } from './types'

/** Cheap tier for extraction/classification (bulk of the calls); reasoning tier only when quality matters. */
export const MODELS: Record<ModelTier, string> = {
  cheap: 'gpt-4o-mini',
  reasoning: 'gpt-4o'
}

/**
 * Approximate published OpenAI list pricing, USD per 1M tokens, as of this build.
 * For in-app budget tracking only ("watch the $5 burn down") — not billing-accurate;
 * check the OpenAI dashboard for the real number.
 */
const PRICE_PER_MILLION: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  'gpt-4o': { prompt: 2.5, completion: 10 }
}

/** ~4 chars/token is the standard rough heuristic for English text; used when the API doesn't report real usage. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const price = PRICE_PER_MILLION[model] ?? PRICE_PER_MILLION['gpt-4o-mini']
  return (promptTokens / 1_000_000) * price.prompt + (completionTokens / 1_000_000) * price.completion
}
