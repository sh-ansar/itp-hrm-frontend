import { useUiPreferencesStore } from '../stores/uiPreferences'
import { formatUiDate, formatUiDateTime, formatUiNumber, localeTag } from '../utils/localeFormat'

export function useUiFormatters() {
  const ui = useUiPreferencesStore()

  return {
    localeTag: () => localeTag(ui.locale),
    date: (value: string | Date | null | undefined) =>
      formatUiDate(value, ui.dateFormat),
    dateTime: (value: string | Date | null | undefined) =>
      formatUiDateTime(value, {
        locale: ui.locale,
        dateFormat: ui.dateFormat,
        timeFormat: ui.timeFormat,
        timeZone: ui.timeZone,
      }),
    number: (value: number | string | null | undefined, maximumFractionDigits = 2) =>
      formatUiNumber(value, ui.numberFormat, maximumFractionDigits),
  }
}
