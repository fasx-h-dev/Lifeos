import 'server-only'
import { NextResponse } from 'next/server'
import { getAuthedUser } from './auth'
import { getServerDb } from './serverDb'
import { makeAiProvider } from './aiProvider'
import { createDbAuditSink } from '@lifeos/db'

export async function requireApiContext() {
  const user = await getAuthedUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) } as const
  }
  const db = await getServerDb()
  const ai = makeAiProvider(db, user.id)
  const auditSink = createDbAuditSink(db, user.id)
  return { user, db, ai, auditSink } as const
}

export type ApiContext = Exclude<Awaited<ReturnType<typeof requireApiContext>>, { error: unknown }>
