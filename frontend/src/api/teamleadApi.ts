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
  department?: number | string
  department_id?: number | string
  delivery_location?: string
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent'
  vendor?: string
  preferred_vendor?: string
  justification?: string
  requested_amount?: number
  total_estimated_cost?: number
  flow_type?: string
  request_type?: string
  software_name?: string
  current_plan?: string
  required_plan?: string
  existing_cost?: number
  business_requirement?: string
  extra_fields?: Record<string, any>
}

export const getTeamLeadRequests = async (params?: { status?: string; search?: string; priority?: string }) => {
  const role = (localStorage.getItem('user_role') || '').toUpperCase()
  const primaryEndpoint = (role === 'TEAM_LEAD' || role === 'ADMIN') ? '/team-lead/requests/' : '/requests/'
  try {
    // page_size=100 is generous for portal views; server caps at max_page_size=200 anyway.
    // Removed page_size=10000 which was causing full-DB serialization on every page load.
    const response = await apiClient.get(primaryEndpoint, { params: { ...params, page_size: 100 } })
    return response.data
  } catch (err) {
    try {
      const fallback = await apiClient.get('/requests/', { params: { ...params, page_size: 100 } })
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
    requested_amount: payload.requested_amount ?? payload.total_estimated_cost ?? payload.existing_cost ?? 0,
    total_estimated_cost: payload.total_estimated_cost ?? payload.requested_amount ?? payload.existing_cost ?? 0,
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

export const confirmTeamLeadRequest = async (id: string | number, comments?: string) => {
  try {
    const response = await apiClient.post(`/team-lead/requests/${id}/confirm/`, { comments })
    return response.data
  } catch (err) {
    const fallback = await apiClient.post(`/requests/${id}/confirm/`, { comments })
    return fallback.data
  }
}

/** SOFTWARE & SAAS WORKFLOW APIs **/

export interface MockPaymentPayload {
  payment_reference?: string
  amount?: number
  payment_method?: string
  notes?: string
}

export const mockPaymentApi = async (id: string | number, payload?: MockPaymentPayload) => {
  const response = await apiClient.post(`/team-lead/requests/${id}/mock-payment/`, payload || {})
  return response.data
}

export interface PaymentJustificationPayload {
  // Section 2: Software / SaaS Details
  software_name?: string
  vendor_name?: string
  purchase_type?: string
  subscription_type?: string
  users_licenses?: string
  start_date?: string
  end_date?: string
  plan_edition?: string

  // Section 3: Financial Details
  actual_purchase_amount?: number
  gst_tax?: number
  discount?: number

  // Section 4: Business Justification
  why_required?: string
  business_purpose?: string
  who_will_use?: string
  expected_benefits?: string
  impact_if_not_purchased?: string
  urgency?: string
  required_by_date?: string

  // Section 5: Vendor & Purchase Details
  vendor_contact?: string
  quote_number?: string
  purchase_date?: string
  po_number?: string
  purchase_url?: string
  selected_plan?: string
  purchase_remarks?: string

  // Section 6: Payment & Documents
  payment_method?: string
  payment_reference?: string
  payment_date?: string
  payment_status?: string
  invoice_file?: File | null
  quote_file?: File | null
  receipt_file?: File | null
  supporting_doc?: File | null

  // Section 7: Team Lead Confirmation
  comments_remarks?: string
  confirmation_checked?: boolean

  // Backward compatibility fields
  subscription_plan?: string
  business_justification?: string
  payment_amount?: number
  proof_description?: string
}

export const submitPaymentJustificationApi = async (id: string | number, payload: PaymentJustificationPayload | FormData) => {
  const isFormData = payload instanceof FormData
  const response = await apiClient.post(
    `/team-lead/requests/${id}/submit-justification/`,
    payload,
    isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
  )
  return response.data
}

export const acknowledgeRequestApi = async (id: string | number, comments?: string) => {
  const response = await apiClient.post(`/team-lead/requests/${id}/acknowledge/`, { comments: comments || 'Acknowledged by Team Lead.' })
  return response.data
}

export const renewRequestApi = async (id: string | number) => {
  const response = await apiClient.post(`/team-lead/requests/${id}/renew/`)
  return response.data
}

export const upgradeRequestApi = async (id: string | number) => {
  const response = await apiClient.post(`/team-lead/requests/${id}/upgrade/`)
  return response.data
}
