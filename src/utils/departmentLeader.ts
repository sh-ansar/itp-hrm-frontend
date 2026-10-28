export type DepartmentMember = { id: string; name: string; position: string | null }

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/\s*[—–-]\s*/gu, ' — ').replace(/\s+/gu, ' ')
}

/**
 * Staff-title hint for the chart. NOT an approval routing or authorization rule.
 * Ambiguous titles deliberately return null instead of displaying a random person.
 */
export function selectDepartmentLeader<T extends DepartmentMember>(
  departmentName: string,
  members: readonly T[],
): T | null {
  const exact = normalize('Руководитель — ' + departmentName)
  const exactMatches = members.filter(member => normalize(member.position ?? '') === exact)
  if (exactMatches.length === 1) return exactMatches[0]!
  if (exactMatches.length > 1) return null

  const leaders = members.filter(member => {
    const position = normalize(member.position ?? '')
    return position === 'руководитель'
      || position.startsWith('руководитель ')
      || position === 'генеральный директор'
      || position.startsWith('генеральный директор ')
      || position.startsWith('директор по ')
      || position.startsWith('начальник ')
      || position.startsWith('head of ')
  })
  return leaders.length === 1 ? leaders[0]! : null
}
