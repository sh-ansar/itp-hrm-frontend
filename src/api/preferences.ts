import { apiRequest } from './client'

export type NotificationChannels = {
  email: boolean
  in_app: boolean
}

export type NotificationRules = {
  employee_changes: boolean
  schedule_changes: boolean
  learning_reserve: boolean
  document_deadlines: boolean
}

export type UserPreferences = {
  notification_channels: NotificationChannels
  notification_rules: NotificationRules
  revision: number
}

export function getUserPreferences() {
  return apiRequest<{ data: UserPreferences }>('/me/preferences')
}

export function updateUserPreferences(payload: UserPreferences) {
  return apiRequest<{ data: UserPreferences }>('/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
