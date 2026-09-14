const MAX_CONTEXT_CHARS = 6000

/**
 * The context-retrieval step every agent must go through before calling the AI provider:
 * assemble only the labeled snippets relevant to the current task (never "the whole database"),
 * and hard-cap the result so a runaway caller can't blow the token budget in one call.
 */
export function buildContext(parts: { label: string; content: string }[]): string {
  const joined = parts
    .filter((p) => p.content && p.content.trim().length > 0)
    .map((p) => `## ${p.label}\n${p.content.trim()}`)
    .join('\n\n')
  if (joined.length > MAX_CONTEXT_CHARS) {
    return `${joined.slice(0, MAX_CONTEXT_CHARS)}\n\n[context truncated to stay within budget]`
  }
  return joined
}
