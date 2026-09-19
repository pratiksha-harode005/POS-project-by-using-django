import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Clock, ShieldAlert, ArrowRight, Settings, Check, X, Filter } from 'lucide-react'
import { useProcurement, NotificationRecord } from '../../context/ProcurementContext'
import { useAuth } from '../../context/AuthContext'

export const SharedNotificationsPage: React.FC = () => {
  const navigate = useNavigate()
  const { role } = useAuth()
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    notificationPreferences,
    updateNotificationPreferences,
  } = useProcurement()

  const [filterType, setFilterType] = useState('All')
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)

  const isTeamLead = role === 'TEAM_LEAD'

  // Filter notifications by type & target role
  const filteredNotifications = notifications.filter((n) => {
    const matchesType = filterType === 'All' || n.type === filterType
    return matchesType
  })

  // Date Grouping
  const dateGroups: Record<string, NotificationRecord[]> = {
    Today: [],
    Yesterday: [],
    'Earlier this week': [],
    Older: [],
  }

  filteredNotifications.forEach((n) => {
    const group = n.dateGroup || 'Today'
    if (!dateGroups[group]) dateGroups[group] = []
    dateGroups[group].push(n)
  })

  const unreadCount = filteredNotifications.filter((n) => !n.isRead).length

  const handleCardClick = (n: NotificationRecord, e: React.MouseEvent) => {
    markNotificationRead(n.id)
    if (n.requestId) {
      if (isTeamLead) {
        navigate('/portal/team_lead/my-requests')
      } else {
        navigate('/portal/manager/my-approvals')
      }
    }
  }

  const handleSingleMarkRead = (nId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    markNotificationRead(nId)
  }

  // CRITICAL FIX #3: Role-Aware title formatter
  const formatNotificationTitle = (n: NotificationRecord) => {
    if (isTeamLead && n.title.includes('Approval Required')) {
      return `Your request ${n.requestId || ''} is now awaiting Manager approval.`
    }
    return n.title
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="text-blue-600" /> Notifications & Alerts
          </h1>
          <p className="text-xs text-gray-500">
            Real-time status updates, approval alerts, and payment notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings / Gear Icon */}
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-xl transition-colors shadow-xs"
            title="Notification Preferences"
          >
            <Settings size={18} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200 transition-colors shadow-xs"
            >
              <CheckCheck size={16} /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Filter by Type Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <Filter size={15} className="text-gray-400" />
          <span className="font-bold text-gray-700">Filter by Type:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {['All', 'Approvals', 'Status updates', 'Vendor activity', 'Payments'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Notifications List */}
      {filteredNotifications.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-16 text-center rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
            <Bell size={32} />
          </div>
          <h2 className="text-base font-bold text-gray-900">You're all caught up!</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            There are zero notifications matching your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(dateGroups).map(([groupTitle, list]) => {
            if (list.length === 0) return null

            return (
              <div key={groupTitle} className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
                  {groupTitle}
                </h3>

                <div className="space-y-3">
                  {list.map((n) => {
                    const formattedTitle = formatNotificationTitle(n)

                    return (
                      <div
                        key={n.id}
                        onClick={(e) => handleCardClick(n, e)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 hover:shadow-md ${
                          n.isRead
                            ? 'bg-white border-gray-200 hover:border-gray-300'
                            : 'bg-blue-50/60 border-blue-200 shadow-xs hover:border-blue-300'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            n.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-600 text-white shadow-xs'
                          }`}
                        >
                          {n.isRead ? <Clock size={16} /> : <ShieldAlert size={16} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4
                              className={`text-xs font-bold truncate ${
                                n.isRead ? 'text-gray-700' : 'text-gray-900'
                              }`}
                            >
                              {formattedTitle}
                            </h4>
                            <span className="text-[11px] text-gray-400 font-medium ml-2 flex-shrink-0">
                              {n.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                          {n.requestId && (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                              {n.requestId} <ArrowRight size={10} />
                            </span>
                          )}
                        </div>

                        {/* Individual Clickable Unread Dot */}
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleSingleMarkRead(n.id, e)}
                            title="Mark as read"
                            className="w-3 h-3 bg-blue-600 hover:bg-blue-800 rounded-full flex-shrink-0 mt-1.5 transition-transform hover:scale-125"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Notification Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Settings className="text-blue-600" size={20} /> Notification Preferences
              </h3>
              <button onClick={() => setShowPreferencesModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-gray-500">Configure which procurement events trigger alerts on your account:</p>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                {[
                  { key: 'inAppApprovals', label: 'In-App Approval & Decision Alerts' },
                  { key: 'inAppStatus', label: 'In-App Request Stage & Workflow Updates' },
                  { key: 'inAppPayments', label: 'In-App Disbursement & Receipt Upload Alerts' },
                  { key: 'emailApprovals', label: 'Email Notifications for Pending Approvals' },
                  { key: 'emailStatus', label: 'Email Summaries for Request Status Changes' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between cursor-pointer py-1">
                    <span className="font-semibold text-gray-700">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={!!notificationPreferences[item.key]}
                      onChange={(e) =>
                        updateNotificationPreferences({
                          ...notificationPreferences,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow hover:bg-blue-700"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
