import 'server-only'
import { subjectsRepo, teachersRepo } from '@lifeos/db'
import type { Database } from '@lifeos/db'

/**
 * Validates that client-supplied foreign-key references (subjectId/teacherId) actually
 * belong to the requesting user before they're attached to a new/updated record.
 * Without this, a caller could attach their own assignment/exam/teacher row to another
 * user's subject or teacher by guessing/enumerating its UUID — not a data leak by itself
 * (nothing here returns the other user's row), but a real tenant-isolation gap.
 */
export async function verifyOptionalRefs(
  db: Database,
  userId: string,
  refs: { subjectId?: string | null; teacherId?: string | null }
): Promise<string | null> {
  if (refs.subjectId) {
    const ok = await subjectsRepo.belongsToUser(db, refs.subjectId, userId)
    if (!ok) return 'subjectId does not refer to one of your subjects'
  }
  if (refs.teacherId) {
    const ok = await teachersRepo.belongsToUser(db, refs.teacherId, userId)
    if (!ok) return 'teacherId does not refer to one of your teachers'
  }
  return null
}
