import { apiClient } from './client'
import { ApiRequestParams } from './managerApi'

export const getFinanceDashboardStats = async () => {
  try {
    const res = await apiClient.get('/requests/?page_size=1000')
    return res.data
  } catch {
    return null
  }
}

export const getPendingFinancialApprovals = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/requests/', { params: { page_size: 1000, ...params, current_stage: 2 } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const approveFinanceRequestApi = async (id: string, notes?: string, amount?: number) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, {
      action: 'APPROVE',
      notes,
      amount: amount || undefined
    })
    return res.data
  } catch {
    return { success: false }
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
