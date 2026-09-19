import React, { useState, useRef, useEffect } from 'react'
import {
  Bell, CheckCheck, X, Clock, ShieldAlert, ArrowRight, CheckCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActivity } from '../../context/ActivityContext'

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

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    title: 'Request REQ-2026-001 Approved',
    message: 'High Performance Laptops for Engineering approved by Manager. Routed to Finance Review for capex verification.',
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
    message: 'Quotation QUO-4582 ($35,000.00) submitted for RFQ-2026-001 with 15-day delivery commitment.',
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
    message: 'IT Capex utilization reached 78.4% of quarterly ceiling. Approvals above ₹10L require CFO sign-off.',
    timestamp: '2 hours ago',
    date: '2026-09-11 15:55',
    isRead: false,
    category: 'Budget',
    sender: 'Finance System Automated',
  },
  {
    id: 4,
    title: 'Goods Receipt GRN-2214 Verified',
    message: 'Warehouse team confirmed physical delivery of 20 units with zero damage. Ready for 3-way matching.',
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
    message: 'Accounts Payable scheduled wire disbursement for ₹3,50,000 on Sep 14, 2026.',
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
    message: 'Quarterly vendor audit documentation must be completed before end of month.',
    timestamp: '3 days ago',
    date: '2026-09-08 10:00',
    isRead: true,
    category: 'Compliance',
    sender: 'Audit & Risk Team',
  },
]

interface NotificationDropdownProps {
  currentRole: string
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ currentRole }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { getRoleTotalUnread } = useActivity()

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const totalUnreadCount = unreadCount + getRoleTotalUnread()
  const topNotifications = notifications.slice(0, 5)

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  // Click notification: automatically mark as read
  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      )
    }
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
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75">
            {totalUnreadCount}
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
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={14} /> Mark All as Read
                </button>
              )}

              {/* Close/Cancel option on side */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
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
                No notifications right now
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

            <Link
              to={`/portal/${currentRole.toLowerCase()}/notifications`}
              onClick={() => setIsOpen(false)}
              className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              View All Notifications <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
