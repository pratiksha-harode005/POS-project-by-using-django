import { apiClient, invalidateApiCache } from './client'
import { triggerGlobalDataSync } from '../utils/syncUtils'

export interface BackendNotification {
  id: number
  title: string
  message: string
  is_read: boolean
  isRead?: boolean
  purchase_request?: number | null
  request_id?: string
  requestId?: string
  timestamp?: string
  date?: string
  category?: 'Approval' | 'RFQ' | 'Budget' | 'Logistics' | 'Payment' | 'Compliance'
  sender?: string
  created_at?: string
  updated_at?: string
}

export interface NotificationsFetchResult {
  notifications: BackendNotification[]
  unreadCount: number
}

export const getNotifications = async (params?: { role?: string; user?: string; vendor?: string; page_size?: number }): Promise<BackendNotification[]> => {
  invalidateApiCache('/notifications/')
  try {
    const res = await apiClient.get('/notifications/', { params })
    const data = res.data
    return Array.isArray(data) ? data : data?.results || []
  } catch (err) {
    console.warn('Failed to get notifications:', err)
    return []
  }
}

export const getNotificationsWithCount = async (params?: { role?: string; user?: string; vendor?: string; page_size?: number }): Promise<NotificationsFetchResult> => {
  invalidateApiCache('/notifications/')
  try {
    const res = await apiClient.get('/notifications/', { params })
    const data = res.data
    const list: BackendNotification[] = Array.isArray(data) ? data : (data?.results || [])
    const unreadCount = typeof data?.unread_count === 'number'
      ? data.unread_count
      : list.filter(n => !(n.is_read || n.isRead)).length
    return { notifications: list, unreadCount }
  } catch (err) {
    console.warn('Failed to get notifications with count:', err)
    return { notifications: [], unreadCount: 0 }
  }
}

export const getUnreadNotificationCount = async (params?: { role?: string; user?: string; vendor?: string }): Promise<number | null> => {
  try {
    invalidateApiCache('/notifications/')
    const res = await apiClient.get('/notifications/unread_count/', { params })
    return typeof res.data?.unread_count === 'number' ? res.data.unread_count : 0
  } catch {
    return null
  }
}

export const markNotificationRead = async (id: number | string): Promise<boolean> => {
  try {
    await apiClient.post(`/notifications/${id}/mark_read/`)
    window.dispatchEvent(new Event('kss_backend_updated'))
    triggerGlobalDataSync('notification_read')
    return true
  } catch (err) {
    console.error(`Failed to mark notification ${id} as read:`, err)
    return false
  }
}

export const markAllNotificationsRead = async (params?: { role?: string; user?: string; vendor?: string }): Promise<boolean> => {
  try {
    await apiClient.post('/notifications/mark_all_read/', params || {})
    window.dispatchEvent(new Event('kss_backend_updated'))
    triggerGlobalDataSync('notification_all_read')
    return true
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err)
    return false
  }
}
