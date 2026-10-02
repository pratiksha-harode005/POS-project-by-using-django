import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth, UserRole } from './AuthContext'
import { useManagerData } from './ManagerDataContext'

interface ActivityContextType {
  readItemIds: Set<string>
  isUnread: (itemId: string) => boolean
  markAsRead: (itemId: string | string[]) => void
  markAllAsRead: (routeOrType?: string) => void
  getUnreadCount: (routePath: string, roleOverride?: UserRole) => number
  getRoleTotalUnread: (roleOverride?: UserRole) => number
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

const getStorageKey = (role: string) => `procurement_os_read_items_${role.toLowerCase()}`

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth()
  const currentRole: UserRole = role || 'MANAGER'

  const {
    arrivedRequests,
    pendingApprovals,
    financeReview,
    recommendedToAdmin,
    invoices,
    purchaseOrders,
    payments,
    rfqs,
    quotations,
  } = useManagerData()

  // Load read item IDs from localStorage for the current role
  const [readItemIds, setReadItemIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(currentRole))
      if (saved) {
        const arr = JSON.parse(saved)
        return new Set<string>(Array.isArray(arr) ? arr : [])
      }
    } catch {
      // ignore
    }
    return new Set<string>()
  })

  // Synchronize when active role changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(currentRole))
      if (saved) {
        const arr = JSON.parse(saved)
        setReadItemIds(new Set<string>(Array.isArray(arr) ? arr : []))
        return
      }
    } catch {
      // ignore
    }
    setReadItemIds(new Set<string>())
  }, [currentRole])

  const isUnread = useCallback((itemId: string) => {
    if (!itemId) return false
    return !readItemIds.has(itemId)
  }, [readItemIds])

  const markAsRead = useCallback((itemIdOrArray: string | string[]) => {
    const idsToMark = Array.isArray(itemIdOrArray) ? itemIdOrArray : [itemIdOrArray]
    if (idsToMark.length === 0) return

    setReadItemIds(prev => {
      let changed = false
      const next = new Set(prev)
      for (const id of idsToMark) {
        if (id && !next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      if (changed) {
        try {
          localStorage.setItem(getStorageKey(currentRole), JSON.stringify(Array.from(next)))
        } catch {
          // ignore
        }
        return next
      }
      return prev
    })
  }, [currentRole])

  const markAllAsRead = useCallback((_routeOrType?: string) => {
    // Collect all current IDs across data sources
    const allCurrentIds: string[] = [
      ...arrivedRequests.map(r => r.id),
      ...pendingApprovals.map(r => r.id),
      ...financeReview.map(r => r.id),
      ...recommendedToAdmin.map(r => r.id),
      ...invoices.map(i => i.id),
      ...purchaseOrders.map(p => p.id),
      ...payments.map(p => p.id),
      ...rfqs.map(r => r.id),
      ...quotations.map(q => q.id),
    ]

    setReadItemIds(prev => {
      const next = new Set(prev)
      allCurrentIds.forEach(id => next.add(id))
      try {
        localStorage.setItem(getStorageKey(currentRole), JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }, [currentRole, arrivedRequests, pendingApprovals, financeReview, recommendedToAdmin, invoices, purchaseOrders, payments, rfqs, quotations])

  // Compute unread count for specific sidebar menu routes
  const getUnreadCount = useCallback((routePath: string, roleOverride?: UserRole): number => {
    const activeRole = roleOverride || currentRole

    switch (activeRole) {
      case 'MANAGER': {
        if (routePath.includes('/pending-approvals')) {
          return pendingApprovals.filter(r => !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/finance-review')) {
          return financeReview.filter(r => !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/purchase-orders')) {
          return invoices.filter(inv => inv.status === 'Pending Review' && !readItemIds.has(inv.id)).length
        }
        if (routePath.includes('/payments')) {
          return payments.filter(p => p.status === 'Pending' && !readItemIds.has(p.id)).length
        }
        if (routePath.includes('/request-arrival')) {
          return arrivedRequests.filter(r => !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/notifications')) {
          return 2 // unread notification alerts
        }
        return 0
      }

      case 'FINANCE': {
        if (routePath.includes('/pending-approvals')) {
          return financeReview.filter(r => (r.status === 'finance_review' || r.status === 'sent_to_finance') && !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/payments')) {
          return payments.filter(p => p.status === 'Pending' && !readItemIds.has(p.id)).length
        }
        if (routePath.includes('/purchase-requests')) {
          return arrivedRequests.filter(r => !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/notifications')) {
          return 3
        }
        return 0
      }

      case 'ADMIN': {
        if (routePath.includes('/requests')) {
          return recommendedToAdmin.filter(r => !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/quotations') || routePath.includes('/vendor-comparison')) {
          return quotations.filter(q => q.status === 'Under Evaluation' && !readItemIds.has(q.id)).length
        }
        if (routePath.includes('/rfqs')) {
          return rfqs.filter(r => (r.status === 'under_evaluation' || r.status === 'quotes_received') && !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/purchase-orders')) {
          return purchaseOrders.filter(po => po.status === 'Approved' && !readItemIds.has(po.id)).length
        }
        if (routePath.includes('/notifications')) {
          return 2
        }
        return 0
      }

      case 'TEAM_LEAD': {
        if (routePath.includes('/my-requests') || routePath.includes('/request-history')) {
          // Team lead unread updates (e.g. clarification requested, newly approved)
          return arrivedRequests.slice(0, 2).filter(r => !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/payment-status')) {
          return payments.slice(0, 1).filter(p => !readItemIds.has(p.id)).length
        }
        if (routePath.includes('/notifications')) {
          return 1
        }
        return 0
      }

      case 'VENDOR': {
        if (routePath.includes('/rfqs')) {
          return rfqs.filter(r => r.status === 'sent' && !readItemIds.has(r.id)).length
        }
        if (routePath.includes('/purchase-orders') || routePath.includes('/orders')) {
          return purchaseOrders.filter(po => po.status === 'Sent to Vendor' && !readItemIds.has(po.id)).length
        }
        if (routePath.includes('/invoices')) {
          return invoices.filter(i => i.status === 'Pending Review' && !readItemIds.has(i.id)).length
        }
        if (routePath.includes('/notifications')) {
          return 2
        }
        return 0
      }

      default:
        return 0
    }
  }, [currentRole, pendingApprovals, financeReview, invoices, payments, arrivedRequests, recommendedToAdmin, quotations, rfqs, purchaseOrders, readItemIds])

  const getRoleTotalUnread = useCallback((roleOverride?: UserRole): number => {
    const activeRole = roleOverride || currentRole
    const paths = ['/pending-approvals', '/finance-review', '/purchase-orders', '/payments', '/requests', '/quotations', '/rfqs', '/my-requests']
    let sum = 0
    paths.forEach(p => {
      sum += getUnreadCount(p, activeRole)
    })
    return sum
  }, [currentRole, getUnreadCount])

  return (
    <ActivityContext.Provider value={{
      readItemIds,
      isUnread,
      markAsRead,
      markAllAsRead,
      getUnreadCount,
      getRoleTotalUnread,
    }}>
      {children}
    </ActivityContext.Provider>
  )
}

export const useActivity = () => {
  const ctx = useContext(ActivityContext)
  if (!ctx) {
    return {
      readItemIds: new Set<string>(),
      isUnread: () => false,
      markAsRead: () => {},
      markAllAsRead: () => {},
      getUnreadCount: () => 0,
      getRoleTotalUnread: () => 0,
    }
  }
  return ctx
}

/**
 * Reusable Enterprise "New" Badge component
 */
export const UnreadBadge: React.FC<{ isUnread: boolean; className?: string }> = ({ isUnread, className = '' }) => {
  if (!isUnread) return null

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200/80 uppercase tracking-wide flex-shrink-0 animate-in fade-in duration-200 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
      New
    </span>
  )
}
