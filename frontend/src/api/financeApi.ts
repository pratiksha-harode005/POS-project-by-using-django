import { apiClient } from './client'
import { ApiRequestParams } from './managerApi'

export const getFinanceDashboardStats = async () => {
  const role = (localStorage.getItem('user_role') || '').toUpperCase()
  const primaryEndpoint = (role === 'FINANCE' || role === 'ADMIN') ? '/finance/requests/' : '/requests/'
  try {
    const res = await apiClient.get(primaryEndpoint)
    return res.data
  } catch {
    try {
      const fallback = await apiClient.get('/requests/')
      return fallback.data
    } catch {
      return null
    }
  }
}

export const getFinanceRequests = async (params?: ApiRequestParams) => {
  const role = (localStorage.getItem('user_role') || '').toUpperCase()
  const primaryEndpoint = (role === 'FINANCE' || role === 'ADMIN') ? '/finance/requests/' : '/requests/'
  try {
    const res = await apiClient.get(primaryEndpoint, { params })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.get('/requests/', { params })
      return fallback.data
    } catch {
      return { results: [], count: 0 }
    }
  }
}

export const getPendingFinancialApprovals = async (params?: ApiRequestParams) => {
  return getFinanceRequests(params)
}

export const approveFinanceRequestApi = async (id: string | number, comments?: string, approvedAmount?: number) => {
  try {
    const res = await apiClient.post(`/finance/requests/${id}/approve/`, {
      comments: comments || 'Approved by Finance Department.',
      approved_amount: approvedAmount,
    })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'APPROVE',
        notes: comments || 'Approved by Finance.',
        amount: approvedAmount || undefined,
        approved_amount: approvedAmount || undefined
      })
      return fallback.data
    } catch {
      return { success: false }
    }
  }
}

export const rejectFinanceRequestApi = async (id: string | number, reasonOrComments: string, notes?: string) => {
  const comments = notes ? `${reasonOrComments} - ${notes}` : reasonOrComments
  try {
    const res = await apiClient.post(`/finance/requests/${id}/reject/`, { comments })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'REJECT',
        notes: comments
      })
      return fallback.data
    } catch {
      return { success: false }
    }
  }
}

export const sendBackFinanceRequestApi = async (id: string | number, comments: string) => {
  try {
    const res = await apiClient.post(`/finance/requests/${id}/send-back/`, { comments })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'RETURN',
        notes: comments
      })
      return fallback.data
    } catch {
      return { success: false }
    }
  }
}

export const getFinancePayments = async (period: 'weekly' | 'monthly' | 'yearly' = 'monthly') => {
  try {
    const res = await apiClient.get('/payments/', { params: { period } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getInvoices = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/invoices/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const processPayment = async (invoiceId: string) => {
  try {
    const res = await apiClient.patch(`/invoices/${invoiceId}/`, { status: 'Paid' })
    return res.data
  } catch {
    return { success: false }
  }
}
