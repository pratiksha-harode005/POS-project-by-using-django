import { apiClient } from './client'
import type { ApiRequestParams } from './managerApi'

export const getFinanceDashboardStats = async () => {
  const role = (localStorage.getItem('user_role') || '').toUpperCase()
  const primaryEndpoint = (role === 'FINANCE' || role === 'ADMIN') ? '/finance/requests/' : '/requests/'
  try {
    // page_size=100: dashboard stats are computed from this list
    const res = await apiClient.get(primaryEndpoint, { params: { page_size: 100 } })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.get('/requests/', { params: { page_size: 100 } })
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
    // Removed page_size=10000 — caused full-DB serialization on every finance portal load
    const res = await apiClient.get(primaryEndpoint, { params: { ...params, page_size: 100 } })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.get('/requests/', { params: { ...params, page_size: 100 } })
      return fallback.data
    } catch {
      return { results: [], count: 0 }
    }
  }
}

export const getRecommendedToAdminRequests = async () => {
  const allRequests: any[] = []
  let page = 1

  while (true) {
    const response = await apiClient.get('/finance/requests/recommended-to-admin/', {
      params: { page, page_size: 1000 },
    })
    const data = response.data
    const rows = Array.isArray(data) ? data : data?.results || []
    allRequests.push(...rows)

    if (Array.isArray(data) || !data?.next || rows.length === 0) break
    page += 1
  }

  return allRequests
}

export const getPendingFinancialApprovals = async (params?: ApiRequestParams) => {
  return getFinanceRequests(params)
}

export interface FinanceApprovalPayload {
  approved_amount?: number
  finance_approved_amount?: number
  cost_center?: string
  budget_code?: string
  budget_available?: boolean
  payment_method?: string
  vendor?: string
  comments?: string
}

export const approveFinanceRequestApi = async (
  id: string | number,
  commentsOrPayload?: string | FinanceApprovalPayload,
  approvedAmount?: number
) => {
  let body: any = {}
  if (typeof commentsOrPayload === 'object' && commentsOrPayload !== null) {
    const amt = commentsOrPayload.finance_approved_amount ?? commentsOrPayload.approved_amount ?? 0
    body = {
      ...commentsOrPayload,
      finance_approved_amount: amt,
      approved_amount: amt,
    }
  } else {
    const amt = approvedAmount ?? 0
    body = {
      comments: commentsOrPayload || 'Approved by Finance Department.',
      approved_amount: amt,
      finance_approved_amount: amt,
    }
  }

  try {
    const res = await apiClient.post(`/finance/requests/${id}/approve/`, body)
    return res.data
  } catch (err: any) {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'APPROVE',
        notes: body.comments || 'Approved by Finance.',
        amount: body.finance_approved_amount ?? body.approved_amount ?? 0,
        approved_amount: body.finance_approved_amount ?? body.approved_amount ?? 0,
        cost_center: body.cost_center,
        vendor: body.vendor,
        budget_available: body.budget_available ?? true,
      })
      return fallback.data
    } catch {
      throw err
    }
  }
}

export const rejectFinanceRequestApi = async (id: string | number, reasonOrComments: string, notes?: string) => {
  const comments = notes ? `${reasonOrComments} - ${notes}` : reasonOrComments
  try {
    const res = await apiClient.post(`/finance/requests/${id}/reject/`, { comments })
    return res.data
  } catch (primaryErr) {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'REJECT',
        notes: comments
      })
      return fallback.data
    } catch {
      throw primaryErr
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
    const res = await apiClient.get('/invoices/', { params: { ...params, page_size: 10000 } })
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

export interface ProcessPaymentPayload {
  approved_amount?: number
  final_payable_amount: number
  payment_method?: string
  payment_reference: string
  payment_date?: string
  payment_status?: string
  payment_remarks?: string
}

export const processPaymentApi = async (id: string | number, payload: ProcessPaymentPayload) => {
  try {
    const res = await apiClient.post(`/finance/requests/${id}/process-payment/`, payload)
    return res.data
  } catch (err) {
    const fallback = await apiClient.post(`/requests/${id}/process-payment/`, payload)
    return fallback.data
  }
}

export const saveFinanceResearchApi = async (id: string | number, data: any) => {
  try {
    const res = await apiClient.post(`/finance/requests/${id}/save-research/`, data)
    return res.data
  } catch {
    const fallback = await apiClient.post(`/requests/${id}/save-research/`, data)
    return fallback.data
  }
}

export const saveFinanceCostEstimationApi = async (id: string | number, data: any) => {
  try {
    const res = await apiClient.post(`/finance/requests/${id}/save-cost-estimation/`, data)
    return res.data
  } catch {
    const fallback = await apiClient.post(`/requests/${id}/save-cost-estimation/`, data)
    return fallback.data
  }
}

export const submitFinanceCostEstimationApi = async (id: string | number, data: any) => {
  try {
    const res = await apiClient.post(`/finance/requests/${id}/submit-cost-estimation/`, data)
    return res.data
  } catch {
    const fallback = await apiClient.post(`/requests/${id}/submit-cost-estimation/`, data)
    return fallback.data
  }
}

export const recommendToAdminApi = async (
  id: string | number,
  reason: string,
  comments?: string,
  amount?: number
) => {
  const payload = {
    reason,
    comments: comments || reason || 'Recommended to Administrator for executive approval.',
    approved_amount: amount,
    recommended_amount: amount,
  }

  const res = await apiClient.post(`/finance/requests/${id}/recommend-admin/`, payload)
  return res.data
}



