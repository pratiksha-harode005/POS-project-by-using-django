import { apiClient } from './client'
import { ApiRequestParams } from './managerApi'

export const getAdminDashboardStats = async () => {
  try {
    const res = await apiClient.get('/requests/')
    return res.data
  } catch {
    return null
  }
}

export const getAdminUsers = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/users/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getAdminVendors = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/vendors/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getAdminPurchaseOrders = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/procurement/purchase-orders/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const approveAdminRequestApi = async (id: string, notes?: string) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, {
      action: 'APPROVE',
      notes
    })
    return res.data
  } catch {
    return { success: false }
  }
}
