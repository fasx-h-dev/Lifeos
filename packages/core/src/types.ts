export type TaskStatus =
  | 'READY'
  | 'NEEDS_INFO'
  | 'UNCERTAIN'
  | 'BLOCKED'
  | 'AWAITING_REVIEW'
  | 'APPROVED'
  | 'COMPLETED'
  | 'FAILED'

export type PermissionLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type ApprovalStatus = 'AWAITING_REVIEW' | 'APPROVED' | 'REJECTED'

export type Approval = {
  id: string
  taskId: string
  action: string
  riskLevel: PermissionLevel
  status: ApprovalStatus
  summary: string
  createdAt: string
  decidedAt: string | null
  decidedBy: string | null
}

export type AuditEntry = {
  id?: string
  timestamp: string
  agent: string
  task: string
  contextState: TaskStatus
  action: string
  status: TaskStatus
  result?: unknown
  error?: string | null
  linkedApprovalId?: string | null
}
