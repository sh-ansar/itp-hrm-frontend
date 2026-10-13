import type { StaffingPlanRecord } from '../api/staffing'
import { localTodayISO } from './localDate'

/**
 * Select the effective approved plan before a newer draft or a future plan.
 * Fallback to the latest approved version when no approved plan covers the day.
 * Never treat draft versions as approved.
 */
export function preferredApprovedStaffingPlan(
  plans: StaffingPlanRecord[],
  day = localTodayISO(),
): StaffingPlanRecord | null {
  const approved = plans.filter(plan => plan.status === 'approved')
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from) || a.id.localeCompare(b.id))
  return approved.find(plan => plan.valid_from <= day && (plan.valid_to === null || plan.valid_to >= day))
    ?? approved[0]
    ?? null
}

export function preferredStaffingPlan(
  plans: StaffingPlanRecord[],
  day = localTodayISO(),
): StaffingPlanRecord | null {
  return preferredApprovedStaffingPlan(plans, day)
    ?? [...plans].sort((a, b) => b.valid_from.localeCompare(a.valid_from) || a.id.localeCompare(b.id))[0]
    ?? null
}
