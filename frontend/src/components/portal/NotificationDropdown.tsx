import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Bell, CheckCheck, X, CheckCircle, ArrowRight
} from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getNotifications, getNotificationsWithCount, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead, BackendNotification } from '../../api/notificationApi'
import { subscribeGlobalDataSync, triggerGlobalDataSync } from '../../utils/syncUtils'

export interface NotificationItem {
  id: number
  title: string
  message: string
  timestamp: string
  date: string
  isRead: boolean
  category: 'Approval' | 'RFQ' | 'Budget' | 'Logistics' | 'Payment' | 'Compliance'
  requestId?: string
  sender: string
}

interface NotificationDropdownProps {
  currentRole: string
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ currentRole }) => {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchInFlight = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const derivedRoleFromPath = useMemo(() => {
    if (location.pathname.includes('/team_lead')) return 'TEAM_LEAD'
    if (location.pathname.includes('/manager')) return 'MANAGER'
    if (location.pathname.includes('/finance')) return 'FINANCE'
    if (location.pathname.includes('/admin')) return 'ADMIN'
    if (location.pathname.includes('/vendor')) return 'VENDOR'
    return null
  }, [location.pathname])

  const activeRole = (currentRole || role || derivedRoleFromPath || 'MANAGER').toUpperCase()

  const getActiveVendorId = useCallback(() => {
    const match = location.pathname.match(/\/portal\/vendor\/vendor\/([^/]+)/)
    const vndMatch = location.pathname.match(/(VND-[A-Z0-9-]+|V-[A-Z0-9-]+)/i)
    return (match ? match[1] : null) || (vndMatch ? vndMatch[1] : null) || user?.vendor_id_code || (user?.role === 'VENDOR' ? user?.username : undefined) || 'VND-HW-001'
  }, [location.pathname, user?.vendor_id_code, user?.username, user?.role])

  const getNotificationPageRoute = useCallback(() => {
    const isVendorPortal = location.pathname.includes('/portal/vendor') || activeRole === 'VENDOR' || user?.role === 'VENDOR'
    if (isVendorPortal) {
      const vId = getActiveVendorId()
      return `/portal/vendor/vendor/${vId}/notifications`
    }
    if (activeRole === 'TEAM_LEAD') return '/portal/team_lead/notifications'
    if (activeRole === 'MANAGER') return '/portal/manager/notifications'
    if (activeRole === 'FINANCE') return '/portal/finance/notifications'
    if (activeRole === 'ADMIN') return '/portal/admin/notifications'
    return `/portal/${currentRole.toLowerCase()}/notifications`
  }, [currentRole, activeRole, location.pathname, user?.role, getActiveVendorId])

  const fetchRealNotifications = useCallback(async () => {
    if (fetchInFlight.current) return
    fetchInFlight.current = true
    try {
      const isVendorPortal = location.pathname.includes('/portal/vendor') || activeRole === 'VENDOR' || user?.role === 'VENDOR'
      let params: { role?: string; user?: string; vendor?: string; page_size?: number } = { 
        role: activeRole,
        page_size: 20
      }

      if (isVendorPortal) {
        params.vendor = getActiveVendorId()
      } else if (user?.username) {
        params.user = user.username
        params.role = activeRole
      }

      const { notifications: data, unreadCount: totalUnread } = await getNotificationsWithCount(params)
      
      const mapped: NotificationItem[] = data.map((n) => {
        const readStatus = n.is_read !== undefined ? Boolean(n.is_read) : Boolean(n.isRead)
        const reqId = n.request_id || n.requestId || (n.purchase_request ? `REQ-${n.purchase_request}` : undefined)
        return {
          id: n.id,
          title: n.title || 'System Notification',
          message: n.message || '',
          timestamp: n.timestamp || 'Just now',
          date: n.date || n.created_at || '',
          isRead: readStatus,
          category: (n.category as any) || 'Approval',
          requestId: reqId,
          sender: n.sender || 'Procurement System',
        }
      })

      setNotifications(mapped)
      setUnreadCount(totalUnread)
    } catch (err) {
      console.warn('Temporary issue loading notifications in dropdown:', err)
    } finally {
      setLoading(false)
      fetchInFlight.current = false
    }
  }, [activeRole, user?.username, getActiveVendorId, location.pathname])

  useEffect(() => {
    fetchRealNotifications()

    // 1. Subscribe to real-time cross-tab and in-memory synchronization events
    const unsubscribeSync = subscribeGlobalDataSync(() => {
      fetchRealNotifications()
    })

    // 2. Direct Window event listeners for immediate in-tab mutations
    const handleUpdate = () => {
      fetchRealNotifications()
    }
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchRealNotifications()
      }
    }

    window.addEventListener('kss_backend_updated', handleUpdate)
    window.addEventListener('kss_notifications_updated', handleUpdate)
    window.addEventListener('kss_request_created', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3. Heartbeat polling interval (10s) when tab is active
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchRealNotifications()
      }
    }, 10000)

    return () => {
      unsubscribeSync()
      window.removeEventListener('kss_backend_updated', handleUpdate)
      window.removeEventListener('kss_notifications_updated', handleUpdate)
      window.removeEventListener('kss_request_created', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [fetchRealNotifications])

  const topNotifications = notifications.slice(0, 5)

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    const isVendorPortal = location.pathname.includes('/portal/vendor') || activeRole === 'VENDOR' || user?.role === 'VENDOR'
    
    try {
      if (isVendorPortal) {
        await markAllNotificationsRead({ vendor: getActiveVendorId() })
      } else if (user?.username) {
        await markAllNotificationsRead({ user: user.username, role: activeRole })
      } else {
        await markAllNotificationsRead({ role: activeRole })
      }
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err)
    } finally {
      window.dispatchEvent(new CustomEvent('kss_backend_updated'))
      triggerGlobalDataSync('notifications_cleared')
    }
  }

  const resolveTargetRoute = (item: NotificationItem) => {
    const isVendorPortal = location.pathname.includes('/portal/vendor') || activeRole === 'VENDOR' || user?.role === 'VENDOR'
    
    if (isVendorPortal) {
      const vId = getActiveVendorId()
      const titleMsg = `${item.title} ${item.message}`.toLowerCase()
      if (titleMsg.includes('purchase order') || titleMsg.includes('po-')) {
        return `/portal/vendor/vendor/${vId}/purchase-orders`
      }
      if (titleMsg.includes('rfq') || titleMsg.includes('quote')) {
        return `/portal/vendor/vendor/${vId}/rfqs`
      }
      if (titleMsg.includes('invoice') || titleMsg.includes('inv-')) {
        return `/portal/vendor/vendor/${vId}/invoices`
      }
      if (titleMsg.includes('receipt') || titleMsg.includes('grn') || titleMsg.includes('delivery')) {
        return `/portal/vendor/vendor/${vId}/documents`
      }
      return `/portal/vendor/vendor/${vId}/notifications`
    }

    const titleMsg = `${item.title} ${item.message}`.toLowerCase()

    if (activeRole === 'FINANCE') {
      if (titleMsg.includes('recommend') || titleMsg.includes('approval') || titleMsg.includes('pending') || titleMsg.includes('submitted')) {
        return '/portal/finance/pending-approvals'
      }
      if (titleMsg.includes('payment') || titleMsg.includes('disbursed') || titleMsg.includes('utr')) {
        return '/portal/finance/payments'
      }
      if (titleMsg.includes('grn') || titleMsg.includes('receipt') || titleMsg.includes('invoice') || titleMsg.includes('3-way') || titleMsg.includes('ticket')) {
        return '/portal/finance/raise-ticket'
      }
      if (titleMsg.includes('rfq') || titleMsg.includes('quotation') || titleMsg.includes('quote')) {
        return '/portal/finance/vendor-quotations'
      }
      if (titleMsg.includes('budget')) {
        return '/portal/finance/budget'
      }
      return '/portal/finance/notifications'
    }

    if (activeRole === 'MANAGER') {
      if (titleMsg.includes('recommend') || titleMsg.includes('approval') || titleMsg.includes('submitted')) {
        return '/portal/manager/pending-approvals'
      }
      if (titleMsg.includes('payment')) {
        return '/portal/manager/payments'
      }
      if (titleMsg.includes('ticket') || titleMsg.includes('grn') || titleMsg.includes('invoice')) {
        return '/portal/manager/raise-ticket'
      }
      if (titleMsg.includes('rfq') || titleMsg.includes('quotation')) {
        return '/portal/manager/vendor-quotations'
      }
      if (titleMsg.includes('po') || titleMsg.includes('order')) {
        return '/portal/manager/purchase-requests'
      }
      return '/portal/manager/notifications'
    }

    if (activeRole === 'ADMIN') {
      if (titleMsg.includes('recommend') || titleMsg.includes('request') || titleMsg.includes('approval')) {
        return '/portal/admin/requests'
      }
      if (titleMsg.includes('po') || titleMsg.includes('purchase order')) {
        return '/portal/admin/purchase-orders'
      }
      if (titleMsg.includes('receipt') || titleMsg.includes('grn')) {
        return '/portal/admin/receipts'
      }
      if (titleMsg.includes('rfq') || titleMsg.includes('quotation')) {
        return '/portal/admin/vendor-quotations'
      }
      if (titleMsg.includes('ticket') || titleMsg.includes('complaint')) {
        return '/portal/admin/raise-ticket'
      }
      return '/portal/admin/notifications'
    }

    if (activeRole === 'TEAM_LEAD') {
      return '/portal/team_lead/notifications'
    }

    return getNotificationPageRoute()
  }

  // Click notification: mark as read, close dropdown, navigate to notification page
  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      try {
        await markNotificationRead(item.id)
        window.dispatchEvent(new CustomEvent('kss_backend_updated'))
        triggerGlobalDataSync('notification_read')
      } catch (err) {
        console.warn('Failed to mark notification read:', err)
      }
    }
    setIsOpen(false)
    const targetRoute = getNotificationPageRoute()
    navigate(targetRoute, {
      state: {
        selectedNotificationId: item.id,
        requestId: item.requestId,
        search: item.requestId,
      },
    })
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev)
          if (!isOpen) {
            fetchRealNotifications()
          }
        }}
        className="relative text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck size={14} /> Mark All as Read
                </button>
              )}

              {/* Close/Cancel option on side */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 4–5 Most Recent Notifications List */}
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
            {topNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle size={28} className="mx-auto mb-2 text-emerald-400 opacity-80" />
                No new notifications
              </div>
            ) : (
              topNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                    !n.isRead ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  {/* Indicator Dot */}
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      !n.isRead ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          !n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{n.timestamp}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {n.requestId && (
                      <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {n.requestId}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dropdown Footer: "View All" option */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              Showing {topNotifications.length} of {notifications.length}
            </span>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate(getNotificationPageRoute())
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              View All Notifications <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
