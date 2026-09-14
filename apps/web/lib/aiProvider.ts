import 'server-only'
import { AIProvider } from '@lifeos/ai'
import { aiTasksRepo } from '@lifeos/db'
import type { Database } from '@lifeos/db'

/** One AIProvider per request, wired to log real usage/cost into ai_tasks for the Control Room's $ tracker. */
export function makeAiProvider(db: Database, userId: string): AIProvider {
  return new AIProvider({
    onUsage: async (usage) => {
      await aiTasksRepo.create(db, userId, {
        kind: 'generate',
        agent: 'unknown',
        model: usage.model,
        promptTokensEst: usage.promptTokensEst,
        completionTokensEst: usage.completionTokensEst,
        costEstUsd: String(usage.costEstUsd),
        contextState: 'READY',
        status: 'COMPLETED'
      })
    }
  })
}
