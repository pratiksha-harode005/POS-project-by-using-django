/**
 * teamleadApi.ts — API service layer for Team Lead Portal
 */
import { apiClient } from './client'

export interface CreateRequestPayload {
  title: string
  category: string
  subcategory?: string
  description: string
  quantity: number
  required_by?: string
  department?: number
  department_id?: number
  delivery_location?: string
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent'
  vendor?: string
  preferred_vendor?: string
  justification?: string
  requested_amount?: number
  total_estimated_cost?: number
  flow_type?: string
  extra_fields?: Record<string, any>
}

export const getTeamLeadRequests = async (params?: { status?: string; search?: string; priority?: string }) => {
  const role = (localStorage.getItem('user_role') || '').toUpperCase()
  const primaryEndpoint = (role === 'TEAM_LEAD' || role === 'ADMIN') ? '/team-lead/requests/' : '/requests/'
  try {
    const response = await apiClient.get(primaryEndpoint, { params })
    return response.data
  } catch (err) {
    try {
      const fallback = await apiClient.get('/requests/', { params })
      return fallback.data
    } catch {
      return []
    }
  }
}

export const getTeamLeadRequestById = async (id: string | number) => {
  const response = await apiClient.get(`/team-lead/requests/${id}/`)
  return response.data
}

export const createTeamLeadRequest = async (payload: CreateRequestPayload) => {
  const body = {
    ...payload,
    requested_amount: payload.requested_amount ?? payload.total_estimated_cost ?? 0,
    department: payload.department ?? payload.department_id ?? 1,
    vendor: payload.vendor || payload.preferred_vendor || '',
    preferred_vendor: payload.preferred_vendor || payload.vendor || '',
  }
  const response = await apiClient.post('/requests/', body)
  return response.data
}

export const approveTeamLeadRequest = async (id: string | number, comments?: string) => {
  const response = await apiClient.post(`/team-lead/requests/${id}/approve/`, { comments })
  return response.data
}

export const rejectTeamLeadRequest = async (id: string | number, comments: string) => {
  const response = await apiClient.post(`/team-lead/requests/${id}/reject/`, { comments })
  return response.data
}

export const sendBackTeamLeadRequest = async (id: string | number, comments: string) => {
  const response = await apiClient.post(`/team-lead/requests/${id}/send-back/`, { comments })
  return response.data
}

export const resubmitTeamLeadRequest = async (requestId: string | number, payload?: any) => {
  const response = await apiClient.post(`/requests/${requestId}/resubmit/`, payload || {})
  return response.data
}
