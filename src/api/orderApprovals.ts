import { apiRequest } from './client'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function path(company: string, order: string): string {
  if (!uuid.test(company) || !uuid.test(order)) throw new Error('Invalid order identifier')
  return `/companies/${company}/documents/${order}`
}
export interface OrderReviewResult {
  data: {
    id: string
    status: 'submitted' | 'approved' | 'rejected'
    revision: number
  }
}
export function submitPersonnelOrder(company: string, order: string, revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid order revision')
  return apiRequest<OrderReviewResult>(`${path(company, order)}/submit`, {
    method: 'POST', body: JSON.stringify({ revision }),
  })
}
export function decidePersonnelOrder(company: string, order: string, revision: number,
  decision: 'approved' | 'rejected', comment: string | null) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid order revision')
  return apiRequest<OrderReviewResult>(`${path(company, order)}/decision`, {
    method: 'POST', body: JSON.stringify({ revision, decision, comment }),
  })
}
