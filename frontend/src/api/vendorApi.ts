import { apiClient } from './client'
import { ApiRequestParams } from './managerApi'

export const getVendorDashboardStats = async () => {
  try {
    const res = await apiClient.get('/rfq/')
    return res.data
  } catch {
    return null
  }
}

export const getVendorRFQs = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/rfq/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getVendorQuotations = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/rfq-quotations/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getVendorPurchaseOrders = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/procurement/purchase-orders/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const submitQuotationApi = async (rfqId: string, quoteData: any) => {
  try {
    const res = await apiClient.post(`/rfq-quotations/`, {
      rfq: rfqId,
      ...quoteData
    })
    return res.data
  } catch {
    return { success: false }
  }
}

export const submitInvoiceApi = async (poId: string, invoiceData: any) => {
  try {
    const res = await apiClient.post(`/invoices/`, {
      purchase_order: poId,
      ...invoiceData
    })
    return res.data
  } catch {
    return { success: false }
  }
}
