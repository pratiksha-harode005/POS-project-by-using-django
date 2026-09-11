import React, { useState } from 'react'
import { Bell, CheckCheck, Clock, ShieldAlert, ArrowRight } from 'lucide-react'

interface NotificationItem {
  id: number
  title: string
  message: string
  timestamp: string
  isRead: boolean
  requestId?: string
}

export const SharedNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      title: 'Request REQ-DEMO-001 Updated',
      message: 'Status changed to In Procurement by Admin. Stage: Product Order (6/10).',
      timestamp: '10 mins ago',
      isRead: false,
      requestId: 'REQ-DEMO-001',
    },
    {
      id: 2,
      title: 'Approval Required for REQ-DEMO-002',
      message: 'Cloud Infrastructure Yearly Renewal ($60,000.00) awaits Manager Approval.',
      timestamp: '1 hour ago',
      isRead: false,
      requestId: 'REQ-DEMO-002',
    },
    {
      id: 3,
      title: 'Quotation Received from Dell Technologies',
      message: 'Quotation QUO-001 submitted for RFQ-001 ($35,000.00).',
      timestamp: '3 hours ago',
      isRead: true,
      requestId: 'REQ-DEMO-001',
    },
  ])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const toggleRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    )
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="text-blue-600" /> Notifications
          </h1>
          <p className="text-xs text-gray-500">
            Real-time notifications sent to request creators and approval history actors.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition-colors"
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => toggleRead(n.id)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
              n.isRead
                ? 'bg-white border-gray-200'
                : 'bg-blue-50/50 border-blue-200 shadow-sm'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                n.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-600 text-white'
              }`}
            >
              {n.isRead ? <Clock size={16} /> : <ShieldAlert size={16} />}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h2
                  className={`text-xs font-bold ${
                    n.isRead ? 'text-gray-700' : 'text-gray-900'
                  }`}
                >
                  {n.title}
                </h2>
                <span className="text-[11px] text-gray-400 font-medium">{n.timestamp}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
              {n.requestId && (
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                  {n.requestId} <ArrowRight size={10} />
                </span>
              )}
            </div>

            {!n.isRead && (
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
