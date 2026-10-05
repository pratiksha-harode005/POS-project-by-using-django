/**
 * syncUtils.ts — Real-time cross-tab and cross-context synchronization utility.
 *
 * Ensures all portals (Team Lead, Manager, Finance, Admin) receive fresh data
 * immediately after any request creation or workflow transition without delay,
 * without manual browser refresh, and without aggressive polling.
 */

import { invalidateApiCache } from '../api/client'

const SYNC_EVENT_NAME = 'kss_backend_updated'
const STORAGE_KEY = 'kss_last_sync_timestamp'

// Use standard BroadcastChannel for instant cross-tab sync when available
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('kss_procurement_sync')
  : null

/**
 * Dispatches a sync event across the current window and all other browser tabs.
 */
export const triggerGlobalDataSync = (reason?: string, data?: any) => {
  // 0. Invalidate local API cache immediately
  invalidateApiCache()

  const payload = {
    type: 'KSS_SYNC',
    reason: reason || 'mutation',
    timestamp: Date.now(),
    data: data || null,
  }

  // 1. Dispatch locally on current window (same-tab contexts)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: payload }))
    } catch {
      // fallback for older environments
      window.dispatchEvent(new Event(SYNC_EVENT_NAME))
    }

    // 2. Broadcast to other open browser tabs
    try {
      syncChannel?.postMessage(payload)
    } catch (err) {
      console.warn('BroadcastChannel error:', err)
    }

    // 3. Update localStorage timestamp as secondary cross-tab fallback
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore storage quota / sandbox errors
    }
  }
}

/**
 * Subscribes a callback to receive instant synchronization triggers:
 * - Local window events
 * - Other tab BroadcastChannel messages
 * - Storage event fallback
 * - Window focus (when user switches back to tab)
 * - Page visibility changes (when tab becomes visible)
 */
export const subscribeGlobalDataSync = (callback: (payload?: any) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {}

  let lastRun = 0
  const throttledCallback = (payload?: any) => {
    const now = Date.now()
    // Invalidate API cache so fresh network response is retrieved
    invalidateApiCache()
    // Debounce triggers by 100ms to prevent duplicate simultaneous fetches
    if (now - lastRun > 100) {
      lastRun = now
      callback(payload)
    }
  }

  // 1. Listen to local custom event
  const onCustomEvent = (ev: any) => {
    throttledCallback(ev?.detail)
  }
  window.addEventListener(SYNC_EVENT_NAME, onCustomEvent)

  // 2. Listen to BroadcastChannel
  const onChannelMessage = (ev: MessageEvent) => {
    if (ev.data?.type === 'KSS_SYNC') {
      throttledCallback(ev.data)
    }
  }
  syncChannel?.addEventListener('message', onChannelMessage)

  // 3. Listen to storage event (cross-tab fallback)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        throttledCallback(parsed)
      } catch {
        throttledCallback()
      }
    }
  }
  window.addEventListener('storage', onStorage)

  // 4. Listen to window focus (refetch when tab is brought to front)
  const onFocus = () => throttledCallback()
  window.addEventListener('focus', onFocus)

  // 5. Listen to document visibility change
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      throttledCallback()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  // Cleanup function
  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, onCustomEvent)
    syncChannel?.removeEventListener('message', onChannelMessage)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
