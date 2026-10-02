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
    const res = await apiClient.get('/rfq/quotations/', { params })
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

export const getVendorInvoices = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/invoices/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getVendorGoodsReceipts = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/procurement/goods-receipts/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

export const getVendorDocumentsApi = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/procurement/documents/', { params })
    return res.data
  } catch {
    return []
  }
}

export const deleteVendorDocumentApi = async (docId: string) => {
  try {
    const res = await apiClient.delete(`/procurement/documents/${docId}/`)
    return res.data
  } catch (err) {
    console.warn('Failed to delete document via API:', err)
    return { success: false }
  }
}

export const submitQuotationApi = async (rfqId: string, quoteData: any) => {
  try {
    const res = await apiClient.post(`/rfq/quotations/`, {
      rfq: rfqId,
      ...quoteData
    })
    return res.data
  } catch (err) {
    console.error('Failed to submit quotation via API:', err)
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
  } catch (err) {
    console.error('Failed to submit invoice via API:', err)
    return { success: false }
  }
}

export const createGoodsReceiptApi = async (poId: string, grData?: any) => {
  try {
    const res = await apiClient.post(`/procurement/goods-receipts/`, {
      purchase_order: poId,
      ...grData
    })
    return res.data
  } catch (err) {
    console.error('Failed to create goods receipt via API:', err)
    return { success: false }
  }
}

export const updateVendorPurchaseOrderApi = async (poId: string, data: any) => {
  try {
    const res = await apiClient.patch(`/procurement/purchase-orders/${poId}/`, data)
    return res.data
  } catch (err) {
    console.warn('Failed to update PO status via API:', err)
    return null
  }
}
