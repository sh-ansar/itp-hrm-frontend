export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>): void {
  const escapeCell = (value: unknown): string => {
    const raw = String(value ?? '')
    const safe = /^[=+@\-\t\r]/.test(raw) ? "'" + raw : raw
    return '"' + safe.replace(/"/g, '""') + '"'
  }
  const content = [headers, ...rows].map(row => row.map(escapeCell).join(';')).join('\r\n')
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
