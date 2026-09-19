import React, { useState } from 'react'
import {
  Bell, CheckCheck, Clock, ShieldAlert, CheckCircle
} from 'lucide-react'

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

const ALL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    title: 'Request REQ-2026-001 Approved',
    message: 'High Performance Laptops for Engineering approved by Manager. Routed to Finance Review for capex verification and budget certification.',
    timestamp: '10 mins ago',
    date: '2026-09-11 17:45',
    isRead: false,
    category: 'Approval',
    requestId: 'REQ-2026-001',
    sender: 'Sarah Manager',
  },
  {
    id: 2,
    title: 'Quotation Received from Dell Technologies',
    message: 'Quotation QUO-4582 ($35,000.00) submitted for RFQ-2026-001 with 15-day delivery commitment. Awaiting quotation comparison.',
    timestamp: '45 mins ago',
    date: '2026-09-11 17:10',
    isRead: false,
    category: 'RFQ',
    requestId: 'REQ-2026-001',
    sender: 'Dell Technologies Enterprise',
  },
  {
    id: 3,
    title: 'Budget Threshold Warning — IT Department',
    message: 'IT Capex utilization reached 78.4% of quarterly ceiling. Approvals above ₹10L require CFO sign-off prior to PO generation.',
    timestamp: '2 hours ago',
    date: '2026-09-11 15:55',
    isRead: false,
    category: 'Budget',
    sender: 'Finance System Automated',
  },
  {
    id: 4,
    title: 'Goods Receipt GRN-2214 Verified',
    message: 'Warehouse team confirmed physical delivery of 20 units with zero damage. Ready for 3-way matching and ticket raising.',
    timestamp: '4 hours ago',
    date: '2026-09-11 13:50',
    isRead: true,
    category: 'Logistics',
    requestId: 'PO-4582',
    sender: 'Logistics & Receiving',
  },
  {
    id: 5,
    title: 'Payment Scheduled for PO-4582',
    message: 'Accounts Payable scheduled wire disbursement for ₹3,50,000 on Sep 14, 2026 after invoice verification.',
    timestamp: 'Yesterday',
    date: '2026-09-10 16:30',
    isRead: true,
    category: 'Payment',
    requestId: 'INV-9841',
    sender: 'Finance Controller',
  },
  {
    id: 6,
    title: 'Policy Compliance Reminder',
    message: 'Quarterly vendor audit documentation must be completed before end of month for all active supplier contracts.',
    timestamp: '3 days ago',
    date: '2026-09-08 10:00',
    isRead: true,
    category: 'Compliance',
    sender: 'Audit & Risk Team',
  },
  {
    id: 7,
    title: 'Request REQ-2026-018 Arrived',
    message: 'New standing desks request for Operations Floor submitted by Ravi Kumar. Awaiting initial manager review.',
    timestamp: '4 days ago',
    date: '2026-09-07 11:20',
    isRead: true,
    category: 'Approval',
    requestId: 'REQ-2026-018',
    sender: 'Ravi Kumar (Operations)',
  },
]

export const SharedNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(ALL_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleSelectMessage = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    )
  }

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true))
  const unreadCount = notifications.filter((n) => !n.isRead).length

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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors"
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
            <CheckCircle size={36} className="mx-auto mb-2 text-emerald-400 opacity-80" />
            <p className="font-semibold text-slate-700 text-sm">No notifications found</p>
            <p className="text-slate-400 text-xs mt-0.5">You are completely up to date!</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleSelectMessage(n)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 hover:shadow-xs ${
                n.isRead
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
