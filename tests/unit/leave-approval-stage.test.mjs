import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextLeaveApprovalStage } from '../../src/utils/leaveApprovalStage.ts'
const submitted = { status: 'submitted' }

test('submitted requests wait for departmental manager when staged workflow is active', () => {
  assert.equal(nextLeaveApprovalStage(submitted, true), 'manager')
  assert.equal(nextLeaveApprovalStage({ ...submitted, manager_recommendation: null }, true), 'manager')
})
test('HR waits for a positive managerial recommendation', () => {
  assert.equal(nextLeaveApprovalStage({ ...submitted, manager_recommendation: 'approved' }, true), 'hr')
  assert.equal(nextLeaveApprovalStage(submitted, false), 'hr')
})
test('rejected, approved, and draft requests show no next action', () => {
  for (const status of ['draft', 'approved', 'rejected', 'cancelled']) {
    assert.equal(nextLeaveApprovalStage({ status }, true), null)
    assert.equal(nextLeaveApprovalStage({ status }, false), null)
  }
  assert.equal(nextLeaveApprovalStage({ ...submitted, manager_recommendation: 'rejected' }, true), null)
})
