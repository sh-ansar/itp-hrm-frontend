export type LeaveStageStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'
export type ManagerRecommendation = 'approved' | 'rejected' | null

export interface LeaveStageInput {
  status: LeaveStageStatus
  manager_recommendation?: ManagerRecommendation
}

/** Pure view-only projection. Authorization always lives on Laravel. */
export function nextLeaveApprovalStage(
  row: LeaveStageInput,
  managerApprovalRequired: boolean,
): 'manager' | 'hr' | null {
  if (row.status !== 'submitted') return null
  if (!managerApprovalRequired) return 'hr'
  if (row.manager_recommendation === 'rejected') return null
  return row.manager_recommendation === 'approved' ? 'hr' : 'manager'
}
