/** Calendar date in the viewer's local timezone, for effective-dated personnel records. */
export function localTodayISO(date = new Date()): string {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
