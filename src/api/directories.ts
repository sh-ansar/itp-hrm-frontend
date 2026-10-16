import { apiRequest } from './client'

export type DirectoryStatus = 'active' | 'inactive' | 'draft'
export type DirectoryEntry = {
  id: string
  group: string
  code: string
  name: string
  category: string | null
  unit: string | null
  value: string | null
  status: DirectoryStatus
  revision: number
}
export type DirectoryListResponse = {
  data: DirectoryEntry[]
  meta: { group: string; writes_enabled: boolean }
}
export type DirectoryPayload = {
  code: string
  name: string
  category: string | null
  unit: string | null
  value: string | null
  status: DirectoryStatus
}

export function listDirectoryEntries(companyId: string, group: string) {
  return apiRequest<DirectoryListResponse>(`/companies/${companyId}/directories/${encodeURIComponent(group)}`)
}
export function createDirectoryEntry(companyId: string, group: string, payload: DirectoryPayload) {
  return apiRequest<{ data: DirectoryEntry }>(`/companies/${companyId}/directories/${encodeURIComponent(group)}`, {
    method: 'POST', body: JSON.stringify(payload),
  })
}
export function updateDirectoryEntry(companyId: string, group: string, id: string, revision: number, payload: DirectoryPayload) {
  return apiRequest<{ data: DirectoryEntry }>(`/companies/${companyId}/directories/${encodeURIComponent(group)}/${id}`, {
    method: 'PUT', body: JSON.stringify({ ...payload, revision }),
  })
}
export function deleteDirectoryEntry(companyId: string, group: string, id: string, revision: number) {
  return apiRequest<void>(`/companies/${companyId}/directories/${encodeURIComponent(group)}/${id}`, {
    method: 'DELETE', body: JSON.stringify({ revision }),
  })
}
