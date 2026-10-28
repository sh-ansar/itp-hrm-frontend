import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unionTenureDays, formatTenure } from '../../src/utils/employeeTenure.ts'

test('overlapping contracts do not count the same day twice', () => {
  assert.equal(unionTenureDays([
    {start:'2026-01-01',end:'2026-01-15'},
    {start:'2026-01-10',end:'2026-01-31'},
  ],'2026-01-31'),31)
})
test('termination, rehire and open-ended periods include only actual work days', () => {
  assert.equal(unionTenureDays([
    {start:'2026-01-01',end:'2026-01-10'},
    {start:'2026-02-01',end:null},
  ],'2026-02-10'),20)
})
test('future and invalid periods never invent tenure', () => {
  assert.equal(unionTenureDays([{start:'2027-01-01'}],'2026-10-28'),null)
  assert.equal(unionTenureDays([{start:'2026-02-31'}],'2026-10-28'),null)
  assert.equal(unionTenureDays([],'2026-10-28'),null)
})
test('report renders unavailable history distinct from zero-day tenure', () => {
  assert.equal(formatTenure(null),'Нет подтверждённой истории')
  assert.equal(formatTenure(0),'0 дн.')
})
