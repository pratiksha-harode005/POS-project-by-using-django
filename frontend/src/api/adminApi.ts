import { apiClient } from './client'
import { ApiRequestParams } from './managerApi'

export const getAdminDashboardStats = async () => {
  try {
    const res = await apiClient.get('/admin/requests/', { params: { page_size: 100 } })
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

export const getAdminRequests = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/admin/requests/', { params: { ...params, page_size: 100 } })
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

export const getAdminRequestById = async (id: string | number) => {
  try {
    const res = await apiClient.get(`/admin/requests/${id}/`)
    return res.data
  } catch {
    const fallback = await apiClient.get(`/requests/${id}/`)
    return fallback.data
  }
}

export const getAdminRequestHistory = async (id: string | number) => {
  try {
    const res = await apiClient.get(`/admin/requests/${id}/history/`)
    return res.data
  } catch {
    const fallback = await apiClient.get(`/requests/${id}/`)
    return fallback.data?.approval_history || []
  }
}

export const getAdminUsers = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/users/', { params: { ...params, page_size: 100 } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getAdminVendors = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/vendors/', { params: { ...params, page_size: 100 } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getAdminPurchaseOrders = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/procurement/purchase-orders/', { params: { ...params, page_size: 100 } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const approveAdminRequestApi = async (id: string | number, notes?: string, approvedAmount?: number) => {
  const res = await apiClient.post(`/admin/requests/${id}/approve/`, {
    comments: notes || 'Approved by Administrator.',
    approved_amount: approvedAmount,
  })
  return res.data
}

export const rejectAdminRequestApi = async (id: string | number, reasonOrComments: string) => {
  try {
    const res = await apiClient.post(`/admin/requests/${id}/reject/`, {
      comments: reasonOrComments,
    })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'REJECT',
        notes: reasonOrComments,
      })
      return fallback.data
    } catch {
      return { success: false }
    }
  }
}

export const sendBackAdminRequestApi = async (id: string | number, feedback: string) => {
  try {
    const res = await apiClient.post(`/admin/requests/${id}/send-back/`, {
      comments: feedback,
    })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'RETURN',
        notes: feedback,
      })
      return fallback.data
    } catch {
      return { success: false }
    }
  }
}

export const saveAdminResearchApi = async (id: string | number, data: any) => {
  try {
    const res = await apiClient.post(`/admin/requests/${id}/save-research/`, data)
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/save_research/`, data)
      return fallback.data
    } catch (err: any) {
      console.error('Failed to save admin research:', err)
      throw err
    }
  }
}

export const saveAdminCostEstimationApi = async (id: string | number, data: any) => {
  try {
    const res = await apiClient.post(`/admin/requests/${id}/save-cost-estimation/`, data)
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/save_pre_estimation/`, data)
      return fallback.data
    } catch (err: any) {
      console.error('Failed to save admin cost estimation:', err)
      throw err
    }
  }
}

