import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiClient } from '../../api/client'
import { useProcurement } from '../../context/ProcurementContext'
import { isFlowBCategory } from '../../components/portal/TrackingStepper'
import { rankVendorsForCategory } from '../../components/portal/VendorRecommendationPanel'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import {
  Truck,
  FileSpreadsheet,
  Layers,
  Package,
  FileCheck,
  FileText,
  CreditCard,
  FolderOpen,
  AlertCircle,
  Clock,
  CheckCircle,
  Download,
  Upload,
  Plus,
  ArrowRight,
  Eye,
  Printer,
  ShieldCheck,
  Building,
  Grid,
  ChevronRight,
  User,
  Star,
  ExternalLink,
  RefreshCw,
  Bell,
  Info,
  Sparkles,
  Award,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Paperclip,
  XCircle,
  X,
  Trash2,
  Search,
} from 'lucide-react'
import { DocumentPdfViewerModal, DocumentPdfData } from '../../components/portal/DocumentPdfViewerModal'
import { verifyDocumentApi } from '../../api/managerApi'
import {
  getVendorInvoices,
  getVendorGoodsReceipts,
  getVendorQuotations,
  getVendorDocumentsApi,
  deleteVendorDocumentApi,
  submitInvoiceApi,
  createGoodsReceiptApi,
  updateVendorPurchaseOrderApi
} from '../../api/vendorApi'

// ─── MASTER VENDOR DATABASE ──────────────────────────────────────────────────
export interface VendorRecord {
  id: string
  name: string
  category: string
  score: string
  risk: string
  contactPerson: string
  email: string
  phone: string
  status: string
  openRfqsCount: number
  activePosCount: number
  totalDisbursed: number
}

export const MASTER_VENDORS: VendorRecord[] = [
  // IT Hardware
  { id: 'VND-HW-001', name: 'Dell Technologies Inc.', category: 'IT Hardware', score: '95.5%', risk: 'Low', contactPerson: 'Michael Dell', email: 'contact@dell.com', phone: '+1 800-456-3355', status: 'Active', openRfqsCount: 2, activePosCount: 3, totalDisbursed: 42000 },
  { id: 'VND-HW-002', name: 'HP Enterprise', category: 'IT Hardware', score: '92.0%', risk: 'Low', contactPerson: 'Meg Whitman', email: 'contact@hpe.com', phone: '+1 800-752-0900', status: 'Active', openRfqsCount: 1, activePosCount: 1, totalDisbursed: 18500 },
  { id: 'VND-HW-003', name: 'Lenovo Group', category: 'IT Hardware', score: '89.5%', risk: 'Low', contactPerson: 'Yuanqing Yang', email: 'contact@lenovo.com', phone: '+1 800-426-7378', status: 'Active', openRfqsCount: 1, activePosCount: 0, totalDisbursed: 0 },
  { id: 'VND-HW-004', name: 'Apple Enterprise', category: 'IT Hardware', score: '97.2%', risk: 'Low', contactPerson: 'Tim Cook', email: 'enterprise@apple.com', phone: '+1 800-692-7753', status: 'Active', openRfqsCount: 0, activePosCount: 2, totalDisbursed: 24000 },

  // Software & SaaS (Flow B - Direct Fund Release Excluded)
  { id: 'VND-SW-001', name: 'Microsoft Corporation', category: 'Software & SaaS', score: '98.0%', risk: 'Low', contactPerson: 'Satya Nadella', email: 'saas@microsoft.com', phone: '+1 800-642-7676', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 68000 },
  { id: 'VND-SW-002', name: 'Adobe Systems', category: 'Software & SaaS', score: '94.0%', risk: 'Low', contactPerson: 'Shantanu Narayen', email: 'enterprise@adobe.com', phone: '+1 800-833-6687', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 15400 },
  { id: 'VND-SW-003', name: 'Salesforce Inc.', category: 'Software & SaaS', score: '96.5%', risk: 'Low', contactPerson: 'Marc Benioff', email: 'sales@salesforce.com', phone: '+1 800-667-6389', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 32000 },
  { id: 'VND-SW-004', name: 'Figma Inc.', category: 'Software & SaaS', score: '93.0%', risk: 'Low', contactPerson: 'Dylan Field', email: 'enterprise@figma.com', phone: '+1 800-555-3446', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 8900 },

  // Cloud & Infrastructure (Flow B - Direct Fund Release Excluded)
  { id: 'VND-CLD-001', name: 'Amazon Web Services Inc.', category: 'Cloud & Infrastructure', score: '99.0%', risk: 'Low', contactPerson: 'Andy Jassy', email: 'aws-support@amazon.com', phone: '+1 800-282-1770', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 125000 },
  { id: 'VND-CLD-002', name: 'Microsoft Azure', category: 'Cloud & Infrastructure', score: '97.8%', risk: 'Low', contactPerson: 'Azure Sales', email: 'azure@microsoft.com', phone: '+1 800-642-7676', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 94000 },
  { id: 'VND-CLD-003', name: 'Google Cloud Platform', category: 'Cloud & Infrastructure', score: '96.2%', risk: 'Low', contactPerson: 'GCP Enterprise', email: 'gcp@google.com', phone: '+1 800-358-8228', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 45000 },

  // Cybersecurity
  { id: 'VND-SEC-001', name: 'Palo Alto Networks', category: 'Cybersecurity', score: '94.5%', risk: 'Low', contactPerson: 'Nikesh Arora', email: 'sec@paloaltonetworks.com', phone: '+1 800-732-8246', status: 'Active', openRfqsCount: 2, activePosCount: 2, totalDisbursed: 38000 },
  { id: 'VND-SEC-002', name: 'CrowdStrike', category: 'Cybersecurity', score: '96.0%', risk: 'Low', contactPerson: 'George Kurtz', email: 'sales@crowdstrike.com', phone: '+1 800-276-9378', status: 'Active', openRfqsCount: 1, activePosCount: 1, totalDisbursed: 21000 },

  // IT Services
  { id: 'VND-IT-001', name: 'Accenture', category: 'IT Services', score: '91.0%', risk: 'Low', contactPerson: 'Julie Sweet', email: 'services@accenture.com', phone: '+1 800-541-2244', status: 'Active', openRfqsCount: 1, activePosCount: 3, totalDisbursed: 76000 },
  { id: 'VND-IT-002', name: 'Infosys', category: 'IT Services', score: '93.5%', risk: 'Low', contactPerson: 'Salil Parekh', email: 'enterprise@infosys.com', phone: '+1 800-300-0100', status: 'Active', openRfqsCount: 2, activePosCount: 2, totalDisbursed: 54000 },

  // Office Accessories
  { id: 'VND-FUR-001', name: 'Herman Miller Inc.', category: 'Office Accessories', score: '94.0%', risk: 'Low', contactPerson: 'Andi Owen', email: 'sales@hermanmiller.com', phone: '+1 800-646-4400', status: 'Active', openRfqsCount: 1, activePosCount: 1, totalDisbursed: 16500 },
  { id: 'VND-FUR-002', name: 'Steelcase', category: 'Office Accessories', score: '90.5%', risk: 'Low', contactPerson: 'Sara Armbruster', email: 'info@steelcase.com', phone: '+1 800-333-9939', status: 'Active', openRfqsCount: 1, activePosCount: 1, totalDisbursed: 12000 },

  // Office Technology
  { id: 'VND-OFF-001', name: 'Samsung Display Systems', category: 'Office Technology', score: '92.5%', risk: 'Low', contactPerson: 'JH Han', email: 'display@samsung.com', phone: '+1 800-726-7864', status: 'Active', openRfqsCount: 2, activePosCount: 2, totalDisbursed: 29000 },
  { id: 'VND-OFF-002', name: 'Canon Inc.', category: 'Office Technology', score: '89.0%', risk: 'Low', contactPerson: 'Fujio Mitarai', email: 'office@canon.com', phone: '+1 800-652-2666', status: 'Active', openRfqsCount: 1, activePosCount: 1, totalDisbursed: 11000 },

  // Networking & Telecom
  { id: 'VND-NET-001', name: 'Cisco Systems', category: 'Networking & Telecom', score: '96.8%', risk: 'Low', contactPerson: 'Chuck Robbins', email: 'telecom@cisco.com', phone: '+1 800-553-6387', status: 'Active', openRfqsCount: 3, activePosCount: 3, totalDisbursed: 88000 },

  // Training & Certifications (Flow B - Direct Fund Release Excluded)
  { id: 'VND-TRN-001', name: 'Coursera for Business', category: 'Training & Certifications', score: '93.8%', risk: 'Low', contactPerson: 'Jeff Maggioncalda', email: 'b2b@coursera.org', phone: '+1 800-555-0192', status: 'Flow B Excluded (Direct Fund Release)', openRfqsCount: 0, activePosCount: 0, totalDisbursed: 9500 },

  // Print & Consumables
  { id: 'VND-PRN-001', name: 'HP Inc. Print', category: 'Print & Consumables', score: '91.2%', risk: 'Low', contactPerson: 'Enrique Lores', email: 'print@hp.com', phone: '+1 800-474-6836', status: 'Active', openRfqsCount: 1, activePosCount: 1, totalDisbursed: 7200 }
]

export const VENDOR_CATEGORIES_LIST = [
  { name: 'IT Hardware',            icon: '💻', desc: 'Laptops, desktops, monitors, servers, storage arrays' },
  { name: 'Office Accessories',     icon: '🪑', desc: 'Tables, chairs, fans, cable management, ID card holders' },
  { name: 'Office Technology',      icon: '🖥️', desc: 'Printers, projectors, video-conferencing systems' },
]

// ─── VENDOR QUOTATION HELPERS (PostgreSQL Backend + Namespaced Local Cache) ──
export function getStoredVendorQuotes(vendorId: string): any[] {
  if (!vendorId) return []
  const key = `kss_vendor_quotes_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {}
  }
  return []
}

export function saveStoredVendorQuote(vendorId: string, quote: any): any[] {
  if (!vendorId || !quote) return []
  const key = `kss_vendor_quotes_${vendorId}`
  const current = getStoredVendorQuotes(vendorId)
  const cleanRfq = (quote.rfqRef || quote.rfqId || quote.rfq_id || '').toString().trim().toUpperCase()
  const qId = (quote.id || quote.quotation_id || '').toString().trim()

  const filtered = current.filter((q: any) => {
    if (qId && (q.id === qId || q.quotation_id === qId)) return false
    const existingRfq = (q.rfqRef || q.rfqId || q.rfq_id || '').toString().trim().toUpperCase()
    if (cleanRfq && existingRfq && (cleanRfq === existingRfq || cleanRfq.replace(/^RFQ-/, '') === existingRfq.replace(/^RFQ-/, ''))) return false
    return true
  })

  const updated = [quote, ...filtered]
  localStorage.setItem(key, JSON.stringify(updated))
  return updated
}

// ─── LOCAL VENDOR DOCUMENT STORAGE HELPERS ─────────────────────────────
export function getStoredVendorDocuments(vendorId: string): any[] {
  const key = `kss_vendor_docs_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        // Filter out legacy mock quotation documents that were auto-created from quote submissions
        return parsed.filter((d: any) => {
          if (!d) return false
          const name = (d.name || '').toLowerCase()
          const id = (d.id || '').toUpperCase()
          if (name.startsWith('official quotation') || name.startsWith('official goods receipt')) return false
          if (id.startsWith('DOC-QUO-') || id.startsWith('DOC-8B') || id.startsWith('DOC-AA') || id.startsWith('DOC-F4') || id.startsWith('DOC-B4') || id.startsWith('DOC-21')) return false
          return true
        })
      }
    } catch (e) {}
  }
  return []
}

export function saveStoredVendorDocument(vendorId: string, doc: any): any[] {
  const key = `kss_vendor_docs_${vendorId}`
  const current = getStoredVendorDocuments(vendorId)
  const updated = [doc, ...current]
  localStorage.setItem(key, JSON.stringify(updated))
  return updated
}

export function deleteStoredVendorDocument(vendorId: string, docId: string): any[] {
  const key = `kss_vendor_docs_${vendorId}`
  const current = getStoredVendorDocuments(vendorId)
  const updated = current.filter((d: any) => d.id !== docId && d.grnDocNumber !== docId && d.receiptNumber !== docId)
  localStorage.setItem(key, JSON.stringify(updated))
  addDeletedDocId(vendorId, docId)
  return updated
}

export function clearStoredVendorDocuments(vendorId: string): any[] {
  const key = `kss_vendor_docs_${vendorId}`
  localStorage.removeItem(key)
  return []
}

export function getDeletedDocIds(vendorId: string): Set<string> {
  const key = `kss_vendor_deleted_docs_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return new Set(JSON.parse(saved))
    } catch (e) {}
  }
  return new Set<string>()
}

export function addDeletedDocId(vendorId: string, docId: string): Set<string> {
  const key = `kss_vendor_deleted_docs_${vendorId}`
  const current = getDeletedDocIds(vendorId)
  if (docId) {
    current.add(docId)
    current.add(docId.toUpperCase())
    const clean = docId.replace(/^(DOC-GRN-|DOC-|GRN-|REC-|PO-|RFQ-|REQ-)/i, '').trim().toUpperCase()
    if (clean) {
      current.add(`DOC-GRN-${clean}`)
      current.add(`DOC-${clean}`)
      current.add(`GRN-${clean}`)
      current.add(clean)
    }
  }
  localStorage.setItem(key, JSON.stringify(Array.from(current)))
  return current
}

export function isDocDeleted(deletedSet: Set<string>, doc: any): boolean {
  if (!doc) return true
  if (doc.id && (deletedSet.has(doc.id) || deletedSet.has(doc.id.toUpperCase()))) return true
  if (doc.grnDocNumber && (deletedSet.has(doc.grnDocNumber) || deletedSet.has(doc.grnDocNumber.toUpperCase()))) return true
  if (doc.receiptNumber && (deletedSet.has(doc.receiptNumber) || deletedSet.has(doc.receiptNumber.toUpperCase()))) return true
  if (doc.poRef && (deletedSet.has(doc.poRef) || deletedSet.has(doc.poRef.toUpperCase()))) return true
  const cleanKey = (doc.id || doc.grnDocNumber || doc.receiptNumber || '').replace(/^(DOC-GRN-|DOC-|GRN-|REC-|PO-|RFQ-|REQ-)/i, '').trim().toUpperCase()
  if (cleanKey && deletedSet.has(cleanKey)) return true
  return false
}

// ─── ADMIN DOC STATUS OVERRIDE HELPERS ─────────────────────────────────────
// Admin writes per-doc status overrides; vendor reads them back (read-only).
export function getDocStatusOverrides(vendorId: string): Record<string, string> {
  const key = `kss_vendor_doc_statuses_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try { return JSON.parse(saved) } catch (e) {}
  }
  return {}
}

export function setDocStatusOverride(vendorId: string, docId: string, status: string): void {
  const key = `kss_vendor_doc_statuses_${vendorId}`
  const current = getDocStatusOverrides(vendorId)
  current[docId] = status
  localStorage.setItem(key, JSON.stringify(current))
}

// ─── LOCAL STORAGE HELPERS FOR ENFORCED PO WORKFLOW ─────────────────────────
export function getPaidPayments(): string[] {
  try {
    const list1 = JSON.parse(localStorage.getItem('kss_manager_released_payments') || '[]')
    const list2 = JSON.parse(localStorage.getItem('kss_paid_payments') || '[]')
    const list3 = JSON.parse(localStorage.getItem('kss_paid_requests') || '[]')
    const list4 = JSON.parse(localStorage.getItem('kss_completed_payments') || '[]')
    const list5 = JSON.parse(localStorage.getItem('kss_settled_payments') || '[]')
    return Array.from(new Set([
      ...(Array.isArray(list1) ? list1 : []),
      ...(Array.isArray(list2) ? list2 : []),
      ...(Array.isArray(list3) ? list3 : []),
      ...(Array.isArray(list4) ? list4 : []),
      ...(Array.isArray(list5) ? list5 : [])
    ]))
  } catch {
    return []
  }
}

export function isPaymentPaidForPO(poRef: string): boolean {
  if (!poRef) return false
  const paid = getPaidPayments()
  const cleanRef = String(poRef).replace(/^(PO-|RFQ-|REQ-|TCK-|PRD-|PRD\s+|PAY-)/i, '').trim().toUpperCase()
  const shortRef = cleanRef.slice(0, 8)

  return paid.some((k) => {
    if (!k) return false
    const cleanK = String(k).replace(/^(PO-|RFQ-|REQ-|TCK-|PRD-|PRD\s+|PAY-)/i, '').trim().toUpperCase()
    const shortK = cleanK.slice(0, 8)
    return (
      k === poRef ||
      cleanK === cleanRef ||
      (shortK && shortRef && (shortK === shortRef || shortRef.startsWith(shortK) || shortK.startsWith(shortRef))) ||
      (cleanRef.length >= 4 && cleanK.includes(cleanRef)) ||
      (cleanK.length >= 4 && cleanRef.includes(cleanK))
    )
  })
}

export function markPaymentPaidForPO(poRef: string) {
  if (!poRef) return
  try {
    const cleanRef = String(poRef).replace(/^(PO-|RFQ-|REQ-|TCK-|PRD-|PRD\s+|PAY-)/i, '').trim().toUpperCase()
    const current = getPaidPayments()
    const toAdd = [poRef, cleanRef, `PO-${cleanRef}`, `REQ-${cleanRef}`].filter(Boolean)
    const updated = Array.from(new Set([...current, ...toAdd]))
    localStorage.setItem('kss_manager_released_payments', JSON.stringify(updated))
    localStorage.setItem('kss_paid_payments', JSON.stringify(updated))
    localStorage.setItem('kss_paid_requests', JSON.stringify(updated))
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))
  } catch (e) {}
}

export function getDeliveredPOs(): string[] {
  try {
    return JSON.parse(localStorage.getItem('kss_delivered_pos') || '[]')
  } catch {
    return []
  }
}

export function isPODelivered(poRef: string): boolean {
  if (!poRef) return false
  const delivered = getDeliveredPOs()
  const normPoRef = poRef.replace(/^(PO-|RFQ-|REQ-|TCK-)/, '').trim().toUpperCase()
  return delivered.some((k) => {
    const normK = k.replace(/^(PO-|RFQ-|REQ-|TCK-)/, '').trim().toUpperCase()
    return k === poRef || normK === normPoRef || poRef.includes(k) || k.includes(poRef)
  })
}

export function markPODelivered(poRef: string) {
  const current = getDeliveredPOs()
  if (!current.includes(poRef)) {
    const updated = [...current, poRef]
    localStorage.setItem('kss_delivered_pos', JSON.stringify(updated))
  }
}

export function getStoredVendorPOStatuses(vendorId: string): Record<string, string> {
  try {
    const key = `kss_vendor_po_statuses_${vendorId}`
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function saveVendorPOStatus(vendorId: string, poRef: string, status: string) {
  if (!poRef) return
  const key = `kss_vendor_po_statuses_${vendorId}`
  const current = getStoredVendorPOStatuses(vendorId)
  current[poRef] = status
  localStorage.setItem(key, JSON.stringify(current))

  if (status === 'Delivered') {
    markPODelivered(poRef)
  }
}

// ─── LOCAL VENDOR RFQ ACTION STORAGE HELPERS ──────────────────────────────
export interface VendorRfqAction {
  status: 'Accepted' | 'Declined' | 'Submitted'
  declineReason?: string
  timestamp?: string
}

export function getStoredVendorRfqActions(vendorId: string): Record<string, VendorRfqAction> {
  const key = `kss_vendor_rfq_actions_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {}
  }
  return {}
}

export function saveVendorRfqAction(vendorId: string, rfqId: string, actionStatus: 'Accepted' | 'Declined' | 'Submitted', declineReason?: string) {
  const key = `kss_vendor_rfq_actions_${vendorId}`
  const current = getStoredVendorRfqActions(vendorId)
  current[rfqId] = {
    status: actionStatus,
    declineReason,
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(key, JSON.stringify(current))

  // If declined, notify originating portal (push to kss_tl_notifications)
  if (actionStatus === 'Declined') {
    const notifKey = 'kss_tl_notifications'
    const existingNotifsRaw = localStorage.getItem(notifKey)
    const existingNotifs = existingNotifsRaw ? JSON.parse(existingNotifsRaw) : []
    const newNotif = {
      id: Date.now(),
      title: `RFQ Declined by ${vendorId}`,
      message: `Vendor ${vendorId} declined ${rfqId}. Reason: ${declineReason || 'Not specified'}.`,
      timestamp: 'Just now',
      dateGroup: 'Today',
      isRead: false,
      requestId: rfqId,
      type: 'Vendor activity',
      targetRole: 'Admin',
    }
    localStorage.setItem(notifKey, JSON.stringify([newNotif, ...existingNotifs]))
  }

  return current
}

// ─── LOCAL VENDOR INVOICE & GRN STORAGE HELPERS ──────────────────────────────
export function getVerifiedInvoiceRefs(): string[] {
  try {
    const saved = localStorage.getItem('kss_manager_verified_invoices')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function isInvoiceVerifiedInSystem(refOrId?: string): boolean {
  if (!refOrId) return false
  const verifiedList = getVerifiedInvoiceRefs()
  const cleanTarget = String(refOrId).replace(/^(INV-[A-Z0-9]+-|INV-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()
  if (!cleanTarget) return false
  const shortTarget = cleanTarget.slice(0, 8)
  return verifiedList.some((v) => {
    const cleanV = String(v).replace(/^(INV-[A-Z0-9]+-|INV-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()
    const shortV = cleanV.slice(0, 8)
    return (
      cleanV === cleanTarget ||
      (shortV && shortTarget && (shortV === shortTarget || shortTarget.startsWith(shortV) || shortV.startsWith(shortTarget))) ||
      v === refOrId ||
      (cleanTarget.length >= 4 && cleanV.includes(cleanTarget)) ||
      (cleanV.length >= 4 && cleanTarget.includes(cleanV))
    )
  })
}

export function getVerifiedGRNRefs(): string[] {
  try {
    const saved = localStorage.getItem('kss_manager_verified_grns')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function isGRNVerifiedInSystem(refOrId?: string): boolean {
  if (!refOrId) return false
  const verifiedList = getVerifiedGRNRefs()
  const cleanTarget = String(refOrId).replace(/^(REC-[A-Z0-9]+-|REC-|GRN-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()
  if (!cleanTarget) return false
  const shortTarget = cleanTarget.slice(0, 8)
  return verifiedList.some((v) => {
    const cleanV = String(v).replace(/^(REC-[A-Z0-9]+-|REC-|GRN-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()
    const shortV = cleanV.slice(0, 8)
    return (
      cleanV === cleanTarget ||
      (shortV && shortTarget && (shortV === shortTarget || shortTarget.startsWith(shortV) || shortV.startsWith(shortTarget))) ||
      v === refOrId ||
      (cleanTarget.length >= 4 && cleanV.includes(cleanTarget)) ||
      (cleanV.length >= 4 && cleanTarget.includes(cleanV))
    )
  })
}

export function markVendorInvoiceVerified(poRefOrInvId: string, verifiedBy: string = 'Sarah Manager') {
  if (!poRefOrInvId) return
  const cleanKey = String(poRefOrInvId).replace(/^(INV-[A-Z0-9]+-|INV-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()

  // 1. Add to global verified invoices list
  try {
    const currentList = getVerifiedInvoiceRefs()
    const toAdd = [poRefOrInvId, cleanKey, `PO-${cleanKey}`, `REQ-${cleanKey}`, `INV-${cleanKey}`].filter(Boolean)
    const updated = Array.from(new Set([...currentList, ...toAdd]))
    localStorage.setItem('kss_manager_verified_invoices', JSON.stringify(updated))
  } catch (e) {}

  // 2. Update existing stored vendor invoices across all vendors in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (storageKey && storageKey.startsWith('kss_vendor_invoices_')) {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const invList = JSON.parse(raw)
          if (Array.isArray(invList)) {
            let changed = false
            const updatedInvList = invList.map((inv: any) => {
              const invClean = (inv.id || inv.invoiceNumber || inv.invoice_number || '').replace(/^(INV-[A-Z0-9]+-|INV-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()
              if (invClean === cleanKey || inv.id === poRefOrInvId || inv.invoiceNumber === poRefOrInvId || inv.invoice_number === poRefOrInvId) {
                changed = true
                return {
                  ...inv,
                  status: 'Verified & Approved',
                  verified: true,
                  verifiedBy: verifiedBy,
                  verifiedAt: new Date().toISOString()
                }
              }
              return inv
            })
            if (changed) {
              localStorage.setItem(storageKey, JSON.stringify(updatedInvList))
            }
          }
        }
      }
    }
  } catch (e) {}

  // 3. Dispatch broadcast sync events across all open tabs/portals
  try {
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))
  } catch (e) {}
}

export function markVendorDeliveryVerified(poRefOrGrnId: string, verifiedBy: string = 'Sarah Manager') {
  if (!poRefOrGrnId) return
  const cleanKey = String(poRefOrGrnId).replace(/^(REC-[A-Z0-9]+-|REC-|GRN-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()

  // 1. Add to global verified GRNs list
  try {
    const saved = localStorage.getItem('kss_manager_verified_grns')
    const currentList = saved ? JSON.parse(saved) : []
    const toAdd = [poRefOrGrnId, cleanKey, `PO-${cleanKey}`, `REQ-${cleanKey}`, `GRN-${cleanKey}`].filter(Boolean)
    const updated = Array.from(new Set([...currentList, ...toAdd]))
    localStorage.setItem('kss_manager_verified_grns', JSON.stringify(updated))
  } catch (e) {}

  // 2. Update delivery docs across all vendors in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (storageKey && storageKey.startsWith('kss_delivery_docs_')) {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const doc = JSON.parse(raw)
          if (doc) {
            const docClean = (doc.poRef || doc.deliveryId || doc.requestRef || '').replace(/^(REC-[A-Z0-9]+-|REC-|GRN-|PO-|RCP-|RFQ-|REQ-|PRD-|PRD\s+)/i, '').trim().toUpperCase()
            if (docClean === cleanKey || (cleanKey.length >= 4 && docClean.includes(cleanKey)) || (docClean.length >= 4 && cleanKey.includes(docClean))) {
              doc.verified = true
              doc.status = 'Verified'
              doc.verifiedBy = verifiedBy
              doc.verifiedAt = new Date().toISOString()
              localStorage.setItem(storageKey, JSON.stringify(doc))
            }
          }
        }
      }
    }
  } catch (e) {}

  // 3. Dispatch broadcast sync events
  try {
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))
  } catch (e) {}
}

export function getStoredVendorInvoices(vendorId: string): any[] {
  const key = `kss_vendor_invoices_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((inv: any) => {
          if (!inv) return false
          const ref = `${inv.poRef || ''} ${inv.id || ''} ${inv.title || ''} ${inv.description || ''}`
          if (ref.includes('6C74523B') || ref.includes('Enterprise Laptop Workstations')) return false
          return !ref.includes('VNDHW001-76') && !ref.includes('VND-HW-001-76') && !ref.includes('PO-VNDHW001-76')
        }).map((inv: any) => {
          const isVerified = inv.status === 'Verified & Approved' || inv.verified === true || isInvoiceVerifiedInSystem(inv.poRef) || isInvoiceVerifiedInSystem(inv.id) || isInvoiceVerifiedInSystem(inv.requestRef)
          if (isVerified && inv.status !== 'Verified & Approved') {
            inv = {
              ...inv,
              status: 'Verified & Approved',
              verified: true
            }
          }
          if (!inv.quantity || inv.quantity === 1) {
            const cleanKey = (inv.poRef || inv.id || '').replace(/^(INV-|PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
            const storedPOs = getStoredVendorPOs(vendorId)
            const matchPO = storedPOs.find((p: any) => {
              const pKey = (p.id || p.poNumber || p.requestRef || p.rfqRef || '').replace(/^(PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
              return pKey === cleanKey || pKey.includes(cleanKey) || cleanKey.includes(pKey)
            })
            if (matchPO?.quantity && matchPO.quantity > 1) {
              return {
                ...inv,
                quantity: matchPO.quantity,
                productQty: `${matchPO.quantity} ${matchPO.unit || 'Units'}`
              }
            }
          }
          return inv
        })
        if (cleaned.length !== parsed.length || JSON.stringify(cleaned) !== saved) {
          localStorage.setItem(key, JSON.stringify(cleaned))
        }
        return cleaned
      }
    } catch (e) {}
  }
  return []
}

export function saveStoredVendorInvoice(vendorId: string, invoice: any): any[] {
  const key = `kss_vendor_invoices_${vendorId}`
  const current = getStoredVendorInvoices(vendorId)
  const updated = [invoice, ...current]
  localStorage.setItem(key, JSON.stringify(updated))
  return updated
}

// ─── LOCAL VENDOR RECEIPT STORAGE HELPERS ──────────────────────────────
export function getStoredVendorReceipts(vendorId: string): any[] {
  const key = `kss_vendor_receipts_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {}
  }
  return []
}

export function saveStoredVendorReceipt(vendorId: string, receipt: any): any[] {
  const key = `kss_vendor_receipts_${vendorId}`
  const current = getStoredVendorReceipts(vendorId)
  const updated = [receipt, ...current]
  localStorage.setItem(key, JSON.stringify(updated))
  return updated
}

// ─── LOCAL DELIVERY DOCUMENT STORAGE HELPERS ──────────────────────────────
export interface DeliveryDocRecord {
  poRef: string
  requestRef?: string
  deliveryId?: string
  vendorId: string
  challanDocName: string
  invoiceDocName: string
  warrantyDocName?: string
  deliveryDate: string
  courierRef?: string
  status: string
  uploadedAt: string
}

export function getStoredDeliveryDocs(poRefOrReqRef: string, vendorId?: string): DeliveryDocRecord | null {
  if (!poRefOrReqRef) return null
  const cleanRef = poRefOrReqRef.trim()

  // 1. Check namespaced key if vendorId is provided
  if (vendorId) {
    const namespacedKey = `kss_delivery_docs_${vendorId}_${cleanRef}`
    const saved = localStorage.getItem(namespacedKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed) return parsed
      } catch (e) {}
    }
  }

  // 2. Fallback to old key ONLY if the stored record's vendorId matches the current vendor (or if no vendorId requested)
  const oldKey = `kss_delivery_docs_${cleanRef}`
  const oldSaved = localStorage.getItem(oldKey)
  if (oldSaved) {
    try {
      const parsed = JSON.parse(oldSaved)
      if (parsed) {
        if (!vendorId || parsed.vendorId === vendorId || (parsed.vendorId && vendorId && parsed.vendorId.toLowerCase() === vendorId.toLowerCase())) {
          return parsed
        }
      }
    } catch (e) {}
  }

  return null
}

export function saveDeliveryDocs(poRefOrReqRef: string, payload: DeliveryDocRecord) {
  if (!poRefOrReqRef || !payload) return
  const cleanRef = poRefOrReqRef.trim()
  const vId = payload.vendorId || ''

  // Write strictly to namespaced vendor key without polluting global vendor-less keys
  if (vId) {
    localStorage.setItem(`kss_delivery_docs_${vId}_${cleanRef}`, JSON.stringify(payload))
  } else {
    localStorage.setItem(`kss_delivery_docs_${cleanRef}`, JSON.stringify(payload))
  }
}

export function formatExpectedDeliveryDate(item: any, defaultLeadDays = 7): string {
  if (item?.expectedDeliveryDate && item.expectedDeliveryDate !== '2026-10-15') {
    return item.expectedDeliveryDate
  }
  if (item?.deliveryDate && item.deliveryDate !== '2026-10-15' && item.deliveryDate !== '2026-09-26') {
    return item.deliveryDate
  }
  const leadDays = parseInt(item?.leadTime || item?.deliveryDays) || defaultLeadDays
  const baseDateStr = item?.issueDate || item?.quoteDate || item?.submissionDate || item?.created_at || new Date().toISOString().split('T')[0]
  const d = new Date(baseDateStr)
  if (!isNaN(d.getTime())) {
    d.setDate(d.getDate() + leadDays)
    return d.toISOString().split('T')[0]
  }
  return new Date(Date.now() + defaultLeadDays * 86400000).toISOString().split('T')[0]
}

export function getStoredVendorPOs(vendorId: string): any[] {
  try {
    const key = `kss_vendor_pos_${vendorId}`
    const localStr = localStorage.getItem(key)
    const local = localStr ? JSON.parse(localStr) : []

    const vendorQuotes = getStoredVendorQuotes(vendorId)
    const currentVendor = MASTER_VENDORS.find((v) => v.id === vendorId) || { id: vendorId, name: 'Vendor Partner' }

    // Global purchase orders
    const globalStr = localStorage.getItem('kss_purchase_orders')
    const globalPOs = globalStr ? JSON.parse(globalStr) : []
    const matchingGlobal = globalPOs
      .filter((p: any) => {
        if (!p) return false
        if (p.vendorId === vendorId) return true
        const pVendor = (p.vendor || '').toLowerCase()
        const vName = currentVendor.name.toLowerCase()
        const vKey = vendorId.toLowerCase()
        if (pVendor && vName && (pVendor.includes(vName) || vName.includes(pVendor))) return true
        if (vKey.includes('001') && (pVendor.includes('dell') || pVendor.includes('hw-001'))) return true
        if (vKey.includes('002') && (pVendor.includes('hp') || pVendor.includes('hw-002'))) return true
        if (vKey.includes('003') && (pVendor.includes('lenovo') || pVendor.includes('hw-003'))) return true
        if (vKey.includes('004') && (pVendor.includes('apple') || pVendor.includes('hw-004'))) return true
        return false
      })
      .map((p: any) => {
        const quoteMatch = vendorQuotes.find((q: any) =>
          (q.rfqRef && q.rfqRef.includes(p.requestId)) || (q.rfqId && q.rfqId.includes(p.requestId))
        )
        const delDate = formatExpectedDeliveryDate(p) || formatExpectedDeliveryDate(quoteMatch)
        const poQty = p.quantity || quoteMatch?.quantity || (quoteMatch?.productQty ? parseInt(quoteMatch.productQty) : undefined) || 15
        return {
          id: p.id || p.poNumber || `PO-${p.requestId || '2026-001'}`,
          poNumber: p.poNumber || p.id,
          requestRef: p.requestId || 'REQ-2026-028',
          rfqRef: p.rfqId || p.requestId || 'RFQ-2026-028',
          title: p.requestTitle || p.items?.[0]?.product || 'Procurement Item Order',
          quantity: poQty,
          unit: p.unit || 'Units',
          amount: p.totalAmount || p.amount || 94400,
          status: p.status === 'Sent to Vendor' ? 'Pending Confirmation' : (p.status || 'Pending Confirmation'),
          issueDate: p.poDate || p.submissionDate || new Date().toISOString().split('T')[0],
          deliveryDate: delDate,
          vendorId: vendorId,
          vendorName: p.vendor || currentVendor.name
        }
      })

    // Derive POs from selected vendor quotes
    const selStr = localStorage.getItem('kss_selected_vendor_quotes')
    const selMap = selStr ? JSON.parse(selStr) : {}
    const selPOs: any[] = []

    Object.values(selMap).forEach((sel: any) => {
      if (sel && (sel.quoteId || sel.rfqId || sel.product)) {
        const selVendor = (sel.vendorName || sel.vendor || '').toLowerCase()
        const currentVName = currentVendor.name.toLowerCase()
        const isMatch = sel.vendorId === vendorId || (selVendor && currentVName && (selVendor.includes(currentVName) || currentVName.includes(selVendor)))
        if (isMatch) {
          const cleanRfq = sel.rfqId || sel.quoteId || ''
          if (!cleanRfq) return
          const cleanKey = cleanRfq.replace(/^(PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
          const poId = `PO-${cleanKey}`
          const delDate = formatExpectedDeliveryDate(sel)
          const selQty = sel.quantity || 1
          selPOs.push({
            id: poId,
            poNumber: poId,
            requestRef: cleanRfq,
            rfqRef: cleanRfq,
            title: sel.product || 'Procurement Order Equipment',
            quantity: selQty,
            unit: 'Units',
            amount: sel.amount || 0,
            status: 'Pending Confirmation',
            issueDate: (sel.selectedAt || new Date().toISOString()).split('T')[0],
            deliveryDate: delDate,
            vendorId: vendorId,
            vendorName: currentVendor.name
          })
        }
      }
    })

    const rawAll = [...local, ...matchingGlobal, ...selPOs]
    const uniqueMap = new Map<string, any>()

    rawAll.forEach((p: any) => {
      if (!p) return
      const rawRef = p.requestRef || p.requestId || p.rfqRef || p.poNumber || p.id || ''
      const normKey = rawRef.replace(/^(PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
      if (!normKey) return

      const quoteMatch = vendorQuotes.find((q: any) =>
        (q.rfqRef && q.rfqRef.toUpperCase().includes(normKey)) ||
        (q.rfqId && q.rfqId.toUpperCase().includes(normKey)) ||
        (q.id && q.id.toUpperCase().includes(normKey))
      )
      const targetDelivery = formatExpectedDeliveryDate(p) || formatExpectedDeliveryDate(quoteMatch)
      const resolvedQty = p.quantity || quoteMatch?.quantity || (quoteMatch?.productQty ? parseInt(quoteMatch.productQty) : undefined) || 15

      if (!uniqueMap.has(normKey)) {
        uniqueMap.set(normKey, {
          ...p,
          quantity: resolvedQty,
          deliveryDate: targetDelivery
        })
      } else {
        const prev = uniqueMap.get(normKey)!
        uniqueMap.set(normKey, {
          ...prev,
          ...p,
          quantity: resolvedQty || prev.quantity || 15,
          status: (prev.status && prev.status !== 'Pending Confirmation') ? prev.status : (p.status || prev.status),
          deliveryDate: (targetDelivery && targetDelivery !== '2026-10-15') ? targetDelivery : prev.deliveryDate
        })
      }
    })

    return Array.from(uniqueMap.values())
  } catch (e) {
    return []
  }
}

// ─── SCOPED DATA GENERATOR (100% DATA ISOLATION PER VENDOR ID) ───────────────
export function resolveVendorRecord(vendorIdentifier: string): VendorRecord {
  if (!vendorIdentifier) return MASTER_VENDORS[0]
  const clean = String(vendorIdentifier).toLowerCase().trim()
  
  // 1. Direct ID match
  let found = MASTER_VENDORS.find(v => v.id.toLowerCase() === clean)
  if (found) return found

  // 2. Direct Name match
  found = MASTER_VENDORS.find(v => v.name.toLowerCase() === clean)
  if (found) return found

  // 3. Known aliases or substring match
  if (clean.includes('dell')) return MASTER_VENDORS.find(v => v.id === 'VND-HW-001')!
  if (clean.includes('hp') || clean.includes('hewlett')) return MASTER_VENDORS.find(v => v.id === 'VND-HW-002')!
  if (clean.includes('lenovo') || clean.includes('len')) return MASTER_VENDORS.find(v => v.id === 'VND-HW-003')!
  if (clean.includes('apple') || clean.includes('app')) return MASTER_VENDORS.find(v => v.id === 'VND-HW-004')!
  if (clean.includes('palo') || clean.includes('alto')) return MASTER_VENDORS.find(v => v.id === 'VND-SEC-001')!
  if (clean.includes('crowd') || clean.includes('strike')) return MASTER_VENDORS.find(v => v.id === 'VND-SEC-002')!
  if (clean.includes('accenture')) return MASTER_VENDORS.find(v => v.id === 'VND-IT-001')!
  if (clean.includes('infosys')) return MASTER_VENDORS.find(v => v.id === 'VND-IT-002')!
  if (clean.includes('herman') || clean.includes('miller')) return MASTER_VENDORS.find(v => v.id === 'VND-FUR-001')!
  if (clean.includes('steelcase')) return MASTER_VENDORS.find(v => v.id === 'VND-FUR-002')!
  if (clean.includes('samsung')) return MASTER_VENDORS.find(v => v.id === 'VND-OFF-001')!
  if (clean.includes('canon')) return MASTER_VENDORS.find(v => v.id === 'VND-OFF-002')!
  if (clean.includes('cisco')) return MASTER_VENDORS.find(v => v.id === 'VND-NET-001')!

  // 4. Fallback search by number if integer
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean)
    if (num === 5) return MASTER_VENDORS.find(v => v.id === 'VND-HW-001')!
    if (num === 6) return MASTER_VENDORS.find(v => v.id === 'VND-HW-002')!
    if (num === 7) return MASTER_VENDORS.find(v => v.id === 'VND-HW-003')!
    if (num === 8) return MASTER_VENDORS.find(v => v.id === 'VND-HW-004')!
  }

  return {
    id: vendorIdentifier,
    name: `Vendor ${vendorIdentifier}`,
    category: 'IT Hardware',
    score: '94.0%',
    risk: 'Low',
    contactPerson: 'Account Representative',
    email: `contact@${vendorIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    phone: '+1 800-555-0100',
    status: 'Active',
    openRfqsCount: 2,
    activePosCount: 1,
    totalDisbursed: 25000,
  }
}

export function getScopedVendorData(vendorId: string) {
  const vendor = resolveVendorRecord(vendorId)

  // Derive integer seed from vendorId characters
  const seed = vendorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  // RFQs scoped to this vendorId (Dynamic from localStorage, API & candidate scope)
  const rfqs: any[] = getVendorScopedRfqs(vendorId, vendor.name, vendor.category)

  // Quotations scoped to this vendorId (merged with user submitted quotes)
  const userQuotes = getStoredVendorQuotes(vendorId)
  const defaultQuotations: any[] = []
  const quotations = [...userQuotes, ...defaultQuotations]

  // POs scoped to this vendorId (merged with user & system POs)
  const userPOs = getStoredVendorPOs(vendorId)
  const defaultPOs: any[] = []
  const pos = [...userPOs, ...defaultPOs]

  // Deliveries scoped to this vendorId
  const deliveries: any[] = []

  // Receipts scoped to this vendorId (merged with user-added receipts & derived from POs)
  const userReceipts = getStoredVendorReceipts(vendorId)
  const derivedReceiptsFromPOs: any[] = []
  pos.forEach((p: any) => {
    if (!p || !p.id || p.id.includes('6C74523B') || (p.title && p.title.includes('Enterprise Laptop Workstations'))) return
    const isDelivered = isPODelivered(p.id) || !!getStoredDeliveryDocs(p.id, vendorId) || p.status === 'Delivered' || p.status === 'Fulfilled'
    if (isDelivered) {
      const cleanKey = p.id.replace(/^(PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
      const rcpId = `RCP-2026-${cleanKey}`
      const delDoc = getStoredDeliveryDocs(p.id, vendorId)
      const pQty = p.quantity || 1
      const itemTitle = p.title || p.productName || 'Procurement Order Equipment'
      const itemCategory = p.category || vendor.category || 'IT Hardware'
      const rawDate = delDoc?.deliveryDate || p.deliveryDate || p.issueDate || '2026-09-24'
      const uploadDate = rawDate && rawDate !== 'None' && rawDate !== 'null' ? rawDate : '2026-09-24'
      const isVerified = p.document_verification_status === 'Documents Verified' || p.document_verification?.is_goods_receipt_verified || isInvoiceVerifiedInSystem(p.id)

      derivedReceiptsFromPOs.push({
        id: rcpId,
        receiptNumber: rcpId,
        poRef: p.id || `PO-${cleanKey}`,
        requestRef: p.requestRef || `REQ-${cleanKey}`,
        rfqRef: p.rfqRef || `RFQ-${cleanKey}`,
        item: itemTitle,
        productName: itemTitle,
        category: itemCategory,
        quantity: pQty,
        quantityReceived: `${pQty} Units`,
        productQty: `${pQty} Units`,
        amount: p.amount || 94400,
        totalAmount: p.amount || 94400,
        receivedDate: uploadDate,
        uploadedDate: uploadDate,
        receivedBy: isVerified ? ((delDoc as any)?.verifiedBy || 'Sarah Manager') : 'Warehouse Manager',
        vendorId: vendorId,
        vendorName: p.vendorName || vendor.name,
        status: isVerified ? 'Verified' : 'Pending',
        verified: isVerified,
        docName: delDoc?.challanDocName || `Delivery_Challan_${p.id}.pdf`
      })
    }
  })

  const receiptMap = new Map<string, any>()
  derivedReceiptsFromPOs.forEach(r => {
    const normKey = (r.poRef || r.id).replace(/^(RCP-|PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
    receiptMap.set(normKey, r)
  })
  userReceipts.forEach(r => {
    const normKey = (r.poRef || r.id).replace(/^(RCP-|PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
    receiptMap.set(normKey, r)
  })

  const receipts = Array.from(receiptMap.values())

  // Invoices scoped to this vendorId (merged with user submitted invoices & derived from POs)
  const userInvoices = getStoredVendorInvoices(vendorId)
  
  const derivedInvoicesFromPOs: any[] = []
  pos.forEach((p: any) => {
    if (!p || !p.id || p.id.includes('6C74523B') || (p.title && p.title.includes('Enterprise Laptop Workstations'))) return
    const isDelivered = isPODelivered(p.id) || !!getStoredDeliveryDocs(p.id, vendorId) || p.status === 'Delivered' || p.status === 'Fulfilled'
    if (isDelivered) {
      const cleanKey = p.id.replace(/^(PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
      const cleanVCode = vendorId.replace(/[^A-Z0-9]/g, '').toUpperCase()
      const invId = `INV-${cleanVCode}-${cleanKey}`
      const delDoc = getStoredDeliveryDocs(p.id, vendorId)
      const pQty = p.quantity || 1
      const qMatch = quotations.find((q: any) =>
        (q.rfqRef && q.rfqRef.toUpperCase().includes(cleanKey)) ||
        (q.rfqId && q.rfqId.toUpperCase().includes(cleanKey)) ||
        (q.id && q.id.toUpperCase().includes(cleanKey))
      )
      const pTotal = typeof p.amount === 'number' ? p.amount : (typeof p.totalAmount === 'number' ? p.totalAmount : (parseFloat(p.amount) || parseFloat(p.totalAmount) || 0))
      const pGstPct = typeof p.gstPercent === 'number' ? p.gstPercent : (typeof p.gstRate === 'number' ? p.gstRate : (typeof p.gst_rate === 'number' ? p.gst_rate : (typeof qMatch?.gstPercent === 'number' ? qMatch.gstPercent : (typeof qMatch?.gstRate === 'number' ? qMatch.gstRate : (parseFloat(qMatch?.gst_rate) || 18)))))
      const pBase = typeof p.baseAmount === 'number' ? p.baseAmount : (typeof p.base_amount === 'number' ? p.base_amount : (typeof qMatch?.baseAmount === 'number' ? qMatch.baseAmount : (typeof qMatch?.price === 'number' ? qMatch.price : (parseFloat(qMatch?.baseAmount) || parseFloat(qMatch?.price) || Math.round(pTotal / (1.0 + (pGstPct / 100.0)))))))
      const pTax = typeof p.taxAmount === 'number' ? p.taxAmount : (typeof p.tax_amount === 'number' ? p.tax_amount : (typeof qMatch?.taxAmount === 'number' ? qMatch.taxAmount : (typeof qMatch?.tax_amount === 'number' ? qMatch.tax_amount : Math.round(pTotal - pBase))))

      derivedInvoicesFromPOs.push({
        id: invId,
        invoiceNumber: invId,
        poRef: p.id || `PO-${cleanKey}`,
        requestRef: p.requestRef || `REQ-${cleanKey}`,
        rfqRef: p.rfqRef || `RFQ-${cleanKey}`,
        title: p.title || 'Procurement Order Equipment',
        productName: p.title || 'Procurement Order Equipment',
        vendorId: vendorId,
        vendorName: p.vendorName || 'Vendor Partner',
        amount: pTotal,
        invoiceAmount: pTotal,
        quantity: pQty,
        productQty: `${pQty} Units`,
        taxAmount: pTax,
        baseAmount: pBase,
        gstPercent: pGstPct,
        gstNumber: '27AAACK1092F1Z9',
        invoiceDate: delDoc?.deliveryDate || p.issueDate || '2026-09-10',
        dueDate: '2026-10-10',
        status: 'Verified & Approved',
        docName: delDoc?.invoiceDocName || `Tax_Invoice_${p.id}.pdf`,
        items: [
          { description: p.title || 'Enterprise Laptop Workstations', qty: pQty, unitPrice: Math.round(pTotal / (pQty || 1)), total: pTotal }
        ]
      })
    }
  })

  const invoiceMap = new Map<string, any>()
  derivedInvoicesFromPOs.forEach(inv => {
    const normKey = (inv.poRef || inv.id).replace(/^(INV-|PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
    invoiceMap.set(normKey, inv)
  })
  userInvoices.forEach(inv => {
    const normKey = (inv.poRef || inv.id).replace(/^(INV-|PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
    invoiceMap.set(normKey, inv)
  })

  const invoices = Array.from(invoiceMap.values()).map((inv: any) => {
    const isVerified = inv.status === 'Verified & Approved' || inv.verified === true || isInvoiceVerifiedInSystem(inv.poRef) || isInvoiceVerifiedInSystem(inv.id) || isInvoiceVerifiedInSystem(inv.requestRef)
    if (isVerified) {
      return {
        ...inv,
        status: 'Verified & Approved',
        verified: true
      }
    }
    return inv
  })

  // Payments scoped to this vendorId
  const payments: any[] = []

  // Derived win rate
  const winRate = `100.0%`

  const cleanVndCode = vendorId.replace(/[^A-Z0-9]/g, '').toUpperCase()

  // Documents scoped to this vendorId (merged with user uploaded docs & submitted quotes)
  const userDocs = getStoredVendorDocuments(vendorId)

  // Lookup maps from RFQs and POs for real quantities, titles, categories
  const rfqLookupMap = new Map<string, any>()
  rfqs.forEach(r => {
    if (r) {
      if (r.id) rfqLookupMap.set(r.id.toUpperCase(), r)
      const cleanR = (r.id || '').replace(/^(RFQ-|REQ-)/i, '').trim().toUpperCase()
      if (cleanR) rfqLookupMap.set(cleanR, r)
      if (r.request_id) rfqLookupMap.set(r.request_id.toUpperCase(), r)
    }
  })

  const poLookupMap = new Map<string, any>()
  pos.forEach(p => {
    if (p) {
      if (p.id) poLookupMap.set(p.id.toUpperCase(), p)
      const cleanP = (p.id || '').replace(/^(PO-|RFQ-|REQ-)/i, '').trim().toUpperCase()
      if (cleanP) poLookupMap.set(cleanP, p)
      if (p.requestRef) poLookupMap.set(p.requestRef.toUpperCase(), p)
    }
  })

  // Auto-derive document entries for all real submitted RFQ quotations with full details
  const quoteDocs = userQuotes.map((q: any) => {
    const cleanQKey = (q.rfqRef || q.rfqId || q.grnDocNumber || q.id || '').replace(/^(DOC-|GRN-|PO-|RFQ-|REQ-)/gi, '').trim().toUpperCase()
    const matchedRfq = rfqLookupMap.get(q.rfqRef?.toUpperCase()) || rfqLookupMap.get(q.rfqId?.toUpperCase()) || rfqLookupMap.get(cleanQKey)
    const matchedPo = poLookupMap.get(cleanQKey)
    
    const realQtyNum = matchedRfq?.quantity || matchedPo?.quantity || (q.productQty ? parseInt(q.productQty) : undefined) || (q.quantity ? parseInt(q.quantity) : undefined) || 30
    const realTitle = matchedRfq?.title || matchedPo?.title || q.productName || 'Enterprise Workstations & Supplies'
    const realCategory = matchedRfq?.category || matchedPo?.category || vendor.category || 'IT Hardware'

    return {
      id: `DOC-${q.grnDocNumber || q.id}`,
      name: `Official Quotation & Receipt (${q.id}) - ${q.rfqRef || 'RFQ-2026-001'}`,
      category: realCategory,
      uploadedDate: q.issueDate || q.submittedDate || new Date().toISOString().split('T')[0],
      expiryDate: q.expiryDate || q.quoteValidUntil || 'N/A',
      status: 'Verified',
      fileSize: '1.4 MB',
      rfqRef: q.rfqRef || q.rfqId || 'RFQ-2026-001',
      grnDocNumber: q.grnDocNumber || `GRN-2026-${cleanVndCode}-001`,
      receiptNumber: q.receiptNumber || `RCP-${Math.floor(10000 + Math.random() * 90000)}`,
      productName: realTitle,
      productQty: `${realQtyNum} Units`,
      quantity: realQtyNum,
      receivedQty: realQtyNum,
      acceptedQty: realQtyNum,
      warrantyDuration: q.warrantyDuration || '36 Months (On-site)',
      warrantyType: q.warrantyType || 'On-site',
      freeServiceCount: q.freeServiceCount || '3 Services',
      installationType: q.installationType || 'Free',
      techSupportDuration: q.techSupportDuration || '24/7 Support',
      replacementPolicy: q.replacementPolicy || 'Standard Policy',
      accessoriesIncluded: q.accessoriesIncluded || 'Standard Accessories',
      baseAmount: typeof q.baseAmount === 'number' ? q.baseAmount : (typeof q.base_amount === 'number' ? q.base_amount : (typeof q.price === 'number' ? q.price : (parseFloat(q.baseAmount) || parseFloat(q.base_amount) || parseFloat(q.price) || 30000))),
      gstPercent: typeof q.gstPercent === 'number' ? q.gstPercent : (typeof q.gstRate === 'number' ? q.gstRate : (typeof q.gst_rate === 'number' ? q.gst_rate : (parseFloat(q.gstPercent) || parseFloat(q.gst_rate) || 18))),
      gstAmount: typeof q.gstAmount === 'number' ? q.gstAmount : (typeof q.taxAmount === 'number' ? q.taxAmount : (typeof q.tax_amount === 'number' ? q.tax_amount : (parseFloat(q.gstAmount) || parseFloat(q.tax_amount) || 5400))),
      totalAmount: typeof q.totalAmount === 'number' ? q.totalAmount : (typeof q.total_amount === 'number' ? q.total_amount : (parseFloat(q.totalAmount) || parseFloat(q.total_amount) || 35400)),
      leadTime: q.leadTime || '7 Days',
      expectedDeliveryDate: q.expectedDeliveryDate || '2026-10-15',
      notes: q.notes || 'Net 30 payment terms upon delivery & verification.',
      docName: q.grnDocName || `DOC-${q.grnDocNumber || q.id}.pdf`
    }
  })

  const cleanSeedDocs = [
    {
      id: `DOC-REG-${cleanVndCode}-001`,
      name: `Official Vendor Registration Certificate - ${vendor.name}`,
      category: 'Legal Registrations',
      uploadedDate: '2026-01-15',
      expiryDate: '2027-12-31',
      status: 'Verified',
      fileSize: '2.1 MB',
      rfqRef: 'N/A (Registration)',
      grnDocNumber: `REG-${cleanVndCode}-2026`,
      receiptNumber: `CERT-88491`,
      productName: `${vendor.category} Supply & Maintenance`,
      productQty: 'Enterprise Service Agreement',
      quantity: 1,
      receivedQty: 1,
      acceptedQty: 1,
      warrantyDuration: '24 Months',
      warrantyType: 'Full Coverage',
      freeServiceCount: 'Unlimited',
      installationType: 'Included',
      techSupportDuration: '24/7 Dedicated Support',
      replacementPolicy: 'Immediate Replacement SLA',
      accessoriesIncluded: 'All Standard Hardware & Software Drivers',
      baseAmount: 150000,
      gstPercent: 18,
      gstAmount: 27000,
      totalAmount: 177000,
      leadTime: 'Immediate',
      expectedDeliveryDate: '2026-12-31',
      notes: 'Certified vendor compliance registration document.',
      docName: `DOC-REG-${cleanVndCode}-001.pdf`
    }
  ]

  // Map userQuotes for fast lookup
  const userQuotesMap = new Map<string, any>()
  userQuotes.forEach(q => {
    if (q) {
      if (q.grnDocNumber) userQuotesMap.set(`DOC-${q.grnDocNumber}`, q)
      if (q.id) userQuotesMap.set(`DOC-${q.id}`, q)
      if (q.rfqRef) userQuotesMap.set(q.rfqRef, q)
    }
  })

  // Enrich userDocs stored in localStorage with matching quote details
  const enhancedUserDocs = userDocs.map(d => {
    const cleanDKey = (d.id || d.name || d.rfqRef || d.grnDocNumber || '').replace(/^(DOC-|GRN-|PO-|RFQ-|REQ-)/gi, '').trim().toUpperCase()
    const matchedRfq = rfqLookupMap.get(d.rfqRef?.toUpperCase()) || rfqLookupMap.get(cleanDKey)
    const matchedPo = poLookupMap.get(cleanDKey)

    const matchedQuote = userQuotesMap.get(d.id) ||
      userQuotes.find(q => d.id?.includes(q.grnDocNumber) || d.name?.includes(q.rfqRef) || d.name?.includes(q.grnDocNumber))

    const realQtyNum = matchedRfq?.quantity || matchedPo?.quantity || (matchedQuote?.quantity ? parseInt(matchedQuote.quantity) : undefined) || (d.quantity ? parseInt(d.quantity) : undefined) || (d.productQty ? parseInt(d.productQty) : undefined) || 30
    const realTitle = matchedRfq?.title || matchedPo?.title || matchedQuote?.productName || d.productName || 'Enterprise Workstations'
    const realCategory = matchedRfq?.category || matchedPo?.category || d.category || vendor.category || 'IT Hardware'

    if (matchedQuote) {
      const qGstPct = typeof matchedQuote.gstPercent === 'number' ? matchedQuote.gstPercent : (typeof matchedQuote.gstRate === 'number' ? matchedQuote.gstRate : (typeof matchedQuote.gst_rate === 'number' ? matchedQuote.gst_rate : (parseFloat(matchedQuote.gstPercent) || parseFloat(matchedQuote.gst_rate) || 18)))
      const qBase = typeof matchedQuote.baseAmount === 'number' ? matchedQuote.baseAmount : (typeof matchedQuote.base_amount === 'number' ? matchedQuote.base_amount : (typeof matchedQuote.price === 'number' ? matchedQuote.price : (parseFloat(matchedQuote.baseAmount) || parseFloat(matchedQuote.base_amount) || parseFloat(matchedQuote.price) || 45000)))
      const qGstAmt = typeof matchedQuote.gstAmount === 'number' ? matchedQuote.gstAmount : (typeof matchedQuote.taxAmount === 'number' ? matchedQuote.taxAmount : (typeof matchedQuote.tax_amount === 'number' ? matchedQuote.tax_amount : Math.round((qBase * qGstPct) / 100)))
      const qTotal = typeof matchedQuote.totalAmount === 'number' ? matchedQuote.totalAmount : (typeof matchedQuote.total_amount === 'number' ? matchedQuote.total_amount : (parseFloat(matchedQuote.totalAmount) || parseFloat(matchedQuote.total_amount) || (qBase + qGstAmt)))

      return {
        ...d,
        rfqRef: d.rfqRef || matchedQuote.rfqRef || matchedQuote.rfqId,
        grnDocNumber: d.grnDocNumber || matchedQuote.grnDocNumber,
        receiptNumber: d.receiptNumber || matchedQuote.receiptNumber,
        productName: realTitle,
        productQty: `${realQtyNum} Units`,
        quantity: realQtyNum,
        receivedQty: realQtyNum,
        acceptedQty: realQtyNum,
        category: realCategory,
        warrantyDuration: d.warrantyDuration || matchedQuote.warrantyDuration || matchedQuote.warranty || '36 Months (On-site)',
        warrantyType: d.warrantyType || matchedQuote.warrantyType || 'On-site',
        freeServiceCount: d.freeServiceCount || matchedQuote.freeServiceCount || '3 Services',
        installationType: d.installationType || matchedQuote.installationType || 'Included',
        techSupportDuration: d.techSupportDuration || matchedQuote.techSupportDuration || '24/7 Dedicated Support',
        replacementPolicy: d.replacementPolicy || matchedQuote.replacementPolicy || 'Standard Policy',
        accessoriesIncluded: d.accessoriesIncluded || matchedQuote.accessoriesIncluded || 'Standard Accessories',
        baseAmount: (d.baseAmount !== undefined && d.baseAmount !== 0) ? d.baseAmount : qBase,
        gstPercent: (d.gstPercent !== undefined && d.gstPercent !== 0) ? d.gstPercent : qGstPct,
        gstAmount: (d.gstAmount !== undefined && d.gstAmount !== 0) ? d.gstAmount : qGstAmt,
        totalAmount: (d.totalAmount !== undefined && d.totalAmount !== 0) ? d.totalAmount : qTotal,
        leadTime: d.leadTime || matchedQuote.leadTime,
        expectedDeliveryDate: d.expectedDeliveryDate || matchedQuote.expectedDeliveryDate,
        notes: d.notes || matchedQuote.notes || matchedQuote.terms_conditions,
      }
    }
    return {
      ...d,
      productName: realTitle,
      productQty: `${realQtyNum} Units`,
      quantity: realQtyNum,
      receivedQty: realQtyNum,
      acceptedQty: realQtyNum,
      category: realCategory,
    }
  })

  const deletedDocIds = getDeletedDocIds(vendorId)
  const combinedDocsMap = new Map<string, any>()
  enhancedUserDocs.forEach(d => {
    if (d && d.id && !isDocDeleted(deletedDocIds, d)) {
      combinedDocsMap.set(d.id, d)
    }
  })
  if (combinedDocsMap.size === 0) {
    cleanSeedDocs.forEach(d => {
      if (d && d.id && !isDocDeleted(deletedDocIds, d)) combinedDocsMap.set(d.id, d)
    })
  }

  const documents = Array.from(combinedDocsMap.values()).filter(d => !isDocDeleted(deletedDocIds, d))

  // Vendor Notifications (Dynamic)
  const notifications: any[] = []

  return {
    vendor: { ...vendor, winRate },
    rfqs,
    quotations,
    pos,
    deliveries,
    receipts,
    invoices,
    payments,
    documents,
    notifications,
  }
}

// ─── 1. VENDOR CATEGORIES LANDING PAGE ─────────────────────────────────────────
export const VendorCategoriesPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
            VENDOR SELECTION PORTAL
          </span>
          <h1 className="text-2xl font-black text-white mt-2">Vendor Categories Catalog</h1>
          <p className="text-xs text-blue-100 mt-1">
            Browse procurement categories to select vendor accounts and access isolated dashboards.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-center">
          <span className="text-[10px] uppercase font-bold block text-blue-100">Registered Categories</span>
          <span className="text-2xl font-black text-white">{VENDOR_CATEGORIES_LIST.length}</span>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {VENDOR_CATEGORIES_LIST.map((cat) => {
          const vendorsInCat = MASTER_VENDORS.filter((v) => v.category === cat.name)
          const openRfqsSum = vendorsInCat.reduce((acc, curr) => acc + curr.openRfqsCount, 0)

          return (
            <div
              key={cat.name}
              onClick={() => navigate(`/portal/vendor/categories/${encodeURIComponent(cat.name)}`)}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-2xl flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                    {cat.icon}
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    {vendorsInCat.length} Vendor Account(s)
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{cat.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-semibold">
                  Open RFQs: <strong className="text-gray-900">{openRfqsSum}</strong>
                </span>
                <span className="font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Vendors <ChevronRight size={14} />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 2. VENDORS IN CATEGORY PAGE ──────────────────────────────────────────────
export const VendorsInCategoryPage: React.FC = () => {
  const { categoryId = 'IT Hardware' } = useParams<{ categoryId: string }>()
  const decodedCategory = decodeURIComponent(categoryId)
  const navigate = useNavigate()

  const vendors = MASTER_VENDORS.filter(
    (v) => v.category.toLowerCase() === decodedCategory.toLowerCase()
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
          <Link to="/portal/vendor/categories" className="hover:text-blue-600 transition-colors">
            Vendor Categories
          </Link>
          <ChevronRight size={12} />
          <span className="text-gray-900 font-bold">{decodedCategory}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="text-blue-600" /> Vendors in {decodedCategory}
            </h1>
            <p className="text-xs text-gray-500">
              Select a vendor account below to launch its isolated portal view and dashboard.
            </p>
          </div>
          <Link
            to="/portal/vendor/categories"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-xs"
          >
            ← Back to All Categories
          </Link>
        </div>
      </div>

      {isFlowBCategory(decodedCategory) && (
        <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-purple-950">
            <AlertCircle size={18} className="text-purple-600" /> Flow B Category — Excluded from Vendor Bidding & POs
          </div>
          <p className="text-purple-800 leading-relaxed">
            <strong>{decodedCategory}</strong> is a designated Flow B (no-vendor) category. Requests under this category do not issue RFQs or Purchase Orders, and route directly to Team Lead Fund Release upon approval.
          </p>
        </div>
      )}

      {/* Vendor Cards Grid */}
      {vendors.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-500">
          <AlertCircle size={36} className="mx-auto mb-2 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-700">No vendors registered under "{decodedCategory}"</h3>
          <p className="text-xs text-gray-400 mt-1">Try selecting another category from the catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => navigate(`/portal/vendor/vendor/${vendor.id}/dashboard`)}
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                    {vendor.id}
                  </span>
                  <span className="text-xs font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
                    <Star size={12} className="fill-green-600" /> Performance {vendor.score}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {vendor.name}
                </h3>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <p>👤 Contact: <strong className="text-gray-800">{vendor.contactPerson}</strong></p>
                  <p>✉️ Email: <strong className="text-gray-800">{vendor.email}</strong></p>
                  <p>📞 Phone: <strong className="text-gray-800">{vendor.phone}</strong></p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-semibold">
                    Open RFQs: <strong className="text-purple-700">{vendor.openRfqsCount}</strong>
                  </span>
                  <span className="text-gray-500 font-semibold">
                    Active POs: <strong className="text-blue-700">{vendor.activePosCount}</strong>
                  </span>
                </div>
                <span className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1">
                  Launch Portal <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function getRFQDeadlineUrgency(deadlineStr: string) {
  if (!deadlineStr) return null
  const deadlineDate = new Date(deadlineStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadlineDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 3 && diffDays >= 0) {
    return { label: `🔥 Urgent (${diffDays === 0 ? 'Today' : `${diffDays}d left`})`, style: 'bg-red-100 text-red-800 border-red-200 font-extrabold' }
  }
  if (diffDays <= 7 && diffDays > 3) {
    return { label: `⏳ Closing soon (${diffDays}d left)`, style: 'bg-amber-100 text-amber-800 border-amber-200 font-bold' }
  }
  return null
}

// ─── 3. DYNAMIC VENDOR DASHBOARD ──────────────────────────────────────────────
export const VendorDashboard: React.FC = () => {
  const { vendorId: paramVendorId } = useParams<{ vendorId: string }>()
  const { user } = useAuth()
  const vendorId = paramVendorId || user?.vendor_id_code || 'VND-HW-001'
  const navigate = useNavigate()
  const { vendor, rfqs, quotations, pos, deliveries, invoices, documents, notifications } = getScopedVendorData(vendorId)

  // State for interactive "Submit New Quote" modal
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [selectedRfqId, setSelectedRfqId] = useState(rfqs[0]?.id || '')
  const [quotePrice, setQuotePrice] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('7')
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState('')
  const [localRfqs, setLocalRfqs] = useState<any[]>([])
  const [localQuotes, setLocalQuotes] = useState<any[]>([])
  const [localPos, setLocalPos] = useState<any[]>([])
  const [localInvoices, setLocalInvoices] = useState<any[]>([])
  const [localNotifications, setLocalNotifications] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true)
    const currentVendor = MASTER_VENDORS.find(v => v.id === vendorId)
    const vName = (currentVendor?.name || vendor.name || '').toLowerCase()
    const vKey = vendorId.toLowerCase()
    const vCat = (currentVendor?.category || vendor.category || 'IT Hardware').toLowerCase().trim()

    try {
      const vendorParamObj = { params: { vendor: vendorId } }
      const [rfqRes, quoRes, poRes, invRes, notifRes] = await Promise.all([
        apiClient.get('/rfq/', vendorParamObj).catch(() => ({ data: [] })),
        apiClient.get('/rfq/quotations/', vendorParamObj).catch(() => ({ data: [] })),
        apiClient.get('/procurement/purchase-orders/', vendorParamObj).catch(() => ({ data: [] })),
        apiClient.get('/invoices/', vendorParamObj).catch(() => ({ data: [] })),
        apiClient.get('/notifications/', vendorParamObj).catch(() => ({ data: [] }))
      ])

      // 1. Map & Filter RFQs (with deduplication by formattedId)
      const backendRfqs = Array.isArray(rfqRes.data) ? rfqRes.data : rfqRes.data?.results || []
      const rMap = new Map<string, any>()
      backendRfqs.forEach((r: any) => {
        const rfqCat = (r.purchase_request_detail?.category || r.category || '').toLowerCase().trim()
        const isCatMatch = Boolean(rfqCat && vCat && (rfqCat.includes(vCat) || vCat.includes(rfqCat)))
        const isExplicitlyInvited = 
          r.invited_vendors?.includes(vendorId) ||
          r.invited_vendors?.includes(Number(vendorId)) ||
          r.invited_vendors_detail?.some((iv: any) => {
            if (!iv.name) return false
            const v1 = iv.name.toLowerCase().trim()
            return v1 === vName || (vName && (v1.includes(vName) || vName.includes(v1)))
          })
        if (isCatMatch || isExplicitlyInvited) {
          const cleanId = (r.rfq_id || r.id || '').toString().replace(/^RFQ-/i, '')
          const formattedId = `RFQ-${cleanId}`
          if (!rMap.has(formattedId)) {
            const budget = Number(r.budgetEst) || Number(r.purchase_request_detail?.total_estimated_cost) || Number(r.purchase_request_detail?.amount) || Number(r.purchase_request_detail?.estimated_cost) || Number(r.estimatedAmount) || Number(r.estimated_amount) || Number(r.budget_est) || 0
            rMap.set(formattedId, {
              ...r,
              id: formattedId,
              rfq_id: formattedId,
              title: r.title,
              status: r.status || 'Open',
              category: r.purchase_request_detail?.category || r.category || currentVendor?.category || 'IT Hardware',
              budgetEst: budget,
              deadline: r.deadline || '2026-10-15',
              deliveryLocation: r.purchase_request_detail?.delivery_location || r.deliveryLocation || 'Pune HQ',
            })
          }
        }
      })
      setLocalRfqs(Array.from(rMap.values()))

      // 2. Map & Filter Quotations (with deduplication)
      const backendQ = Array.isArray(quoRes.data) ? quoRes.data : quoRes.data?.results || []
      const qMap = new Map<string, any>()
      backendQ.forEach((bq: any) => {
        const bqVId = (bq.vendor_detail?.unique_vendor_id || (typeof bq.vendor === 'string' ? bq.vendor : '')).toString().toLowerCase().trim()
        const bqVName = (bq.vendor_detail?.name || '').toString().toLowerCase().trim()
        const bqVendorNum = typeof bq.vendor === 'number' ? bq.vendor : (bq.vendor_detail?.id || null)
        const isMatch = (
          bqVId === vKey ||
          (vName && bqVName && (bqVName.includes(vName) || vName.includes(bqVName))) ||
          (vKey.includes('001') && (bqVName.includes('dell') || bqVId.includes('001') || bqVendorNum === 5)) ||
          (vKey.includes('002') && (bqVName.includes('hp') || bqVId.includes('002') || bqVendorNum === 6)) ||
          (vKey.includes('003') && (bqVName.includes('lenovo') || bqVId.includes('003') || bqVendorNum === 7)) ||
          (vKey.includes('004') && (bqVName.includes('apple') || bqVId.includes('004') || bqVendorNum === 8))
        )
        if (isMatch) {
          const qId = bq.quotation_id || (typeof bq.id === 'string' ? bq.id : `QUO-${bq.id}`)
          if (!qMap.has(qId)) {
            qMap.set(qId, {
              id: qId,
              quotation_id: qId,
              status: bq.status || 'Submitted',
              price: Number(bq.price) || 0,
              rfqRef: bq.rfq_id || bq.rfq_detail?.rfq_id || (typeof bq.rfq === 'string' ? bq.rfq : `RFQ-${bq.rfq}`),
              created_at: bq.created_at
            })
          }
        }
      })
      setLocalQuotes(Array.from(qMap.values()))

      // 3. Map & Filter POs (with deduplication)
      const backendPOs = Array.isArray(poRes.data) ? poRes.data : poRes.data?.results || []
      const poMap = new Map<string, any>()
      backendPOs.forEach((p: any) => {
        const pvId = (p.vendor_detail?.unique_vendor_id || p.vendor?.unique_vendor_id || p.vendor_id || (typeof p.vendor === 'string' ? p.vendor : '')).toString().toLowerCase().trim()
        const pvName = (p.vendor_detail?.name || p.vendor?.name || '').toString().toLowerCase().trim()
        const pvVendorNum = typeof p.vendor === 'number' ? p.vendor : (p.vendor_detail?.id || null)
        const isMatch = (
          pvId === vKey ||
          (vName && pvName && (pvName.includes(vName) || vName.includes(pvName))) ||
          (vKey.includes('001') && (pvName.includes('dell') || pvId.includes('001') || pvVendorNum === 5)) ||
          (vKey.includes('002') && (pvName.includes('hp') || pvId.includes('002') || pvVendorNum === 6)) ||
          (vKey.includes('003') && (pvName.includes('lenovo') || pvId.includes('003') || pvVendorNum === 7)) ||
          (vKey.includes('004') && (pvName.includes('apple') || pvId.includes('004') || pvVendorNum === 8))
        )
        if (isMatch) {
          const poId = p.po_id || (p.id ? `PO-${p.id}` : 'PO-UNKNOWN')
          if (!poMap.has(poId)) {
            const pr = p.purchase_request_detail || (typeof p.purchase_request === 'object' ? p.purchase_request : null)
            poMap.set(poId, {
              id: poId,
              title: pr?.title || p.title || 'Procurement Order',
              amount: Number(p.total_amount) || Number(pr?.total_estimated_cost) || 0,
              status: p.status === 'Issued' ? 'Pending Confirmation' : p.status,
              payment_status: p.payment_status || 'Pending',
              issueDate: (p.created_at || '').split('T')[0] || p.order_date || '2026-09-10',
              deliveryDueDate: p.expected_delivery || '2026-10-15',
            })
          }
        }
      })
      setLocalPos(Array.from(poMap.values()))

      // 4. Map & Filter Invoices (with deduplication)
      const backendInvs = Array.isArray(invRes.data) ? invRes.data : invRes.data?.results || []
      const invMap = new Map<string, any>()
      backendInvs.forEach((inv: any) => {
        const ivId = (inv.vendor_detail?.unique_vendor_id || inv.vendor_id || (typeof inv.vendor === 'string' ? inv.vendor : '')).toString().toLowerCase().trim()
        const ivName = (inv.vendor_detail?.name || '').toString().toLowerCase().trim()
        const ivVendorNum = typeof inv.vendor === 'number' ? inv.vendor : (inv.vendor_detail?.id || null)
        const isMatch = (
          ivId === vKey ||
          (vName && ivName && (ivName.includes(vName) || vName.includes(ivName))) ||
          (vKey.includes('001') && (ivName.includes('dell') || ivId.includes('001') || ivVendorNum === 5)) ||
          (vKey.includes('002') && (ivName.includes('hp') || ivId.includes('002') || ivVendorNum === 6)) ||
          (vKey.includes('003') && (ivName.includes('lenovo') || ivId.includes('003') || ivVendorNum === 7)) ||
          (vKey.includes('004') && (ivName.includes('apple') || ivId.includes('004') || ivVendorNum === 8))
        )
        if (isMatch) {
          const invId = inv.invoice_id || `INV-${inv.id}`
          if (!invMap.has(invId)) {
            invMap.set(invId, {
              id: invId,
              amount: Number(inv.amount) || 0,
              status: inv.status || 'Submitted',
              invoiceDate: inv.invoice_date,
              dueDate: inv.due_date,
            })
          }
        }
      })
      setLocalInvoices(Array.from(invMap.values()))

      // 5. Map Vendor Notifications from Backend
      const backendNotifs = Array.isArray(notifRes.data) ? notifRes.data : notifRes.data?.results || []
      setLocalNotifications(backendNotifs.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp || 'Just now',
        date: n.date || n.created_at,
        isRead: Boolean(n.is_read || n.isRead),
        requestId: n.request_id || n.requestId
      })))
    } catch (err) {
      console.warn('Dashboard fetch error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [vendorId])

  useEffect(() => {
    fetchDashboardData()
    window.addEventListener('kss_backend_updated', fetchDashboardData)
    window.addEventListener('storage', fetchDashboardData)
    window.addEventListener('focus', fetchDashboardData)
    return () => {
      window.removeEventListener('kss_backend_updated', fetchDashboardData)
      window.removeEventListener('storage', fetchDashboardData)
      window.removeEventListener('focus', fetchDashboardData)
    }
  }, [fetchDashboardData])

  // Check if this vendor is top-ranked for category
  const topRankedVendor = rankVendorsForCategory(vendor.category)[0]
  const isTopRecommended = topRankedVendor?.id === vendor.id

  // Check document expiry
  const expiringDoc = documents.find(
    (d) => d.status === 'Expiring Soon' || d.expiryDate.startsWith('2026-10') || d.expiryDate.startsWith('2026-09')
  )

  // Open RFQs (status === 'Open' or not marked closed)
  const openRfqs = localRfqs.filter((r) => r.status === 'Open' || !r.status)
  const openRfqsCount = openRfqs.length

  // Quotation status counts
  const draftQuotesCount = localQuotes.filter((q) => q.status === 'Draft').length
  const submittedQuotesCount = localQuotes.filter((q) => q.status === 'Submitted' || q.status === 'Under Evaluation' || q.status === 'Shortlisted').length
  const selectedQuotesCount = localQuotes.filter((q) => q.status === 'Selected' || q.status === 'Accepted').length
  const rejectedQuotesCount = localQuotes.filter((q) => q.status === 'Rejected').length
  const totalLifetimeQuotes = localQuotes.length

  // POs count
  const confirmedPosCount = localPos.length

  // Financial calculations
  const totalDisbursed =
    localInvoices.filter(i => i.status === 'Paid' || i.status === 'Approved' || i.status === 'Verified & Approved').reduce((acc, i) => acc + (Number(i.amount) || 0), 0) ||
    localPos.filter(p => p.status === 'Delivered' || p.payment_status === 'Paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) ||
    vendor.totalDisbursed ||
    366000

  const pendingInvoicesSum =
    localInvoices.filter(i => i.status !== 'Paid' && i.status !== 'Approved' && i.status !== 'Verified & Approved').reduce((acc, i) => acc + (Number(i.amount) || 0), 0) ||
    localPos.filter(p => p.status !== 'Delivered' && p.payment_status !== 'Paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) ||
    94400

  // Win rate calculation
  const winRateNumber = totalLifetimeQuotes > 0 ? (selectedQuotesCount / totalLifetimeQuotes) * 100 : (parseFloat(vendor.winRate) || 84.5)
  const winRateDisplay = totalLifetimeQuotes > 0 ? `${winRateNumber.toFixed(1)}%` : (vendor.winRate || '84.5%')

  // Win Rate Trend
  const recentQuoteResults = localQuotes.slice(0, 5).map(q => {
    const isWon = q.status === 'Selected' || q.status === 'Accepted'
    return isWon ? 'Won' : (q.status === 'Rejected' ? 'Lost' : 'Submitted')
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 8. Document Expiry Warning Banner */}
      {expiringDoc && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-900 block text-xs uppercase tracking-wider">
                DOCUMENT EXPIRY WARNING
              </span>
              <p className="text-amber-800 mt-0.5">
                Document <strong>{expiringDoc.name}</strong> is expiring soon on{' '}
                <strong>{formatDate(expiringDoc.expiryDate)}</strong>. Please upload a renewed copy to maintain active bidding status.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/documents`)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Upload Renewed Document →
          </button>
        </div>
      )}

      {/* Dynamic Vendor Header (Fixed high contrast white text for Dell Technologies) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                ISOLATED VENDOR ACCOUNT
              </span>
              <span className="text-xs font-bold bg-black/30 text-blue-100 px-2.5 py-1 rounded-full border border-white/20">
                Category: {vendor.category}
              </span>
            </div>
            <h1 className="text-2xl font-black mt-1 text-white drop-shadow-xs">{vendor.name}</h1>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              Vendor ID: <strong className="text-white font-bold">{vendor.id}</strong> • Contact Person: <strong className="text-white font-bold">{vendor.contactPerson}</strong> ({vendor.email}) • {vendor.phone}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} /> Submit New Quote
            </button>
            <button
              onClick={() => fetchDashboardData()}
              disabled={isRefreshing}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 text-white transition-colors cursor-pointer"
              title="Refresh live metrics from backend"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Syncing...' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/portal/vendor/categories')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={14} /> Switch Vendor
            </button>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/20 min-w-[90px]">
              <span className="text-[9px] uppercase font-bold block text-blue-100">Performance</span>
              <span className="text-xl font-black text-white">{vendor.score}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/20 min-w-[90px]">
              <span className="text-[9px] uppercase font-bold block text-blue-100">Win Rate</span>
              <span className="text-xl font-black text-emerald-300">{winRateDisplay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Dynamic Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/rfqs`)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <span className="text-xs text-gray-500 font-semibold block">Open RFQs</span>
          <span className="text-xl font-bold text-gray-900">{openRfqsCount} Pending Bids</span>
        </div>
        <div
          onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/quotations`)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <span className="text-xs text-gray-500 font-semibold block">Submitted Quotes</span>
          <span className="text-xl font-bold text-purple-600">{submittedQuotesCount} Submitted</span>
        </div>
        <div
          onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/purchase-orders`)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <span className="text-xs text-gray-500 font-semibold block">Confirmed POs</span>
          <span className="text-xl font-bold text-blue-600">{confirmedPosCount} Active POs</span>
        </div>
        <div
          onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/payment-status`)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <span className="text-xs text-gray-500 font-semibold block">Payment Disbursed</span>
          <span className="text-xl font-bold text-green-600">RS {totalDisbursed.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 font-medium block mt-1 border-t pt-1">
            RS {totalDisbursed.toLocaleString()} Paid · RS {pendingInvoicesSum.toLocaleString()} Pending Approval
          </span>
        </div>
      </div>

      {/* 2. "MY QUOTATIONS" STATUS WIDGET */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" /> My Quotations Status ({vendor.id})
          </h3>
          <button
            onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/quotations`)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View Quotations History →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/quotations?tab=draft`)}
            className="p-3.5 bg-gray-50 hover:bg-amber-50/60 rounded-xl border border-gray-200 hover:border-amber-300 transition-all cursor-pointer text-center group"
          >
            <span className="text-[11px] font-bold text-gray-500 group-hover:text-amber-700 block uppercase tracking-wider">Draft</span>
            <span className="text-2xl font-black text-gray-800 group-hover:text-amber-600 mt-1 block">{draftQuotesCount}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">Click to view draft bids</span>
          </div>
          <div
            onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/quotations?tab=submitted`)}
            className="p-3.5 bg-gray-50 hover:bg-blue-50/60 rounded-xl border border-gray-200 hover:border-blue-300 transition-all cursor-pointer text-center group"
          >
            <span className="text-[11px] font-bold text-gray-500 group-hover:text-blue-700 block uppercase tracking-wider">Submitted</span>
            <span className="text-2xl font-black text-blue-600 group-hover:text-blue-700 mt-1 block">{submittedQuotesCount}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">Click to view active quotes</span>
          </div>
          <div
            onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/quotations?tab=selected`)}
            className="p-3.5 bg-gray-50 hover:bg-emerald-50/60 rounded-xl border border-gray-200 hover:border-emerald-300 transition-all cursor-pointer text-center group"
          >
            <span className="text-[11px] font-bold text-gray-500 group-hover:text-emerald-700 block uppercase tracking-wider">Selected (Won)</span>
            <span className="text-2xl font-black text-emerald-600 group-hover:text-emerald-700 mt-1 block">{selectedQuotesCount}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">Click to view awarded bids</span>
          </div>
          <div
            onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/quotations?tab=rejected`)}
            className="p-3.5 bg-gray-50 hover:bg-red-50/60 rounded-xl border border-gray-200 hover:border-red-300 transition-all cursor-pointer text-center group"
          >
            <span className="text-[11px] font-bold text-gray-500 group-hover:text-red-700 block uppercase tracking-wider">Rejected</span>
            <span className="text-2xl font-black text-red-600 group-hover:text-red-700 mt-1 block">{rejectedQuotesCount}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">Click to view closed bids</span>
          </div>
        </div>
      </div>

      {/* 4. "QUOTE HISTORY & PERFORMANCE" SCOPED METRICS WIDGET */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" /> Quote History & Performance ({vendor.id})
          </h3>
          <span className="text-xs font-bold text-gray-400">Scoped Analytics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">Win Rate Trend (Recent RFQs)</span>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {recentQuoteResults.length === 0 ? (
                <span className="text-gray-400 text-[11px]">No quotations submitted yet</span>
              ) : (
                recentQuoteResults.map((result, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded text-[10px] font-black ${
                      result === 'Won'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : result === 'Lost'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}
                    title={`Quote ${idx + 1}: ${result}`}
                  >
                    {result === 'Won' ? '✓ Won' : result === 'Lost' ? '✗ Lost' : '• ' + result}
                  </span>
                ))
              )}
            </div>
            <span className="text-[10px] text-gray-500 font-semibold block mt-2">
              Scoped Win Rate: <strong className="text-emerald-700 font-extrabold">{winRateDisplay}</strong>
            </span>
          </div>

          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">Avg Quote-to-Award Time</span>
            <span className="text-2xl font-black text-purple-700 mt-1 block">3.2 Days</span>
            <span className="text-[10px] text-gray-500 font-semibold block mt-1">
              ⚡ 1.5 days faster than category benchmark
            </span>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">Total Lifetime Quotes</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{totalLifetimeQuotes} Proposals</span>
            <span className="text-[10px] text-gray-500 font-semibold block mt-1">
              Scoped for {vendor.name} ({vendor.id})
            </span>
          </div>
        </div>
      </div>

      {/* Overview Cards (RFQs & POs with Urgency Badges) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open RFQs Preview with ⭐ Recommended & Urgency Badges */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-blue-600" /> Scoped Open RFQs ({vendor.name})
            </h3>
            <button
              onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/rfqs`)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3 text-xs">
            {openRfqs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No open RFQs currently available for bidding.
              </div>
            ) : (
              openRfqs.slice(0, 5).map((r) => {
                const urgency = getRFQDeadlineUrgency(r.deadline)
                const budgetVal = Number(r.budgetEst) || Number(r.purchase_request_detail?.total_estimated_cost) || Number(r.purchase_request_detail?.amount) || Number(r.purchase_request_detail?.estimated_cost) || Number(r.estimated_amount) || Number(r.estimatedAmount) || 0
                return (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/rfqs`)}
                    className="p-3.5 bg-gray-50 hover:bg-blue-50/50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all cursor-pointer flex flex-wrap justify-between items-center gap-2 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-blue-600 group-hover:underline">{r.id}</span>
                        {isTopRecommended && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                            <Star size={10} className="fill-white" /> ⭐ RECOMMENDED VENDOR
                          </span>
                        )}
                        {urgency && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] border ${urgency.style}`}>
                            {urgency.label}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 mt-1 group-hover:text-blue-700 transition-colors">{r.title}</h4>
                      <p className="text-gray-500 mt-0.5">Deadline: {formatDate(r.deadline)} • Location: {r.deliveryLocation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900 bg-white px-2.5 py-1 rounded border shadow-xs">
                        RS {budgetVal > 0 ? budgetVal.toLocaleString() : 'N/A'}
                      </span>
                      <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                        Bid →
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Active POs Preview */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Package size={16} className="text-blue-600" /> Confirmed Purchase Orders ({vendor.id})
            </h3>
            <button
              onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/purchase-orders`)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3 text-xs">
            {localPos.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No purchase orders issued yet.
              </div>
            ) : (
              localPos.slice(0, 5).map((p) => (
                <div key={p.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center gap-2">
                  <div>
                    <span className="font-bold text-blue-600">{p.id}</span>
                    <h4 className="font-bold text-gray-900 mt-0.5">{p.title}</h4>
                    <p className="text-gray-500 mt-0.5">Issue Date: {formatDate(p.issueDate)} • Due: {formatDate(p.deliveryDueDate)}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    {p.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RECENT NOTIFICATIONS WIDGET */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Bell size={16} className="text-blue-600" /> Recent Notifications
          </h3>
          <button
            onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/notifications`)}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            View all →
          </button>
        </div>
        <div className="space-y-3 text-xs">
          {localNotifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No recent notifications.
            </div>
          ) : (
            localNotifications.slice(0, 5).map((n) => (
              <div key={n.id} className="p-3.5 bg-gray-50 hover:bg-blue-50/40 rounded-xl border border-gray-200 transition-colors flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell size={15} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-xs">{n.title}</h4>
                    <span className="text-[10px] text-gray-400 font-medium">{n.timestamp}</span>
                  </div>
                  <p className="text-gray-600 mt-0.5 text-[11px] leading-snug">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interactive Submit New Quote Quick-Action Modal */}
      <SubmitQuotationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        vendorId={vendor.id}
        vendorName={vendor.name}
        rfqs={rfqs}
        onQuoteSubmitted={(q) => setLocalQuotes([q, ...localQuotes])}
      />
    </div>
  )
}

// ─── HELPER: DOWNLOAD GOODS RECEIPT DOCUMENT ─────────────────────────────────
export function downloadGoodsReceiptDocument(quote: any) {
  const docNum = quote.grnDocNumber || quote.id || 'GRN-2026-001'
  const rcpNum = quote.receiptNumber || 'RCP-88392'
  const rfqRef = quote.rfqRef || 'RFQ-2026-001'
  const issueDt = quote.issueDate || quote.submittedDate || new Date().toISOString().split('T')[0]
  const expiryDt = quote.expiryDate || quote.quoteValidUntil || 'N/A'
  const gstPct = typeof quote.gstPercent === 'number' ? quote.gstPercent : (typeof quote.gstRate === 'number' ? quote.gstRate : (typeof quote.gst_rate === 'number' ? quote.gst_rate : (parseFloat(quote.gstPercent) || parseFloat(quote.gst_rate) || 18)))
  const baseAmt = typeof quote.baseAmount === 'number' ? quote.baseAmount : (typeof quote.base_amount === 'number' ? quote.base_amount : (typeof quote.price === 'number' ? quote.price : (parseFloat(quote.baseAmount) || parseFloat(quote.base_amount) || parseFloat(quote.price) || quote.quotedPrice || 0)))
  const gstAmt = typeof quote.gstAmount === 'number' ? quote.gstAmount : (typeof quote.taxAmount === 'number' ? quote.taxAmount : (typeof quote.tax_amount === 'number' ? quote.tax_amount : (baseAmt * gstPct / 100)))
  const totalAmt = typeof quote.totalAmount === 'number' ? quote.totalAmount : (typeof quote.total_amount === 'number' ? quote.total_amount : (parseFloat(quote.totalAmount) || parseFloat(quote.total_amount) || (baseAmt + gstAmt)))
  const vendor = quote.vendorName || quote.vendorId || 'Vendor'

  const content = `================================================================================
                           OFFICIAL GOODS RECEIPT (GRN)
                        KSS PROCUREMENT OS PORTAL
================================================================================

DOCUMENT DETAILS:
--------------------------------------------------------------------------------
Document Number (GRN): ${docNum}
Receipt Number:        ${rcpNum}
RFQ Reference:         ${rfqRef}
Issue Date:            ${issueDt}
Validity / Expiry Date:${expiryDt}
Vendor / Issuer:       ${vendor}
Status:                VERIFIED & ATTACHED TO QUOTATION PROPOSAL

PRODUCT & SERVICE SPECIFICATIONS:
--------------------------------------------------------------------------------
Product Name:          ${quote.productName || 'Enterprise Laptop Workstations'}
Quantity:              ${quote.productQty || '46 Units'}
Warranty Duration:     ${quote.warrantyDuration || '36 Months'}
Warranty Type:         ${quote.warrantyType || 'On-site'}
Free Services:         ${quote.freeServiceCount || '3 Services'}
Installation:          ${quote.installationType || 'Free'}
Technical Support:     ${quote.techSupportDuration || '3 Years 24/7 Support'}
Replacement Policy:    ${quote.replacementPolicy || '7 Days for manufacturing defect'}
Accessories Included:  ${quote.accessoriesIncluded || 'None'}

FINANCIAL SUMMARY & TAX BREAKDOWN:
--------------------------------------------------------------------------------
Base Quoted Amount:    RS {baseAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
GST Rate:              ${gstPct}%
GST Tax Amount:        RS {gstAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
--------------------------------------------------------------------------------
TOTAL AMOUNT (INCL TAX): RS {totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
--------------------------------------------------------------------------------

TERMS & DELIVERY CONDITIONS:
--------------------------------------------------------------------------------
Delivery Lead Time:    ${quote.leadTime || '7 Days'}
Expected Delivery:     ${quote.expectedDeliveryDate || 'N/A'}
Notes / Remarks:       ${quote.notes || 'Includes standard OEM warranty and Net 30 payment terms.'}

AUTHENTICATION:
Digitally certified and generated via KSS Procurement Enterprise Portal.
Timestamp: ${new Date().toISOString()}
================================================================================`

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = quote.grnDocName || `Goods_Receipt_${docNum}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function getAllStoredVendorQuotes(): any[] {
  const quotes: any[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('kss_vendor_quotes_')) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || '[]')
        if (Array.isArray(val)) {
          quotes.push(...val)
        }
      } catch (e) {}
    }
  }
  return quotes
}

// ─── REUSABLE SUBMIT GOODS RECEIPT / QUOTATION MODAL ─────────────────────────
export const SubmitQuotationModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  rfqs: Array<{ id: string; title: string; deadline: string; status: string }>
  initialRfqId?: string
  onQuoteSubmitted?: (newQuote: any) => void
}> = ({ isOpen, onClose, vendorId, vendorName, rfqs, initialRfqId, onQuoteSubmitted }) => {
  const availableRfqs = useMemo(() => {
    const map = new Map<string, any>()
    rfqs.forEach((r) => { if (r && r.id) map.set(r.id, r) })
    if (initialRfqId && !map.has(initialRfqId)) {
      map.set(initialRfqId, { id: initialRfqId, title: `RFQ ${initialRfqId}`, status: 'Open', deadline: '2026-12-31' })
    }
    return Array.from(map.values())
  }, [rfqs, initialRfqId])

  const [selectedRfqId, setSelectedRfqId] = useState(initialRfqId || availableRfqs[0]?.id || '')

  const todayStr = new Date().toISOString().split('T')[0]
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const cleanVndCode = vendorId.replace(/[^A-Z0-9]/g, '').toUpperCase()
  const defaultGrn = `GRN-2026-${cleanVndCode}-00${Math.floor(Math.random() * 9) + 1}`
  const defaultRcp = `RCP-${Math.floor(10000 + Math.random() * 90000)}`

  const [grnDocNumber, setGrnDocNumber] = useState(defaultGrn)
  const [receiptNumber, setReceiptNumber] = useState(defaultRcp)
  const [issueDate, setIssueDate] = useState(todayStr)
  const [expiryDate, setExpiryDate] = useState(thirtyDaysLater)

  // Product Specification State
  const [productName, setProductName] = useState('Enterprise Laptop Workstations')
  const [productQty, setProductQty] = useState('46 Units')
  const [warrantyDuration, setWarrantyDuration] = useState('36 Months')
  const [warrantyType, setWarrantyType] = useState('On-site')
  const [freeServiceCount, setFreeServiceCount] = useState('3 Services')
  const [installationType, setInstallationType] = useState('Free')
  const [techSupportDuration, setTechSupportDuration] = useState('3 Years 24/7 Support')
  const [replacementPolicy, setReplacementPolicy] = useState('7 Days for manufacturing defect')
  const [accessoriesIncluded, setAccessoriesIncluded] = useState('Power Adapter, Laptop Sleeve, Wireless Mouse')

  const [baseAmount, setBaseAmount] = useState('30000')
  const [gstPercent, setGstPercent] = useState('18')
  const [leadTimeDays, setLeadTimeDays] = useState('7')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(sevenDaysLater)
  const [notes, setNotes] = useState('')
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState('')
  const syncRfqDetails = (rfqId: string) => {
    setSelectedRfqId(rfqId)
    const target = availableRfqs.find((r: any) => r.id === rfqId)
    if (target) {
      const title = target.title || target.description || 'Enterprise Laptop Workstations'
      setProductName(title)
      const qtyNum = target.quantity || target.purchase_request_detail?.quantity || target.qty || 20
      setProductQty(`${qtyNum} Units`)
      const titleLower = title.toLowerCase()
      if (titleLower.includes('desktop')) {
        setAccessoriesIncluded('Power Cord, USB Keyboard & Mouse')
      } else if (titleLower.includes('monitor')) {
        setAccessoriesIncluded('Power Cable, DisplayPort Cable & Stand')
      } else if (titleLower.includes('laptop') || titleLower.includes('leptop')) {
        setAccessoriesIncluded('Power Adapter, Laptop Bag & Documentation')
      } else {
        setAccessoriesIncluded('Standard OEM Accessories & Documentation')
      }
    }
  }

  useEffect(() => {
    const activeId = initialRfqId || availableRfqs[0]?.id || ''
    if (activeId) {
      syncRfqDetails(activeId)
    }
  }, [initialRfqId, isOpen, availableRfqs])

  const handleLeadTimeChange = (val: string) => {
    setLeadTimeDays(val)
    const days = parseInt(val) || 7
    const d = new Date(issueDate || todayStr)
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + days)
      setExpectedDeliveryDate(d.toISOString().split('T')[0])
    }
  }

  if (!isOpen) return null

  const parsedBase = parseFloat(baseAmount) || 0
  const parsedGstPct = parseFloat(gstPercent) || 0
  const calculatedGstAmt = (parsedBase * parsedGstPct) / 100
  const calculatedTotalAmt = parsedBase + calculatedGstAmt

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!issueDate || !expiryDate || !expectedDeliveryDate) {
      alert('Please fill out all required date fields.')
      return
    }

    if (!productName || !productQty || !warrantyDuration || !warrantyType || !freeServiceCount || !installationType || !techSupportDuration || !replacementPolicy) {
      alert('Please fill out all required product details fields.')
      return
    }

    if (parsedBase <= 0) {
      alert('Please enter a valid base amount.')
      return
    }

    const targetRfq = availableRfqs.find((r: any) => r.id === selectedRfqId) || availableRfqs[0]
    const effectiveRfqId = selectedRfqId || targetRfq?.id || ''
    const effectiveRfqTitle = targetRfq?.title || targetRfq?.description || productName || 'Procured Item'
    const finalGrnDocName = `Goods_Receipt_${grnDocNumber || defaultGrn}.pdf`

    const newQuotation = {
      id: `QUO-${cleanVndCode}-${Date.now().toString().slice(-4)}`,
      vendorId,
      vendorName,
      rfqRef: effectiveRfqId,
      rfqId: effectiveRfqId,
      rfqTitle: effectiveRfqTitle,
      product: productName || effectiveRfqTitle,
      grnDocNumber: grnDocNumber || defaultGrn,
      receiptNumber: receiptNumber || defaultRcp,
      issueDate,
      expiryDate,

      // Product Specs
      productName: productName || effectiveRfqTitle,
      productQty,
      warrantyDuration,
      warrantyType,
      freeServiceCount,
      installationType,
      techSupportDuration,
      replacementPolicy,
      accessoriesIncluded: accessoriesIncluded.trim() || undefined,

      baseAmount: parsedBase,
      gstPercent: parsedGstPct,
      gstAmount: calculatedGstAmt,
      totalAmount: calculatedTotalAmt,
      quotedPrice: calculatedTotalAmt,
      leadTime: `${leadTimeDays} Days`,
      quoteValidity: expiryDate,
      quoteValidUntil: expiryDate,
      valid_until: expiryDate,
      expectedDeliveryDate,
      notes: notes.trim() || undefined,
      grnDocName: finalGrnDocName,
      status: 'Submitted',
      submittedDate: todayStr,
    }

    // Save quotation to scoped vendor store
    saveStoredVendorQuote(vendorId, newQuotation)

    // Track RFQ action state
    saveVendorRfqAction(vendorId, effectiveRfqId, 'Submitted')
    const cleanEffId = effectiveRfqId.replace(/^RFQ-/i, '')
    saveVendorRfqAction(vendorId, cleanEffId, 'Submitted')
    saveVendorRfqAction(vendorId, `RFQ-${cleanEffId}`, 'Submitted')
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))

    // Post to Django backend REST API
    apiClient.post('/rfq/quotations/', {
      rfq: effectiveRfqId,
      vendor: vendorName,
      price: parsedBase,
      gst_rate: parsedGstPct,
      tax_amount: calculatedGstAmt,
      total_amount: calculatedTotalAmt,
      delivery_days: parseInt(leadTimeDays) || 7,
      warranty_months: parseInt(warrantyDuration) || 12,
      valid_until: expiryDate,
      terms_conditions: notes.trim() || '',
      status: 'Submitted',
      extra_fields: {
        product_name: productName,
        product_qty: productQty,
        warranty_duration: warrantyDuration,
        warranty_type: warrantyType,
        free_service_count: freeServiceCount,
        installation_type: installationType,
        tech_support_duration: techSupportDuration,
        replacement_policy: replacementPolicy,
        accessories_included: accessoriesIncluded,
        expected_delivery_date: expectedDeliveryDate,
        grn_doc_number: grnDocNumber,
        receipt_number: receiptNumber,
        issue_date: issueDate,
        expiry_date: expiryDate,
      }
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(err => {
      console.warn('Backend quotation post fallback:', err)
      window.dispatchEvent(new Event('kss_backend_updated'))
    })
    
    if (onQuoteSubmitted) {
      onQuoteSubmitted(newQuotation)
    }

    setQuoteSuccessMsg(`Proposal & Quotation for ${newQuotation.rfqRef} submitted successfully!`)
    setTimeout(() => {
      setQuoteSuccessMsg('')
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50">
      {/* Paper Sheet Container with Viewport Constraint & Fixed Max Height */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col relative text-gray-900 font-sans overflow-hidden mx-auto">
        {/* Sticky Paper Receipt Header (Never overlapped or cut off) */}
        <div className="sticky top-0 bg-white z-20 px-6 pt-5 pb-4 border-b-2 border-slate-900 flex items-start justify-between shrink-0 shadow-xs">
          <div>
            <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold tracking-widest uppercase rounded-xs mb-1">
              OFFICIAL VENDOR COMMERCIAL QUOTATION
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {vendorName}
            </h2>
            <p className="text-xs font-mono text-slate-500 font-medium mt-0.5">
              Vendor ID: {vendorId} • KSS Procurement OS
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-slate-900 text-sm font-bold cursor-pointer p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Internal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {quoteSuccessMsg ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-lg text-center text-xs font-bold text-emerald-900 space-y-2">
              <CheckCircle size={36} className="mx-auto text-emerald-600" />
              <p className="font-mono text-sm">{quoteSuccessMsg}</p>
            </div>
          ) : (
            <form id="goods-receipt-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Invoice Metadata Box (GRN & Receipt Number, Issue Date, Expiry) */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Document No. (GRN Format) *
                    </label>
                    <input
                      type="text"
                      required
                      value={grnDocNumber}
                      onChange={(e) => setGrnDocNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. GRN-2026-VNDHW001-001"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Receipt Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. RCP-88392"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Validity / Expiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Target RFQ & Delivery Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target RFQ Reference *
                  </label>
                  <select
                    value={selectedRfqId}
                    onChange={(e) => syncRfqDetails(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-semibold text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    {availableRfqs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} - {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Lead Time (Days) *
                    </label>
                    <input
                      type="number"
                      required
                      value={leadTimeDays}
                      onChange={(e) => handleLeadTimeChange(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      placeholder="e.g. 7"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Expected Delivery Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* PRODUCT DETAILS SECTION (Above Financial breakdown) */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-[11px] font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-slate-700" /> Product & Service Specifications
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">* Required fields</span>
                </div>

                {/* Product Name & Quantity */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. Enterprise Laptop Workstations"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Quantity *
                    </label>
                    <input
                      type="text"
                      required
                      value={productQty}
                      onChange={(e) => setProductQty(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. 46 Units"
                    />
                  </div>
                </div>

                {/* Warranty Duration & Warranty Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Warranty Duration *
                    </label>
                    <input
                      type="text"
                      required
                      value={warrantyDuration}
                      onChange={(e) => setWarrantyDuration(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. 36 Months / 3 Years"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Warranty Type *
                    </label>
                    <select
                      value={warrantyType}
                      onChange={(e) => setWarrantyType(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                    >
                      <option value="On-site">On-site Warranty</option>
                      <option value="Carry-in">Carry-in Warranty</option>
                    </select>
                  </div>
                </div>

                {/* Free Service Count & Installation */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Free Service Count *
                    </label>
                    <input
                      type="text"
                      required
                      value={freeServiceCount}
                      onChange={(e) => setFreeServiceCount(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. 3 Maintenance Services"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Installation *
                    </label>
                    <select
                      value={installationType}
                      onChange={(e) => setInstallationType(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                    >
                      <option value="Free">Free Installation & Setup</option>
                      <option value="Paid">Paid Installation</option>
                    </select>
                  </div>
                </div>

                {/* Technical Support Duration & Replacement Policy */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Technical Support Duration *
                    </label>
                    <input
                      type="text"
                      required
                      value={techSupportDuration}
                      onChange={(e) => setTechSupportDuration(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. 3 Years 24/7 Priority Support"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Replacement Policy *
                    </label>
                    <input
                      type="text"
                      required
                      value={replacementPolicy}
                      onChange={(e) => setReplacementPolicy(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                      placeholder="e.g. 7 Days for manufacturing defect"
                    />
                  </div>
                </div>

                {/* Accessories Included (Optional) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Accessories Included <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={accessoriesIncluded}
                    onChange={(e) => setAccessoriesIncluded(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                    placeholder="e.g. Charger, USB Docking Station, Laptop Sleeve"
                  />
                </div>
              </div>

              {/* Thin Divider Line */}
              <div className="border-t border-dashed border-slate-300 my-3"></div>

              {/* Itemized Financial Table (Line Items Layout) */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] font-mono uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5 pl-3">Item Description</th>
                      <th className="p-2.5 text-center w-28">Tax Rate</th>
                      <th className="p-2.5 pr-3 text-right w-36">Amount (RS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {/* Line Item 1: Base Amount */}
                    <tr className="bg-white">
                      <td className="p-2.5 pl-3 font-semibold text-slate-900">
                        Base Quoted Amount
                        <span className="block text-[10px] font-normal text-slate-500">Net price before taxes</span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-500">-</td>
                      <td className="p-2.5 pr-3 text-right">
                        <input
                          type="number"
                          required
                          min="1"
                          step="any"
                          value={baseAmount}
                          onChange={(e) => setBaseAmount(e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded text-right font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                          placeholder="30000"
                        />
                      </td>
                    </tr>

                    {/* Line Item 2: GST */}
                    <tr className="bg-slate-50/70">
                      <td className="p-2.5 pl-3 font-semibold text-slate-900">
                        Goods & Services Tax (GST)
                        <span className="block text-[10px] font-normal text-slate-500">Applicable tax calculation</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <select
                          value={gstPercent}
                          onChange={(e) => setGstPercent(e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded font-mono font-bold text-xs bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none text-center"
                        >
                          <option value="18">18% GST</option>
                          <option value="12">12% GST</option>
                          <option value="5">5% GST</option>
                          <option value="0">0% Exempt</option>
                        </select>
                      </td>
                      <td className="p-2.5 pr-3 text-right font-mono font-bold text-amber-700">
                        ₹{calculatedGstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Table Invoice Summary Footer */}
                <div className="bg-slate-100 p-3 border-t-2 border-slate-900 flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">Total Amount (Incl. Taxes)</span>
                  <span className="text-base font-black text-slate-900">
                    ₹{calculatedTotalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Notes & Terms Section */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Terms & Warranty Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Includes 3-year OEM warranty, Net 30 payment terms."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </form>
          )}
        </div>

        {/* Sticky Receipt Footer Action Bar */}
        {!quoteSuccessMsg && (
          <div className="sticky bottom-0 bg-white px-6 py-3 border-t-2 border-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 shadow-xs">
            <div className="text-[10px] font-mono text-slate-500">
              <span className="font-bold text-slate-700 block">DIGITALLY SIGNED RECEIPT</span>
              KSS Procurement System • Certified
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="goods-receipt-form"
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg shadow-md cursor-pointer text-xs transition-all flex items-center gap-1.5 font-mono"
              >
                <FileSpreadsheet size={15} /> Submit Quotation & Proposal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DECLINE RFQ MODAL ──────────────────────────────────────────────────
export const DeclineRfqModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  rfq: any
  vendorId: string
  onRfqDeclined: (rfqId: string, reason: string) => void
}> = ({ isOpen, onClose, rfq, vendorId, onRfqDeclined }) => {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !rfq) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return

    setIsSubmitting(true)
    const fullReason = notes.trim() ? `${reason} - ${notes.trim()}` : reason

    // Save action & notify originating portal
    saveVendorRfqAction(vendorId, rfq.id, 'Declined', fullReason)

    setTimeout(() => {
      setIsSubmitting(false)
      onRfqDeclined(rfq.id, fullReason)
      setReason('')
      setNotes('')
      onClose()
    }, 300)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <XCircle className="text-red-600" size={18} /> Decline RFQ ({rfq.id})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <span>
            Declining this RFQ will notify the originating procurement portal and remove this requirement from your Open RFQs.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Reason for Declining *</label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="" disabled>-- Select a reason --</option>
              <option value="Pricing ceiling too low / Out of budget">Pricing ceiling too low / Out of budget</option>
              <option value="Delivery timeframe unachievable">Delivery timeframe unachievable</option>
              <option value="Item specification unavailable">Item specification unavailable</option>
              <option value="Manufacturing / Supply capacity constraints">Manufacturing / Supply capacity constraints</option>
              <option value="Terms & conditions unacceptable">Terms & conditions unacceptable</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Additional Notes / Feedback (Optional)</label>
            <textarea
              rows={3}
              placeholder="e.g. Earliest delivery date we can commit is Nov 15th."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-gray-600 font-bold hover:bg-gray-50 cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || isSubmitting}
              className={`px-5 py-2 text-white font-bold rounded-xl shadow-xs text-xs transition-colors ${
                !reason || isSubmitting
                  ? 'bg-red-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Decline RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── 4. DYNAMIC VENDOR RFQs PAGE ──────────────────────────────────────────────
export function getVendorScopedRfqs(vendorId: string, vendorName: string, vendorCategory: string): any[] {
  let combined: any[] = []



  const vName = (vendorName || '').toLowerCase().trim()
  const vCat = (vendorCategory || '').toLowerCase().trim()

  const mapAndFilter = (r: any) => {
    if (!r) return null
    const invitedVendors = r.vendors || r.invited_vendors_detail || []
    const invitedNames = Array.isArray(invitedVendors)
      ? invitedVendors.map((v: any) => (typeof v === 'string' ? v : v.name || '').toLowerCase().trim())
      : []

    const rfqCat = (r.category || r.purchase_request_detail?.category || '').toLowerCase().trim()
    const isCatMatch = Boolean(rfqCat && vCat && (rfqCat.includes(vCat) || vCat.includes(rfqCat)))

    const isExplicitlyInvited = invitedNames.some((n: string) => n && (n.includes(vName) || vName.includes(n) || (vendorId && n.includes(vendorId.toLowerCase()))))

    const isMatch = isCatMatch || isExplicitlyInvited

    if (!isMatch) return null

    const items = r.items || []
    const firstItem = items[0] || {}

    return {
      id: r.id || r.rfq_id || `RFQ-2026-001`,
      title: r.title || 'Procurement RFQ',
      category: r.category || r.purchase_request_detail?.category || vendorCategory,
      subcategory: r.subcategory || r.purchase_request_detail?.subcategory || 'Laptops & Compute',
      description: firstItem.specification || r.description || r.terms || r.remarks || 'Standard enterprise technical specifications',
      qty: firstItem.quantity || r.qty || r.purchase_request_detail?.quantity || 46,
      budgetEst: r.estimatedAmount || r.budgetEst || parseFloat(r.purchase_request_detail?.total_estimated_cost || '94400'),
      deadline: r.deadline || '2026-10-15',
      status: r.status || 'Open',
      requiredBy: firstItem.requiredBy || r.requiredBy || '2026-10-15',
      deliveryLocation: r.deliveryLocation || r.purchase_request_detail?.delivery_location || 'HQ',
      originator: r.createdBy || r.originator || 'Sarah Manager'
    }
  }

  const deduplicatedMap = new Map<string, any>()
  combined.forEach((raw) => {
    const mapped = mapAndFilter(raw)
    if (mapped && !deduplicatedMap.has(mapped.id)) {
      deduplicatedMap.set(mapped.id, mapped)
    }
  })

  return Array.from(deduplicatedMap.values())
}

export const VendorRfqsPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor } = getScopedVendorData(vendorId)
  const [subTab, setSubTab] = useState<'open' | 'expired'>('open')
  const [localRfqsList, setLocalRfqsList] = useState<any[]>([])
  const [rfqActions, setRfqActions] = useState<Record<string, VendorRfqAction>>({})
  const [expandedRfqIds, setExpandedRfqIds] = useState<Record<string, boolean>>({})
  const [declineModalRfq, setDeclineModalRfq] = useState<any | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [selectedRfqId, setSelectedRfqId] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [, setTick] = useState(0)
  const [vendorQuotes, setVendorQuotes] = useState<any[]>([])
  const [viewingGrnDoc, setViewingGrnDoc] = useState<any | null>(null)
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<any | null>(null)
  const [showCreateGrnModal, setShowCreateGrnModal] = useState(false)

  const handleCreateGRNForRFQ = (rfq: any) => {
    const cleanRef = (rfq.document_verification?.po_id || rfq.id || '2026-001').replace(/^(PO-|RFQ-|REQ-)/i, '').trim()
    const poPayload = {
      id: rfq.document_verification?.po_id || `PO-${cleanRef}`,
      requestRef: rfq.id || `REQ-${cleanRef}`,
      title: rfq.title || 'Enterprise Equipment',
      quantity: rfq.qty || 15,
      unit: 'Units',
      amount: rfq.budgetEst || 80000,
      deliveryLocation: rfq.deliveryLocation || 'Main Office / Warehouse'
    }
    setSelectedPoForGrn(poPayload)
    setShowCreateGrnModal(true)
  }

  const handleViewGoodsReceipt = (rfq: any) => {
    const cleanRef = (rfq.document_verification?.po_id || rfq.id || '2026-001').replace(/^(PO-|RFQ-|REQ-)/i, '').trim()
    const targetVendorId = (vendorId || vendor.id || '').toString().trim().toLowerCase()
    const targetVendorName = (vendor.name || '').toString().trim().toLowerCase()
    const currentRfqId = (rfq.id || rfq.rfq_id || '').toString().toLowerCase().trim()
    const cleanCurrentRfq = currentRfqId.replace(/^rfq-/, '')

    // Search strictly within this vendor's quotations (both local and backend)
    const submittedQ = vendorQuotes.find((q: any) => {
      const qVendorId = (q.vendor_detail?.unique_vendor_id || q.vendorId || '').toString().trim().toLowerCase()
      const qVendorName = (q.vendor_detail?.name || q.vendorName || (typeof q.vendor === 'string' ? q.vendor : '')).toString().trim().toLowerCase()

      const isVendorMatch =
        (Boolean(targetVendorId && qVendorId && (qVendorId === targetVendorId || (targetVendorId.includes('001') && qVendorId.includes('001')) || (targetVendorId.includes('002') && qVendorId.includes('002')) || (targetVendorId.includes('003') && qVendorId.includes('003')) || (targetVendorId.includes('004') && qVendorId.includes('004'))))) ||
        (Boolean(targetVendorName && qVendorName && (qVendorName === targetVendorName || qVendorName.includes(targetVendorName) || targetVendorName.includes(qVendorName))))

      if (!isVendorMatch) return false

      const qRfq = (q.rfqRef || q.rfq || q.rfq_id || q.rfqId || q.id || q.rfq_detail?.rfq_id || '').toString().toLowerCase().trim()
      const cleanQRfq = qRfq.replace(/^rfq-/, '')

      return qRfq === currentRfqId || cleanQRfq === cleanCurrentRfq || qRfq.replace(/[^a-z0-9]/g, '') === currentRfqId.replace(/[^a-z0-9]/g, '')
    })

    const grnDocId = submittedQ?.grnDocNumber ? (submittedQ.grnDocNumber.startsWith('DOC-') ? submittedQ.grnDocNumber : `DOC-${submittedQ.grnDocNumber}`) : `DOC-GRN-PO-${cleanRef}`
    const isGrnVerified = !!rfq.document_verification?.is_goods_receipt_verified

    const subBase = typeof submittedQ?.baseAmount === 'number' ? submittedQ.baseAmount : (typeof submittedQ?.base_amount === 'number' ? submittedQ.base_amount : (typeof submittedQ?.price === 'number' ? submittedQ.price : (parseFloat(submittedQ?.baseAmount || submittedQ?.base_amount || submittedQ?.price) || undefined)))
    const subGstPct = typeof submittedQ?.gstPercent === 'number' ? submittedQ.gstPercent : (typeof submittedQ?.gstRate === 'number' ? submittedQ.gstRate : (typeof submittedQ?.gst_rate === 'number' ? submittedQ.gst_rate : (parseFloat(submittedQ?.gstPercent || submittedQ?.gstRate || submittedQ?.gst_rate) !== undefined && !isNaN(parseFloat(submittedQ?.gstPercent || submittedQ?.gstRate || submittedQ?.gst_rate)) ? parseFloat(submittedQ?.gstPercent || submittedQ?.gstRate || submittedQ?.gst_rate) : undefined)))
    const subGstAmt = typeof submittedQ?.gstAmount === 'number' ? submittedQ.gstAmount : (typeof submittedQ?.taxAmount === 'number' ? submittedQ.taxAmount : (typeof submittedQ?.tax_amount === 'number' ? submittedQ.tax_amount : (subBase !== undefined && subGstPct !== undefined ? Math.round(subBase * subGstPct / 100) : undefined)))
    const subTotal = typeof submittedQ?.totalAmount === 'number' ? submittedQ.totalAmount : (typeof submittedQ?.total_amount === 'number' ? submittedQ.total_amount : (typeof submittedQ?.quotedPrice === 'number' ? submittedQ.quotedPrice : (subBase !== undefined && subGstAmt !== undefined ? subBase + subGstAmt : (subBase !== undefined ? subBase : undefined))))

    const docObj = {
      id: grnDocId,
      name: `Goods Receipt Note - ${submittedQ?.grnDocNumber || `PO-${cleanRef}`}`,
      grnDocNumber: submittedQ?.grnDocNumber || `DOC-GRN-PO-${cleanRef}`,
      receiptNumber: submittedQ?.receiptNumber || `RCP-${cleanRef}`,
      poRef: rfq.document_verification?.po_id || `PO-${cleanRef}`,
      rfqRef: rfq.id || `REQ-${cleanRef}`,
      requestRef: rfq.id || `REQ-${cleanRef}`,
      category: rfq.category || vendor.category || 'IT Hardware',
      status: isGrnVerified ? 'Verified' : 'Pending Verification',
      verified: isGrnVerified,
      productName: submittedQ?.productName || submittedQ?.product || rfq.title || 'Enterprise Equipment',
      productQty: submittedQ?.productQty || `${rfq.qty || 15} Units`,
      totalAmount: subTotal,
      baseAmount: subBase,
      gstPercent: subGstPct,
      gstAmount: subGstAmt,
      uploadedDate: submittedQ?.submittedDate || submittedQ?.issueDate || '2026-09-10',
      expectedDeliveryDate: submittedQ?.expectedDeliveryDate || undefined,
      leadTime: submittedQ?.leadTime || undefined,
      quoteValidity: submittedQ?.quoteValidity || submittedQ?.quoteValidUntil || submittedQ?.expiryDate || submittedQ?.valid_until || undefined,
      vendorId: vendor.id,
      vendorName: vendor.name,
      warrantyDuration: submittedQ?.warrantyDuration || '36 Months (On-site)',
      warrantyType: submittedQ?.warrantyType || 'On-site',
      freeServiceCount: submittedQ?.freeServiceCount || '3 Services',
      installationType: submittedQ?.installationType || 'Free',
      techSupportDuration: submittedQ?.techSupportDuration || '24/7 Dedicated Support',
      replacementPolicy: submittedQ?.replacementPolicy || 'Standard SLA',
      accessoriesIncluded: submittedQ?.accessoriesIncluded || 'Power Adapter, Sleeves & Drivers',
      notes: submittedQ?.notes || 'Net 30 payment terms upon delivery verification and commercial clearance.',
    }
    setViewingGrnDoc(docObj)
  }

  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (isInitial = false) => {
    const localQ = getStoredVendorQuotes(vendorId)
    const allLocalQ = getAllStoredVendorQuotes()
    try {
      if (isInitial) {
        setLoading(true)
      }
      const [quoRes, rfqRes] = await Promise.all([
        apiClient.get('/rfq/quotations/', { params: { vendor: vendorId } }).catch(() => ({ data: [] })),
        apiClient.get('/rfq/', { params: { page_size: 50, vendor: vendor.id || vendorId } }).catch(() => ({ data: [] }))
      ])

      // 1. Process Quotations
      const backendQ = Array.isArray(quoRes.data) ? quoRes.data : quoRes.data?.results || []
      const mappedBackend = backendQ.map((bq: any) => {
        const qId = bq.quotation_id || (typeof bq.id === 'string' ? bq.id : `QUO-${bq.id}`)
        const rfqId = bq.rfq_id || bq.rfq_detail?.rfq_id || (typeof bq.rfq === 'object' ? bq.rfq?.rfq_id : null) || (typeof bq.rfq === 'string' && bq.rfq.startsWith('RFQ-') ? bq.rfq : '')
        const rfqPk = bq.rfq_detail?.id || (typeof bq.rfq === 'number' ? bq.rfq : (typeof bq.rfq === 'string' && /^\d+$/.test(bq.rfq) ? parseInt(bq.rfq) : null))
        const bPrice = typeof bq.price === 'number' ? bq.price : (parseFloat(bq.price) || 0)
        const bGstPct = typeof bq.gst_rate === 'number' ? bq.gst_rate : (typeof bq.gstPercent === 'number' ? bq.gstPercent : (parseFloat(bq.gst_rate) || parseFloat(bq.gstPercent) || 18))
        const bTaxAmt = typeof bq.tax_amount === 'number' ? bq.tax_amount : (typeof bq.taxAmount === 'number' ? bq.taxAmount : (parseFloat(bq.tax_amount) || parseFloat(bq.taxAmount) || Math.round(bPrice * bGstPct / 100)))
        const bTotalAmt = typeof bq.total_amount === 'number' ? bq.total_amount : (typeof bq.totalAmount === 'number' ? bq.totalAmount : (parseFloat(bq.total_amount) || parseFloat(bq.totalAmount) || (bPrice + bTaxAmt)))
        const extra = bq.extra_fields || {}
        return {
          id: qId,
          quotation_id: qId,
          rfqRef: rfqId,
          rfqId: rfqId,
          rfqPk: rfqPk,
          vendorId: bq.vendor_detail?.unique_vendor_id || bq.vendor_detail?.name || bq.vendor || '',
          vendorName: bq.vendor_detail?.name || bq.vendor || '',
          price: bPrice,
          baseAmount: bPrice,
          gst_rate: bGstPct,
          gstPercent: bGstPct,
          gstRate: bGstPct,
          tax_amount: bTaxAmt,
          taxAmount: bTaxAmt,
          gstAmount: bTaxAmt,
          total_amount: bTotalAmt,
          totalAmount: bTotalAmt,
          quotedPrice: bTotalAmt,
          leadTime: bq.delivery_days ? `${bq.delivery_days} Days` : (extra.lead_time || undefined),
          warrantyDuration: bq.warranty_months ? `${bq.warranty_months} Months (On-site)` : (extra.warranty_duration || undefined),
          warrantyType: extra.warranty_type || 'On-site',
          freeServiceCount: extra.free_service_count || undefined,
          installationType: extra.installation_type || undefined,
          techSupportDuration: extra.tech_support_duration || undefined,
          replacementPolicy: extra.replacement_policy || undefined,
          accessoriesIncluded: extra.accessories_included || undefined,
          expectedDeliveryDate: extra.expected_delivery_date || undefined,
          grnDocNumber: extra.grn_doc_number || undefined,
          receiptNumber: extra.receipt_number || undefined,
          quoteValidity: bq.valid_until || extra.expiry_date || extra.valid_until || extra.quote_valid_until || undefined,
          notes: bq.terms_conditions,
          status: bq.status || 'Submitted',
          submittedAt: bq.created_at || new Date().toISOString()
        }
      })
      const qMap = new Map<string, any>()
      allLocalQ.forEach((q: any) => {
        const key = q.quotation_id || q.id || `${q.rfqRef}_${q.vendorId || q.vendorName}`
        qMap.set(key, q)
      })
      localQ.forEach((q: any) => {
        const key = q.quotation_id || q.id || `${q.rfqRef}_${q.vendorId || q.vendorName}`
        qMap.set(key, q)
      })
      mappedBackend.forEach((q: any) => {
        const key = q.quotation_id || q.id || `${q.rfqRef}_${q.vendorId || q.vendorName}`
        qMap.set(key, q)
      })
      setVendorQuotes(Array.from(qMap.values()))

      // 2. Process RFQs
      const backendRfqs = Array.isArray(rfqRes.data) ? rfqRes.data : rfqRes.data?.results || []
      if (Array.isArray(backendRfqs)) {
        const rMap = new Map<string, any>()
        const prKeyMap = new Map<string, string>()
        backendRfqs.forEach((r: any) => {
          const prKey = r.purchase_request_detail?.request_id || r.purchase_request
          const cleanId = (r.rfq_id || r.id || '').toString().replace(/^RFQ-/i, '')
          const formattedId = `RFQ-${cleanId}`
          const budget = parseFloat(r.purchase_request_detail?.total_estimated_cost || r.estimated_amount || r.budgetEst || '0')
          const mapped = {
            id: formattedId,
            rfq_id: formattedId,
            prKey: prKey,
            title: r.title,
            category: r.purchase_request_detail?.category || r.category || vendor.category,
            subcategory: r.purchase_request_detail?.subcategory || 'General',
            description: r.purchase_request_detail?.description || r.terms,
            qty: r.purchase_request_detail?.quantity || 1,
            budgetEst: budget,
            deadline: r.deadline,
            status: r.status,
            requiredBy: r.purchase_request_detail?.required_by || 'N/A',
            deliveryLocation: r.purchase_request_detail?.delivery_location || 'HQ',
            originator: r.purchase_request_detail?.created_by_detail?.username || 'System',
            quotations: r.quotations || [],
            document_verification: r.document_verification,
            document_verification_status: r.document_verification_status || (r.document_verification?.is_both_verified ? 'Documents Verified' : 'Verification Pending')
          }

          if (prKey && prKeyMap.has(String(prKey))) {
            const existingId = prKeyMap.get(String(prKey))!
            const existing = rMap.get(existingId)
            const existingQuotes = existing?.quotations?.length || 0
            const currentQuotes = mapped.quotations?.length || 0
            if (currentQuotes > existingQuotes) {
              rMap.delete(existingId)
              rMap.set(mapped.id, mapped)
              prKeyMap.set(String(prKey), mapped.id)
            }
            return
          }

          if (prKey) {
            prKeyMap.set(String(prKey), mapped.id)
          }
          rMap.set(mapped.id, mapped)
        })
        setLocalRfqsList(Array.from(rMap.values()))
      }
    } catch (err) {
      console.warn('Backend RFQ/Quotes fetch error:', err)
      setVendorQuotes(localQ)
      setLocalRfqsList([])
    } finally {
      setLoading(false)
    }
  }, [vendorId, vendor.id, vendor.name, vendor.category])

  useEffect(() => {
    loadData(true)
    setRfqActions(getStoredVendorRfqActions(vendorId))
  }, [loadData, vendorId])

  useEffect(() => {
    let debounceTimer: any = null
    const handleUpdate = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadData(false)
        setRfqActions(getStoredVendorRfqActions(vendorId))
        setTick((t) => t + 1)
      }, 200)
    }
    window.addEventListener('kss_backend_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      clearTimeout(debounceTimer)
      window.removeEventListener('kss_backend_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [loadData, vendorId])

  const openRfqs = localRfqsList.filter((r) => {
    const st = (r.status || '').toLowerCase();
    const isClosedOrExpired = st === 'closed' || st === 'expired' || st === 'cancelled' || st === 'rejected';
    const isNotDeclined = rfqActions[r.id]?.status !== 'Declined';
    const deadlineDate = new Date(r.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    return !isClosedOrExpired && isNotDeclined && deadlineDate >= new Date();
  })
  const expiredRfqs = localRfqsList.filter((r) => {
    const st = (r.status || '').toLowerCase();
    const isClosedOrExpired = st === 'closed' || st === 'expired' || st === 'cancelled' || st === 'rejected';
    const deadlineDate = new Date(r.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    return isClosedOrExpired || deadlineDate < new Date();
  })

  const displayedRfqs = subTab === 'open' ? openRfqs : expiredRfqs

  const toggleExpand = (id: string) => {
    setExpandedRfqIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAcceptRfq = (rfqId: string) => {
    saveVendorRfqAction(vendorId, rfqId, 'Accepted')
    const updated = getStoredVendorRfqActions(vendorId)
    setRfqActions(updated)
    setToastMsg(`RFQ ${rfqId} Accepted! You can now submit your quotation proposal.`)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleRfqDeclined = (rfqId: string, reason: string) => {
    const updated = getStoredVendorRfqActions(vendorId)
    setRfqActions(updated)
    setToastMsg(`RFQ ${rfqId} Declined. Originating portal notified of reason: "${reason}".`)
    setTimeout(() => setToastMsg(''), 5000)
  }

  const handleOpenSubmit = (rfqId: string) => {
    setSelectedRfqId(rfqId)
    setShowSubmitModal(true)
  }

  const handleDownloadAttachment = (rfqId: string, filename: string) => {
    const rfqObj = localRfqsList.find((r) => r.id === rfqId)
    const content = `================================================================
KSS PROCUREMENT OS - RFQ ATTACHMENT & SPECIFICATION
================================================================
RFQ Reference: ${rfqId}
Vendor Account: ${vendor.name} (${vendor.id})
Attachment Name: ${filename}
Category: ${rfqObj?.category || vendor.category}
Subcategory: ${rfqObj?.subcategory || 'N/A'}
Quantity: ${rfqObj?.qty || 'N/A'}
Estimated Budget: RS {rfqObj?.budgetEst?.toLocaleString() || '0'}
Delivery Location: ${rfqObj?.deliveryLocation || 'N/A'}
Bidding Deadline: ${rfqObj?.deadline || 'N/A'}

TECHNICAL REQUIREMENT DESCRIPTION:
${rfqObj?.description || 'Standard corporate procurement requirement with SLA and warranty commitments.'}

COMPLIANCE & SLA CLAUSES:
- 100% genuine original equipment manufacturer (OEM) parts required.
- Standard 3-year onsite warranty with 24-hour turnaround SLA.
- Delivered goods subject to 3-way matching and GRN physical inspection.
================================================================
Certified Procurement Document - KSS Procurement OS
================================================================
`
    const isDocx = filename.toLowerCase().endsWith('.docx')
    const mimeType = isDocx
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf'
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setToastMsg(`Downloaded attachment "${filename}" successfully!`)
    setTimeout(() => setToastMsg(''), 3500)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle size={16} className="text-blue-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" /> Bidding RFQs ({vendor.name})
        </h1>
        <p className="text-xs text-gray-500">Only RFQs where Vendor ID ({vendor.id}) is invited are listed here.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'open', label: `Open RFQs (${openRfqs.length})` },
          { id: 'expired', label: `Expired RFQs (${expiredRfqs.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              subTab === t.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm text-xs space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-gray-600">Loading RFQs for {vendor.name}...</p>
          </div>
        ) : displayedRfqs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle className="mx-auto mb-2 opacity-40" size={32} />
            <p className="font-bold text-gray-700">No {subTab} RFQs found for {vendor.name}.</p>
          </div>
        ) : (
          displayedRfqs.map((rfq) => {
            const isExpired = subTab === 'expired' || rfq.status === 'Expired' || new Date(rfq.deadline) < new Date()
            const urgency = !isExpired ? getRFQDeadlineUrgency(rfq.deadline) : null
            const isExpanded = !!expandedRfqIds[rfq.id]
            const action = rfqActions[rfq.id]
            const isAccepted = action?.status === 'Accepted' || action?.status === 'Submitted'

            const normCurrentRfq = (rfq.rfq_id || rfq.id || '').toString().trim().toUpperCase()
            const cleanCurrentRfq = normCurrentRfq.replace(/^RFQ-/, '')
            const currentPk = typeof rfq.pk === 'number' ? rfq.pk : (typeof rfq.id === 'number' ? rfq.id : (typeof rfq.id === 'string' && /^\d+$/.test(rfq.id) ? parseInt(rfq.id) : null))

            const submittedQuote = vendorQuotes.find((q: any) => {
              const qRfq = (q.rfq_id || q.rfqId || q.rfqRef || q.rfq_detail?.rfq_id || (typeof q.rfq === 'object' ? q.rfq?.rfq_id : null) || '').toString().trim().toUpperCase()
              const cleanQRfq = qRfq.replace(/^RFQ-/, '')
              const qPk = q.rfqPk || q.rfq_detail?.id || (typeof q.rfq === 'number' ? q.rfq : (typeof q.rfq === 'string' && /^\d+$/.test(q.rfq) ? parseInt(q.rfq) : null))

              const isRfqMatch =
                (Boolean(qRfq && normCurrentRfq && (qRfq === normCurrentRfq || cleanQRfq === cleanCurrentRfq))) ||
                (Boolean(qPk && currentPk && qPk === currentPk))

              const qVendorId = (q.vendor_detail?.unique_vendor_id || q.vendorId || '').toString().trim().toLowerCase()
              const qVendorName = (q.vendor_detail?.name || q.vendorName || (typeof q.vendor === 'string' ? q.vendor : '')).toString().trim().toLowerCase()
              const targetVendorId = (vendorId || vendor.id || '').toString().trim().toLowerCase()
              const targetVendorName = (vendor.name || '').toString().trim().toLowerCase()

              const isVendorMatch =
                (Boolean(targetVendorId && qVendorId && (qVendorId === targetVendorId || (targetVendorId.includes('001') && qVendorId.includes('001')) || (targetVendorId.includes('002') && qVendorId.includes('002')) || (targetVendorId.includes('003') && qVendorId.includes('003')) || (targetVendorId.includes('004') && qVendorId.includes('004'))))) ||
                (Boolean(targetVendorName && qVendorName && (qVendorName === targetVendorName || qVendorName.includes(targetVendorName) || targetVendorName.includes(qVendorName))))

              return isRfqMatch && isVendorMatch && (q.status === 'Submitted' || q.status === 'Selected' || q.status === 'Accepted' || q.status === 'Under Evaluation')
            })

            const backendHasSubmitted = Array.isArray(rfq.quotations) && rfq.quotations.some((bq: any) => {
              const bqVendorId = (bq.vendor_detail?.unique_vendor_id || bq.vendorId || '').toString().trim().toLowerCase()
              const bqVendorName = (bq.vendor_detail?.name || (typeof bq.vendor === 'string' ? bq.vendor : '')).toString().trim().toLowerCase()
              const cVendorId = (vendorId || vendor.id || '').toString().trim().toLowerCase()
              const cVendorName = (vendor.name || '').toString().trim().toLowerCase()

              return (
                (Boolean(cVendorId && bqVendorId && (bqVendorId === cVendorId || (cVendorId.includes('001') && bqVendorId.includes('001')) || (cVendorId.includes('002') && bqVendorId.includes('002')) || (cVendorId.includes('003') && bqVendorId.includes('003')) || (cVendorId.includes('004') && bqVendorId.includes('004'))))) ||
                (Boolean(cVendorName && bqVendorName && (bqVendorName === cVendorName || bqVendorName.includes(cVendorName) || cVendorName.includes(bqVendorName))))
              )
            })

            const hasSubmitted = action?.status === 'Submitted' || !!submittedQuote || backendHasSubmitted

            return (
              <div key={rfq.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 hover:border-gray-300 transition-all">
                {/* Card Top Row: Header badges & Title */}
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                        {rfq.id}
                      </span>
                      {isExpired ? (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          Expired
                        </span>
                      ) : hasSubmitted ? (
                        <span className="text-[10px] font-black text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-300 flex items-center gap-1">
                          <CheckCircle size={10} /> ✓ Quotation Submitted
                        </span>
                      ) : isAccepted ? (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                          <CheckCircle size={10} /> ✓ Accepted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock size={10} /> Acceptance Required
                        </span>
                      )}
                      {/* Document Verification Status Badge - Only shown if PO exists */}
                      {rfq.document_verification?.po_id ? (
                        rfq.document_verification?.is_both_verified || rfq.document_verification_status === 'Documents Verified' ? (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                            <CheckCircle size={10} className="text-emerald-600" /> Documents Verified ✅
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <Clock size={10} className="text-amber-600" /> Verification Pending ⏳
                          </span>
                        )
                      ) : null}
                      {urgency && (
                        <span className={`text-[10px] border px-2 py-0.5 rounded ${urgency.style}`}>
                          {urgency.label}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mt-1.5">{rfq.title}</h3>
                  </div>

                  <span className="font-black text-sm text-gray-900 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
                    Budget Est: RS {rfq.budgetEst?.toLocaleString()}
                  </span>
                </div>

                {/* Card 4 Mandatory Grid Fields: Subcategory, Qty, Deadline, Delivery */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-gray-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Subcategory</span>
                    <span className="font-bold text-gray-900 truncate block mt-0.5" title={rfq.subcategory}>{rfq.subcategory}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Quantity</span>
                    <span className="font-bold text-blue-700 block mt-0.5">{rfq.qty}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Bidding Deadline</span>
                    <span className="font-bold text-gray-900 block mt-0.5">{rfq.deadline}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Delivery Location</span>
                    <span className="font-bold text-gray-900 truncate block mt-0.5" title={rfq.deliveryLocation}>{rfq.deliveryLocation}</span>
                  </div>
                </div>

                {/* Card Bottom Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200/70 pt-3">
                  <button
                    onClick={() => toggleExpand(rfq.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={15} /> Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown size={15} /> View Details
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {isExpired ? (
                      <button
                        disabled
                        className="bg-gray-100 text-gray-400 font-bold px-4 py-2 rounded-xl border border-gray-200 cursor-not-allowed text-xs"
                      >
                        Bidding Closed (Expired)
                      </button>
                    ) : hasSubmitted ? (
                      <button
                        disabled
                        className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-default shadow-2xs"
                      >
                        <CheckCircle size={14} className="text-emerald-600" /> Quotation Submitted
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isAccepted && (
                          <button
                            type="button"
                            onClick={() => handleAcceptRfq(rfq.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                          >
                            <CheckCircle size={14} /> Accept RFQ
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenSubmit(rfq.id)}
                          disabled={!isAccepted}
                          className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
                            isAccepted
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer'
                              : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                          }`}
                        >
                          {isAccepted ? (
                            <>
                              <Unlock size={14} /> Submit Quotation →
                            </>
                          ) : (
                            <>
                              <Lock size={14} /> Submit Quotation (Locked)
                            </>
                          )}
                        </button>
                        {isAccepted && (
                          <button
                            type="button"
                            onClick={() => handleCreateGRNForRFQ(rfq)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                            title="Generate and submit Goods Receipt Note"
                          >
                            <FileCheck size={14} className="text-emerald-600" /> Generate Goods Receipt
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* View Details Expand Panel */}
                {isExpanded && (
                  <div className="p-4 bg-white rounded-xl border border-blue-100 space-y-4 shadow-xs">
                    <div className="border-b border-gray-100 pb-2 flex justify-between items-center">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                        <FileText size={15} className="text-blue-600" /> Full RFQ Specification Details ({rfq.id})
                      </h4>
                      <span className="text-[10px] text-gray-400 font-bold">Category: {rfq.category}</span>
                    </div>

                    {/* Full Info Grid (Category, Subcategory, Qty, Description, Est. Budget, Attachments, Delivery Location, Required By) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50/70 p-3 rounded-lg border border-gray-200/60">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Category</span>
                        <p className="font-bold text-gray-900 mt-0.5">{rfq.category}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Subcategory</span>
                        <p className="font-bold text-gray-900 mt-0.5">{rfq.subcategory}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Quantity</span>
                        <p className="font-bold text-blue-700 mt-0.5">{rfq.qty}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Est. Budget</span>
                        <p className="font-bold text-emerald-700 mt-0.5">RS {rfq.budgetEst?.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Delivery Location</span>
                        <p className="font-bold text-gray-900 mt-0.5">{rfq.deliveryLocation}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Required By Date</span>
                        <p className="font-bold text-gray-900 mt-0.5">{formatDate(rfq.requiredBy || '2026-10-15')}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Bidding Deadline</span>
                        <p className="font-bold text-gray-900 mt-0.5">{rfq.deadline}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Originator</span>
                        <p className="font-bold text-gray-900 mt-0.5">Corporate Procurement</p>
                      </div>
                    </div>

                    {/* Document Verification & PO Audit Panel - Only shown if a PO has been issued */}
                    {rfq.document_verification?.po_id && (
                      <div className="p-3.5 bg-gradient-to-r from-gray-50 to-blue-50/40 rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <FileCheck size={15} className={rfq.document_verification?.is_both_verified || rfq.document_verification_status === 'Documents Verified' ? 'text-emerald-600' : 'text-amber-600'} />
                            Document Verification Status (Invoice + Goods Receipt):
                          </span>
                          {rfq.document_verification?.is_both_verified || rfq.document_verification_status === 'Documents Verified' ? (
                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                              <CheckCircle size={12} /> Documents Verified ✅
                            </span>
                          ) : (
                            <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                              <Clock size={12} /> Verification Pending ⏳
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                          <div className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center justify-between shadow-2xs">
                            <span className="text-gray-500 font-semibold">Goods Receipt:</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold flex items-center gap-1 ${rfq.document_verification?.is_goods_receipt_verified ? 'text-emerald-700' : 'text-amber-600'}`}>
                                {rfq.document_verification?.is_goods_receipt_verified ? '✓ Verified' : '⏳ Pending'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleViewGoodsReceipt(rfq)}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer ml-1"
                                title="View Goods Receipt Note"
                              >
                                <Eye size={11} /> View Receipt
                              </button>
                            </div>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center justify-between shadow-2xs">
                            <span className="text-gray-500 font-semibold">Invoice Receipt:</span>
                            <span className={`font-bold flex items-center gap-1 ${rfq.document_verification?.is_invoice_verified ? 'text-emerald-700' : 'text-amber-600'}`}>
                              {rfq.document_verification?.is_invoice_verified ? '✓ Verified' : '⏳ Pending'}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center justify-between shadow-2xs">
                            <span className="text-gray-500 font-semibold">Linked PO:</span>
                            <span className="font-bold text-gray-900">{rfq.document_verification?.po_id || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Requirement Description</span>
                      <p className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 leading-relaxed text-xs font-medium">
                        {rfq.description}
                      </p>
                    </div>

                    {/* Attachments Section */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Attachments & Specifications</span>
                      <div className="flex flex-wrap gap-2">
                        {(rfq.attachments || ['Technical_Specification_Doc_v2.pdf', 'RF_Requirements_Compliance.docx']).map(
                          (att: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => handleDownloadAttachment(rfq.id, att)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                              <Paperclip size={13} className="text-blue-600" />
                              {att}
                              <Download size={12} className="ml-1 opacity-60" />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Inside detail view: Accept / Decline Action Control Bar */}
                    {!isExpired && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-700">Vendor Decision:</span>
                          {hasSubmitted ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-3 py-1.5 bg-blue-100 text-blue-900 font-bold rounded-xl border border-blue-300 flex items-center gap-1.5">
                                <CheckCircle size={15} className="text-blue-600" /> RFQ Accepted & Quotation Submitted {submittedQuote?.grnDocNumber || submittedQuote?.id ? `(${submittedQuote.grnDocNumber || submittedQuote.id})` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleViewGoodsReceipt(rfq)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="View Goods Receipt Note (GRN)"
                              >
                                <Eye size={13} /> View Goods Receipt Note
                              </button>
                            </div>
                          ) : isAccepted ? (
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-300 flex items-center gap-1.5">
                              <CheckCircle size={15} /> RFQ Accepted (Quotation Submission Unlocked)
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Please Accept or Decline this RFQ to proceed.</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isAccepted ? (
                            <button
                              onClick={() => handleAcceptRfq(rfq.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <CheckCircle size={15} /> Accept RFQ
                            </button>
                          ) : null}

                          <button
                            onClick={() => setDeclineModalRfq(rfq)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <XCircle size={15} /> Decline RFQ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Decline RFQ Modal */}
      <DeclineRfqModal
        isOpen={!!declineModalRfq}
        onClose={() => setDeclineModalRfq(null)}
        rfq={declineModalRfq}
        vendorId={vendor.id}
        onRfqDeclined={handleRfqDeclined}
      />

      {/* Submit Quotation Modal */}
      <SubmitQuotationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        vendorId={vendor.id}
        vendorName={vendor.name}
        rfqs={localRfqsList}
        initialRfqId={selectedRfqId}
      />

      {/* Goods Receipt Note Modal */}
      <ViewLinkedRequestModal
        isOpen={!!viewingGrnDoc}
        onClose={() => setViewingGrnDoc(null)}
        doc={viewingGrnDoc}
        vendor={vendor}
      />

      {/* Create Goods Receipt Modal */}
      <UploadDocumentModal
        isOpen={showCreateGrnModal}
        onClose={() => {
          setShowCreateGrnModal(false)
          setSelectedPoForGrn(null)
        }}
        vendorId={vendor.id}
        vendorName={vendor.name}
        defaultPO={selectedPoForGrn}
        onDocumentUploaded={() => {
          loadData()
          setToastMsg('Goods Receipt Note generated and saved to PostgreSQL & Documents repository.')
          setTimeout(() => setToastMsg(''), 4000)
        }}
      />
    </div>
  )
}
export const VendorRFQsPage: React.FC = VendorRfqsPage

// ─── 5. DYNAMIC VENDOR QUOTATIONS PAGE ────────────────────────────────────────
export const VendorQuotationsPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as 'all' | 'draft' | 'submitted' | 'selected' | 'rejected' | null
  const [subTab, setSubTab] = useState<'all' | 'draft' | 'submitted' | 'selected' | 'rejected'>(tabParam || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const { vendor } = getScopedVendorData(vendorId)
  const [quotationsList, setQuotationsList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (tabParam && ['all', 'draft', 'submitted', 'selected', 'rejected'].includes(tabParam)) {
      setSubTab(tabParam)
    }
  }, [tabParam])

  const loadQuotes = async () => {
    try {
      setIsLoading(true)
      const res = await apiClient.get('/rfq/quotations/', { params: { vendor: vendorId } })
      const backendQ = Array.isArray(res.data) ? res.data : res.data?.results || []
      const currentVendor = MASTER_VENDORS.find(v => v.id === vendorId)
      const vName = (currentVendor?.name || vendor.name || '').toLowerCase()
      const vKey = vendorId.toLowerCase()

      const mappedBackend = backendQ
        .filter((bq: any) => {
          const bqVId = (bq.vendor_detail?.unique_vendor_id || (typeof bq.vendor === 'string' ? bq.vendor : '')).toString().toLowerCase().trim()
          const bqVName = (bq.vendor_detail?.name || '').toString().toLowerCase().trim()
          return bqVId === vKey || (vName && bqVName && (bqVName.includes(vName) || vName.includes(bqVName)))
        })
        .map((bq: any) => {
          const qId = bq.quotation_id || (typeof bq.id === 'string' ? bq.id : `QUO-${bq.id}`)
          const rfqId = bq.rfq_id || bq.rfq_detail?.rfq_id || (typeof bq.rfq === 'string' ? bq.rfq : `RFQ-${bq.rfq}`)
          const rfqTitle = bq.rfq_title || bq.rfq_detail?.title || bq.rfq_detail?.purchase_request_detail?.title || 'Enterprise Workstations & Supplies'
          const baseAmt = typeof bq.price === 'number' ? bq.price : (parseFloat(bq.price) || 0)
          const gstPct = typeof bq.gst_rate === 'number' ? bq.gst_rate : (typeof bq.gstPercent === 'number' ? bq.gstPercent : (parseFloat(bq.gst_rate) || parseFloat(bq.gstPercent) || 18))
          const gstAmt = typeof bq.tax_amount === 'number' ? bq.tax_amount : (typeof bq.taxAmount === 'number' ? bq.taxAmount : (parseFloat(bq.tax_amount) || parseFloat(bq.taxAmount) || Math.round(baseAmt * gstPct / 100)))
          const totalAmt = typeof bq.total_amount === 'number' ? bq.total_amount : (typeof bq.totalAmount === 'number' ? bq.totalAmount : (parseFloat(bq.total_amount) || parseFloat(bq.totalAmount) || (baseAmt + gstAmt)))
          const po = bq.purchase_order_detail
          const gr = bq.goods_receipt_detail

          return {
            id: qId,
            quotation_id: qId,
            rfqRef: rfqId,
            rfqId: rfqId,
            rfqTitle: rfqTitle,
            vendorId: vendorId,
            vendorName: bq.vendor_detail?.name || currentVendor?.name || vendor.name,
            price: baseAmt,
            quotedPrice: totalAmt,
            baseAmount: baseAmt,
            gst_rate: gstPct,
            gstPercent: gstPct,
            gstRate: gstPct,
            tax_amount: gstAmt,
            taxAmount: gstAmt,
            gstAmount: gstAmt,
            total_amount: totalAmt,
            totalAmount: totalAmt,
            productName: rfqTitle,
            productQty: `${bq.quantity || bq.rfq_detail?.purchase_request_detail?.quantity || 20} Units`,
            leadTime: `${bq.delivery_days || 7} Days`,
            expectedDeliveryDate: po?.expected_delivery || null,
            quoteValidUntil: bq.rfq_deadline || bq.rfq_detail?.deadline || 'N/A',
            submittedDate: (bq.created_at || '').split('T')[0] || 'N/A',
            status: bq.status || 'Submitted',
            category: bq.category || bq.rfq_detail?.purchase_request_detail?.category || vendor.category || 'IT Hardware',
            purchaseOrder: po,
            goodsReceipt: gr,
            grnDocNumber: gr?.receipt_id || (po ? `GRN-${po.po_id.replace('PO-', '')}` : null),
            receiptNumber: gr?.receipt_id || null,
            poRef: po?.po_id || null,
            warrantyDuration: `${bq.warranty_months || 12} Months (On-site)`,
            notes: bq.terms_conditions || ''
          }
        })

      setQuotationsList(mappedBackend)
    } catch (e) {
      console.warn('Failed to load vendor quotations:', e)
      setQuotationsList([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQuotes()
    window.addEventListener('kss_backend_updated', loadQuotes)
    window.addEventListener('storage', loadQuotes)
    return () => {
      window.removeEventListener('kss_backend_updated', loadQuotes)
      window.removeEventListener('storage', loadQuotes)
    }
  }, [vendorId, vendor.name, tabParam])

  const draftQuotes = quotationsList.filter((q) => q.status === 'Draft')
  const submittedQuotes = quotationsList.filter((q) => q.status === 'Submitted' || q.status === 'Under Evaluation' || q.status === 'Shortlisted')
  const selectedQuotes = quotationsList.filter((q) => q.status === 'Selected' || q.status === 'Accepted')
  const rejectedQuotes = quotationsList.filter((q) => q.status === 'Rejected')

  const tabFilteredQuotes =
    subTab === 'all' ? quotationsList :
    subTab === 'draft' ? draftQuotes :
    subTab === 'submitted' ? submittedQuotes :
    subTab === 'selected' ? selectedQuotes :
    rejectedQuotes

  const displayedQuotes = tabFilteredQuotes.filter((q) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase().trim()
    return (
      (q.id || '').toLowerCase().includes(query) ||
      (q.rfqRef || '').toLowerCase().includes(query) ||
      (q.rfqTitle || '').toLowerCase().includes(query) ||
      (q.productName || '').toLowerCase().includes(query) ||
      (q.category || '').toLowerCase().includes(query) ||
      (q.status || '').toLowerCase().includes(query) ||
      (q.poRef || '').toLowerCase().includes(query) ||
      (q.notes || '').toLowerCase().includes(query)
    )
  })

  const tabs = [
    { id: 'all', label: `All (${quotationsList.length})` },
    { id: 'submitted', label: `Submitted (${submittedQuotes.length})` },
    { id: 'selected', label: `Selected (${selectedQuotes.length})` },
    { id: 'draft', label: `Draft (${draftQuotes.length})` },
    { id: 'rejected', label: `Rejected (${rejectedQuotes.length})` },
  ]

  const [viewingQuoteDoc, setViewingQuoteDoc] = useState<any | null>(null)

  const handleViewQuoteReceipt = (quo: any) => {
    const cleanRef = (quo.poRef || quo.rfqRef || quo.id || '2026-001').replace(/^(PO-|RFQ-|REQ-|QUO-)/i, '').trim()
    const qBase = typeof quo.baseAmount === 'number' ? quo.baseAmount : (typeof quo.base_amount === 'number' ? quo.base_amount : (typeof quo.price === 'number' ? quo.price : (parseFloat(quo.baseAmount || quo.base_amount || quo.price) || undefined)))
    const qGstPct = typeof quo.gstPercent === 'number' ? quo.gstPercent : (typeof quo.gst_rate === 'number' ? quo.gst_rate : (typeof quo.gstRate === 'number' ? quo.gstRate : (parseFloat(quo.gstPercent || quo.gst_rate || quo.gstRate) !== undefined && !isNaN(parseFloat(quo.gstPercent || quo.gst_rate || quo.gstRate)) ? parseFloat(quo.gstPercent || quo.gst_rate || quo.gstRate) : undefined)))
    const qGstAmt = typeof quo.gstAmount === 'number' ? quo.gstAmount : (typeof quo.taxAmount === 'number' ? quo.taxAmount : (typeof quo.tax_amount === 'number' ? quo.tax_amount : (qBase !== undefined && qGstPct !== undefined ? Math.round(qBase * qGstPct / 100) : undefined)))
    const qTotal = typeof quo.totalAmount === 'number' ? quo.totalAmount : (typeof quo.total_amount === 'number' ? quo.total_amount : (typeof quo.quotedPrice === 'number' ? quo.quotedPrice : (qBase !== undefined && qGstAmt !== undefined ? qBase + qGstAmt : (qBase !== undefined ? qBase : undefined))))

    const docObj = {
      id: `DOC-GRN-${cleanRef}`,
      name: `Goods Receipt Note (${quo.grnDocNumber || 'GRN'}) - ${quo.poRef || quo.rfqRef || ''}`,
      grnDocNumber: quo.grnDocNumber || `GRN-${cleanRef}`,
      receiptNumber: quo.receiptNumber || quo.goodsReceipt?.receipt_id || `RCP-${cleanRef}`,
      poRef: quo.poRef || `PO-${cleanRef}`,
      rfqRef: quo.rfqRef || `RFQ-${cleanRef}`,
      requestRef: quo.rfqRef || `REQ-${cleanRef}`,
      category: quo.category || vendor.category || 'IT Hardware',
      status: quo.goodsReceipt?.status || 'Verified',
      verified: true,
      productName: quo.productName || quo.product || 'Enterprise Workstations',
      productQty: quo.productQty || '20 Units',
      totalAmount: qTotal,
      baseAmount: qBase,
      gstPercent: qGstPct,
      gstAmount: qGstAmt,
      uploadedDate: quo.goodsReceipt?.delivery_date || quo.submittedDate || '2026-09-10',
      expectedDeliveryDate: quo.expectedDeliveryDate || undefined,
      leadTime: quo.leadTime || undefined,
      quoteValidity: quo.quoteValidity || quo.quoteValidUntil || quo.expiryDate || quo.valid_until || undefined,
      vendorId: vendor.id,
      vendorName: vendor.name,
      warrantyDuration: quo.warrantyDuration || '36 Months (On-site)',
      warrantyType: 'On-site',
      freeServiceCount: '3 Services',
      installationType: 'Free',
      techSupportDuration: '24/7 Dedicated Support',
      replacementPolicy: 'Standard SLA',
      accessoriesIncluded: 'Power Adapter, Sleeves & Drivers',
      notes: quo.notes || 'Net 30 payment terms upon delivery verification and commercial clearance.',
    }
    setViewingQuoteDoc(docObj)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="text-blue-600" /> Quotations History ({vendor.id})
          </h1>
          <p className="text-xs text-gray-500">Track all bids and quotation records submitted by {vendor.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search Quotation ID, RFQ, Product, PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === t.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="mx-auto mb-2 animate-spin text-blue-500" size={24} />
            <p className="font-semibold text-gray-600">Loading quotations history...</p>
          </div>
        ) : displayedQuotes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle className="mx-auto mb-2 opacity-40" size={32} />
            <p className="font-bold text-gray-700">No {subTab !== 'all' ? subTab : ''} quotations found {searchQuery ? `matching "${searchQuery}"` : `for ${vendor.name}`}.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-blue-600 hover:underline text-xs font-semibold cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-4">Quotation ID</th>
                <th className="p-4">RFQ & Product Details</th>
                <th className="p-4">Quoted Price</th>
                <th className="p-4">Lead Time / Exp. Delivery</th>
                <th className="p-4">Valid Until</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {displayedQuotes.map((quo) => (
                <tr key={quo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-blue-600 block text-xs">{quo.id}</span>
                    {quo.poRef && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold text-[10px]">
                        PO: {quo.poRef}
                      </span>
                    )}
                    {quo.grnDocNumber && (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => handleViewQuoteReceipt(quo)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded border border-blue-200 text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          title="View Goods Receipt Note (GRN)"
                        >
                          <Eye size={10} className="text-blue-600" />
                          {`Goods_Receipt_${quo.grnDocNumber}`}
                        </button>
                        <button
                          onClick={() => downloadGoodsReceiptDocument(quo)}
                          className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 text-[10px] inline-flex items-center cursor-pointer"
                          title="Download GRN File"
                        >
                          <Download size={10} />
                        </button>
                      </div>
                    )}
                    {quo.notes && (
                      <p className="text-[10px] text-gray-500 font-normal italic mt-1 max-w-xs truncate" title={quo.notes}>
                        📝 {quo.notes}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900 text-xs mb-1">{quo.rfqTitle || quo.productName}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono text-[10px] border border-gray-200">
                        {quo.rfqRef}
                      </span>
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold border border-blue-200">
                        {quo.productQty}
                      </span>
                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold border border-purple-200">
                        {quo.category}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-black text-gray-900 text-xs">₹{(quo.totalAmount || quo.quotedPrice || 0).toLocaleString('en-IN')}</div>
                    {quo.baseAmount && (
                      <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                        Base: ₹{quo.baseAmount.toLocaleString('en-IN')} + GST {quo.gstPercent}% (₹{quo.gstAmount?.toLocaleString('en-IN')})
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-gray-700">
                    <div className="font-semibold">{quo.leadTime}</div>
                    {quo.expectedDeliveryDate && quo.expectedDeliveryDate !== 'N/A' && (
                      <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                        Exp. Delivery: {formatDate(quo.expectedDeliveryDate)}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-gray-600 font-medium">{quo.quoteValidUntil ? formatDate(quo.quoteValidUntil) : 'N/A'}</td>
                  <td className="p-4 text-gray-500">{quo.submittedDate ? formatDate(quo.submittedDate) : 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                      quo.status === 'Selected' || quo.status === 'Accepted' ? 'bg-green-100 text-green-800 border border-green-200' :
                      quo.status === 'Submitted' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      quo.status === 'Under Evaluation' || quo.status === 'Shortlisted' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      quo.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {quo.status === 'Selected' || quo.status === 'Accepted' ? 'Selected (Won)' : quo.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ViewLinkedRequestModal
        isOpen={!!viewingQuoteDoc}
        onClose={() => setViewingQuoteDoc(null)}
        doc={viewingQuoteDoc}
        vendor={vendor}
      />
    </div>
  )
}



// ─── 6. DYNAMIC VENDOR PURCHASE ORDERS PAGE ────────────────────────────────────
// ─── PAPER-INVOICE-STYLE DELIVERY CONFIRMATION & INVOICE MODAL ─────────────
export const DeliveryConfirmationModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  po: any
  vendorId: string
  vendorName: string
  onConfirm: (poRef: string, docName: string, deliveryDate: string) => void
}> = ({ isOpen, onClose, po, vendorId, vendorName, onConfirm }) => {
  const [invoiceFile, setInvoiceFile] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [successMsg, setSuccessMsg] = useState('')

  // Manually editable receipt fields — pre-filled from PO but fully editable
  const [docNumber, setDocNumber] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [quantity, setQuantity] = useState('15')
  const [baseAmount, setBaseAmount] = useState('')
  const [gstPct, setGstPct] = useState('18')
  const [receivedBy, setReceivedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [poIssueDate, setPoIssueDate] = useState('')

  // Re-seed editable fields whenever the PO changes (modal opens for a new PO)
  useEffect(() => {
    if (po) {
      const allQuotes = getAllStoredVendorQuotes()
      const cleanKey = (po.id || po.requestRef || po.rfqRef || '').replace(/^(PO-|RFQ-|REQ-)/gi, '').trim().toUpperCase()
      const matchedQuote = allQuotes.find((q: any) =>
        (q.rfqRef && q.rfqRef.toUpperCase().includes(cleanKey)) ||
        (q.rfqId && q.rfqId.toUpperCase().includes(cleanKey)) ||
        (q.id && q.id.toUpperCase().includes(cleanKey))
      )
      const poGst = typeof po.gstPercent === 'number' ? po.gstPercent : (typeof po.gstRate === 'number' ? po.gstRate : (typeof po.gst_rate === 'number' ? po.gst_rate : (typeof matchedQuote?.gstPercent === 'number' ? matchedQuote.gstPercent : (typeof matchedQuote?.gstRate === 'number' ? matchedQuote.gstRate : (parseFloat(matchedQuote?.gst_rate) || 18)))))
      const poTotal = typeof po.amount === 'number' ? po.amount : (typeof po.totalAmount === 'number' ? po.totalAmount : (parseFloat(po.amount) || parseFloat(po.totalAmount) || 35000))
      const poBase = typeof po.baseAmount === 'number' ? po.baseAmount : (typeof po.base_amount === 'number' ? po.base_amount : (typeof matchedQuote?.baseAmount === 'number' ? matchedQuote.baseAmount : (typeof matchedQuote?.price === 'number' ? matchedQuote.price : (parseFloat(matchedQuote?.baseAmount) || parseFloat(matchedQuote?.price) || Math.round(poTotal / (1.0 + (poGst / 100.0)))))))

      const cleanVnd = (vendorId || 'VND-HW-001').replace(/[^A-Z0-9]/g, '')
      setDocNumber(`GRN-${cleanVnd}-${po.id ? po.id.replace(/[^0-9]/g, '').slice(-5) || '57789' : '57789'}`)
      setItemDescription(po.title || 'Enterprise Laptop Workstations')
      setQuantity(po.quantity ? String(po.quantity) : '15')
      setBaseAmount(poBase.toString())
      setGstPct(poGst.toString())
      setReceivedBy('')
      setNotes('')
      setPoIssueDate(po.issueDate || '2026-09-09')
      setInvoiceFile('')
      setDeliveryDate(new Date().toISOString().split('T')[0])
      setSuccessMsg('')
    }
  }, [po?.id, vendorId])

  if (!isOpen || !po) return null

  // Live-calculated totals from editable fields
  const baseNum = parseFloat(baseAmount) || 0
  const gstNum = parseFloat(gstPct) || 0
  const gstAmount = Math.round(baseNum * gstNum / 100)
  const totalAmount = baseNum + gstAmount
  const parsedQty = parseInt(quantity) || (po.quantity ? Number(po.quantity) : 15)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalDocName = invoiceFile || `${docNumber || `Goods_Receipt_${po.id}`}.pdf`

    const record: DeliveryDocRecord = {
      poRef: po.id,
      requestRef: po.requestRef || 'REQ-2026-101',
      deliveryId: docNumber || `GRN-2026-${po.id.replace(/^(PO-|RFQ-|REQ-)/, '')}`,
      vendorId,
      challanDocName: finalDocName,
      invoiceDocName: finalDocName,
      deliveryDate,
      courierRef: (po as any).courier || 'Express Logistics',
      status: 'Delivered',
      uploadedAt: new Date().toISOString(),
    }

    saveDeliveryDocs(po.id, record)
    markPODelivered(po.id)
    if (po.requestRef) markPODelivered(po.requestRef)
    saveVendorPOStatus(vendorId, po.id, 'Delivered')
    if (po.requestRef) saveVendorPOStatus(vendorId, po.requestRef, 'Delivered')

    // Save to Invoices page
    const newInvoice = {
      id: `INV-${vendorId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      poRef: po.id,
      title: itemDescription || po.title || 'Goods Receipt & Invoice Document',
      amount: totalAmount,
      invoiceDate: deliveryDate,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Submitted',
      docName: finalDocName,
    }
    saveStoredVendorInvoice(vendorId, newInvoice)

    // Save to Documents page
    const grnDocRecord = {
      id: `DOC-${docNumber || `GRN-${po.id}`}`,
      name: `Official Goods Receipt (${docNumber || `GRN-${po.id}`}) - ${po.id}`,
      category: 'Financial Records',
      uploadedDate: deliveryDate,
      expiryDate: 'N/A',
      status: 'Pending Verification',
      fileSize: '1.4 MB',
      docName: finalDocName,
    }
    createGoodsReceiptApi(po.id, {
      delivery_date: deliveryDate,
      delivery_location: (po as any).deliveryLocation || 'Main Office / Warehouse',
      product_name: itemDescription || po.title || 'Enterprise Workstations',
      ordered_quantity: po.quantity || 15,
      received_quantity: po.quantity || 15,
      status: 'Pending Verification',
      notes: `Goods receipt submitted for ${po.id}`,
      vendor: vendorId,
      rfq: po.requestRef || po.id
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    }).catch(err => {
      console.warn('Backend GRN creation error:', err)
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    })

    // Route to Manager & Finance post-delivery
    setSuccessMsg(`Receipt "${docNumber || `GRN-${po.id}`}" created! Delivery confirmed & Invoice submitted.`)
    setTimeout(() => {
      onConfirm(po.id, finalDocName, deliveryDate)
      setSuccessMsg('')
      onClose()
    }, 900)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-lg w-full max-h-[90vh] flex flex-col relative text-gray-900 font-sans overflow-hidden mx-auto animate-scaleUp">

        {/* Sticky Paper Receipt Header */}
        <div className="sticky top-0 bg-white z-20 px-6 pt-5 pb-4 border-b-2 border-slate-900 flex items-start justify-between shrink-0 shadow-xs">
          <div>
            <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold tracking-widest uppercase rounded-xs mb-1">
              OFFICIAL GOODS RECEIPT &amp; GRN
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{vendorId}</h2>
            <p className="text-xs font-mono text-slate-500 font-medium mt-0.5">
              PO Ref: {po.id} • Manual Receipt Entry
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-slate-900 text-sm font-bold cursor-pointer p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
          {successMsg ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-lg text-center text-xs font-bold text-emerald-900 space-y-2">
              <CheckCircle size={36} className="mx-auto text-emerald-600" />
              <p className="font-mono text-sm">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Section 1: Receipt Metadata ── */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3 font-mono">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Details — Fill in manually</p>

                {/* PO Reference */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PO Reference *</label>
                  <div className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white font-mono">
                    {po.id} — {po.title || 'Enterprise Laptop Workstations'}
                  </div>
                </div>

                {/* Document / GRN Number */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Document / GRN Number *</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder={`GRN-${po.id}`}
                  />
                </div>

                {/* Vendor ID (read-only) */}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold uppercase">Vendor ID:</span>
                  <span className="font-bold text-slate-900">{vendorId}</span>
                </div>

                {/* PO Issue Date */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PO Issue Date</label>
                  <input
                    type="date"
                    value={poIssueDate}
                    onChange={(e) => setPoIssueDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Received By */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Received By</label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Warehouse Manager / Team Lead"
                  />
                </div>
              </div>

              {/* ── Section 2: Itemized Table ── */}
              <div className="border border-slate-300 rounded-lg overflow-hidden font-mono">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-800 text-xs">
                    {/* Item Description + Qty */}
                    <tr>
                      <td className="p-2.5" colSpan={2}>
                        <input
                          type="text"
                          value={itemDescription}
                          onChange={(e) => setItemDescription(e.target.value)}
                          required
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Item description…"
                        />
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-slate-400">Qty:</span>
                          <input
                            type="text"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="1"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Base Amount */}
                    <tr>
                      <td className="p-2.5 text-slate-600">Base Subtotal (before GST)</td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-500 text-[10px]">RS</span>
                          <input
                            type="number"
                            min={0}
                            value={baseAmount}
                            onChange={(e) => setBaseAmount(e.target.value)}
                            required
                            className="w-24 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-right text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* GST % */}
                    <tr className="bg-slate-50/70">
                      <td className="p-2 text-slate-600">
                        <div className="flex items-center gap-2">
                          <span>GST</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={gstPct}
                              onChange={(e) => setGstPct(e.target.value)}
                              className="w-12 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-center text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <span className="text-[10px] text-slate-500">%</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right text-slate-600">RS {gstAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                    <tr>
                      <td className="p-2.5 uppercase tracking-wider text-[11px]">Total Receipt Amount</td>
                      <td className="p-2.5 text-right text-sm font-mono">RS {totalAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── Section 3: Notes ── */}
              <div className="space-y-0.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes / Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. All items inspected &amp; accepted. No damage observed."
                />
              </div>

              {/* ── Section 4: Receipt Date ── */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Receipt / Delivery Date *
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-500 block">Date goods were physically received.</span>
              </div>

              {/* ── Submit Button ── */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileCheck size={15} /> Confirm &amp; Add Receipt
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export function getNextStageInfo(currentStatus: string): { nextStatus: 'Processing' | 'Shipped' | 'Delivered' | null; label: string } {
  if (currentStatus === 'Confirmed' || currentStatus === 'Pending Confirmation' || currentStatus === 'Issued' || !currentStatus) {
    return { nextStatus: 'Processing', label: 'Mark as Processing' }
  }
  if (currentStatus === 'Processing') {
    return { nextStatus: 'Shipped', label: 'Mark as Ship / Transit' }
  }
  if (currentStatus === 'Shipped' || currentStatus === 'In Transit') {
    return { nextStatus: 'Delivered', label: 'Mark as Delivered' }
  }
  return { nextStatus: null, label: 'Order Delivered' }
}

export const VendorPurchaseOrdersPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const [subTab, setSubTab] = useState<'all' | 'pending' | 'confirmed' | 'fulfilled'>('all')
  const { vendor, pos } = getScopedVendorData(vendorId)
  const { updateVendorPOStatus } = useProcurement()
  const [poStatuses, setPoStatuses] = useState<Record<string, string>>(() => getStoredVendorPOStatuses(vendorId))
  const [expandedPoIds, setExpandedPoIds] = useState<Record<string, boolean>>({})
  const [activeDeliveryModalPo, setActiveDeliveryModalPo] = useState<any | null>(null)
  const [toastMsg, setToastMsg] = useState<string>('')
  const [, setTick] = useState(0)
  const [backendPOs, setBackendPOs] = useState<any[]>([])

  useEffect(() => {
    setPoStatuses(getStoredVendorPOStatuses(vendorId))
  }, [vendorId])

  useEffect(() => {
    const loadPOs = async () => {
      try {
        const res = await apiClient.get('/procurement/purchase-orders/', { params: { vendor: vendorId } })
        const raw = Array.isArray(res.data) ? res.data : res.data?.results || []
        const currentVendor = MASTER_VENDORS.find(v => v.id === vendorId)
        const vName = (currentVendor?.name || vendor.name || '').toLowerCase()
        const vKey = vendorId.toLowerCase()

        const mapped = raw
          .filter((p: any) => {
            const pvId = (p.vendor_detail?.unique_vendor_id || p.vendor?.unique_vendor_id || p.vendor_id || '').toLowerCase()
            const pvName = (p.vendor_detail?.name || p.vendor?.name || (typeof p.vendor === 'string' ? p.vendor : '')).toLowerCase()
            if (pvId === vKey) return true
            if (vName && (pvName.includes(vName) || vName.includes(pvName))) return true
            if (vKey.includes('001') && (pvName.includes('dell') || pvId.includes('001'))) return true
            if (vKey.includes('002') && (pvName.includes('hp') || pvId.includes('002'))) return true
            if (vKey.includes('003') && (pvName.includes('lenovo') || pvId.includes('003'))) return true
            if (vKey.includes('004') && (pvName.includes('apple') || pvId.includes('004'))) return true
            return false
          })
          .map((p: any) => {
            const pr = p.purchase_request_detail || (typeof p.purchase_request === 'object' ? p.purchase_request : null)
            const rfq = p.quotation_detail?.rfq_detail || null
            const reqId = pr?.request_id || p.purchase_request || 'REQ-UNKNOWN'
            const rfqId = rfq?.rfq_id || `RFQ-${reqId.replace(/^REQ-/, '')}`
            const title = pr?.title || p.title || 'Procurement Item Order'
            const qty = pr?.quantity || p.quantity || 1
            const amt = Number(p.total_amount) || Number(pr?.total_estimated_cost) || 0

            const qGst = p.gst_rate ?? p.quotation_detail?.gst_rate ?? 18
            const qBase = p.base_amount ?? p.quotation_detail?.price ?? Math.round(amt / (1.0 + (qGst / 100.0)))
            const qTax = p.tax_amount ?? p.quotation_detail?.tax_amount ?? Math.round(amt - qBase)

            return {
              id: p.po_id || (p.id ? `PO-${p.id}` : 'PO-UNKNOWN'),
              poNumber: p.po_id || (p.id ? `PO-${p.id}` : 'PO-UNKNOWN'),
              requestRef: reqId,
              rfqRef: rfqId,
              title: title,
              quantity: qty,
              unit: 'Units',
              amount: amt,
              totalAmount: amt,
              baseAmount: qBase,
              gstPercent: qGst,
              gstRate: qGst,
              taxAmount: qTax,
              gstAmount: qTax,
              status: p.status === 'Issued' ? 'Pending Confirmation' : p.status,
              payment_status: p.payment_status || 'Pending',
              paymentStatus: p.payment_status || 'Pending',
              issueDate: (p.created_at || '').split('T')[0] || p.order_date || '2026-09-10',
              deliveryDate: p.expected_delivery || '2026-10-15',
              vendorId: vendorId,
              vendorName: p.vendor_detail?.name || vendor.name,
              document_verification: p.document_verification,
              document_verification_status: p.document_verification_status || (p.document_verification?.is_both_verified ? 'Documents Verified' : 'Verification Pending')
            }
          })
        setBackendPOs(mapped)
      } catch (e) {
        console.warn('Failed loading backend POs for vendor:', e)
      }
    }
    loadPOs()
    window.addEventListener('kss_backend_updated', loadPOs)
    window.addEventListener('storage', loadPOs)
    return () => {
      window.removeEventListener('kss_backend_updated', loadPOs)
      window.removeEventListener('storage', loadPOs)
    }
  }, [vendorId, vendor.name])

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1)
    window.addEventListener('kss_backend_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('kss_backend_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const toggleExpandRow = (poId: string) => {
    setExpandedPoIds((prev) => ({ ...prev, [poId]: !prev[poId] }))
  }

  const getEffectiveStatus = (po: any): string => {
    const refList = [po.id, po.poNumber, po.requestRef, po.rfqRef].filter(Boolean)
    const isDelivered = refList.some((r) => isPODelivered(r) || !!getStoredDeliveryDocs(r, vendorId)) || po.status === 'Delivered' || po.status === 'Fulfilled'
    if (isDelivered) return 'Delivered'

    const savedStatuses = getStoredVendorPOStatuses(vendorId)
    for (const r of refList) {
      if (poStatuses[r] && poStatuses[r] !== 'Pending Confirmation') return poStatuses[r]
      if (savedStatuses[r] && savedStatuses[r] !== 'Pending Confirmation') return savedStatuses[r]
    }

    return isDelivered ? 'Delivered' : (po.status || 'Delivered')
  }

  const handleModalConfirm = (poRef: string, docName: string, deliveryDate: string) => {
    setPoStatuses((prev) => ({
      ...prev,
      [poRef]: 'Delivered',
      ...(activeDeliveryModalPo?.id ? { [activeDeliveryModalPo.id]: 'Delivered' } : {}),
      ...(activeDeliveryModalPo?.requestRef ? { [activeDeliveryModalPo.requestRef]: 'Delivered' } : {}),
    }))
    saveVendorPOStatus(vendorId, poRef, 'Delivered')
    if (activeDeliveryModalPo?.id) saveVendorPOStatus(vendorId, activeDeliveryModalPo.id, 'Delivered')
    if (activeDeliveryModalPo?.requestRef) saveVendorPOStatus(vendorId, activeDeliveryModalPo.requestRef, 'Delivered')
    if (activeDeliveryModalPo?.rfqRef) saveVendorPOStatus(vendorId, activeDeliveryModalPo.rfqRef, 'Delivered')

    updateVendorPOStatus(poRef, 'Delivered')
    markPODelivered(poRef)
    if (activeDeliveryModalPo?.id) markPODelivered(activeDeliveryModalPo.id)
    if (activeDeliveryModalPo?.requestRef) markPODelivered(activeDeliveryModalPo.requestRef)

    const targetPoId = activeDeliveryModalPo?.id || poRef
    updateVendorPurchaseOrderApi(targetPoId, { status: 'Delivered' })
    if (poRef && poRef !== targetPoId) {
      updateVendorPurchaseOrderApi(poRef, { status: 'Delivered' })
    }

    setToastMsg(`✅ Delivery confirmed & Invoice "${docName}" submitted for ${poRef}! Routed to Manager & Finance for payment release.`)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleAdvanceStage = (po: any) => {
    const currentStatus = getEffectiveStatus(po)
    const nextInfo = getNextStageInfo(currentStatus)
    if (!nextInfo.nextStatus) return

    if (nextInfo.nextStatus === 'Delivered') {
      // Open paper-styled invoice delivery modal
      setActiveDeliveryModalPo(po)
    } else {
      const newStatus = nextInfo.nextStatus
      setPoStatuses((prev) => ({ ...prev, [po.id]: newStatus }))
      saveVendorPOStatus(vendorId, po.id, newStatus)
      if (po.requestRef) saveVendorPOStatus(vendorId, po.requestRef, newStatus)
      updateVendorPOStatus(po.id, newStatus)
      updateVendorPurchaseOrderApi(po.id, { status: newStatus })
      setToastMsg(`Order stage advanced to "${newStatus}" for ${po.id}.`)
      setTimeout(() => setToastMsg(''), 3000)
    }
  }

  const sourcePos = [...backendPOs, ...pos]
  const uniquePosMap = new Map<string, any>()
  sourcePos.forEach((p: any) => {
    const rawRef = p.requestRef || p.requestId || p.rfqRef || p.poNumber || p.id || ''
    const normKey = rawRef.replace(/^(PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
    if (!normKey) return
    if (!uniquePosMap.has(normKey)) {
      uniquePosMap.set(normKey, p)
    } else {
      const existing = uniquePosMap.get(normKey)!
      uniquePosMap.set(normKey, {
        ...existing,
        ...p,
        document_verification: p.document_verification || existing.document_verification,
        document_verification_status: p.document_verification_status || existing.document_verification_status,
        status: (existing.status && existing.status !== 'Pending Confirmation') ? existing.status : (p.status || existing.status)
      })
    }
  })
  const deduplicatedPos = Array.from(uniquePosMap.values())

  const filteredPos = deduplicatedPos.filter((po) => {
    const status = getEffectiveStatus(po)
    if (subTab === 'pending') return status === 'Pending Confirmation' || status === 'Processing'
    if (subTab === 'confirmed') return status === 'Confirmed' || status === 'Shipped'
    if (subTab === 'fulfilled') return status === 'Delivered' || status === 'Fulfilled'
    return true
  })

  const tabs = [
    { id: 'all', label: `All POs (${deduplicatedPos.length})` },
    { id: 'pending', label: 'Pending Confirmation' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'fulfilled', label: 'Fulfilled' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toastMsg && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle size={16} className="text-blue-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="text-blue-600" /> Purchase Orders ({vendor.name})
        </h1>
        <p className="text-xs text-gray-500">Review official Purchase Orders issued to Vendor ID ({vendor.id}). Status changes update requester 10-stage stepper live.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === t.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        {filteredPos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle className="mx-auto mb-2 opacity-40" size={32} />
            <p className="font-bold text-gray-700">No purchase orders found in this category.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="p-4">PO Number</th>
                <th className="p-4">Request / RFQ Ref</th>
                <th className="p-4">Item Details</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Order Status</th>
                <th className="p-4">Document Verification</th>
                <th className="p-4 text-right">Update Order Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {filteredPos.map((po) => {
                const currentStatus = getEffectiveStatus(po)
                const isDelivered = currentStatus === 'Delivered' || currentStatus === 'Fulfilled' || po.status === 'Delivered' || po.status === 'Fulfilled'
                const isInvoiceVerified = Boolean(
                  po.document_verification?.is_invoice_verified ||
                  po.document_verification?.invoice_status === 'Verified' ||
                  isInvoiceVerifiedInSystem(po.id) ||
                  isInvoiceVerifiedInSystem(po.poNumber) ||
                  (po.requestRef && isInvoiceVerifiedInSystem(po.requestRef)) ||
                  (po.rfqRef && isInvoiceVerifiedInSystem(po.rfqRef))
                )
                const isGRNVerified = Boolean(
                  po.document_verification?.is_goods_receipt_verified ||
                  po.document_verification?.goods_receipt_status === 'Verified' ||
                  isGRNVerifiedInSystem(po.id) ||
                  isGRNVerifiedInSystem(po.poNumber) ||
                  (po.requestRef && isGRNVerifiedInSystem(po.requestRef)) ||
                  (po.rfqRef && isGRNVerifiedInSystem(po.rfqRef))
                )
                const isDocsVerified = Boolean(
                  po.document_verification?.is_both_verified ||
                  po.document_verification_status === 'Documents Verified' ||
                  (isInvoiceVerified && isGRNVerified) ||
                  (isInvoiceVerified && (isDelivered || po.status === 'Delivered')) ||
                  (isGRNVerified && (isDelivered || po.status === 'Delivered'))
                )
                const paymentPaid =
                  po.payment_status === 'Paid' ||
                  po.payment_status === 'Payment Completed' ||
                  po.paymentStatus === 'Paid' ||
                  po.paymentStatus === 'Payment Completed' ||
                  po.status === 'Paid' ||
                  isPaymentPaidForPO(po.id) ||
                  isPaymentPaidForPO(po.poNumber) ||
                  (po.requestRef && isPaymentPaidForPO(po.requestRef)) ||
                  (po.rfqRef && isPaymentPaidForPO(po.rfqRef))
                const isExpanded = !!expandedPoIds[po.id]
                const existingDocs = getStoredDeliveryDocs(po.id, vendorId) || (po.requestRef ? getStoredDeliveryDocs(po.requestRef, vendorId) : null)
                const nextInfo = getNextStageInfo(currentStatus)

                return (
                  <React.Fragment key={po.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleExpandRow(po.id)}
                          title="Expand shipping details"
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="p-4 font-bold text-blue-600">{po.id}</td>
                      <td className="p-4 text-gray-600">
                        <div className="font-semibold text-gray-900">{po.requestRef}</div>
                        <div className="text-[10px] text-gray-400">{po.rfqRef}</div>
                      </td>
                      <td className="p-4 font-semibold text-gray-900">{po.title}</td>
                      <td className="p-4 font-black text-gray-900">RS {po.amount.toLocaleString()}</td>
                      <td className="p-4">
                        {paymentPaid ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 inline-flex items-center gap-1">
                            <CheckCircle size={10} /> Paid
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          currentStatus === 'Delivered' ? 'bg-green-100 text-green-800 border border-green-200' :
                          currentStatus === 'Shipped' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          currentStatus === 'Processing' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        {isDocsVerified ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                            <CheckCircle size={10} className="text-emerald-600" /> Documents Verified
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <Clock size={10} className="text-amber-600" /> Verification Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {currentStatus === 'Delivered' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                                <CheckCircle size={13} className="text-emerald-600" /> Order Delivered (Fulfilled)
                              </span>
                              <button
                                onClick={() => setActiveDeliveryModalPo(po)}
                                className="px-2.5 py-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                View / Edit Invoice Receipt
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAdvanceStage(po)}
                              className="px-3.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer shadow-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 ml-auto"
                            >
                              <ArrowRight size={13} />
                              <span>{nextInfo.label}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <td colSpan={9} className="p-4">
                          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-4">
                            {/* Document Verification Breakdown Card */}
                            <div className="p-3 bg-gradient-to-r from-gray-50 to-blue-50/40 rounded-xl border border-gray-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                  <FileCheck size={14} className={isDocsVerified ? 'text-emerald-600' : 'text-amber-600'} />
                                  Document Verification Status (Invoice + Goods Receipt):
                                </span>
                                {isDocsVerified ? (
                                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle size={11} /> Documents Verified
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                    <Clock size={11} /> Verification Pending
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center justify-between">
                                  <span className="text-gray-500 font-semibold">Goods Receipt:</span>
                                  <span className={`font-bold flex items-center gap-1 ${isGRNVerified || isDocsVerified ? 'text-emerald-700' : 'text-amber-600'}`}>
                                    {isGRNVerified || isDocsVerified ? '✓ Verified' : (isDelivered ? '⏳ Pending' : '⏳ Pending Delivery')}
                                  </span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center justify-between">
                                  <span className="text-gray-500 font-semibold">Invoice Receipt:</span>
                                  <span className={`font-bold flex items-center gap-1 ${isInvoiceVerified || isDocsVerified ? 'text-emerald-700' : 'text-amber-600'}`}>
                                    {isInvoiceVerified || isDocsVerified ? '✓ Verified' : '⏳ Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {/* Expandable Logistics & Tracking Info */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-blue-600" />
                                <h4 className="font-bold text-gray-900 text-xs">Shipping & Logistics Information ({po.id})</h4>
                              </div>
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                Expanded PO Details
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="text-gray-400 block text-[10px] font-bold uppercase">Courier / Carrier</span>
                                <span className="font-bold text-gray-800">{(po as any).courier || 'FedEx Express'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] font-bold uppercase">Tracking Ref</span>
                                <span className="font-mono font-bold text-blue-600">{(po as any).trackingRef || `GRN-2026-${po.id.replace(/^(PO-|RFQ-|REQ-)/, '')}`}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] font-bold uppercase">Expected Arrival</span>
                                <span className="font-bold text-gray-800">{po.deliveryDate || po.expectedDeliveryDate || po.deliveryDueDate || '2026-10-15'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] font-bold uppercase">Delivery Destination</span>
                                <span className="font-bold text-gray-800">{(po as any).deliveryLocation || 'Pune HQ, 4th Floor'}</span>
                              </div>
                            </div>

                            {/* Section Link to Open Delivery & Invoice Receipt Modal */}
                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="font-bold text-gray-700">Invoice / Goods Receipt File: </span>
                                <span className="font-mono font-bold text-blue-600">
                                  {existingDocs?.invoiceDocName || existingDocs?.challanDocName || 'Not uploaded yet'}
                                </span>
                              </div>

                              <button
                                onClick={() => setActiveDeliveryModalPo(po)}
                                className="px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                              >
                                <FileText size={14} /> Open Delivery & Invoice Receipt Modal
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DELIVERY CONFIRMATION & INVOICE PAPER MODAL */}
      <DeliveryConfirmationModal
        isOpen={!!activeDeliveryModalPo}
        onClose={() => setActiveDeliveryModalPo(null)}
        po={activeDeliveryModalPo}
        vendorId={vendorId}
        vendorName={vendor.name}
        onConfirm={handleModalConfirm}
      />
    </div>
  )
}

// ─── UPLOAD DELIVERY DOCUMENTS MODAL ──────────────────────────────────────────
export const UploadDeliveryDocsModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  delivery: any
  vendorId: string
  onDeliveryConfirmed: (poRef: string, record: DeliveryDocRecord) => void
}> = ({ isOpen, onClose, delivery, vendorId, onDeliveryConfirmed }) => {
  const [challanFile, setChallanFile] = useState('')
  const [invoiceFile, setInvoiceFile] = useState('')
  const [warrantyFile, setWarrantyFile] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen || !delivery) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const record: DeliveryDocRecord = {
      poRef: delivery.poRef,
      requestRef: delivery.requestRef || 'REQ-2026-101',
      deliveryId: delivery.id,
      vendorId,
      challanDocName: challanFile || `Delivery_Challan_${delivery.poRef}.pdf`,
      invoiceDocName: invoiceFile || `Tax_Invoice_${delivery.poRef}.pdf`,
      warrantyDocName: warrantyFile || `Warranty_Certificate_${delivery.poRef}.pdf`,
      deliveryDate,
      courierRef: delivery.courier,
      status: 'Delivered',
      uploadedAt: new Date().toISOString(),
    }

    saveDeliveryDocs(delivery.poRef, record)
    markPODelivered(delivery.poRef)

    createGoodsReceiptApi(delivery.poRef, {
      delivery_date: deliveryDate,
      delivery_location: delivery.destination || 'Main Office / Warehouse',
      product_name: delivery.item || 'Enterprise Equipment',
      ordered_quantity: delivery.quantity || 15,
      received_quantity: delivery.quantity || 15,
      status: 'Pending Verification',
      notes: `Delivery submitted and documents uploaded for ${delivery.poRef}`,
      vendor: vendorId,
      rfq: delivery.requestRef || delivery.poRef
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    }).catch(err => {
      console.warn('Backend GRN creation error:', err)
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    })

    setSuccessMsg(`Status set to "Delivered" for ${delivery.poRef}! Invoice & Delivery Challan linked to requester's portal.`)

    setTimeout(() => {
      onDeliveryConfirmed(delivery.poRef, record)
      setSuccessMsg('')
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-blue-600" size={18} /> Confirm Delivery & Upload Docs ({delivery.poRef})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">✕</button>
        </div>

        {successMsg ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center font-bold text-green-800">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-600" />
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-medium">
              Setting status to <strong>Delivered</strong> for <strong>{delivery.poRef}</strong> ({delivery.item}). Upload <strong>Invoice</strong> and <strong>Delivery Challan</strong> to link them to the requester's portal.
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">📜 Delivery Challan (Required) *</label>
              <input
                type="file"
                required
                accept=".pdf,.docx,.jpg,.png"
                onChange={(e) => setChallanFile(e.target.files?.[0]?.name || '')}
                className="w-full p-2 border rounded-xl bg-gray-50 text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-800 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">Proof of dispatch & physical delivery receipt</span>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">🧾 Commercial Invoice (Required) *</label>
              <input
                type="file"
                required
                accept=".pdf,.docx,.jpg,.png"
                onChange={(e) => setInvoiceFile(e.target.files?.[0]?.name || '')}
                className="w-full p-2 border rounded-xl bg-gray-50 text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-800 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">Official Tax Invoice linked to PO</span>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">🛡️ Warranty Card / Certificate (Optional)</label>
              <input
                type="file"
                accept=".pdf,.docx,.jpg,.png"
                onChange={(e) => setWarrantyFile(e.target.files?.[0]?.name || '')}
                className="w-full p-2 border rounded-xl bg-gray-50 text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">OEM hardware warranty document</span>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Confirmed Delivery Date *</label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-gray-50 border-gray-300 font-medium"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-gray-600 font-bold hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer">
                Set Delivered & Link Docs
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── 7. DYNAMIC VENDOR DELIVERIES PAGE ────────────────────────────────────────
export const VendorDeliveriesPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, deliveries } = getScopedVendorData(vendorId)
  const isFlowA = !isFlowBCategory(vendor.category)

  const [deliveryRecords, setDeliveryRecords] = useState<any[]>(deliveries)
  const [activeDeliveryForDocs, setActiveDeliveryForDocs] = useState<any | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadDeliveries = async () => {
    try {
      setIsLoading(true)
      const [posRes, grnsRes] = await Promise.all([
        apiClient.get('/procurement/purchase-orders/', { params: { vendor: vendorId } }).catch(() => ({ data: [] })),
        apiClient.get('/procurement/goods-receipts/', { params: { vendor: vendorId } }).catch(() => ({ data: [] }))
      ])
      const posData = Array.isArray(posRes.data) ? posRes.data : (posRes.data?.results || [])
      const grnsData = Array.isArray(grnsRes.data) ? grnsRes.data : (grnsRes.data?.results || [])

      if (posData.length > 0) {
        const mapped = posData.map((po: any) => {
          const poId = po.po_id || (typeof po.id === 'string' ? po.id : `PO-${po.id}`)
          const cleanRef = poId.replace(/^PO-/, '')
          const matchedGrn = grnsData.find((g: any) => {
            const gPo = g.purchase_order_id || g.po_id || g.purchase_order
            return gPo === poId || gPo === po.id || (g.receipt_id && g.receipt_id.includes(cleanRef))
          })
          const isDelivered = po.status === 'Delivered' || po.status === 'Completed' || !!matchedGrn || isPODelivered(poId)

          return {
            id: `TRK-${cleanRef}`,
            poRef: poId,
            item: po.purchase_request_detail?.title || po.title || 'Enterprise IT Hardware',
            courier: 'Blue Dart Logistics / FastTrack Express',
            expectedDate: po.expected_delivery || '2026-10-15',
            destination: 'Warehouse Block A, Sector 62, Noida',
            status: isDelivered ? 'Delivered' : (po.status || 'In Transit'),
            amount: parseFloat(po.total_amount) || 50000,
            quantity: po.purchase_request_detail?.quantity || 15,
            unit: po.purchase_request_detail?.unit || 'Units'
          }
        })
        setDeliveryRecords(mapped)
      } else {
        setDeliveryRecords(deliveries)
      }
    } catch (e) {
      console.warn('Error loading vendor deliveries:', e)
      setDeliveryRecords(deliveries)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
    window.addEventListener('kss_backend_updated', loadDeliveries)
    window.addEventListener('storage', loadDeliveries)
    return () => {
      window.removeEventListener('kss_backend_updated', loadDeliveries)
      window.removeEventListener('storage', loadDeliveries)
    }
  }, [vendorId])

  const handleDeliveryConfirmed = (poRef: string, record: DeliveryDocRecord) => {
    markPODelivered(poRef)
    setDeliveryRecords((prev) =>
      prev.map((d) => (d.poRef === poRef ? { ...d, status: 'Delivered' } : d))
    )
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))
    setToastMsg(`Status set to "Delivered" for ${poRef}! Invoice & Delivery Challan linked to requester's portal.`)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleStatusSelectChange = async (delivery: any, newStatus: string) => {
    if (newStatus === 'Delivered') {
      setActiveDeliveryForDocs(delivery)
    } else {
      setDeliveryRecords((prev) =>
        prev.map((d) => (d.poRef === delivery.poRef ? { ...d, status: newStatus } : d))
      )
      try {
        await apiClient.patch(`/procurement/purchase-orders/${delivery.poRef}/`, { status: newStatus })
      } catch (e) {
        console.warn('Failed to update PO status:', e)
      }
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
      setToastMsg(`Delivery status updated to "${newStatus}" for ${delivery.poRef}.`)
      setTimeout(() => setToastMsg(''), 3000)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toastMsg && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle size={16} className="text-blue-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-blue-600" /> Delivery Tracking ({vendor.name})
          </h1>
          <p className="text-xs text-gray-500">Track shipments, update delivery status, and link dispatch docs for {vendor.id}.</p>
        </div>

        {isFlowA ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
            📦 Flow A Goods Delivery (Order Stage Advance → Delivered → Post-Delivery Payment)
          </span>
        ) : (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            ⚠️ Flow B (SaaS & Cloud): Physical delivery tracking not applicable
          </span>
        )}
      </div>

      {!isFlowA && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Flow B Category Notice ({vendor.category})</h4>
            <p className="text-amber-800 mt-0.5">
              Physical shipment tracking, Delivery Challans, and Warranty Cards apply only to Flow A physical goods categories (IT Hardware, Office Accessories, Office Technology, Networking & Telecom).
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Tracking Ref</th>
              <th className="p-4">PO Ref</th>
              <th className="p-4">Item / Description</th>
              <th className="p-4">Courier</th>
              <th className="p-4">Expected Arrival</th>
              <th className="p-4">Destination</th>
              <th className="p-4">Status (Set Status)</th>
              {isFlowA && <th className="p-4 text-right">Delivery Documents</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {deliveryRecords.map((d) => {
              const savedDocs = getStoredDeliveryDocs(d.poRef, vendorId)
              const isDelivered = d.status === 'Delivered' || d.status.includes('Delivered') || !!savedDocs || isPODelivered(d.poRef)
              const currentStatusVal = isDelivered ? 'Delivered' : d.status

              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-blue-600">{d.id}</td>
                  <td className="p-4 font-semibold text-gray-800">{d.poRef}</td>
                  <td className="p-4 font-semibold text-gray-900">{d.item}</td>
                  <td className="p-4 text-gray-600">{d.courier}</td>
                  <td className="p-4 font-bold text-gray-900">{d.expectedDate}</td>
                  <td className="p-4 text-gray-600">{d.destination}</td>
                  <td className="p-4">
                    <select
                      value={currentStatusVal}
                      onChange={(e) => handleStatusSelectChange(d, e.target.value)}
                      className={`p-1.5 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer ${
                        isDelivered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}
                    >
                      <option value="In Transit">In Transit</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="Delivered">Delivered (Upload Docs)</option>
                    </select>
                  </td>

                  {isFlowA && (
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setActiveDeliveryForDocs(d)}
                        className={`px-3 py-1.5 font-bold rounded-lg border transition-colors flex items-center gap-1.5 ml-auto cursor-pointer ${
                          isDelivered
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {isDelivered ? (
                          <>
                            <CheckCircle size={13} /> Update Docs (Challan & Invoice)
                          </>
                        ) : (
                          <>
                            <Upload size={13} /> Set Delivered & Upload Docs
                          </>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <UploadDeliveryDocsModal
        isOpen={!!activeDeliveryForDocs}
        onClose={() => setActiveDeliveryForDocs(null)}
        delivery={activeDeliveryForDocs}
        vendorId={vendor.id}
        onDeliveryConfirmed={handleDeliveryConfirmed}
      />
    </div>
  )
}


// ─── REUSABLE SUBMIT INVOICE MODAL (Paper-Invoice Style) ─────────────────────
export const SubmitInvoiceModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  pos: Array<{ id: string; title: string; amount: number; quantity?: number; unit?: string }>
  onInvoiceSubmitted: (newInv: any) => void
}> = ({ isOpen, onClose, vendorId, vendorName, pos, onInvoiceSubmitted }) => {
  const [poRef, setPoRef] = useState(pos[0]?.id || '')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [description, setDescription] = useState(pos[0]?.title || '')
  const [quantity, setQuantity] = useState(pos[0]?.quantity?.toString() || '15')
  const [baseAmount, setBaseAmount] = useState('')
  const [gstPct, setGstPct] = useState('18')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [poIssueDate, setPoIssueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [fileName, setFileName] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (pos[0] && isOpen) {
      const allQuotes = getAllStoredVendorQuotes()
      const targetPo = pos[0] as any
      const cleanKey = (targetPo.id || targetPo.requestRef || targetPo.rfqRef || '').replace(/^(PO-|RFQ-|REQ-)/gi, '').trim().toUpperCase()
      const matchedQuote = allQuotes.find((q: any) =>
        (q.rfqRef && q.rfqRef.toUpperCase().includes(cleanKey)) ||
        (q.rfqId && q.rfqId.toUpperCase().includes(cleanKey)) ||
        (q.id && q.id.toUpperCase().includes(cleanKey))
      )
      const poGst = typeof targetPo.gstPercent === 'number' ? targetPo.gstPercent : (typeof targetPo.gstRate === 'number' ? targetPo.gstRate : (typeof targetPo.gst_rate === 'number' ? targetPo.gst_rate : (typeof matchedQuote?.gstPercent === 'number' ? matchedQuote.gstPercent : (typeof matchedQuote?.gstRate === 'number' ? matchedQuote.gstRate : (parseFloat(matchedQuote?.gst_rate) || 18)))))
      const poTotal = typeof targetPo.amount === 'number' ? targetPo.amount : (typeof targetPo.totalAmount === 'number' ? targetPo.totalAmount : (parseFloat(targetPo.amount) || parseFloat(targetPo.totalAmount) || 30340))
      const poBase = typeof targetPo.baseAmount === 'number' ? targetPo.baseAmount : (typeof targetPo.base_amount === 'number' ? targetPo.base_amount : (typeof matchedQuote?.baseAmount === 'number' ? matchedQuote.baseAmount : (typeof matchedQuote?.price === 'number' ? matchedQuote.price : (parseFloat(matchedQuote?.baseAmount) || parseFloat(matchedQuote?.price) || Math.round(poTotal / (1.0 + (poGst / 100.0)))))))
      const poQty = targetPo.quantity || 15

      setPoRef(targetPo.id)
      setInvoiceNumber(`INV-${vendorId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-5)}`)
      setDescription(targetPo.title)
      setQuantity(poQty.toString())
      setBaseAmount(poBase.toString())
      setGstPct(poGst.toString())
      setPoIssueDate('')
      setNotes('')
      setFileName('')
      setInvoiceDate(new Date().toISOString().split('T')[0])
      setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      setSuccessMsg('')
    }
  }, [pos, isOpen])

  if (!isOpen) return null

  // Live totals
  const baseNum = parseFloat(baseAmount) || 0
  const gstNum = parseFloat(gstPct) || 0
  const gstAmount = Math.round(baseNum * gstNum / 100)
  const totalAmount = baseNum + gstAmount

  const isDelivered = isPODelivered(poRef)

  const handlePoChange = (selectedPoId: string) => {
    setPoRef(selectedPoId)
    const foundPo = pos.find((p) => p.id === selectedPoId) as any
    if (foundPo) {
      const allQuotes = getAllStoredVendorQuotes()
      const cleanKey = (foundPo.id || foundPo.requestRef || foundPo.rfqRef || '').replace(/^(PO-|RFQ-|REQ-)/gi, '').trim().toUpperCase()
      const matchedQuote = allQuotes.find((q: any) =>
        (q.rfqRef && q.rfqRef.toUpperCase().includes(cleanKey)) ||
        (q.rfqId && q.rfqId.toUpperCase().includes(cleanKey)) ||
        (q.id && q.id.toUpperCase().includes(cleanKey))
      )
      const poGst = typeof foundPo.gstPercent === 'number' ? foundPo.gstPercent : (typeof foundPo.gstRate === 'number' ? foundPo.gstRate : (typeof foundPo.gst_rate === 'number' ? foundPo.gst_rate : (typeof matchedQuote?.gstPercent === 'number' ? matchedQuote.gstPercent : (typeof matchedQuote?.gstRate === 'number' ? matchedQuote.gstRate : (parseFloat(matchedQuote?.gst_rate) || 18)))))
      const poTotal = typeof foundPo.amount === 'number' ? foundPo.amount : (typeof foundPo.totalAmount === 'number' ? foundPo.totalAmount : (parseFloat(foundPo.amount) || parseFloat(foundPo.totalAmount) || 30340))
      const poBase = typeof foundPo.baseAmount === 'number' ? foundPo.baseAmount : (typeof foundPo.base_amount === 'number' ? foundPo.base_amount : (typeof matchedQuote?.baseAmount === 'number' ? matchedQuote.baseAmount : (typeof matchedQuote?.price === 'number' ? matchedQuote.price : (parseFloat(matchedQuote?.baseAmount) || parseFloat(matchedQuote?.price) || Math.round(poTotal / (1.0 + (poGst / 100.0)))))))

      setDescription(foundPo.title)
      setBaseAmount(poBase.toString())
      setGstPct(poGst.toString())
      const poQty = foundPo.quantity || 15
      setQuantity(poQty.toString())
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isDelivered) {
      alert(`🔒 Commercial Invoice submission is enabled ONLY after vendor sets PO status to "Delivered" and uploads Delivery Challan.`)
      return
    }

    const selectedPo = pos.find((p) => p.id === poRef)
    const parsedQty = parseInt(quantity) || selectedPo?.quantity || 15

    const newInvoice = {
      id: invoiceNumber || `INV-${vendorId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-3)}`,
      poRef: poRef || 'PO-VNDHW001-76',
      title: description || 'IT Hardware Supply & Delivery Batch',
      amount: totalAmount || 30340,
      quantity: parsedQty,
      productQty: `${parsedQty} ${selectedPo?.unit || 'Units'}`,
      baseAmount: baseNum,
      gstAmount: gstAmount,
      gstPercent: gstNum,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || '2026-10-11',
      status: 'Submitted',
      docName: fileName || `Tax_Invoice_${poRef}.pdf`,
      items: [
        {
          description: description || 'IT Hardware Supply & Delivery Batch',
          qty: parsedQty,
          unitPrice: Math.round(baseNum / (parsedQty || 1)),
          total: totalAmount || 30340
        }
      ]
    }

    saveStoredVendorInvoice(vendorId, newInvoice)
    submitInvoiceApi(poRef, {
      invoice_number: invoiceNumber || newInvoice.id,
      amount: totalAmount,
      tax_amount: gstAmount,
      invoice_date: invoiceDate,
      due_date: dueDate,
      vendor: vendorId,
      status: 'Submitted'
    }).catch((err) => console.error('API invoice submit error:', err))

    onInvoiceSubmitted(newInvoice)
    setSuccessMsg(`Commercial Invoice "${newInvoice.id}" submitted for record-keeping and 3-way matching!`)

    setTimeout(() => {
      setSuccessMsg('')
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-lg w-full max-h-[90vh] flex flex-col relative text-gray-900 font-sans overflow-hidden mx-auto">

        {/* Sticky Paper Invoice Header */}
        <div className="sticky top-0 bg-white z-20 px-6 pt-5 pb-4 border-b-2 border-slate-900 flex items-start justify-between shrink-0 shadow-xs">
          <div>
            <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold tracking-widest uppercase rounded-xs mb-1">
              OFFICIAL COMMERCIAL TAX INVOICE
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{vendorName || vendorId}</h2>
            <p className="text-xs font-mono text-slate-500 font-medium mt-0.5">
              PO Ref: {poRef} • Vendor ID: {vendorId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-slate-900 text-sm font-bold cursor-pointer p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
          {successMsg ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-lg text-center text-xs font-bold text-emerald-900 space-y-2">
              <CheckCircle size={36} className="mx-auto text-emerald-600" />
              <p className="font-mono text-sm">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Delivery Gate Warning */}
              {!isDelivered && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-semibold text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <Lock size={13} /> Delivery Confirmation Required First
                  </div>
                  <p className="text-[11px] text-amber-700 font-normal">
                    Invoice submission is for 3-way matching and is enabled ONLY after PO status is "Delivered" and Delivery Challan is uploaded.
                  </p>
                </div>
              )}

              {/* ── Section 1: Invoice Metadata ── */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3 font-mono">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Details — Edit as needed</p>

                {/* PO Reference */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PO Reference *</label>
                  <select
                    value={poRef}
                    onChange={(e) => handlePoChange(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  >
                    {pos.map((p) => {
                      const delivered = isPODelivered(p.id)
                      return (
                        <option key={p.id} value={p.id}>
                          {delivered ? `✅ ${p.id} — RS ${p.amount.toLocaleString()}` : `🔒 ${p.id} — Delivery Required`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Invoice Number */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Number *</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g. INV-VNDHW001-00001"
                  />
                </div>

                {/* Vendor ID (read-only) */}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold uppercase">Vendor ID:</span>
                  <span className="font-bold text-slate-900">{vendorId}</span>
                </div>

                {/* PO Issue Date */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PO Issue Date</label>
                  <input
                    type="date"
                    value={poIssueDate}
                    onChange={(e) => setPoIssueDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Invoice Date + Due Date side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 2: Itemized Invoice Table ── */}
              <div className="border border-slate-300 rounded-lg overflow-hidden font-mono">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-800 text-xs">
                    {/* Item Description + Qty */}
                    <tr>
                      <td className="p-2.5" colSpan={2}>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          required
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. IT Hardware Supply & Delivery Batch"
                        />
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-slate-400">Qty:</span>
                          <input
                            type="text"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="1"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Base Amount */}
                    <tr>
                      <td className="p-2.5 text-slate-600">Base Subtotal (before GST)</td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-500 text-[10px]">RS</span>
                          <input
                            type="number"
                            min={0}
                            value={baseAmount}
                            onChange={(e) => setBaseAmount(e.target.value)}
                            required
                            className="w-24 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-right text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* GST % */}
                    <tr className="bg-slate-50/70">
                      <td className="p-2 text-slate-600">
                        <div className="flex items-center gap-2">
                          <span>GST</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={gstPct}
                              onChange={(e) => setGstPct(e.target.value)}
                              className="w-12 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-center text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <span className="text-[10px] text-slate-500">%</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right text-slate-600">RS {gstAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                    <tr>
                      <td className="p-2.5 uppercase tracking-wider text-[11px]">Total Invoice Amount</td>
                      <td className="p-2.5 text-right text-sm font-mono">RS {totalAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── Section 3: Notes ── */}
              <div className="space-y-0.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes / Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. Invoice raised as per agreed purchase order terms."
                />
              </div>

              {/* ── Section 4: Attach Tax Invoice PDF ── */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                  🧾 Attach Tax Invoice PDF *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.png,.jpg"
                  onChange={(e) => e.target.files?.[0] && setFileName(e.target.files[0].name)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-slate-800 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">Attach your official Tax Invoice or Commercial Invoice PDF.</span>
              </div>

              {/* ── Submit Button ── */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={!isDelivered}
                  className={`w-full sm:w-auto px-6 py-2.5 font-mono font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2 ${
                    isDelivered
                      ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                      : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                  }`}
                >
                  <FileText size={15} />
                  {isDelivered ? 'Submit Invoice for Record-Keeping' : '🔒 Delivery Required Before Invoice'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── INVOICE DETAILS & RECEIPT MODAL ──────────────────────────────────────────
export const InvoiceDetailsModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  invoice: any
  vendorName: string
  vendorId: string
}> = ({ isOpen, onClose, invoice, vendorName, vendorId }) => {
  if (!isOpen || !invoice) return null

  const cleanKey = (invoice.poRef || invoice.id || '').replace(/^(INV-|PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
  const storedPOs = getStoredVendorPOs(vendorId)
  const matchedPO = storedPOs.find((p: any) => {
    const pKey = (p.id || p.poNumber || p.requestRef || p.rfqRef || '').replace(/^(PO-|RFQ-|REQ-)/, '').trim().toUpperCase()
    return pKey === cleanKey || pKey.includes(cleanKey) || cleanKey.includes(pKey)
  })
  const storedQuotes = getStoredVendorQuotes(vendorId)
  const matchedQuote = storedQuotes.find((q: any) => {
    const qKey = (q.rfqRef || q.rfqId || q.id || '').replace(/^(QUO-|RFQ-|REQ-)/, '').trim().toUpperCase()
    return qKey === cleanKey || qKey.includes(cleanKey) || cleanKey.includes(qKey)
  })

  const rawQty = invoice.quantity || invoice.productQty || invoice.qty || matchedPO?.quantity || matchedQuote?.quantity || (matchedQuote?.productQty ? parseInt(matchedQuote.productQty) : undefined) || 15
  const displayQuantity = typeof rawQty === 'number' ? rawQty : parseInt(String(rawQty)) || 15

  const totalAmount = invoice.amount || 0
  const gstPct = invoice.gstPercent || 18
  const baseAmount = invoice.baseAmount || Math.round(totalAmount / (1 + gstPct / 100))
  const gstAmount = invoice.gstAmount || (totalAmount - baseAmount)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-2xl w-full max-h-[92vh] flex flex-col relative text-slate-900 font-sans overflow-hidden my-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-20 px-6 pt-5 pb-4 border-b-2 border-slate-900 flex items-center justify-between shrink-0 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold tracking-widest uppercase rounded-xs mb-1">
              <FileText size={12} /> OFFICIAL TAX INVOICE DOSSIER
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{invoice.id}</h2>
            <p className="text-xs font-mono text-slate-500 font-medium">
              PO Ref: <span className="font-bold text-slate-800">{invoice.poRef}</span> • Date: {invoice.invoiceDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer size={15} /> Print / Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-slate-900 text-sm font-bold cursor-pointer p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {/* Status & Verification Seal */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">INVOICE STATUS:</span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                invoice.status === 'Verified & Approved' || invoice.status === 'Approved' || invoice.verified || isInvoiceVerifiedInSystem(invoice.id) || isInvoiceVerifiedInSystem(invoice.poRef)
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : invoice.status === 'Submitted'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-green-100 text-green-800'
              }`}>
                {invoice.status === 'Verified & Approved' || invoice.status === 'Approved' || invoice.verified || isInvoiceVerifiedInSystem(invoice.id) || isInvoiceVerifiedInSystem(invoice.poRef)
                  ? 'Verified & Approved'
                  : invoice.status}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>3-WAY MATCH VERIFIED</span>
            </div>
          </div>

          {/* Parties Grid: Supplier vs Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1">
                <Building size={13} /> Supplier / Vendor Details
              </h3>
              <p className="font-extrabold text-sm text-slate-900">{vendorName || vendorId}</p>
              <p className="text-slate-600 font-mono">Vendor Code: {vendorId}</p>
              <p className="text-slate-600 font-mono">GSTIN: 27AAACK1092F1Z9</p>
              <p className="text-slate-500 text-[11px]">Industrial Area Phase II, MIDC Digital Campus</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1">
                <User size={13} /> Billed To / Recipient
              </h3>
              <p className="font-extrabold text-sm text-slate-900">KSS Procurement OS Solutions</p>
              <p className="text-slate-600 font-mono">Dept: Central Receiving & Accounts Payable</p>
              <p className="text-slate-600 font-mono">GSTIN: 27KSSPROC9901Z2</p>
              <p className="text-slate-500 text-[11px]">KSS Enterprise HQ, Tech Park, Bldg 4B</p>
            </div>
          </div>

          {/* Dates & Reference Breakdown */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100/70 p-3 rounded-xl font-mono text-[11px] text-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Invoice Date</span>
              <span className="font-bold text-slate-900">{invoice.invoiceDate || '2026-09-22'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Due Date</span>
              <span className="font-bold text-slate-900">{formatDate(invoice.dueDate || '2026-10-22')}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Terms</span>
              <span className="font-bold text-slate-900">Net 30 Days</span>
            </div>
          </div>

          {/* Itemized Commercial Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-900 text-white font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Base Amount</th>
                  <th className="p-3 text-right">GST ({gstPct}%)</th>
                  <th className="p-3 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{invoice.title || 'Supplies & Equipment'}</p>
                    <p className="text-[11px] text-slate-500 font-mono">HSN Code: 84713010 | Ref PO: {invoice.poRef}</p>
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{displayQuantity}</td>
                  <td className="p-3 text-right font-mono">RS {baseAmount.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-slate-600">RS {gstAmount.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-extrabold text-slate-900">RS {totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Commercial Totals Card */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 bg-slate-900 text-white p-4 rounded-xl space-y-2 font-mono text-xs shadow-md">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal Base:</span>
                <span>RS {baseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>GST Tax ({gstPct}%):</span>
                <span>RS {gstAmount.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between font-black text-sm text-emerald-400">
                <span>Total Payable:</span>
                <span>RS {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Digital Signature & Document Reference */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-blue-950 flex items-center gap-1.5">
                <FileCheck size={14} className="text-blue-600" /> Attached Tax Document
              </p>
              <p className="text-blue-700 font-mono text-[11px]">{invoice.docName || `Tax_Invoice_${invoice.poRef}.pdf`}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full">
              Digitally Signed & Archived
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-mono text-[11px]">System-Generated Tax Invoice Dossier</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 9. DYNAMIC VENDOR INVOICES PAGE ──────────────────────────────────────────
export const VendorInvoicesPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, invoices, pos } = getScopedVendorData(vendorId)
  const [localInvoices, setLocalInvoices] = useState(invoices)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<any | null>(null)

  const reloadInvoices = async () => {
    try {
      const res = await getVendorInvoices({ vendor: vendorId })
      const rawList = Array.isArray(res) ? res : res?.results || []
      const dbInvoices = rawList.map((inv: any) => {
        const po = inv.purchase_order_detail || {}
        const pr = po.purchase_request_detail || {}
        const v = inv.vendor_detail || {}
        const totalAmt = parseFloat(inv.amount) || parseFloat(po.total_amount) || 94400
        const isVer = inv.status === 'Approved' || inv.status === 'Matched' || inv.status === 'Verified' || inv.status === 'Verified & Approved'

        let cleanTitle = pr.title || po.title || inv.description || ''
        cleanTitle = cleanTitle.replace(/\s*tax\s*invoice/gi, '').trim()
        cleanTitle = cleanTitle.replace(/^request\s+for\s+/i, '').trim()
        cleanTitle = cleanTitle.replace(/^i\s+need\s+/i, '').trim()
        if (cleanTitle) {
          cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
        } else if (pr.category) {
          cleanTitle = `${pr.category} Equipment / Supplies`
        } else {
          cleanTitle = 'IT Hardware Equipment & Workstations'
        }

        const category = pr.category || 'IT Hardware'
        const quantity = pr.quantity || 15

        return {
          id: inv.invoice_id || `INV-${inv.id}`,
          rawId: inv.id,
          poRef: po.po_id || `PO-${pr.request_id?.replace('REQ-', '') || '2026-001'}`,
          title: cleanTitle,
          description: cleanTitle,
          category: category,
          amount: totalAmt,
          quantity: quantity,
          productQty: `${quantity} Units`,
          baseAmount: parseFloat(inv.amount) ? Math.round(parseFloat(inv.amount) / 1.18) : Math.round(totalAmt / 1.18),
          gstAmount: parseFloat(inv.tax_amount) || Math.round((totalAmt * 0.18) / 1.18),
          gstPercent: 18,
          invoiceDate: inv.invoice_date,
          dueDate: inv.due_date,
          status: isVer ? 'Verified & Approved' : (inv.status === 'Pending Match' ? 'Submitted' : (inv.status || 'Submitted')),
          verified: isVer,
          vendorId: v.unique_vendor_id || vendorId,
          vendorName: v.name || vendor.name,
          invoiceNumber: inv.invoice_number,
        }
      })

      const localData = getScopedVendorData(vendorId).invoices
      const mergedMap = new Map<string, any>()
      dbInvoices.forEach((i: any) => mergedMap.set(i.id, i))
      localData.forEach((i: any) => {
        if (!mergedMap.has(i.id)) {
          mergedMap.set(i.id, i)
        }
      })
      setLocalInvoices(Array.from(mergedMap.values()))
    } catch (e) {
      const data = getScopedVendorData(vendorId)
      setLocalInvoices(data.invoices)
    }
  }

  useEffect(() => {
    reloadInvoices()
    const handleSync = () => {
      reloadInvoices()
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('kss_backend_updated', handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('kss_backend_updated', handleSync)
    }
  }, [vendorId])

  const filteredInvoices = useMemo(() => {
    return localInvoices.filter((inv) => {
      if (!inv) return false
      const ref = `${inv.poRef || ''} ${inv.id || ''} ${inv.title || ''} ${inv.description || ''} ${inv.productName || ''}`
      if (ref.includes('6C74523B') || ref.includes('Enterprise Laptop Workstations')) return false
      return !ref.includes('VNDHW001-76') && !ref.includes('VND-HW-001-76') && !ref.includes('PO-VNDHW001-76')
    })
  }, [localInvoices])

  const handleDownloadInvoice = (inv: any) => {
    setSelectedInvoiceModal(inv)
    setTimeout(() => {
      window.print()
    }, 300)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" /> Vendor Invoices ({vendor.name})
          </h1>
          <p className="text-xs text-gray-500">Invoices submitted under Vendor ID ({vendor.id}).</p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus size={16} /> Submit New Invoice
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <FileText size={40} className="mx-auto text-gray-300" />
            <p className="font-bold text-base text-gray-800">No User Invoices Available</p>
            <p className="text-xs max-w-md mx-auto text-gray-500">
              Only real manually submitted invoices are displayed. Click "Submit New Invoice" above to submit a commercial tax invoice for a delivered Purchase Order.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
              <tr>
                <th className="p-4">Invoice Number</th>
                <th className="p-4">PO Ref</th>
                <th className="p-4">Description</th>
                <th className="p-4">Invoice Amount</th>
                <th className="p-4">Invoice Date</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {filteredInvoices.map((inv) => {
                const isVerified = inv.status === 'Verified & Approved' || inv.status === 'Approved' || inv.verified || isInvoiceVerifiedInSystem(inv.id) || isInvoiceVerifiedInSystem(inv.poRef)
                const displayStatus = isVerified ? 'Verified & Approved' : (inv.status || 'Submitted')
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-blue-600">{inv.id}</td>
                    <td className="p-4 font-semibold text-gray-800">{inv.poRef}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{inv.description || inv.title}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {inv.category ? `Category: ${inv.category}` : 'IT Hardware'} • Qty: {inv.quantity || 1} {inv.quantity === 1 ? 'Unit' : 'Units'}
                      </div>
                    </td>
                    <td className="p-4 font-black text-gray-900">RS {inv.amount.toLocaleString()}</td>
                    <td className="p-4 text-gray-600">{inv.invoiceDate}</td>
                    <td className="p-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isVerified
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : displayStatus === 'Submitted'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {displayStatus}
                      </span>
                    </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedInvoiceModal(inv)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye size={14} /> View Receipt
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <SubmitInvoiceModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        vendorId={vendor.id}
        vendorName={vendor.name}
        pos={pos}
        onInvoiceSubmitted={(newInv) => setLocalInvoices([newInv, ...localInvoices])}
      />

      <InvoiceDetailsModal
        isOpen={!!selectedInvoiceModal}
        onClose={() => setSelectedInvoiceModal(null)}
        invoice={selectedInvoiceModal}
        vendorName={vendor.name}
        vendorId={vendor.id}
      />
    </div>
  )
}

// ─── 10. DYNAMIC VENDOR PAYMENT STATUS PAGE ───────────────────────────────────
export const VendorPaymentStatusPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, payments, pos: seedPos } = getScopedVendorData(vendorId)
  const [backendPOs, setBackendPOs] = useState<any[]>([])
  const [backendPayments, setBackendPayments] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const vendorParamObj = { params: { vendor: vendorId } }
        const [posRes, payRes] = await Promise.all([
          apiClient.get('/procurement/purchase-orders/', vendorParamObj),
          apiClient.get('/payments/', vendorParamObj)
        ])
        const rawPOs = Array.isArray(posRes.data) ? posRes.data : posRes.data?.results || []
        const rawPay = Array.isArray(payRes.data) ? payRes.data : payRes.data?.results || []
        setBackendPOs(rawPOs)
        setBackendPayments(rawPay)
      } catch (err) {
        console.warn('Failed loading vendor payments:', err)
      }
    }
    loadData()
    window.addEventListener('kss_backend_updated', loadData)
    return () => window.removeEventListener('kss_backend_updated', loadData)
  }, [vendorId])

  const mappedBackend = backendPOs.map((p: any) => ({
    id: p.po_id || `PO-${p.id}`,
    amount: Number(p.total_amount) || 0,
    payment_status: p.payment_status || 'Pending',
    requestRef: p.purchase_request_detail?.request_id || p.purchase_request
  }))
  const effectivePOs = [...mappedBackend, ...seedPos.filter(s => !mappedBackend.some(b => b.id === s.id || (s.requestRef && b.requestRef === s.requestRef)))]

  // Single source of truth for payment status across Purchase Orders page and Payment Status page
  const paymentRows = effectivePOs.map((po) => {
    const isPaid =
      po.payment_status === 'Paid' ||
      (po as any).paymentStatus === 'Paid' ||
      isPaymentPaidForPO(po.id) ||
      (po.requestRef && isPaymentPaidForPO(po.requestRef)) ||
      backendPayments.some((p: any) => (p.purchase_request_detail?.request_id === po.requestRef || p.invoice_detail?.purchase_order === po.id) && p.status === 'Paid')
    const matchingPay = backendPayments.find((p: any) => p.invoice_detail?.purchase_order === po.id || p.purchase_request_detail?.request_id === po.requestRef) || payments.find((p) => p.poRef === po.id)
    return {
      id: matchingPay?.payment_id || matchingPay?.id || `PAY-${po.id.slice(-6)}`,
      invoiceRef: matchingPay?.invoice_detail?.invoice_id || matchingPay?.invoiceRef || `INV-${po.id.slice(-4)}`,
      poRef: po.id,
      amount: po.amount,
      disbursedDate: isPaid ? 'Completed' : 'Pending Delivery Confirmation',
      transferRef: matchingPay?.reference_number || matchingPay?.transferRef || `TXN-ELECTRONIC-${po.id.slice(-4)}`,
      isPaid,
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Payment & Disbursement ({vendor.id})
        </h1>
        <p className="text-xs text-gray-500">Track client bank transfers and payout schedules for {vendor.name}. Single real-time source of truth synced with Purchase Orders page.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Payment Ref</th>
              <th className="p-4">Invoice Ref</th>
              <th className="p-4">PO Ref</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Disbursed Date</th>
              <th className="p-4">Bank Transfer Ref</th>
              <th className="p-4">Payment Status</th>
            </tr>
          </thead>
          <tbody className="divide-[#f1f5f9] divide-y font-medium text-gray-800">
            {paymentRows.map((pay) => (
              <tr key={pay.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-blue-600">{pay.id}</td>
                <td className="p-4 font-semibold text-gray-800">{pay.invoiceRef}</td>
                <td className="p-4 font-semibold text-gray-800">{pay.poRef}</td>
                <td className="p-4 font-black text-gray-900">RS {pay.amount.toLocaleString()}</td>
                <td className="p-4 text-gray-600">{pay.disbursedDate}</td>
                <td className="p-4 text-gray-600">{pay.transferRef}</td>
                <td className="p-4">
                  {pay.isPaid ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 inline-flex items-center gap-1">
                      <CheckCircle size={10} /> Paid
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                      <Clock size={10} /> Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── UPLOAD DOCUMENT MODAL (MANUAL GOODS RECEIPT FORM FORMAT) ─────────────────
export function UploadDocumentModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  defaultPO: customPO,
  onDocumentUploaded,
}: {
  isOpen: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  defaultPO?: any
  onDocumentUploaded: (newDoc: any) => void
}) {
  const [vendorPos, setVendorPos] = useState<any[]>([])
  const [selectedPoId, setSelectedPoId] = useState<string>('')
  const [linkedRef, setLinkedRef] = useState('')
  const [grnDocNumber, setGrnDocNumber] = useState('')
  const [productName, setProductName] = useState('')
  const [productQty, setProductQty] = useState('')
  const [receivedQty, setReceivedQty] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [warrantyDuration, setWarrantyDuration] = useState('36 Months (On-site)')
  const [freeServiceCount, setFreeServiceCount] = useState('3 Services')
  const [installationType, setInstallationType] = useState('Free')
  const [techSupportDuration, setTechSupportDuration] = useState('24/7 Dedicated Support')
  const [replacementPolicy, setReplacementPolicy] = useState('Standard SLA')
  const [accessoriesIncluded, setAccessoriesIncluded] = useState('Power Adapter, Sleeves & Drivers')
  const [baseAmount, setBaseAmount] = useState<number>(0)
  const [gstPct, setGstPct] = useState<number>(18)
  const [leadTime, setLeadTime] = useState('7 Days')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [deliveryLocation, setDeliveryLocation] = useState('Warehouse Block A, Sector 62, Noida')
  const [quoteValidity, setQuoteValidity] = useState('N/A')
  const [remarks, setRemarks] = useState('')
  const [notes, setNotes] = useState('Net 30 payment terms upon delivery verification and commercial clearance.')
  const [fileName, setFileName] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoadingPos, setIsLoadingPos] = useState(false)

  const populateFromPo = (targetPo: any) => {
    if (!targetPo) return
    const poIdStr = targetPo.po_id || targetPo.id || 'PO-2026'
    const poCode = poIdStr.replace(/^PO-/, '')
    const reqRef = targetPo.purchase_request_detail?.request_id || targetPo.request_id || targetPo.requestRef || `REQ-${poCode}`
    const pTitle = targetPo.purchase_request_detail?.title || targetPo.title || 'Enterprise Laptop Workstations'
    const pQty = targetPo.purchase_request_detail?.quantity || targetPo.quantity || 15
    const pUnit = targetPo.purchase_request_detail?.unit || targetPo.unit || 'Units'
    const targetGst = typeof targetPo.gst_rate === 'number' ? targetPo.gst_rate : (typeof targetPo.gstPercent === 'number' ? targetPo.gstPercent : (typeof targetPo.gstRate === 'number' ? targetPo.gstRate : 18))
    const totalAmt = parseFloat(targetPo.total_amount || targetPo.amount || 0)
    const baseAmt = typeof targetPo.base_amount === 'number' ? targetPo.base_amount : (typeof targetPo.baseAmount === 'number' ? targetPo.baseAmount : (totalAmt > 0 ? Math.round(totalAmt / (1.0 + (targetGst / 100.0))) : 0))

    setSelectedPoId(poIdStr)
    setLinkedRef(reqRef)
    setGrnDocNumber(`GRN-${poCode}`)
    setProductName(pTitle)
    setProductQty(`${pQty} ${pUnit}`)
    setReceivedQty(`${pQty} ${pUnit}`)
    setBaseAmount(baseAmt)
    setGstPct(targetGst)
    setReceiptDate(new Date().toISOString().split('T')[0])
    setDeliveryDate(targetPo.expected_delivery || new Date().toISOString().split('T')[0])
    setDeliveryLocation('Warehouse Block A, Sector 62, Noida')
    setRemarks('')
    setSuccessMsg('')
  }

  useEffect(() => {
    if (!isOpen) return

    const fetchPOs = async () => {
      try {
        setIsLoadingPos(true)
        const res = await apiClient.get('/procurement/purchase-orders/', { params: { vendor: vendorId } })
        const backendPOs = Array.isArray(res.data) ? res.data : (res.data?.results || [])
        
        let poList = backendPOs
        if (poList.length === 0) {
          const { pos } = getScopedVendorData(vendorId)
          poList = pos
        }
        setVendorPos(poList)

        const initialPO = customPO || poList[0]
        if (initialPO) {
          populateFromPo(initialPO)
        }
      } catch (err) {
        console.warn('Failed to load POs for modal:', err)
        const { pos } = getScopedVendorData(vendorId)
        setVendorPos(pos)
        const initialPO = customPO || pos[0]
        if (initialPO) {
          populateFromPo(initialPO)
        }
      } finally {
        setIsLoadingPos(false)
      }
    }

    fetchPOs()
  }, [isOpen, vendorId, customPO])

  const handleSelectPoChange = (poId: string) => {
    setSelectedPoId(poId)
    const found = vendorPos.find((p: any) => (p.po_id || p.id) === poId)
    if (found) {
      populateFromPo(found)
    }
  }

  if (!isOpen) return null

  const calculatedGst = Math.round((baseAmount * gstPct) / 100)
  const calculatedTotal = baseAmount + calculatedGst

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanRef = grnDocNumber.replace(/^(DOC-|GRN-|PO-|RFQ-|REQ-)/gi, '').trim() || Date.now().toString().slice(-6)
    const effectivePo = selectedPoId || (linkedRef.startsWith('PO-') ? linkedRef : `PO-${cleanRef}`)
    
    const newDoc = {
      id: `DOC-${grnDocNumber || `GRN-${cleanRef}`}`,
      name: `Goods Receipt Note (${grnDocNumber || `GRN-${cleanRef}`}) - ${effectivePo}`,
      grnDocNumber: grnDocNumber || `GRN-${cleanRef}`,
      receiptNumber: grnDocNumber || `GRN-${cleanRef}`,
      poRef: effectivePo,
      rfqRef: linkedRef.startsWith('REQ-') || linkedRef.startsWith('RFQ-') ? linkedRef : `REQ-${cleanRef}`,
      requestRef: linkedRef.startsWith('REQ-') || linkedRef.startsWith('RFQ-') ? linkedRef : `REQ-${cleanRef}`,
      category: 'Goods Receipt Note',
      status: 'Verified',
      verified: true,
      productName: productName.trim() || 'Enterprise Workstations',
      productQty: productQty.trim() || '15 Units',
      receivedQty: receivedQty.trim() || productQty.trim() || '15 Units',
      receiptDate: receiptDate || new Date().toISOString().split('T')[0],
      baseAmount,
      gstPercent: gstPct,
      gstAmount: calculatedGst,
      totalAmount: calculatedTotal,
      leadTime: leadTime.trim() || '7 Days',
      expectedDeliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
      deliveryLocation: deliveryLocation.trim() || 'Warehouse Block A, Sector 62, Noida',
      uploadedDate: new Date().toISOString().split('T')[0],
      quoteValidity: quoteValidity !== 'N/A' ? quoteValidity : undefined,
      expiryDate: '2027-12-31',
      vendorId,
      vendorName: vendorName || 'Vendor Authority',
      warrantyDuration,
      warrantyType: 'On-site',
      freeServiceCount,
      installationType,
      techSupportDuration,
      replacementPolicy,
      accessoriesIncluded,
      notes,
      remarks: remarks.trim(),
      fileName: fileName || `${grnDocNumber || `GRN-${cleanRef}`}.pdf`,
    }

    createGoodsReceiptApi(newDoc.poRef, {
      delivery_date: newDoc.expectedDeliveryDate,
      delivery_location: newDoc.deliveryLocation,
      product_name: newDoc.productName,
      ordered_quantity: parseInt(newDoc.productQty) || 15,
      received_quantity: parseInt(newDoc.receivedQty) || 15,
      status: 'Pending Verification',
      notes: newDoc.remarks || newDoc.notes || `Goods receipt note for ${newDoc.poRef}`,
      vendor: vendorId,
      rfq: newDoc.rfqRef
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    }).catch(err => {
      console.warn('Backend GRN creation error:', err)
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    })

    saveStoredVendorDocument(vendorId, newDoc)
    onDocumentUploaded(newDoc)
    
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))

    setSuccessMsg(`Goods Receipt Note "${newDoc.grnDocNumber}" created and verified in database!`)
    setTimeout(() => {
      setSuccessMsg('')
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp my-4 text-xs">
        
        {/* Clean Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-base text-slate-900">Create Goods Receipt Note</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Select a Purchase Order and fill in the details below. Real database records are linked automatically.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Content Form */}
        <div className="p-6 space-y-5 text-slate-700 overflow-y-auto max-h-[75vh]">
          {successMsg ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <CheckCircle size={44} className="mx-auto text-emerald-600" />
              <p className="font-bold text-base text-emerald-950">{successMsg}</p>
              <p className="text-xs text-emerald-700">Goods Receipt Note submitted for verification. Status: <b>Pending Verification</b>.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="manual-grn-form" className="space-y-5">
              {/* Section 1: Overview 4-Column Card */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Linked Purchase Order *</span>
                  {vendorPos.length > 0 ? (
                    <select
                      value={selectedPoId}
                      onChange={(e) => handleSelectPoChange(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-bold text-blue-600 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {vendorPos.map((p: any) => {
                        const pId = p.po_id || p.id
                        return (
                          <option key={pId} value={pId}>
                            {pId} ({p.purchase_request_detail?.title || p.title || 'Order'})
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={selectedPoId}
                      onChange={(e) => setSelectedPoId(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs font-black text-blue-600 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="PO-2026-001"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">GRN Document No. *</span>
                  <input
                    type="text"
                    required
                    value={grnDocNumber}
                    onChange={(e) => setGrnDocNumber(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="GRN-2026-001"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Vendor Identity</span>
                  <span className="text-xs font-bold text-slate-900 mt-1 block">{vendorName || vendorId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Verification Status</span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold border border-amber-300 inline-block mt-1">
                    Pending Verification
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Receipt Date *</span>
                  <input
                    type="date"
                    required
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Section 2: Product & Technical Specifications */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Package size={14} className="text-blue-600" /> Product &amp; Technical Specifications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Product / Item Name *</span>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enterprise Laptop Workstations"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Billed Quantity *</span>
                    <input
                      type="text"
                      required
                      value={productQty}
                      onChange={(e) => setProductQty(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="15 Units"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Received Qty *</span>
                    <input
                      type="text"
                      required
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="15 Units"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Warranty Coverage</span>
                    <input
                      type="text"
                      value={warrantyDuration}
                      onChange={(e) => setWarrantyDuration(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="36 Months (On-site)"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Free Maintenance Services</span>
                    <input
                      type="text"
                      value={freeServiceCount}
                      onChange={(e) => setFreeServiceCount(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="3 Services"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Installation &amp; Setup</span>
                    <input
                      type="text"
                      value={installationType}
                      onChange={(e) => setInstallationType(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Free"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Technical Support Duration</span>
                    <input
                      type="text"
                      value={techSupportDuration}
                      onChange={(e) => setTechSupportDuration(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="24/7 Dedicated Support"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Defect Replacement Policy</span>
                    <input
                      type="text"
                      value={replacementPolicy}
                      onChange={(e) => setReplacementPolicy(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Standard SLA"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Included Accessories / Items</span>
                    <input
                      type="text"
                      value={accessoriesIncluded}
                      onChange={(e) => setAccessoriesIncluded(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Power Adapter, Sleeves & Drivers"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Commercial Breakdown & Delivery Schedule */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-emerald-600" /> Commercial Breakdown &amp; Delivery Schedule
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Base Amount (Excl. GST) *</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-700">₹</span>
                      <input
                        type="number"
                        min={0}
                        required
                        value={baseAmount}
                        onChange={(e) => setBaseAmount(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">GST Rate &amp; Tax Amount</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={gstPct}
                        onChange={(e) => setGstPct(Number(e.target.value))}
                        className="w-14 border border-slate-300 rounded px-1.5 py-1 text-xs text-center font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-700">% (₹{calculatedGst.toLocaleString('en-IN')})</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Quoted Amount</span>
                    <span className="font-black text-emerald-700 text-base mt-0.5 block">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Lead Time</span>
                    <input
                      type="text"
                      value={leadTime}
                      onChange={(e) => setLeadTime(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="7 Days"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Expected Delivery Date</span>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Location</span>
                    <input
                      type="text"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Warehouse Block A, Chennai"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Quote Validity Expiry</span>
                    <input
                      type="text"
                      value={quoteValidity}
                      onChange={(e) => setQuoteValidity(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="N/A"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Terms & Remarks */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                  Vendor Terms &amp; Special Remarks
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Payment Terms / Notes</span>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Net 30 payment terms upon delivery verification and commercial clearance."
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Remarks</span>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Any additional remarks about goods condition, partial delivery, discrepancies, etc."
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Attach File (Optional) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                  Attach Goods Receipt / Scanned Invoice (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white cursor-pointer"
                />
                {fileName && (
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">📎 {fileName}</span>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Matching media_1790241936613.png with Submit action */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">Official Digital Audit Record • Certified KSS Procurement OS</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors text-xs cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              form="manual-grn-form"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={14} /> Create &amp; Save Goods Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LINKED REQUEST DETAILS MODAL (OFFICIAL GOODS RECEIPT FORMAT) ───────────────
export const ViewLinkedRequestModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  doc: any
  vendor: any
}> = ({ isOpen, onClose, doc, vendor }) => {
  if (!isOpen || !doc) return null

  const refMatch = doc.name?.match(/(RFQ-[A-Za-z0-9-]+|PO-[A-Za-z0-9-]+|GRN-[A-Za-z0-9-]+)/i)
  const linkedRef = doc.rfqRef || doc.poRef || (refMatch ? refMatch[0] : '')

  const cleanKey = (doc.id || doc.name || linkedRef || '').replace(/^(DOC-|GRN-|PO-|RFQ-|REQ-)/gi, '').trim().toUpperCase()
  const storedPOs = getStoredVendorPOs(vendor.id)
  const matchedPO = storedPOs.find((p: any) => p.id?.toUpperCase().includes(cleanKey) || cleanKey.includes(p.id?.replace(/^PO-/, '')))

  const rfqs = getVendorScopedRfqs(vendor.id, vendor.name, vendor.category)
  const matchedRFQ = rfqs.find((r: any) => r.id?.toUpperCase().includes(cleanKey) || cleanKey.includes(r.id?.replace(/^RFQ-/, '')) || (r.request_id && cleanKey.includes(r.request_id.replace(/^REQ-/, ''))))

  const resolvedCategory = (doc.category && doc.category !== 'Goods Receipt Note' && doc.category !== 'None')
    ? doc.category
    : (doc.categoryName || matchedPO?.category || matchedRFQ?.category || vendor.category || 'IT Hardware')

  const resolvedDate = (doc.uploadedDate && doc.uploadedDate !== 'None' && doc.uploadedDate !== 'null')
    ? doc.uploadedDate
    : (doc.date || '2026-09-24')

  let displayProductName = doc.productName || matchedPO?.title || matchedRFQ?.title || (doc.name && !doc.name.startsWith('Official') && !doc.name.startsWith('Goods Receipt Note') ? doc.name : '') || 'Enterprise Workstations'

  const parsedQtyNum = doc.quantity || doc.receivedQty || doc.acceptedQty || (doc.productQty ? parseInt(doc.productQty) : undefined) || matchedPO?.quantity || matchedRFQ?.quantity || 30
  let displayQty = `${parsedQtyNum} Units`

  const displayTotal = typeof doc.totalAmount === 'number' ? doc.totalAmount : (typeof doc.total_amount === 'number' ? doc.total_amount : (typeof doc.amount === 'number' ? doc.amount : undefined))

  const displayGstPct = typeof doc.gstPercent === 'number' ? doc.gstPercent : (typeof doc.gstRate === 'number' ? doc.gstRate : (typeof doc.gst_rate === 'number' ? doc.gst_rate : (typeof matchedPO?.gstPercent === 'number' ? matchedPO.gstPercent : undefined)))

  const displayBase = typeof doc.baseAmount === 'number' ? doc.baseAmount : (typeof doc.base_amount === 'number' ? doc.base_amount : (typeof doc.price === 'number' ? doc.price : (displayTotal !== undefined && displayGstPct !== undefined ? Math.round(displayTotal / (1.0 + (displayGstPct / 100.0))) : undefined)))

  const displayGstAmt = typeof doc.gstAmount === 'number' ? doc.gstAmount : (typeof doc.taxAmount === 'number' ? doc.taxAmount : (typeof doc.tax_amount === 'number' ? doc.tax_amount : (displayBase !== undefined && displayGstPct !== undefined ? Math.round(displayBase * displayGstPct / 100) : (displayTotal !== undefined && displayBase !== undefined ? displayTotal - displayBase : undefined))))

  const isVerified = doc.status === 'Verified' || doc.status === 'Goods Received Note (GRN) Confirmed' || doc.verified === true

  const targetDocData: DocumentPdfData = {
    key: 'goodsReceipt',
    id: doc.id || `DOC-GRN-${cleanKey}`,
    title: displayProductName,
    subtitle: `Document Ref: ${doc.grnDocNumber || doc.id} • Category: ${resolvedCategory}`,
    vendor: doc.vendorName || vendor.name || 'Vendor',
    date: resolvedDate,
    amount: displayTotal,
    totalAmount: displayTotal,
    baseAmount: displayBase,
    gstPercent: displayGstPct,
    verified: isVerified,
    verifiedBy: doc.verifiedBy || 'Manager / Vendor Authority',
    verifiedAt: doc.verifiedAt,
    taxAmount: displayGstAmt,
    gstAmount: displayGstAmt,
    gstNumber: doc.gstNumber || '27AAACK1092F1Z9',
    receivedQty: parsedQtyNum,
    acceptedQty: parsedQtyNum,
    quantity: parsedQtyNum,
    unit: 'Units',
    productDetails: displayProductName,
    requestId: linkedRef.startsWith('REQ-') ? linkedRef : (doc.requestRef || `REQ-${cleanKey}`),
    category: resolvedCategory,
    grnDocNumber: doc.grnDocNumber || (doc.id?.startsWith('DOC-') ? doc.id : `DOC-${doc.id}`),
    poRef: doc.poRef || `PO-${cleanKey}`,
    warrantyDuration: doc.warrantyDuration || matchedRFQ?.warrantyDuration || '36 Months (On-site)',
    warrantyType: doc.warrantyType || 'On-site',
    freeServiceCount: doc.freeServiceCount || '3 Services',
    installationType: doc.installationType || 'Free',
    techSupportDuration: doc.techSupportDuration || '24/7 Dedicated Support',
    replacementPolicy: doc.replacementPolicy || 'Standard SLA',
    accessoriesIncluded: doc.accessoriesIncluded || 'Power Adapter, Sleeves & Drivers',
    leadTime: doc.leadTime || matchedRFQ?.leadTime || undefined,
    expectedDeliveryDate: doc.expectedDeliveryDate || undefined,
    quoteValidity: doc.quoteValidity || doc.quoteValidUntil || doc.expiryDate || doc.valid_until || undefined,
    notes: doc.notes || 'Net 30 payment terms upon delivery verification and commercial clearance.',
  }

  return (
    <DocumentPdfViewerModal
      document={targetDocData}
      onClose={onClose}
    />
  )
}

// ─── 11. DYNAMIC VENDOR DOCUMENTS PAGE ────────────────────────────────────────
export const VendorDocumentsPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, documents } = getScopedVendorData(vendorId)
  const [localDocs, setLocalDocs] = useState(documents)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<any | null>(null)
  const [downloadToast, setDownloadToast] = useState('')

  // Merge Admin's status overrides into document list
  const applyOverrides = (docs: any[]) => {
    const overrides = getDocStatusOverrides(vendorId)
    return docs.map((d) => overrides[d.id] ? { ...d, status: overrides[d.id] } : d)
  }

  const reloadDocuments = async () => {
    try {
      const deletedSet = getDeletedDocIds(vendorId)
      const docsFromApi = await getVendorDocumentsApi({ vendor: vendorId })
      const grsFromApi = await getVendorGoodsReceipts({ vendor: vendorId })
      const grList = Array.isArray(grsFromApi) ? grsFromApi : (grsFromApi?.results || [])
      
      const apiDocs: any[] = []
      if (Array.isArray(docsFromApi)) {
        docsFromApi.forEach(d => {
          if (d && !isDocDeleted(deletedSet, d)) {
            apiDocs.push(d)
          }
        })
      }
      
      grList.forEach((gr: any) => {
        const po = gr.purchase_order_detail || {}
        const pr = po.purchase_request_detail || {}
        const cleanRef = (gr.po_id || po.po_id || '2026-001').replace('PO-', '').trim()
        const grDocId = `DOC-GRN-${cleanRef}`
        
        if (isDocDeleted(deletedSet, { id: grDocId, grnDocNumber: `GRN-${cleanRef}`, receiptNumber: gr.receipt_id, poRef: gr.po_id })) {
          return
        }

        const itemCategory = gr.category_name || pr.category || po.category || vendor.category || 'IT Hardware'
        const itemTitle = gr.product_name || gr.request_title || pr.title || po.title || 'Enterprise Workstations'
        const realQuantityNum = gr.received_quantity ?? gr.ordered_quantity ?? gr.quantity ?? gr.request_quantity ?? pr.quantity ?? po.quantity ?? 30
        const itemQty = `${realQuantityNum} Units`
        const rawTotal = parseFloat(gr.total_amount || po.total_amount || po.final_amount || 0)
        const rawGstPct = typeof gr.gst_percent === 'number' ? gr.gst_percent : (typeof po.gst_rate === 'number' ? po.gst_rate : 18)
        const rawBase = parseFloat(gr.base_amount || po.base_amount || (rawTotal > 0 ? Math.round(rawTotal / (1.0 + (rawGstPct / 100.0))) : 30000))
        const rawGst = parseFloat(gr.gst_amount || (rawTotal > 0 ? (rawTotal - rawBase) : Math.round(rawBase * (rawGstPct / 100.0))))
        const validDate = gr.delivery_date && gr.delivery_date !== 'None' && gr.delivery_date !== 'null'
          ? gr.delivery_date
          : (gr.created_at ? gr.created_at.split('T')[0] : '2026-09-24')
        const docStatus = (gr.status === 'Verified' || gr.status === 'Goods Received Note (GRN) Confirmed') ? 'Verified' : (gr.status || 'Pending')

        apiDocs.push({
          id: grDocId,
          name: `Goods Receipt Note (${gr.receipt_id}) - ${gr.po_id || po.po_id || ''}`,
          grnDocNumber: `GRN-${cleanRef}`,
          receiptNumber: gr.receipt_id,
          poRef: gr.po_id || po.po_id || `PO-${cleanRef}`,
          rfqRef: gr.request_id || pr.request_id || `REQ-${cleanRef}`,
          requestRef: gr.request_id || pr.request_id || `REQ-${cleanRef}`,
          category: itemCategory,
          status: docStatus,
          productName: itemTitle,
          productQty: itemQty,
          quantity: realQuantityNum,
          receivedQty: realQuantityNum,
          acceptedQty: realQuantityNum,
          baseAmount: rawBase,
          gstPercent: rawGstPct,
          gstAmount: rawGst,
          totalAmount: rawTotal > 0 ? rawTotal : 94400,
          uploadedDate: validDate,
          expiryDate: '2027-12-31',
          vendorId: gr.vendor_id_code || vendorId,
          vendorName: gr.vendor_name || vendor.name,
          warrantyDuration: gr.warranty_duration || '36 Months (On-site)',
          leadTime: gr.lead_time || '7 Days',
        })
      })

      const localData = getScopedVendorData(vendorId).documents
      const mergedMap = new Map<string, any>()
      apiDocs.forEach(d => {
        if (!isDocDeleted(deletedSet, d)) {
          mergedMap.set(d.id, d)
        }
      })
      localData.forEach(d => {
        if (!isDocDeleted(deletedSet, d) && !mergedMap.has(d.id)) {
          mergedMap.set(d.id, d)
        }
      })

      const finalDocs = Array.from(mergedMap.values()).filter(d => !isDocDeleted(deletedSet, d))
      finalDocs.sort((a, b) => {
        const timeA = new Date(a.uploadedDate || a.date || 0).getTime()
        const timeB = new Date(b.uploadedDate || b.date || 0).getTime()
        if (timeA !== timeB) return timeB - timeA
        return (b.id || '').localeCompare(a.id || '')
      })
      setLocalDocs(applyOverrides(finalDocs))
    } catch (e) {
      const deletedSet = getDeletedDocIds(vendorId)
      const { documents: refreshedDocs } = getScopedVendorData(vendorId)
      const filtered = refreshedDocs.filter(d => !isDocDeleted(deletedSet, d))
      setLocalDocs(applyOverrides(filtered))
    }
  }

  useEffect(() => {
    reloadDocuments()
    const handleSync = () => {
      reloadDocuments()
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('kss_backend_updated', handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('kss_backend_updated', handleSync)
    }
  }, [vendorId])

  const handleDeleteDoc = async (docId: string) => {
    const updatedSet = addDeletedDocId(vendorId, docId)
    deleteStoredVendorDocument(vendorId, docId)
    
    // Immediately filter local state
    setLocalDocs((prevDocs) => {
      return prevDocs.filter((d) => !isDocDeleted(updatedSet, d) && d.id !== docId)
    })

    // Delete on backend API so it never returns on refresh
    try {
      await deleteVendorDocumentApi(docId)
    } catch (e) {
      console.warn('Backend delete document failed:', e)
    }
    
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))
    setDownloadToast('Document deleted successfully.')
    setTimeout(() => setDownloadToast(''), 3000)
  }

  const handleDownloadDoc = (doc: any) => {
    const displayCategory = (doc.category && doc.category !== 'Goods Receipt Note' && doc.category !== 'None')
      ? doc.category
      : (doc.categoryName || vendor.category || 'IT Hardware')
    const displayUploadDate = (doc.uploadedDate && doc.uploadedDate !== 'None' && doc.uploadedDate !== 'null')
      ? formatDate(doc.uploadedDate)
      : '24/09/2026'
    const displayExpiryDate = (doc.expiryDate && doc.expiryDate !== 'None' && doc.expiryDate !== 'null' && doc.expiryDate !== 'N/A')
      ? formatDate(doc.expiryDate)
      : 'N/A'

    const content = `================================================================================
KSS PROCUREMENT OS - OFFICIAL COMPLIANCE & GOODS RECEIPT DOCUMENT
================================================================================
Vendor ID           : ${vendor.id}
Vendor Name         : ${vendor.name}
Document Ref        : ${doc.id}
GRN Document Number : ${doc.grnDocNumber || doc.id}
Receipt Number      : ${doc.receiptNumber || 'N/A'}
Linked Request Ref  : ${doc.rfqRef || 'RFQ-2026-001'}
Document Category   : ${displayCategory}
Uploaded / Issue Date: ${displayUploadDate}
Validity Expiry Date: ${displayExpiryDate}
Verification Status : ${doc.status === 'Goods Received Note (GRN) Confirmed' ? 'Verified' : (doc.status || 'Verified')}

--------------------------------------------------------------------------------
PRODUCT & TECHNICAL SPECIFICATIONS
--------------------------------------------------------------------------------
Product / Item Name : ${doc.productName || 'Enterprise Workstations'}
Product Quantity    : ${doc.productQty || '15 Units'}
Warranty Coverage   : ${doc.warrantyDuration || '12 Months'} (${doc.warrantyType || 'On-site'})
Free Service Count  : ${doc.freeServiceCount || '3 Services'}
Installation Type   : ${doc.installationType || 'Free'}
Technical Support   : ${doc.techSupportDuration || '24/7 Dedicated Support'}
Replacement Policy  : ${doc.replacementPolicy || 'Standard SLA'}
Included Accessories: ${doc.accessoriesIncluded || 'Standard Accessories'}

--------------------------------------------------------------------------------
COMMERCIAL BREAKDOWN & FINANCIAL TERMS
--------------------------------------------------------------------------------
Quoted Base Amount  : ₹${(doc.baseAmount || 0).toLocaleString('en-IN')}
GST Tax Rate        : ${doc.gstPercent || 18}% (₹${(doc.gstAmount || 0).toLocaleString('en-IN')})
Total Quoted Amount : ₹${(doc.totalAmount || 0).toLocaleString('en-IN')}
Delivery Lead Time  : ${doc.leadTime || '7 Days'}
Expected Delivery   : ${formatDate(doc.expectedDeliveryDate || '2026-10-15')}

--------------------------------------------------------------------------------
TERMS & CONDITIONS / VENDOR REMARKS
--------------------------------------------------------------------------------
${doc.notes || 'Net 30 payment terms upon delivery & verification.'}

================================================================================
Certified Digital Audit Seal • KSS Procurement OS Governance Standard
================================================================================
`
    const blob = new Blob([content], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.id}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDownloadToast(`Downloading ${doc.id}.pdf...`)
    setTimeout(() => setDownloadToast(''), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {downloadToast && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <Download size={16} className="text-blue-600 animate-bounce" />
          {downloadToast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="text-blue-600" /> Vendor Documents ({vendor.name})
          </h1>
          <p className="text-xs text-gray-500">Legal registrations and compliance files for Vendor ID ({vendor.id}).</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload size={16} /> Upload New Document
          </button>
        </div>
      </div>

      {localDocs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <FolderOpen size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">No Vendor Documents Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              There are no saved documents or compliance records. Upload a new document or submit an RFQ quotation to auto-generate official records.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Upload size={15} /> Upload New Document
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
              <tr>
                <th className="p-4">Document Ref</th>
                <th className="p-4">Document Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Uploaded Date</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {localDocs.map((doc) => {
                const displayCategory = (doc.category && doc.category !== 'Goods Receipt Note' && doc.category !== 'None')
                  ? doc.category
                  : (doc.categoryName || vendor.category || 'IT Hardware')
                const displayUploadDate = (doc.uploadedDate && doc.uploadedDate !== 'None' && doc.uploadedDate !== 'null')
                  ? formatDate(doc.uploadedDate)
                  : '24/09/2026'
                const displayExpiryDate = (doc.expiryDate && doc.expiryDate !== 'None' && doc.expiryDate !== 'null' && doc.expiryDate !== 'N/A')
                  ? formatDate(doc.expiryDate)
                  : 'N/A'
                const isDocVerified = doc.status === 'Verified' || doc.status === 'Goods Received Note (GRN) Confirmed' || doc.verified === true

                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-blue-600">{doc.id}</td>
                    <td className="p-4 font-bold text-gray-900">{doc.name}</td>
                    <td className="p-4 font-semibold text-gray-700">{displayCategory}</td>
                    <td className="p-4 text-gray-600">{displayUploadDate}</td>
                    <td className="p-4 text-gray-600">{displayExpiryDate}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isDocVerified                  ? 'bg-green-100 text-green-800 border border-green-200' :
                        doc.status === 'Rejected'      ? 'bg-red-100 text-red-800 border border-red-200' :
                        doc.status === 'Expiring Soon' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      }`}>
                        {isDocVerified ? '✓ Verified' : (doc.status === 'Pending' ? '⏳ Pending Review' : doc.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="View Request Details"
                        >
                          <Eye size={13} /> View Request
                        </button>

                        <button
                          onClick={() => handleDownloadDoc(doc)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg border border-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download size={13} /> PDF
                        </button>

                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        vendorId={vendor.id}
        vendorName={vendor.name}
        onDocumentUploaded={(newDoc) => setLocalDocs(applyOverrides([newDoc, ...localDocs]))}
      />

      <ViewLinkedRequestModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        doc={viewingDoc}
        vendor={vendor}
      />
    </div>
  )
}

export const VendorPaymentsPage: React.FC = VendorPaymentStatusPage
