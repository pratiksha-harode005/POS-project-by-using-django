import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, CheckCheck, Clock, ShieldAlert, ArrowRight, Settings, Check, X, Filter } from 'lucide-react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getNotificationsWithCount, markNotificationRead, markAllNotificationsRead, BackendNotification } from '../../api/notificationApi'
import { subscribeGlobalDataSync, triggerGlobalDataSync } from '../../utils/syncUtils'

export interface NotificationItem {
  id: number
  title: string
  message: string
  timestamp: string
  date: string
  isRead: boolean
  category: string
  requestId?: string
  sender: string
}

export const SharedNotificationsPage: React.FC = () => {
  const { user, role } = useAuth()
  const location = useLocation()
  const params = useParams<{ vendorId?: string }>()
  const navigate = useNavigate()
  const selectedNotificationId = (location.state as { selectedNotificationId?: number })?.selectedNotificationId
  const currentRole = (role ? role.toUpperCase() : 'MANAGER')

  const vendorMatch = location.pathname.match(/\/portal\/vendor\/vendor\/([^/]+)/)
  const vndMatch = location.pathname.match(/(VND-[A-Z0-9-]+|V-[A-Z0-9-]+)/i)
  const routeVendorId = params.vendorId || (vendorMatch ? vendorMatch[1] : undefined) || (vndMatch ? vndMatch[1] : undefined)
  const isVendorPortal = location.pathname.includes('/portal/vendor') || (role ? role.toUpperCase() === 'VENDOR' : false)
  const activeVendorId = routeVendorId || user?.vendor_id_code || (user?.role === 'VENDOR' ? user?.username : undefined) || 'VND-HW-001'

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(false)
  const fetchInFlight = useRef(false)

  useEffect(() => {
    if (selectedNotificationId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`notification-${selectedNotificationId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedNotificationId, notifications.length])

  const fetchRealNotifications = useCallback(async () => {
    if (fetchInFlight.current) return
    fetchInFlight.current = true
    try {
      let queryParams: { role?: string; user?: string; vendor?: string; page_size?: number } = { 
        role: currentRole,
        page_size: 100
      }

      if (isVendorPortal) {
        queryParams.vendor = activeVendorId
      } else if (user?.username) {
        queryParams.user = user.username
        queryParams.role = currentRole
      }

      const { notifications: data, unreadCount } = await getNotificationsWithCount(queryParams)
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
          category: n.category || 'Approval',
          requestId: reqId,
          sender: n.sender || 'Procurement System',
        }
      })
      setNotifications(mapped)
      setUnreadTotal(unreadCount)
    } catch (err) {
      console.error('Failed to load notifications page data:', err)
    } finally {
      setLoading(false)
      fetchInFlight.current = false
    }
  }, [currentRole, isVendorPortal, activeVendorId, user?.username])

  useEffect(() => {
    fetchRealNotifications()

    // 1. Cross-tab and in-memory synchronization
    const unsubscribeSync = subscribeGlobalDataSync(() => {
      fetchRealNotifications()
    })

    // 2. Direct Window event listeners
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

    // 3. Heartbeat polling (10s) when tab is active
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

  const handleSelectMessage = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      )
      setUnreadTotal((prev) => Math.max(0, prev - 1))
      try {
        await markNotificationRead(item.id)
        window.dispatchEvent(new CustomEvent('kss_backend_updated'))
        triggerGlobalDataSync('notification_read')
      } catch (err) {
        console.warn('Failed to mark notification read:', err)
      }
    }
    if (currentRole.toUpperCase() === 'TEAM_LEAD') return
    const titleMsg = `${item.title} ${item.message}`.toLowerCase()

    if (isVendorPortal && activeVendorId) {
      if (titleMsg.includes('purchase order') || titleMsg.includes('po-')) {
        navigate(`/portal/vendor/vendor/${activeVendorId}/purchase-orders`)
      } else if (titleMsg.includes('rfq') || titleMsg.includes('quote')) {
        navigate(`/portal/vendor/vendor/${activeVendorId}/rfqs`)
      } else if (titleMsg.includes('invoice') || titleMsg.includes('inv-')) {
        navigate(`/portal/vendor/vendor/${activeVendorId}/invoices`)
      } else if (titleMsg.includes('receipt') || titleMsg.includes('grn') || titleMsg.includes('delivery')) {
        navigate(`/portal/vendor/vendor/${activeVendorId}/documents`)
      }
      return
    }

    const activeRole = currentRole.toUpperCase()
    if (activeRole === 'FINANCE') {
      if (titleMsg.includes('recommend') || titleMsg.includes('approval') || titleMsg.includes('pending') || titleMsg.includes('submitted')) {
        navigate('/portal/finance/pending-approvals', { state: { requestId: item.requestId } })
      } else if (titleMsg.includes('payment') || titleMsg.includes('disbursed') || titleMsg.includes('utr')) {
        navigate('/portal/finance/payments', { state: { requestId: item.requestId } })
      } else if (titleMsg.includes('grn') || titleMsg.includes('receipt') || titleMsg.includes('invoice') || titleMsg.includes('3-way') || titleMsg.includes('ticket')) {
        navigate('/portal/finance/raise-ticket', { state: { requestId: item.requestId } })
      } else if (titleMsg.includes('rfq') || titleMsg.includes('quotation') || titleMsg.includes('quote')) {
        navigate('/portal/finance/vendor-quotations')
      } else if (titleMsg.includes('budget')) {
        navigate('/portal/finance/budget')
      }
    } else if (activeRole === 'MANAGER') {
      if (titleMsg.includes('recommend') || titleMsg.includes('approval') || titleMsg.includes('submitted')) {
        navigate('/portal/manager/pending-approvals', { state: { requestId: item.requestId } })
      } else if (titleMsg.includes('payment')) {
        navigate('/portal/manager/payments', { state: { requestId: item.requestId } })
      } else if (titleMsg.includes('ticket') || titleMsg.includes('grn') || titleMsg.includes('invoice')) {
        navigate('/portal/manager/raise-ticket', { state: { requestId: item.requestId } })
      } else if (titleMsg.includes('rfq') || titleMsg.includes('quotation')) {
        navigate('/portal/manager/vendor-quotations')
      } else if (titleMsg.includes('po') || titleMsg.includes('order')) {
        navigate('/portal/manager/purchase-requests')
      }
    } else if (activeRole === 'ADMIN') {
      if (titleMsg.includes('recommend') || titleMsg.includes('request') || titleMsg.includes('approval')) {
        navigate('/portal/admin/requests', { state: { requestId: item.requestId } })
      } else if (titleMsg.includes('po') || titleMsg.includes('purchase order')) {
        navigate('/portal/admin/purchase-orders')
      } else if (titleMsg.includes('receipt') || titleMsg.includes('grn')) {
        navigate('/portal/admin/receipts')
      } else if (titleMsg.includes('rfq') || titleMsg.includes('quotation')) {
        navigate('/portal/admin/vendor-quotations')
      }
    } else if (activeRole === 'TEAM_LEAD') {
      if (titleMsg.includes('payment')) {
        navigate('/portal/team_lead/payment-status')
      } else {
        navigate('/portal/team_lead/my-requests')
      }
    }
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadTotal(0)
    try {
      if (isVendorPortal) {
        await markAllNotificationsRead({ vendor: activeVendorId })
      } else if (user?.username) {
        await markAllNotificationsRead({ user: user.username, role: currentRole })
      } else {
        await markAllNotificationsRead({ role: currentRole })
      }
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err)
    } finally {
      window.dispatchEvent(new CustomEvent('kss_backend_updated'))
      triggerGlobalDataSync('notifications_cleared')
    }
  }

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true))
  const unreadCount = unreadTotal

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Bell className="text-indigo-600" size={24} /> Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time audit alerts, workflow updates, and approval notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
            >
              <CheckCheck size={15} /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs text-slate-400 text-xs">
            <Clock size={36} className="mx-auto mb-2 text-emerald-400 opacity-80" />
            <p className="font-semibold text-slate-700 text-sm">No notifications found</p>
            <p className="text-slate-400 text-xs mt-0.5">You are completely up to date!</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              id={`notification-${n.id}`}
              key={n.id}
              onClick={() => handleSelectMessage(n)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 hover:shadow-xs ${
                selectedNotificationId === n.id
                  ? 'ring-2 ring-indigo-500 bg-indigo-50/70 border-indigo-300 shadow-md'
                  : n.isRead
                  ? 'bg-white border-slate-200/80 hover:border-slate-300'
                  : 'bg-indigo-50/40 border-indigo-200/90 shadow-2xs'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600 text-white shadow-xs'
                }`}
              >
                {n.isRead ? <Clock size={16} /> : <ShieldAlert size={16} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {n.category}
                    </span>
                    <h2
                      className={`text-xs truncate ${
                        n.isRead ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'
                      }`}
                    >
                      {n.title}
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">{n.timestamp}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>

                <div className="flex items-center gap-3 mt-2 text-[11px]">
                  {n.requestId && (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {n.requestId}
                    </span>
                  )}
                  <span className="text-slate-400">From: <strong className="text-slate-600">{n.sender}</strong></span>
                </div>
              </div>

              {!n.isRead && (
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full flex-shrink-0 mt-2" title="Unread" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
