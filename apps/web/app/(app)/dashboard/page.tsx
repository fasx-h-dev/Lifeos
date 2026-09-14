import { getAuthedUser } from '@/lib/auth'
import { getServerDb } from '@/lib/serverDb'
import { assignmentsRepo, examsRepo, approvalsRepo, activityLogRepo, aiTasksRepo } from '@lifeos/db'
import { rankStudyPlan } from '@lifeos/agents'
import StatusBadge from '@/components/StatusBadge'
import PushSetup from '@/components/PushSetup'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getAuthedUser()
  const db = await getServerDb()
  const userId = user!.id

  const [assignments, exams, pendingApprovals, recentActivity, totalCostUsd] = await Promise.all([
    assignmentsRepo.list(db, userId),
    examsRepo.list(db, userId),
    approvalsRepo.list(db, userId, 'AWAITING_REVIEW'),
    activityLogRepo.list(db, userId, 10),
    aiTasksRepo.totalCostUsd(db, userId)
  ])

  const incomplete = assignments.filter((a) => a.status !== 'done')
  const plan = rankStudyPlan({
    now: new Date(),
    assignments: assignments.map((a) => ({ id: a.id, title: a.title, dueDate: a.dueDate, priority: a.priority, status: a.status })),
    exams: exams.map((e) => ({ id: e.id, title: e.title, examDate: e.examDate, weight: e.weight })),
    topics: []
  })
  const today = plan.slice(0, 5)
  const urgentDeadlines = incomplete.filter((a) => a.dueDate && a.dueDate.getTime() - Date.now() <= 48 * 3600_000)
  const aiConfigured = Boolean(process.env.OPENAI_API_KEY)
  const budget = 5

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Today</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Priorities">
          {today.length === 0 ? (
            <Empty>Nothing urgent right now.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {today.map((item) => (
                <li key={item.refId} className="flex justify-between">
                  <span>{item.title}</span>
                  <span className="text-gray-400 text-xs">{item.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Urgent deadlines">
          {urgentDeadlines.length === 0 ? (
            <Empty>No urgent deadlines.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {urgentDeadlines.map((a) => (
                <li key={a.id} className="text-red-700">
                  {a.title} — due {a.dueDate?.toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="AI status">
          <p className="text-sm">
            Provider: <strong>{aiConfigured ? 'OpenAI (configured)' : 'AI_PROVIDER_NOT_CONFIGURED'}</strong>
          </p>
          <p className="text-sm mt-1">
            Est. spend: <strong>${totalCostUsd.toFixed(4)}</strong> / ${budget.toFixed(2)} budget
          </p>
          <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
            <div className="h-2 bg-indigo-500" style={{ width: `${Math.min(100, (totalCostUsd / budget) * 100)}%` }} />
          </div>
          <div className="mt-3">
            <PushSetup />
          </div>
        </Card>

        <Card title="Approvals">
          {pendingApprovals.length === 0 ? (
            <Empty>Nothing awaiting review.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {pendingApprovals.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span>{a.summary}</span>
                  <StatusBadge status={a.riskLevel} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/approvals" className="text-xs text-indigo-600 mt-2 inline-block">
            Open Approval Queue →
          </Link>
        </Card>

        <Card title="Recent activity" wide>
          {recentActivity.length === 0 ? (
            <Empty>Nothing logged yet.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {recentActivity.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="text-gray-400">{e.agent}</span> — {e.task}
                  </span>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/audit" className="text-xs text-indigo-600 mt-2 inline-block">
            Open Control Room →
          </Link>
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`bg-white rounded shadow p-4 ${wide ? 'md:col-span-2 lg:col-span-3' : ''}`}>
      <h2 className="font-medium text-sm text-gray-500 mb-2">{title}</h2>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400">{children}</p>
}
