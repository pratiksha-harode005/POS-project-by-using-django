import React, { useState, useMemo } from 'react'
import {
  Scale, Search, Filter, CheckCircle, Clock, ChevronRight,
  ArrowLeft, Building2, Package, ShieldCheck, Truck,
  IndianRupee, FileText, AlertCircle, Award, Check, Eye,
  BarChart3, Layers, UserCheck, ThumbsUp, Wrench, Calendar, Gift
} from 'lucide-react'
import { useManagerData, resolveVendorId, isMockRfq, isFinanceRelevantRequest } from '../../context/ManagerDataContext'
import type { QuotationItem } from '../../context/ManagerDataContext'
import { QuotationCommercialModal } from '../../components/portal/QuotationCommercialModal'
import { formatDate } from '../../utils/formatDate'
import { useAuth } from '../../context/AuthContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export interface VendorQuotationsPageProps {
  role?: 'MANAGER' | 'FINANCE' | 'ADMIN'
}

interface ProductGroup {
  key: string
  product: string
  rfqId: string
  rfqTitle: string
  category: string
  quantity: number
  quotes: QuotationItem[]
  selectedQuote?: QuotationItem
  lowestPrice: number
  highestPrice: number
}

export const VendorQuotationsPage: React.FC<VendorQuotationsPageProps> = ({ role = 'MANAGER' }) => {
  const { user } = useAuth()
  const effectiveRole = role || (user?.role as any) || 'MANAGER'
  const isFinance = (effectiveRole || '').toUpperCase() === 'FINANCE'
  const { quotations, rfqs, allRequests, selectVendorQuotation, assignVendorToRequest } = useManagerData()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SELECTED'>('ALL')
  const [selectedProductKey, setSelectedProductKey] = useState<string | null>(null)
  const [comparisonLayout, setComparisonLayout] = useState<'cards' | 'table'>('cards')

  // Inspection & Selection Modal state
  const [inspectQuote, setInspectQuote] = useState<QuotationItem | null>(null)
  const [confirmingQuote, setConfirmingQuote] = useState<QuotationItem | null>(null)
  const [selectionRationale, setSelectionRationale] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Group quotations by RFQ ID
  const productGroups = useMemo<ProductGroup[]>(() => {
    const map = new Map<string, ProductGroup>()
    const aliasToKeyMap = new Map<string, string>()

    // Helper to extract clean alphanumeric identifiers (for exact comparison)
    const cleanStr = (s?: any): string => {
      if (s === null || s === undefined) return ''
      if (typeof s === 'object') {
        const inner = s.rfq_id || s.request_id || s.id || ''
        return String(inner).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      }
      return String(s).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    }

    // Vendor submissions persist detailed commercial fields in extra_fields.
    // Read both API aliases and the JSON payload so every portal renders the
    // same submitted quotation details regardless of which endpoint supplied it.
    const quoteField = (quote: any, ...keys: string[]): any => {
      const extra = quote?.extra_fields && typeof quote.extra_fields === 'object' ? quote.extra_fields : {}
      for (const key of keys) {
        for (const source of [quote, extra]) {
          const value = source?.[key]
          if (value !== undefined && value !== null && String(value).trim() !== '') return value
        }
      }
      return undefined
    }

    // Helper to check if RFQ is accessible in current role view
    const isRfqAllowedForRole = (r: any): boolean => {
      if (!isFinance) return true
      if (Array.isArray(r.quotations) && r.quotations.length > 0) return true
      const rawStatus = (r.status || '').toUpperCase()
      if (rawStatus === 'OPEN' || rawStatus === 'QUOTES_RECEIVED' || rawStatus === 'SENT' || rawStatus === 'AWARDED') return true
      const prDetail = r.purchase_request_detail
      if (!prDetail) return true
      const stage = Number(prDetail.current_stage || r.current_stage || 0)
      if (stage >= 3) return true
      const matchedReq = (allRequests || []).find(req =>
        req.id === r.purchase_request ||
        req.id === prDetail?.request_id ||
        (req as any).rawRequest?.id === r.purchase_request ||
        (req as any).rawRequest?.request_id === prDetail?.request_id
      )
      if (matchedReq) {
        if ((matchedReq.currentStage || 0) >= 3) return true
        return isFinanceRelevantRequest(matchedReq)
      }
      if (prDetail) {
        if (prDetail.flow_type === 'B') return true
        if (prDetail.created_by_detail?.role === 'FINANCE') return true
        if (prDetail.is_forwarded_to_finance) return true
        const st = (prDetail.status || '').toUpperCase()
        if (st.includes('FINANCE') || st.includes('PROCUREMENT') || st === 'RECOMMENDED_TO_FINANCE' || st === 'MANAGER_RECOMMENDED_TO_FINANCE' || st === 'RECOMMENDED_TO_ADMIN' || st === 'APPROVED') {
          return true
        }
      }
      return true
    }

    // 1. Initialize cards for active RFQs in rfqs context
    (rfqs || []).forEach((r: any) => {
      const rId = (r.rfq_id || r.id || '').toString()
      if (!rId || isMockRfq(rId)) return
      if (!isRfqAllowedForRole(r)) return
      const normRfqId = rId.startsWith('RFQ-') ? rId.toUpperCase() : `RFQ-${rId.toUpperCase()}`
      const title = r.title || r.purchase_request_detail?.title || r.purchase_request_detail?.subcategory || 'Procurement Request'

      if (!map.has(normRfqId)) {
        map.set(normRfqId, {
          key: normRfqId,
          product: title,
          rfqId: normRfqId,
          rfqTitle: title,
          category: r.purchase_request_detail?.category || r.category || 'General',
          quantity: r.purchase_request_detail?.quantity || r.qty || 1,
          quotes: [],
          selectedQuote: undefined,
          lowestPrice: 0,
          highestPrice: 0
        })
      }

      // Register all exact aliases for this RFQ to point directly to normRfqId
      const aliases = [
        normRfqId,
        rId,
        cleanStr(normRfqId),
        cleanStr(rId),
        r.id ? String(r.id) : '',
        r.pk ? String(r.pk) : '',
        cleanStr(r.pk),
        r.purchase_request ? String(r.purchase_request) : '',
        cleanStr(r.purchase_request),
        r.purchase_request_detail?.request_id ? String(r.purchase_request_detail.request_id) : '',
        cleanStr(r.purchase_request_detail?.request_id)
      ].filter(Boolean)

      aliases.forEach(a => {
        aliasToKeyMap.set(a.toUpperCase(), normRfqId)
        aliasToKeyMap.set(cleanStr(a), normRfqId)
      })

      // If this RFQ object already contains nested quotations from backend, populate them
      if (Array.isArray(r.quotations) && r.quotations.length > 0) {
        const group = map.get(normRfqId)!
        r.quotations.forEach((nq: any) => {
          const qId = nq.quotation_id || (nq.id ? (String(nq.id).startsWith('QUO-') ? String(nq.id) : `QUO-${nq.id}`) : '')
          const vObj = nq.vendor_detail || (typeof nq.vendor === 'object' ? nq.vendor : null)
          const vName = vObj?.name || (typeof nq.vendor === 'string' && isNaN(Number(nq.vendor)) ? nq.vendor : '') || (nq.vendor_name || 'Vendor Partner')
          const p = Number(nq.price) || Number(nq.total_amount) || Number(nq.totalAmount) || 0
          const qItem: QuotationItem = {
            id: qId,
            rfqId: normRfqId,
            rfqTitle: title,
            vendor: vName,
            vendorId: vObj?.unique_vendor_id || nq.vendor_id || String(nq.vendor || ''),
            product: title,
            specification: quoteField(nq, 'specification', 'terms_conditions', 'product_description') || '',
            quoteDate: String(quoteField(nq, 'issue_date', 'issueDate', 'created_at') || new Date().toISOString()).split('T')[0],
            validUntil: quoteField(nq, 'valid_until', 'validUntil', 'expiry_date', 'expiryDate') || r.deadline || '',
            unitPrice: Number(nq.unit_price) || Number(nq.unitPrice) || (group.quantity > 0 ? Math.round(p / group.quantity) : p),
            unitLandedPrice: Number(nq.unit_landed_price) || Number(nq.unitLandedPrice) || (group.quantity > 0 ? Math.round(p / group.quantity) : p),
            baseAmount: p,
            price: p,
            quantity: group.quantity || 1,
            gstRate: Number(nq.gst_rate) || 18,
            gstPercent: Number(nq.gst_rate) || 18,
            gstAmount: Number(nq.tax_amount) || Math.round(p * 0.18),
            taxAmount: Number(nq.tax_amount) || Math.round(p * 0.18),
            shippingCost: 0,
            discountAmount: 0,
            totalAmount: Number(nq.total_amount) || Number(nq.totalAmount) || p,
            deliveryDays: Number(nq.delivery_days) || 7,
            warranty: quoteField(nq, 'warranty', 'warranty_duration', 'warrantyDuration') || (nq.warranty_months ? `${nq.warranty_months} Months` : '12 Months'),
            warrantyType: quoteField(nq, 'warranty_type', 'warrantyType'),
            paymentTerms: quoteField(nq, 'payment_terms', 'paymentTerms', 'terms_conditions') || 'Standard',
            complianceRating: 'Verified',
            performanceScore: vObj?.performance_score ? parseFloat(vObj.performance_score) : 95,
            vendorRating: vObj?.rating ? parseFloat(vObj.rating) : 4.8,
            status: (nq.status === 'Selected' || nq.status === 'Shortlisted' || nq.status === 'Rejected') ? nq.status : 'Under Evaluation',
            notes: quoteField(nq, 'notes', 'terms_conditions') || '',
            techSupportDuration: quoteField(nq, 'tech_support_duration', 'techSupportDuration'),
            freeServiceCount: quoteField(nq, 'free_service_count', 'freeServiceCount'),
            installationType: quoteField(nq, 'installation_type', 'installationType'),
            replacementPolicy: quoteField(nq, 'replacement_policy', 'replacementPolicy'),
            accessoriesIncluded: quoteField(nq, 'accessories_included', 'accessoriesIncluded'),
            expectedDeliveryDate: quoteField(nq, 'expected_delivery_date', 'expectedDeliveryDate'),
            technicalCompliance: 'Compliant',
            commercialCompliance: 'Approved',
            submittedAt: (nq.created_at || '').split('T')[0]
          }
          const exists = group.quotes.find(eq => eq.id === qId || (eq.vendor.toLowerCase() === vName.toLowerCase() && (eq.totalAmount || eq.price) === p))
          if (!exists) {
            group.quotes.push(qItem)
            if (qItem.status === 'Selected') group.selectedQuote = qItem
          }
        })

        // Immediately compute price range in step 1 so cards always have correct price range & quotes
        const validAmounts = group.quotes
          .map((item: any) => Number(item.totalAmount) || Number(item.unitPrice) || Number(item.price) || 0)
          .filter((amt: number) => amt > 0)
        if (validAmounts.length > 0) {
          group.lowestPrice = Math.min(...validAmounts)
          group.highestPrice = Math.max(...validAmounts)
        }
      }
    })

    // 2. Map and group all submitted quotations (from backend and local browser submissions) into matching RFQ cards
    const localQuotesList: any[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.startsWith('kss_vendor_quotes_') || k === 'kss_vendor_quotes')) {
          const val = JSON.parse(localStorage.getItem(k) || '[]')
          if (Array.isArray(val)) {
            localQuotesList.push(...val)
          }
        }
      }
    } catch (e) {}

    const allQuotesToProcess: any[] = [...(quotations || []), ...localQuotesList]

    allQuotesToProcess.forEach(qItem => {
      const q = qItem as any
      const rawRfq = (q.rfqId || q.rfqRef || q.rfq_id || q.rfq || '').toString().trim()
      if (!rawRfq || isMockRfq(rawRfq)) return

      const normRfqId = rawRfq.startsWith('RFQ-') ? rawRfq.toUpperCase() : `RFQ-${rawRfq.toUpperCase()}`
      const cleanQRfq = cleanStr(rawRfq)
      const cleanQReq = cleanStr(q.request_id || q.requestId)

      // Exact lookup using alias map
      let targetKey: string | undefined =
        aliasToKeyMap.get(normRfqId) ||
        aliasToKeyMap.get(rawRfq.toUpperCase()) ||
        aliasToKeyMap.get(cleanQRfq) ||
        (cleanQReq ? aliasToKeyMap.get(cleanQReq) : undefined)

      // If not in alias map, look for exact match in rfqs list
      let mRfq: any = null
      if (!targetKey) {
        const matchingRfq = (rfqs || []).find((r: any) => {
          const rId = (r.rfq_id || r.id || '').toString().toUpperCase()
          const rPk = (r.pk || r.id || '').toString().toUpperCase()
          const prId = (r.purchase_request_detail?.request_id || '').toString().toUpperCase()
          const cleanRId = cleanStr(r.rfq_id || r.id)
          const cleanPrId = cleanStr(r.purchase_request_detail?.request_id)
          const cleanRPk = cleanStr(r.pk)

          return (
            rId === normRfqId ||
            `RFQ-${rId}` === normRfqId ||
            (cleanRId && cleanQRfq && cleanRId === cleanQRfq) ||
            (cleanRPk && cleanQRfq && cleanRPk === cleanQRfq) ||
            (cleanPrId && cleanQReq && cleanPrId === cleanQReq)
          )
        })

        if (matchingRfq) {
          mRfq = matchingRfq
          const rfqIdStr = (matchingRfq.rfq_id || matchingRfq.id || '').toString()
          targetKey = rfqIdStr.startsWith('RFQ-') ? rfqIdStr.toUpperCase() : `RFQ-${rfqIdStr.toUpperCase()}`
        }
      } else {
        mRfq = (rfqs || []).find((r: any) => {
          const rId = (r.rfq_id || r.id || '').toString().toUpperCase()
          return rId === targetKey || `RFQ-${rId}` === targetKey
        })
      }

      const finalKey: string = targetKey || normRfqId

      if (isFinance) {
        if (mRfq && !isRfqAllowedForRole(mRfq)) return
        if (!mRfq) {
          const matchedReq = (allRequests || []).find(req =>
            cleanStr(req.id) === cleanQReq ||
            cleanStr((req as any).rfqId) === cleanQRfq ||
            cleanStr(req.poNumber) === cleanQRfq
          )
          if (matchedReq && !isFinanceRelevantRequest(matchedReq)) return
        }
      }

      const realRfqTitle =
        mRfq?.title ||
        mRfq?.purchase_request_detail?.title ||
        q.rfqTitle ||
        q.product ||
        'Procurement Request'

      const quotePrice = Number(q.totalAmount) || Number(q.total_amount) || Number(q.unitPrice) || Number(q.price) || 0

      if (!map.has(finalKey)) {
        map.set(finalKey, {
          key: finalKey,
          product: realRfqTitle,
          rfqId: finalKey,
          rfqTitle: realRfqTitle,
          category: mRfq?.purchase_request_detail?.category || mRfq?.category || q.category || 'General',
          quantity: q.quantity || mRfq?.purchase_request_detail?.quantity || mRfq?.qty || 1,
          quotes: [],
          selectedQuote: undefined,
          lowestPrice: quotePrice,
          highestPrice: quotePrice
        })
      }

      const group = map.get(finalKey)!

      const vName = (q.vendor || q.vendorName || q.vendor_detail?.name || (typeof q.vendor === 'string' && isNaN(Number(q.vendor)) ? q.vendor : '') || 'Vendor Partner').trim()
      const vId = q.vendorId || q.vendor_detail?.unique_vendor_id || String(q.vendor || '')

      const normalizedQuote: QuotationItem = {
        id: q.quotation_id || (q.id ? String(q.id) : `QUO-${finalKey.replace('RFQ-', '')}-${vName.slice(0, 3).toUpperCase()}`),
        rfqId: finalKey,
        rfqTitle: realRfqTitle,
        vendor: vName,
        vendorId: vId,
        product: realRfqTitle,
        specification: quoteField(q, 'specification', 'terms_conditions', 'product_description') || '',
        quoteDate: String(quoteField(q, 'submittedDate', 'quoteDate', 'issue_date', 'issueDate', 'created_at') || new Date().toISOString()).split('T')[0],
        validUntil: quoteField(q, 'valid_until', 'validUntil', 'expiry_date', 'expiryDate', 'quoteValidity') || '',
        unitPrice: Number(q.unitPrice) || Number(q.unit_price) || (group.quantity > 0 ? Math.round(quotePrice / group.quantity) : quotePrice),
        unitLandedPrice: Number(q.unitLandedPrice) || Number(q.unit_landed_price) || (group.quantity > 0 ? Math.round(quotePrice / group.quantity) : quotePrice),
        baseAmount: Number(q.baseAmount) || Number(q.base_amount) || Number(q.price) || quotePrice,
        price: quotePrice,
        quantity: group.quantity || q.quantity || 1,
        gstRate: Number(q.gstRate) || Number(q.gstPercent) || Number(q.gst_rate) || 18,
        gstPercent: Number(q.gstPercent) || Number(q.gstRate) || Number(q.gst_rate) || 18,
        gstAmount: Number(q.gstAmount) || Number(q.taxAmount) || Number(q.tax_amount) || Math.round(quotePrice * 0.18),
        taxAmount: Number(q.taxAmount) || Number(q.tax_amount) || Math.round(quotePrice * 0.18),
        shippingCost: 0,
        discountAmount: 0,
        totalAmount: quotePrice,
        deliveryDays: Number(q.deliveryDays) || Number(q.delivery_days) || parseInt(q.leadTime) || 7,
        warranty: quoteField(q, 'warranty', 'warranty_duration', 'warrantyDuration') || (q.warranty_months ? `${q.warranty_months} Months` : '12 Months'),
        warrantyType: quoteField(q, 'warranty_type', 'warrantyType'),
        paymentTerms: quoteField(q, 'payment_terms', 'paymentTerms', 'terms_conditions') || 'Standard',
        complianceRating: 'Verified',
        performanceScore: q.performanceScore || (q.vendor_detail?.performance_score ? parseFloat(q.vendor_detail.performance_score) : 95),
        vendorRating: q.vendorRating || (q.vendor_detail?.rating ? parseFloat(q.vendor_detail.rating) : 4.8),
        status: (q.status === 'Selected' || q.status === 'Shortlisted' || q.status === 'Rejected') ? q.status : 'Under Evaluation',
        notes: quoteField(q, 'notes', 'terms_conditions') || '',
        techSupportDuration: quoteField(q, 'tech_support_duration', 'techSupportDuration'),
        freeServiceCount: quoteField(q, 'free_service_count', 'freeServiceCount'),
        installationType: quoteField(q, 'installation_type', 'installationType'),
        replacementPolicy: quoteField(q, 'replacement_policy', 'replacementPolicy'),
        accessoriesIncluded: quoteField(q, 'accessories_included', 'accessoriesIncluded'),
        expectedDeliveryDate: quoteField(q, 'expected_delivery_date', 'expectedDeliveryDate'),
        technicalCompliance: 'Compliant',
        commercialCompliance: 'Approved',
        submittedAt: (q.submittedDate || q.created_at || '').split('T')[0]
      }

      const existingIdx = group.quotes.findIndex((existing: any) => {
        const vA = (existing.vendor || existing.vendorName || '').toLowerCase()
        const vB = normalizedQuote.vendor.toLowerCase()
        return (existing.id && normalizedQuote.id && existing.id === normalizedQuote.id) ||
               (vA && vB && (vA === vB || vA.includes(vB) || vB.includes(vA)))
      })

      if (existingIdx >= 0) {
        group.quotes[existingIdx] = { ...group.quotes[existingIdx], ...normalizedQuote }
      } else {
        group.quotes.push(normalizedQuote)
      }

      if (normalizedQuote.status === 'Selected') {
        group.selectedQuote = normalizedQuote
      }

      const validAmounts = group.quotes
        .map((item: any) => Number(item.totalAmount) || Number(item.unitPrice) || Number(item.price) || 0)
        .filter((amt: number) => amt > 0)

      if (validAmounts.length > 0) {
        group.lowestPrice = Math.min(...validAmounts)
        group.highestPrice = Math.max(...validAmounts)
      }
    })

    const result = Array.from(map.values())
    result.forEach((g: ProductGroup) => {
      g.quotes.sort((a, b) => {
        const timeA = new Date(a.submittedAt || a.quoteDate || 0).getTime()
        const timeB = new Date(b.submittedAt || b.quoteDate || 0).getTime()
        if (timeA !== timeB) return timeB - timeA
        return Number(a.totalAmount || (a as any).price || 0) - Number(b.totalAmount || (b as any).price || 0)
      })
      const validAmounts = g.quotes
        .map((item: any) => Number(item.totalAmount) || Number(item.unitPrice) || Number(item.price) || 0)
        .filter((amt: number) => amt > 0)
      if (validAmounts.length > 0) {
        g.lowestPrice = Math.min(...validAmounts)
        g.highestPrice = Math.max(...validAmounts)
      }
      if (!g.selectedQuote) {
        const sel = g.quotes.find(q => q.status === 'Selected')
        if (sel) g.selectedQuote = sel
      }
    })

    result.sort((a: ProductGroup, b: ProductGroup) => {
      const rfqA = (rfqs || []).find((r: any) => 
        (r.rfq_id && r.rfq_id.toUpperCase() === a.rfqId.toUpperCase()) || 
        (r.id && `RFQ-${r.id}`.toUpperCase() === a.rfqId.toUpperCase()) || 
        (r.id && r.id.toString().toUpperCase() === a.rfqId.toUpperCase())
      )
      const rfqB = (rfqs || []).find((r: any) => 
        (r.rfq_id && r.rfq_id.toUpperCase() === b.rfqId.toUpperCase()) || 
        (r.id && `RFQ-${r.id}`.toUpperCase() === b.rfqId.toUpperCase()) || 
        (r.id && r.id.toString().toUpperCase() === b.rfqId.toUpperCase())
      )

      const timeA = new Date(rfqA?.createdDate || (rfqA as any)?.created_at || a.quotes[0]?.submittedAt || a.quotes[0]?.quoteDate || 0).getTime()
      const timeB = new Date(rfqB?.createdDate || (rfqB as any)?.created_at || b.quotes[0]?.submittedAt || b.quotes[0]?.quoteDate || 0).getTime()
      if (timeA !== timeB) return timeB - timeA
      return b.rfqId.localeCompare(a.rfqId)
    })
    return result
  }, [quotations, rfqs, allRequests, isFinance])

  // Filtered product groups
  const filteredGroups = useMemo(() => {
    return productGroups.filter(g => {
      const matchSearch =
        !search ||
        g.product.toLowerCase().includes(search.toLowerCase()) ||
        g.rfqId.toLowerCase().includes(search.toLowerCase()) ||
        g.rfqTitle.toLowerCase().includes(search.toLowerCase()) ||
        g.quotes.some(q => q.vendor.toLowerCase().includes(search.toLowerCase()))

      const matchCategory = categoryFilter === 'All' || g.category === categoryFilter

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SELECTED' && !!g.selectedQuote) ||
        (statusFilter === 'PENDING' && !g.selectedQuote)

      return matchSearch && matchCategory && matchStatus
    })
  }, [productGroups, search, categoryFilter, statusFilter])

  // Active product group for detailed comparison
  const activeGroup = useMemo(() => {
    if (!selectedProductKey) return null
    return productGroups.find(g => g.key === selectedProductKey) || null
  }, [productGroups, selectedProductKey])

  // Handle open confirm selection
  const handleOpenSelection = (quote: QuotationItem) => {
    setConfirmingQuote(quote)
    setSelectionRationale(
      `Selected based on best technical fit (${quote.technicalCompliance || 'Compliant'}), delivery lead time of ${quote.deliveryDays} days, and evaluated price of ${fmt(quote.totalAmount)}.`
    )
  }

  // Handle confirm vendor selection
  const handleConfirmSelection = () => {
    if (!confirmingQuote) return
    selectVendorQuotation(
      confirmingQuote.id,
      confirmingQuote.rfqId,
      confirmingQuote.product || activeGroup?.product || '',
      selectionRationale
    )
    assignVendorToRequest(
      confirmingQuote.rfqId,
      confirmingQuote.vendor,
      resolveVendorId(confirmingQuote.vendor, confirmingQuote.vendorId),
      confirmingQuote.totalAmount || confirmingQuote.unitPrice,
      confirmingQuote.id
    )
    showToast(`✓ Vendor ${confirmingQuote.vendor} awarded! Request forwarded to Vendor Portal for acceptance.`, 'success')
    setConfirmingQuote(null)
  }

  // Categories list
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(productGroups.map(g => g.category)))]
  }, [productGroups])

  // Summary counts
  const totalProducts = productGroups.length
  const selectedCount = productGroups.filter(g => !!g.selectedQuote).length
  const pendingCount = totalProducts - selectedCount
  const totalQuotesReceived = productGroups.reduce((acc, g) => acc + g.quotes.length, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-14">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
              role === 'FINANCE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : role === 'ADMIN'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {role === 'FINANCE'
                ? 'FINANCE COMMERCIAL EVALUATION'
                : role === 'ADMIN'
                ? 'ADMIN COMMERCIAL EVALUATION & GOVERNANCE'
                : 'MANAGER SOURCING & SELECTION'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {totalProducts} Products • {totalQuotesReceived} Vendor Quotations
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Scale className={role === 'ADMIN' ? 'text-purple-600' : 'text-blue-600'} size={26} /> Vendor Quotations &amp; Selection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {role === 'FINANCE'
              ? 'Review competitive vendor quotations, commercial terms, GST breakdown, and accept/award the optimal supplier.'
              : role === 'ADMIN'
              ? 'Review competitive vendor quotations, commercial terms, GST breakdown, and Admin governance.'
              : 'Evaluate multi-vendor quotations per product, analyze commercial terms, and award the optimal supplier.'}
          </p>
        </div>

        {/* Action / Back to Products Button */}
        {activeGroup && (
          <button
            onClick={() => setSelectedProductKey(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-all"
          >
            <ArrowLeft size={14} /> Back to Products List
          </button>
        )}
      </div>

      {/* View 1: Product-First Listing (When no product is selected) */}
      {!activeGroup && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Products for Quoting</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalProducts}</p>
              <span className="text-[10px] text-blue-600 font-bold mt-1 inline-block">Active RFQs</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Total Bids Received</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{totalQuotesReceived}</p>
              <span className="text-[10px] text-indigo-600 font-bold mt-1 inline-block">Verified Vendors</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Vendor Selected</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{selectedCount}</p>
              <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">PO Ready</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Pending Selection</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
              <span className="text-[10px] text-amber-600 font-bold mt-1 inline-block">Requires Decision</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 min-w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Product Name, RFQ ID, or Vendor..."
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {categories.map(c => <option key={c} value={c}>Category: {c}</option>)}
              </select>

              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({totalProducts})
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('SELECTED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'SELECTED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Selected ({selectedCount})
                </button>
              </div>
            </div>
          </div>

          {/* Products List */}
          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Scale size={42} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No Quotations Found</p>
              <p className="text-xs mt-1 text-slate-500">No product quotations match your active search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGroups.map(group => {
                const isSelected = !!group.selectedQuote
                return (
                  <div
                    key={group.key}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md p-5 flex flex-col justify-between ${
                      isSelected ? 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/20 to-white' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            {group.rfqId}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {group.category}
                          </span>
                        </div>

                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle size={12} /> Vendor Selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <Clock size={12} /> Awaiting Selection
                          </span>
                        )}
                      </div>

                      {/* Product Title */}
                      <h3 className="text-base font-bold text-slate-900 tracking-tight line-clamp-1">
                        {group.product}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        RFQ: {group.rfqTitle} • Quantity: {group.quantity} units
                      </p>

                      {/* Quotations summary pill */}
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Bids Received:</span>
                          <span className="font-bold text-slate-900">{group.quotes.length} Vendors Quoted</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Price Range:</span>
                          <span className="font-black text-slate-900">
                            {fmt(group.lowestPrice)} - {fmt(group.highestPrice)}
                          </span>
                        </div>

                        {/* If selected, show awarded vendor */}
                        {group.selectedQuote && (
                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Award size={13} /> Selected Supplier:
                            </span>
                            <span className="font-bold text-slate-900 text-right">
                              {group.selectedQuote.vendor} ({fmt(group.selectedQuote.totalAmount)})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Vendor badges preview */}
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        {group.quotes.map(q => {
                          const isThisSelected = q.status === 'Selected'
                          return (
                            <span
                              key={q.id}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                isThisSelected
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              {q.vendor.split(' ')[0]} {isThisSelected && '✓'}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Compare pricing, lead times & specs
                      </span>
                      <button
                        onClick={() => setSelectedProductKey(group.key)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        Select Quotes <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* View 2: Multi-Vendor Detailed Comparison Matrix (When product is selected) */}
      {activeGroup && (
        <div className="space-y-5">
          {/* Active Product Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {activeGroup.rfqId}
                </span>
                <span className="text-xs text-slate-300 font-medium">{activeGroup.category}</span>
                {activeGroup.selectedQuote ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle size={12} /> Awarded to {activeGroup.selectedQuote.vendor}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <Clock size={12} /> Awaiting Manager Decision
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">{activeGroup.product}</h2>
              <p className="text-xs text-slate-300 mt-1">
                Quantity: <b className="text-white">{activeGroup.quantity} units</b> • Quotes Received: <b className="text-white">{activeGroup.quotes.length} Vendors</b> • Lowest Quote: <b className="text-emerald-300">{fmt(activeGroup.lowestPrice)}</b>
              </p>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-white/10 rounded-xl border border-white/20 text-xs">
                <button
                  onClick={() => setComparisonLayout('cards')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    comparisonLayout === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Card Comparison
                </button>
                <button
                  onClick={() => setComparisonLayout('table')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    comparisonLayout === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Comparison Table
                </button>
              </div>
            </div>
          </div>

          {/* Card Comparison Mode */}
          {comparisonLayout === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGroup.quotes.map(quote => {
                const isSelected = quote.status === 'Selected' || (activeGroup.selectedQuote && activeGroup.selectedQuote.id === quote.id)
                const isLowest = quote.totalAmount === activeGroup.lowestPrice

                return (
                  <div
                    key={quote.id}
                    className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between relative shadow-2xs ${
                      isSelected
                        ? 'border-2 border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/10'
                        : isLowest
                        ? 'border-blue-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Top status & tags */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                            Quote: {quote.id}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 truncate mt-0.5">
                            {quote.vendor}
                          </h4>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            ⭐ Rating: {quote.vendorRating || 4.7}/5.0 • Score: {quote.performanceScore || 92}%
                          </span>
                        </div>

                        {isSelected && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs flex items-center gap-1 shrink-0">
                            <Check size={11} strokeWidth={3} /> SELECTED
                          </span>
                        )}
                        {!isSelected && isLowest && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                            BEST PRICE
                          </span>
                        )}
                      </div>

                      {/* Pricing Highlight */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 mb-4">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 font-medium">Unit Price:</span>
                          <span className="text-sm font-bold text-slate-800">{fmt(quote.unitPrice)} / unit</span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1 text-[11px] text-slate-500">
                          <span>Quoted Quantity / Units:</span>
                          <span className="font-bold text-slate-800">{activeGroup.quantity ? `${activeGroup.quantity} Units` : (quote.productQty || `${quote.quantity || 1} Units`)}</span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1 text-[11px] text-slate-500">
                          <span>Base Subtotal:</span>
                          <span className="font-semibold text-slate-700">{fmt(quote.baseAmount || (quote.totalAmount - quote.taxAmount))}</span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1 text-[11px] text-slate-500">
                          <span>Tax / GST ({quote.gstPercent || quote.gstRate || 18}%):</span>
                          <span className="font-semibold text-slate-700">+{fmt(quote.taxAmount)}</span>
                        </div>
                        {quote.discountAmount > 0 && (
                          <div className="flex items-baseline justify-between text-[11px] text-emerald-600">
                            <span>Discount:</span>
                            <span>-{fmt(quote.discountAmount)}</span>
                          </div>
                        )}
                        <div className="pt-2 mt-2 border-t border-slate-200 flex items-baseline justify-between">
                          <span className="text-xs font-bold text-slate-700">Total Quoted (incl. GST):</span>
                          <span className="text-lg font-black text-slate-900">{fmt(quote.totalAmount)}</span>
                        </div>
                      </div>

                      {/* Commercial, Services & Technical Specs */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" /> Submitted &amp; Validity:
                          </span>
                          <span className="font-semibold text-slate-700 text-right">
                            {formatDate(quote.submittedAt || quote.quoteDate)} • Valid till {quote.validUntil ? formatDate(quote.validUntil) : 'Not provided'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Truck size={13} className="text-slate-400" /> Delivery Schedule:
                          </span>
                          {quote.deliveryDays ? (
                            <span className="font-bold text-slate-800">
                              {quote.deliveryDays} Days {quote.expectedDeliveryDate ? `(Est: ${formatDate(quote.expectedDeliveryDate)})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-slate-400" /> Warranty:
                          </span>
                          {quote.warranty ? (
                            <span className="font-bold text-slate-800 text-right">
                              {quote.warranty} {quote.warrantyType ? `(${quote.warrantyType})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <IndianRupee size={13} className="text-slate-400" /> Terms &amp; Conditions:
                          </span>
                          {quote.paymentTerms ? (
                            <span className="font-semibold text-slate-800 text-right max-w-[210px] truncate" title={quote.paymentTerms}>
                              {quote.paymentTerms}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Tech Support:</span>
                          {quote.techSupportDuration ? (
                            <span className="font-semibold text-slate-800 text-right max-w-[210px] truncate" title={quote.techSupportDuration}>
                              {quote.techSupportDuration}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Gift size={13} className="text-slate-400" /> Maintenance:
                          </span>
                          {quote.freeServiceCount ? (
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                              {quote.freeServiceCount}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Wrench size={13} className="text-slate-400" /> Installation:
                          </span>
                          {quote.installationType ? (
                            <span className="font-semibold text-slate-800">
                              {quote.installationType}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Replacement:</span>
                          {quote.replacementPolicy ? (
                            <span className="font-semibold text-slate-800 text-right max-w-[210px] truncate" title={quote.replacementPolicy}>
                              {quote.replacementPolicy}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Accessories:</span>
                          {quote.accessoriesIncluded ? (
                            <span className="font-medium text-slate-700 text-right max-w-[210px] truncate" title={quote.accessoriesIncluded}>
                              {quote.accessoriesIncluded}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500">Supplier Status:</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {quote.complianceRating || 'Verified'}
                          </span>
                        </div>
                      </div>

                      {/* Selection notes if already selected */}
                      {isSelected && quote.selectionNotes && (
                        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                          <p className="font-bold">Selection Rationale:</p>
                          <p className="mt-0.5">{quote.selectionNotes}</p>
                          {quote.selectedAt && (
                            <span className="block text-[10px] text-emerald-700/80 mt-1">
                              Recorded on: {formatDate(quote.selectedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => setInspectQuote(quote)}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="View Full Commercial Dossier"
                      >
                        <Eye size={14} /> Dossier
                      </button>

                      {role === 'MANAGER' || role === 'FINANCE' || role === 'ADMIN' ? (
                        isSelected ? (
                          <div className="flex-1 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                            <CheckCircle size={14} /> Selected Supplier (Awarded)
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenSelection(quote)}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Award size={14} />
                            {activeGroup.selectedQuote ? 'Switch Selection' : (role === 'FINANCE' ? 'Accept & Select Vendor' : 'Select This Vendor')}
                          </button>
                        )
                      ) : (
                        <div className="flex-1 text-center py-1.5 text-xs text-slate-500 font-medium">
                          {isSelected ? '✓ Approved' : 'Unselected Bid'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Table Comparison Mode */}
          {comparisonLayout === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="text-left px-4 py-3.5">Vendor</th>
                    <th className="text-left px-4 py-3.5">Quote ID</th>
                    <th className="text-right px-4 py-3.5">Unit Price</th>
                    <th className="text-right px-4 py-3.5">Tax / GST</th>
                    <th className="text-right px-4 py-3.5">Total Amount</th>
                    <th className="text-left px-4 py-3.5">Delivery</th>
                    <th className="text-left px-4 py-3.5">Warranty</th>
                    <th className="text-left px-4 py-3.5">Payment Terms</th>
                    <th className="text-left px-4 py-3.5">Compliance</th>
                    <th className="text-center px-4 py-3.5">Status</th>
                    <th className="text-center px-4 py-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeGroup.quotes.map(quote => {
                    const isSelected = quote.status === 'Selected' || (activeGroup.selectedQuote && activeGroup.selectedQuote.id === quote.id)
                    const isLowest = quote.totalAmount === activeGroup.lowestPrice

                    return (
                      <tr
                        key={quote.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/50' : isLowest ? 'bg-blue-50/20' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <div>{quote.vendor}</div>
                          <span className="text-[10px] text-slate-400 font-normal">Rating: {quote.vendorRating || 4.7}/5.0</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">{quote.id}</td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-700">{fmt(quote.unitPrice)}</td>
                        <td className="px-4 py-3.5 text-right text-slate-500">+{fmt(quote.taxAmount)}</td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-900">
                          {fmt(quote.totalAmount)}
                          {isLowest && <span className="block text-[9px] text-blue-600 font-bold">LOWEST</span>}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">{quote.deliveryDays} Days</td>
                        <td className="px-4 py-3.5 text-slate-600">{quote.warranty || 'Standard'}</td>
                        <td className="px-4 py-3.5 text-slate-600">{quote.paymentTerms || 'Net 30'}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {quote.technicalCompliance || '100% Compliant'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isSelected ? (
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                              Selected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {role === 'MANAGER' || role === 'FINANCE' || role === 'ADMIN' ? (
                            isSelected ? (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                                <Check size={12} /> Awarded
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenSelection(quote)}
                                className="px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              >
                                {role === 'FINANCE' ? 'Accept & Select' : 'Select Vendor'}
                              </button>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">View Only</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Vendor Selection */}
      {confirmingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award size={20} className="text-amber-300" />
                <div>
                  <h3 className="text-base font-bold">Confirm Vendor Selection</h3>
                  <p className="text-xs text-blue-100">Award contract to selected supplier for procurement</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Product / Requisition:</span>
                  <span className="font-bold text-slate-900">{confirmingQuote.product || activeGroup?.product}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Selected Vendor:</span>
                  <span className="font-black text-blue-700 text-sm">{confirmingQuote.vendor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Quotation Number:</span>
                  <span className="font-mono font-bold text-slate-700">{confirmingQuote.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Quantity & Unit Price:</span>
                  <span className="font-bold text-slate-800">
                    {confirmingQuote.quantity} units @ {fmt(confirmingQuote.unitPrice)} / unit
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Base Subtotal:</span>
                  <span className="font-semibold text-slate-700">{fmt(confirmingQuote.baseAmount || (confirmingQuote.unitPrice * confirmingQuote.quantity))}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Tax / GST ({confirmingQuote.gstPercent || confirmingQuote.gstRate || 18}%):</span>
                  <span className="font-semibold text-slate-700">+{fmt(confirmingQuote.taxAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">Total Purchase Value (incl. GST):</span>
                  <span className="font-black text-emerald-600 text-base">{fmt(confirmingQuote.totalAmount)}</span>
                </div>
              </div>

              {/* Selection Justification */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Selection Rationale & Audit Justification *
                </label>
                <textarea
                  rows={3}
                  value={selectionRationale}
                  onChange={e => setSelectionRationale(e.target.value)}
                  placeholder="State the technical, commercial, or operational reasons for selecting this supplier..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-800 text-[11px] space-y-1">
                <p className="font-bold">✓ Audit Preservation Guarantee:</p>
                <p>
                  Unselected vendor quotations will not be deleted or hidden. All bids are retained permanently in the system for internal audit, financial transparency, and compliance reporting.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingQuote(null)}
                  className="px-4 py-2 font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="flex items-center gap-2 px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle size={15} /> Confirm Selection & Award
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commercial Breakdown Dossier Modal */}
      <QuotationCommercialModal quote={inspectQuote} onClose={() => setInspectQuote(null)} />
    </div>
  )
}
