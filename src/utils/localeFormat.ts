import type {
  UiDateFormat,
  UiLocale,
  UiNumberFormat,
  UiTimeFormat,
} from '../stores/uiPreferences'

export function localeTag(locale: UiLocale): string {
  return ({ ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' } as const)[locale]
}

function plainDateParts(value: string | Date | null | undefined): { year: string; month: string; day: string } | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return {
      year: String(value.getFullYear()).padStart(4, '0'),
      month: String(value.getMonth() + 1).padStart(2, '0'),
      day: String(value.getDate()).padStart(2, '0'),
    }
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? { year: match[1]!, month: match[2]!, day: match[3]! } : null
}

export function formatUiDate(
  value: string | Date | null | undefined,
  format: UiDateFormat,
): string {
  const parts = plainDateParts(value)
  if (!parts) return '—'
  if (format === 'yyyy-mm-dd') return `${parts.year}-${parts.month}-${parts.day}`
  if (format === 'dd/mm/yyyy') return `${parts.day}/${parts.month}/${parts.year}`
  return `${parts.day}.${parts.month}.${parts.year}`
}

export function formatUiNumber(
  value: number | string | null | undefined,
  format: UiNumberFormat,
  maximumFractionDigits = 2,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  const locale = format === 'comma' ? 'en-US' : 'ru-RU'
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(numeric)
  return format === 'space'
    ? formatted.replace(/[\u00A0\u202F]/g, ' ')
    : formatted
}

export function formatUiDateTime(
  value: string | Date | null | undefined,
  options: {
    locale: UiLocale
    dateFormat: UiDateFormat
    timeFormat: UiTimeFormat
    timeZone: string
  },
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const parts = new Intl.DateTimeFormat(localeTag(options.locale), {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: options.timeFormat === '12h',
  }).formatToParts(date)

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? ''

  const localDate = formatUiDate(
    `${part('year')}-${part('month')}-${part('day')}`,
    options.dateFormat,
  )
  const hour = part('hour')
  const minute = part('minute')
  const dayPeriod = part('dayPeriod')
  const time = dayPeriod ? `${hour}:${minute} ${dayPeriod}` : `${hour}:${minute}`
  return `${localDate} ${time}`.trim()
}
