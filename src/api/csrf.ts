/** First-party Laravel CSRF cookie; never send it to third-party origins. */
const xsrfCookieName = import.meta.env.VITE_XSRF_COOKIE_NAME || 'XSRF-TOKEN'
if (!/^[A-Za-z0-9_-]{1,64}$/.test(xsrfCookieName)) {
  throw new Error('Invalid first-party XSRF cookie name')
}

export function readXsrfCookie(): string | null {
  const prefix = xsrfCookieName + '='
  const pair = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  if (!pair) return null
  try {
    return decodeURIComponent(pair.slice(prefix.length))
  } catch {
    return null
  }
}

export function requiresCsrf(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}
