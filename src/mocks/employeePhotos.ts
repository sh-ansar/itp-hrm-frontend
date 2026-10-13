// Demo photos live only in memory. Refreshing the demo clears user uploads.
const photos = new Map<string, Blob>()
export function getDemoEmployeePhoto(employeeId: string): Blob | null { return photos.get(employeeId) ?? null }
export function setDemoEmployeePhoto(employeeId: string, photo: Blob | null): void {
  if (photo) photos.set(employeeId, photo)
  else photos.delete(employeeId)
}
