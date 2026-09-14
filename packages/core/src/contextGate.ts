/**
 * The Context Gate is the one rule every agent action must pass before it runs:
 * "Do I have enough reliable information to do this correctly?"
 * It never guesses — missing, ambiguous, or unconfident input produces a typed
 * non-READY result instead of a fabricated answer.
 */

export type ContextGateInput = {
  /** field name -> value; undefined/null/empty-string counts as missing */
  requiredFields: Record<string, unknown>
  /** fields present but internally conflicting (e.g. two different due dates parsed from the same text) */
  ambiguousFields?: { field: string; reason: string }[]
  /** confidence score from an upstream extraction step, 0-1 */
  confidence?: number
  /** hard blocker unrelated to missing info, e.g. an external dependency is not configured */
  blockedReason?: string | null
}

export type ContextGateResult =
  | { status: 'READY' }
  | { status: 'NEEDS_INFO'; missing: string[] }
  | { status: 'UNCERTAIN'; reason: string; fields: string[] }
  | { status: 'BLOCKED'; reason: string }

const CONFIDENCE_THRESHOLD = 0.5

export function evaluateContextGate(input: ContextGateInput): ContextGateResult {
  if (input.blockedReason) {
    return { status: 'BLOCKED', reason: input.blockedReason }
  }

  const missing = Object.entries(input.requiredFields)
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([field]) => field)

  if (missing.length > 0) {
    return { status: 'NEEDS_INFO', missing }
  }

  if (input.ambiguousFields && input.ambiguousFields.length > 0) {
    return {
      status: 'UNCERTAIN',
      reason: input.ambiguousFields.map((f) => `${f.field}: ${f.reason}`).join('; '),
      fields: input.ambiguousFields.map((f) => f.field)
    }
  }

  if (typeof input.confidence === 'number' && input.confidence < CONFIDENCE_THRESHOLD) {
    return {
      status: 'UNCERTAIN',
      reason: `Extraction confidence too low (${input.confidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD})`,
      fields: Object.keys(input.requiredFields)
    }
  }

  return { status: 'READY' }
}
