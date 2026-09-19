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
  required_by: string
  department_id?: number
  delivery_location: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  preferred_vendor?: string
  justification: string
  total_estimated_cost?: number
}

export const getTeamLeadRequests = async (params?: { status?: string; search?: string }) => {
  try {
    const response = await apiClient.get('/requests/', { params })
    return response.data
  } catch (err) {
    console.warn('TeamLead API fallback:', err)
    return []
  }
}

export const createTeamLeadRequest = async (payload: CreateRequestPayload) => {
  const response = await apiClient.post('/requests/', payload)
  return response.data
}

export const resubmitTeamLeadRequest = async (requestId: string) => {
  const response = await apiClient.post(`/requests/${requestId}/resubmit/`)
  return response.data
}
