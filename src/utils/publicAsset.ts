/** Paths to files in Vite's public/ folder work at both / and /hrm/ origins. */
export function publicAsset(path: string): string {
  // Treat this as an asset path, never a caller-supplied URL.
  if (!/^\/?[A-Za-z0-9/_\-.]+$/.test(path) || path.includes('..')) {
    throw new Error('Invalid local asset path')
  }
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
