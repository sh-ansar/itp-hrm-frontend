import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectDepartmentLeader } from '../../src/utils/departmentLeader.ts'

const member = (id, position) => ({ id, name: 'Synthetic ' + id, position })

test('exact department head wins over other director titles', () => {
  const people = [member('ceo', 'Генеральный директор'), member('head', 'Руководитель — Бухгалтерия')]
  assert.equal(selectDepartmentLeader('Бухгалтерия', people)?.id, 'head')
})

test('handles hyphen variants and case for staffing head', () => {
  assert.equal(selectDepartmentLeader('IT поддержка', [member('a', 'РУКОВОДИТЕЛЬ - IT поддержка')])?.id, 'a')
})

test('unique leadership title is shown when exact position is absent', () => {
  assert.equal(selectDepartmentLeader('Администрация', [member('a', 'Генеральный директор')])?.id, 'a')
})

test('ambiguous leaders and arbitrary employees are not presented as managers', () => {
  assert.equal(selectDepartmentLeader('Проектный офис', [member('a', 'Директор по развитию'), member('b', 'Начальник отдела')]), null)
  assert.equal(selectDepartmentLeader('Разработка', [member('a', 'Разработчик'), member('b', 'Дизайнер')]), null)
  assert.equal(selectDepartmentLeader('Бухгалтерия', [member('a', 'Руководитель — Бухгалтерия'), member('b', 'Руководитель — Бухгалтерия')]), null)
})
