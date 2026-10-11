/** First-party Laravel CSRF cookie; never send it to third-party origins. */
export function readXsrfCookie(): string | null {
  const pair = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))
  if (!pair) return null
  try {
    return decodeURIComponent(pair.slice('XSRF-TOKEN='.length))
  } catch {
    return null
  }
}

export function requiresCsrf(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}
