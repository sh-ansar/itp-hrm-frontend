/** Duration of documented, non-overlapping work intervals. A missing history is unknown, not zero. */
export interface TenurePeriod { start: string; end?: string | null }
const dayMs = 86400000
function day(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = Date.parse(value + 'T00:00:00Z')
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
    ? Math.floor(parsed / dayMs) : null
}
export function unionTenureDays(periods: readonly TenurePeriod[], asOf: string): number | null {
  const cutoff = day(asOf)
  if (cutoff === null || periods.length === 0) return null
  const ranges: Array<[number,number]> = []
  for (const record of periods) {
    const start = day(record.start)
    const end = record.end ? day(record.end) : cutoff
    if (start === null || end === null) continue
    if (start > cutoff || end < start) continue
    ranges.push([start, Math.min(end, cutoff)])
  }
  if (!ranges.length) return null
  ranges.sort((a,b) => a[0] - b[0])
  let [begin, end] = ranges[0]!
  let result = 0
  for (const [from, to] of ranges.slice(1)) {
    if (from <= end + 1) end = Math.max(end,to)
    else { result += end - begin + 1; begin = from; end = to }
  }
  return result + end - begin + 1
}
export function formatTenure(days: number | null): string {
  if (days === null) return 'Нет подтверждённой истории'
  const years = Math.floor(days / 365.2425)
  const months = Math.floor((days - years * 365.2425) / 30.436875)
  const remainder = Math.max(0,Math.round(days - years * 365.2425 - months * 30.436875))
  return [years ? years + ' г.' : '',months ? months + ' мес.' : '',remainder || (!years&&!months) ? remainder + ' дн.' : ''].filter(Boolean).join(' ')
}
