export type ModelTier = 'cheap' | 'reasoning'

export type AIUsage = {
  model: string
  promptTokensEst: number
  completionTokensEst: number
  costEstUsd: number
}

/**
 * Every AI call returns one of these — there is no fourth path where a guess
 * gets dressed up as OK. A provider that isn't configured, or a call that fails,
 * is reported as exactly that, never silently swapped for a fabricated answer.
 */
export type AIResult<T> =
  | { status: 'OK'; data: T; usage: AIUsage }
  | { status: 'AI_PROVIDER_NOT_CONFIGURED'; reason: string }
  | { status: 'FAILED'; error: string }
