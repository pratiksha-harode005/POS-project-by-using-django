import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiClient } from '../../api/client'
import { useProcurement } from '../../context/ProcurementContext'
import { isFlowBCategory } from '../../components/portal/TrackingStepper'
import { rankVendorsForCategory } from '../../components/portal/VendorRecommendationPanel'
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
} from 'lucide-react'

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

// ─── LOCAL VENDOR QUOTATION STORAGE HELPERS ──────────────────────────────
export function getStoredVendorQuotes(vendorId: string): any[] {
  const key = `kss_vendor_quotes_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {}
  }
  return []
}

export function saveStoredVendorQuote(vendorId: string, quote: any): any[] {
  const key = `kss_vendor_quotes_${vendorId}`
  const current = getStoredVendorQuotes(vendorId)
  const updated = [quote, ...current]
  localStorage.setItem(key, JSON.stringify(updated))
  return updated
}

// ─── LOCAL VENDOR DOCUMENT STORAGE HELPERS ─────────────────────────────
export function getStoredVendorDocuments(vendorId: string): any[] {
  const key = `kss_vendor_docs_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return JSON.parse(saved)
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
    return JSON.parse(localStorage.getItem('kss_paid_payments') || '[]')
  } catch {
    return []
  }
}

export function isPaymentPaidForPO(poRef: string): boolean {
  if (!poRef) return false
  const paid = getPaidPayments()
  // Payment is only Paid after delivery confirmed + invoice submitted via markPaymentPaidForPO
  return paid.includes(poRef) || paid.some((k) => poRef.includes(k) || k.includes(poRef))
}

export function markPaymentPaidForPO(poRef: string) {
  const current = getPaidPayments()
  if (!current.includes(poRef)) {
    const updated = [...current, poRef]
    localStorage.setItem('kss_paid_payments', JSON.stringify(updated))
  }
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
  return delivered.includes(poRef) || delivered.some((k) => poRef.includes(k) || k.includes(poRef))
}

export function markPODelivered(poRef: string) {
  const current = getDeliveredPOs()
  if (!current.includes(poRef)) {
    const updated = [...current, poRef]
    localStorage.setItem('kss_delivered_pos', JSON.stringify(updated))
  }
}

// ─── LOCAL VENDOR RFQ ACTION STORAGE HELPERS ──────────────────────────────
export interface VendorRfqAction {
  status: 'Accepted' | 'Declined'
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

export function saveVendorRfqAction(vendorId: string, rfqId: string, actionStatus: 'Accepted' | 'Declined', declineReason?: string) {
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

// ─── LOCAL VENDOR INVOICE STORAGE HELPERS ──────────────────────────────
export function getStoredVendorInvoices(vendorId: string): any[] {
  const key = `kss_vendor_invoices_${vendorId}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return JSON.parse(saved)
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

export function getStoredDeliveryDocs(poRefOrReqRef: string): DeliveryDocRecord | null {
  const key = `kss_delivery_docs_${poRefOrReqRef}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {}
  }
  return null
}

export function saveDeliveryDocs(poRefOrReqRef: string, payload: DeliveryDocRecord) {
  const key = `kss_delivery_docs_${poRefOrReqRef}`
  localStorage.setItem(key, JSON.stringify(payload))
  if (payload.poRef && payload.poRef !== poRefOrReqRef) {
    localStorage.setItem(`kss_delivery_docs_${payload.poRef}`, JSON.stringify(payload))
  }
  if (payload.requestRef && payload.requestRef !== poRefOrReqRef) {
    localStorage.setItem(`kss_delivery_docs_${payload.requestRef}`, JSON.stringify(payload))
  }
}

// ─── SCOPED DATA GENERATOR (100% DATA ISOLATION PER VENDOR ID) ───────────────
export function getScopedVendorData(vendorId: string) {
  const vendor = MASTER_VENDORS.find((v) => v.id === vendorId) || {
    id: vendorId,
    name: `Vendor ${vendorId}`,
    category: 'IT Hardware',
    score: '94.0%',
    risk: 'Low',
    contactPerson: 'Account Representative',
    email: `contact@${vendorId.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    phone: '+1 800-555-0100',
    status: 'Active',
    openRfqsCount: 2,
    activePosCount: 1,
    totalDisbursed: 25000,
  }

  // Derive integer seed from vendorId characters
  const seed = vendorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  // RFQs scoped to this vendorId
  const rfqs = [
    {
      id: `RFQ-2026-${(seed % 90) + 10}`,
      title: `${vendor.name} - ${vendor.category} Procurement Requirement`,
      category: vendor.category,
      subcategory: vendor.category === 'IT Hardware' ? 'Enterprise Laptops & Workstations' :
                   vendor.category === 'Software & SaaS' ? 'Cloud Collaboration Suite' :
                   vendor.category === 'Office Accessories' ? 'Ergonomic Workstations & Seating' :
                   vendor.category === 'Networking & Telecom' ? 'Core Switches & Fiber Routers' :
                   'General Equipment & Hardware',
      qty: `${(seed % 35) + 15} Units`,
      deadline: '2026-09-28',
      deliveryLocation: 'Pune HQ, Main Facility',
      budgetEst: (seed * 350) % 50000 + 10000,
      description: `Official enterprise procurement requirement for ${vendor.category}. Vendor is requested to supply line-item pricing, technical SLA commitment, and standard OEM warranty coverage.`,
      attachments: ['Technical_Specification_Doc_v2.pdf', 'RF_Requirements_Compliance.docx'],
      requiredBy: '2026-10-15',
      status: 'Open',
    },
    {
      id: `RFQ-2026-${(seed % 90) + 25}`,
      title: `Supplemental ${vendor.category} Upgrade Package`,
      category: vendor.category,
      subcategory: vendor.category === 'IT Hardware' ? 'Server Storage Arrays & Displays' :
                   vendor.category === 'Software & SaaS' ? 'SaaS Enterprise Tier Licenses' :
                   vendor.category === 'Office Accessories' ? 'Executive Desk Systems' :
                   vendor.category === 'Networking & Telecom' ? 'Wireless Access Points & Optics' :
                   'Peripheral Accessories',
      qty: `${(seed % 20) + 10} Units`,
      deadline: '2026-10-05',
      deliveryLocation: 'Bengaluru Tech Center',
      budgetEst: (seed * 180) % 30000 + 5000,
      description: `Supplemental upgrade package for ${vendor.category} facility deployment. Requires fast turnaround and compliance certificate upon delivery.`,
      attachments: ['Upgrade_Deployment_Scope.pdf'],
      requiredBy: '2026-10-20',
      status: 'Open',
    },
    {
      id: `RFQ-2025-${(seed % 90) + 60}`,
      title: `Legacy ${vendor.category} Refresh & Maintenance`,
      category: vendor.category,
      subcategory: 'Legacy Infrastructure',
      qty: '5 Units',
      deadline: '2025-11-20',
      deliveryLocation: 'Mumbai Data Hub',
      budgetEst: (seed * 120) % 20000 + 4000,
      description: 'Annual legacy refresh maintenance contract.',
      attachments: ['Legacy_Maintenance_Contract.pdf'],
      requiredBy: '2025-12-01',
      status: 'Expired',
    },
    {
      id: `RFQ-2025-${(seed % 90) + 75}`,
      title: `Historical ${vendor.category} Infrastructure Contract`,
      category: vendor.category,
      subcategory: 'Infrastructure Hardware',
      qty: '12 Units',
      deadline: '2025-12-10',
      deliveryLocation: 'Pune HQ, Annex Facility',
      budgetEst: (seed * 220) % 28000 + 6000,
      description: 'Historical infrastructure supply contract.',
      attachments: ['Historical_Annex_Specs.pdf'],
      requiredBy: '2025-12-25',
      status: 'Expired',
    },
  ]

  // Quotations scoped to this vendorId (merged with user submitted quotes)
  const userQuotes = getStoredVendorQuotes(vendorId)
  const defaultQuotations = [
    {
      id: `QUO-${vendorId.replace(/[^A-Z0-9]/g, '')}-001`,
      rfqRef: rfqs[0].id,
      quotedPrice: (seed * 340) % 48000 + 9500,
      leadTime: `${(seed % 10) + 3} Days`,
      status: 'Selected',
      submittedDate: '2026-09-08',
    },
    {
      id: `QUO-${vendorId.replace(/[^A-Z0-9]/g, '')}-002`,
      rfqRef: rfqs[1].id,
      quotedPrice: (seed * 170) % 29000 + 4800,
      leadTime: `${(seed % 7) + 5} Days`,
      status: 'Submitted',
      submittedDate: '2026-09-10',
    },
    {
      id: `QUO-${vendorId.replace(/[^A-Z0-9]/g, '')}-003`,
      rfqRef: rfqs[2].id,
      quotedPrice: (seed * 210) % 22000 + 5200,
      leadTime: `${(seed % 5) + 10} Days`,
      status: 'Rejected',
      submittedDate: '2025-11-18',
    },
  ]

  const quotations = [...userQuotes, ...defaultQuotations]

  // POs scoped to this vendorId
  const pos = [
    {
      id: `PO-${vendorId.replace(/[^A-Z0-9]/g, '')}-${(seed % 80) + 10}`,
      requestRef: `REQ-${(seed % 8000) + 1000}`,
      rfqRef: rfqs[0].id,
      title: `${vendor.category} Order for ${vendor.name}`,
      amount: quotations[0].quotedPrice,
      issueDate: '2026-09-09',
      deliveryDueDate: '2026-09-26',
      status: 'Confirmed',
    },
  ]

  // Deliveries scoped to this vendorId
  const deliveries = [
    {
      id: `TRK-${vendorId.replace(/[^A-Z0-9]/g, '')}-${(seed % 800) + 100}`,
      poRef: pos[0].id,
      item: pos[0].title,
      courier: `Logistics Express (#EX-${seed * 4})`,
      dispatchDate: '2026-09-11',
      expectedDate: '2026-09-24',
      destination: 'Pune HQ, Main Facility',
      status: 'In Transit',
    },
  ]

  // Receipts scoped to this vendorId (merged with user-added receipts)
  const defaultReceipts = [
    {
      id: `GRN-${vendorId.replace(/[^A-Z0-9]/g, '')}-${(seed % 80) + 10}`,
      poRef: pos[0].id,
      title: pos[0].title,
      receivedBy: 'Team Lead Inspection',
      receivedDate: '2026-09-12',
      quantityReceived: '100% Verified',
      amount: pos[0].amount,
      status: 'Verified GRN',
    },
  ]
  const userReceipts = getStoredVendorReceipts(vendorId)
  const receipts = [...userReceipts, ...defaultReceipts]

  // Invoices scoped to this vendorId (merged with user submitted invoices)
  const defaultInvoices = [
    {
      id: `INV-${vendorId.replace(/[^A-Z0-9]/g, '')}-${(seed % 80) + 100}`,
      poRef: pos[0].id,
      title: pos[0].title,
      amount: pos[0].amount,
      invoiceDate: '2026-09-11',
      dueDate: '2026-10-11',
      status: 'Approved',
    },
  ]

  const userInvoices = getStoredVendorInvoices(vendorId)
  const invoices = [...userInvoices, ...defaultInvoices]

  // Payments scoped to this vendorId
  const payments = [
    {
      id: `PAY-${vendorId.replace(/[^A-Z0-9]/g, '')}-01`,
      invoiceRef: invoices[0].id,
      poRef: pos[0].id,
      amount: invoices[0].amount,
      disbursedDate: 'Scheduled 2026-09-30',
      transferRef: `TXN-${seed * 112}`,
      bankName: 'Corporate Settlement Account',
      status: 'Scheduled',
    },
  ]

  // Derived win rate
  const winRate = `${(82.0 + (seed % 14.5)).toFixed(1)}%`

  // Documents scoped to this vendorId (merged with user uploaded docs)
  const defaultDocuments = [
    {
      id: `DOC-${vendorId}-GST`,
      name: `${vendor.name} GST & Tax ID Certificate`,
      category: 'Compliance & Tax',
      uploadedDate: '2024-01-15',
      expiryDate: '2027-12-31',
      status: 'Verified',
      fileSize: '1.4 MB',
    },
    {
      id: `DOC-${vendorId}-NDA`,
      name: `${vendor.name} Master Non-Disclosure Agreement (NDA)`,
      category: 'Contracts & NDA',
      uploadedDate: '2024-02-01',
      expiryDate: '2026-10-15',
      status: 'Expiring Soon',
      fileSize: '2.1 MB',
    },
    {
      id: `DOC-${vendorId}-CERT`,
      name: `${vendor.name} ISO-9001 Quality Management Certificate`,
      category: 'Certifications',
      uploadedDate: '2024-03-10',
      expiryDate: '2027-03-10',
      status: 'Verified',
      fileSize: '890 KB',
    },
  ]

  const userDocs = getStoredVendorDocuments(vendorId)
  const documents = [...userDocs, ...defaultDocuments]

  // Vendor Notifications (Latest 3)
  const notifications = [
    {
      id: `NOTIF-${vendorId}-01`,
      title: `⭐ Top Ranked Category Choice`,
      message: `${vendor.name} is currently the #1 auto-recommended vendor for ${vendor.category} with ${vendor.score} score.`,
      timestamp: '15 mins ago',
      type: 'Recommendation',
    },
    {
      id: `NOTIF-${vendorId}-02`,
      title: `📦 Purchase Order Issued`,
      message: `Purchase Order ${pos[0]?.id || 'PO-2026-089'} confirmed. Delivery expected by ${pos[0]?.deliveryDueDate || '2026-09-26'}.`,
      timestamp: '2 hours ago',
      type: 'PO Update',
    },
    {
      id: `NOTIF-${vendorId}-03`,
      title: `💳 Disbursement Scheduled`,
      message: `Payment transfer of RS {vendor.totalDisbursed.toLocaleString()} scheduled for corporate account release.`,
      timestamp: '1 day ago',
      type: 'Payment',
    },
  ]

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
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
  const { vendor, rfqs, quotations, pos, deliveries, invoices, documents, notifications } = getScopedVendorData(vendorId)

  // State for interactive "Submit New Quote" modal
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [selectedRfqId, setSelectedRfqId] = useState(rfqs[0]?.id || '')
  const [quotePrice, setQuotePrice] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('7')
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState('')
  const [localRfqs, setLocalRfqs] = useState(rfqs)
  const [localQuotes, setLocalQuotes] = useState(quotations)

  useEffect(() => {
    setLocalRfqs(rfqs)
    setLocalQuotes(quotations)
  }, [vendorId])

  // Check if this vendor is top-ranked for category
  const topRankedVendor = rankVendorsForCategory(vendor.category)[0]
  const isTopRecommended = topRankedVendor?.id === vendor.id

  // Check document expiry
  const expiringDoc = documents.find(
    (d) => d.status === 'Expiring Soon' || d.expiryDate.startsWith('2026-10') || d.expiryDate.startsWith('2026-09')
  )

  // Invoices pending approval sum
  const pendingInvoicesSum = invoices.reduce((acc, i) => acc + i.amount, 0)

  // Quotation status counts
  const draftQuotesCount = quotations.filter((q) => q.status === 'Draft').length
  const submittedQuotesCount = quotations.filter((q) => q.status === 'Submitted').length
  const selectedQuotesCount = quotations.filter((q) => q.status === 'Selected').length
  const rejectedQuotesCount = quotations.filter((q) => q.status === 'Rejected').length

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
                <strong>{expiringDoc.expiryDate}</strong>. Please upload a renewed copy to maintain active bidding status.
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
              <span className="text-xl font-black text-emerald-300">{vendor.winRate || '84.5%'}</span>
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
          <span className="text-xl font-bold text-gray-900">{localRfqs.length} Pending Bids</span>
        </div>
        <div
          onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/quotations`)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <span className="text-xs text-gray-500 font-semibold block">Submitted Quotes</span>
          <span className="text-xl font-bold text-purple-600">{localQuotes.length} Submitted</span>
        </div>
        <div
          onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/purchase-orders`)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <span className="text-xs text-gray-500 font-semibold block">Confirmed POs</span>
          <span className="text-xl font-bold text-blue-600">{pos.length} Active POs</span>
        </div>
        <div
          onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/payment-status`)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <span className="text-xs text-gray-500 font-semibold block">Payment Disbursed</span>
          <span className="text-xl font-bold text-green-600">RS {vendor.totalDisbursed.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 font-medium block mt-1 border-t pt-1">
            ${vendor.totalDisbursed.toLocaleString()} Paid · ${pendingInvoicesSum.toLocaleString()} Pending Approval
          </span>
        </div>
      </div>

      {/* NEW: 2. "MY QUOTATIONS" STATUS WIDGET */}
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

      {/* NEW: 4. "QUOTE HISTORY & PERFORMANCE" SCOPED METRICS WIDGET */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" /> Quote History & Performance ({vendor.id})
          </h3>
          <span className="text-xs font-bold text-gray-400">Scoped Analytics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">Win Rate Trend (Last 5 RFQs)</span>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {['Won', 'Won', 'Lost', 'Won', 'Won'].map((result, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded text-[10px] font-black ${
                    result === 'Won' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                  title={`RFQ ${idx + 1}: ${result}`}
                >
                  {result === 'Won' ? '✓ Won' : '✗ Lost'}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-gray-500 font-semibold block mt-2">
              Scoped Win Rate: <strong className="text-emerald-700 font-extrabold">{vendor.winRate || '84.5%'}</strong>
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
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{quotations.length} Proposals</span>
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
            {localRfqs.map((r) => {
              const urgency = getRFQDeadlineUrgency(r.deadline)
              return (
                <div key={r.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-blue-600">{r.id}</span>
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
                    <h4 className="font-bold text-gray-900 mt-1">{r.title}</h4>
                    <p className="text-gray-500 mt-0.5">Deadline: {r.deadline} • Location: {r.deliveryLocation}</p>
                  </div>
                  <span className="font-black text-gray-900 bg-white px-2.5 py-1 rounded border shadow-xs">
                    RS {r.budgetEst.toLocaleString()}
                  </span>
                </div>
              )
            })}
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
            {pos.map((p) => (
              <div key={p.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center gap-2">
                <div>
                  <span className="font-bold text-blue-600">{p.id}</span>
                  <h4 className="font-bold text-gray-900 mt-0.5">{p.title}</h4>
                  <p className="text-gray-500 mt-0.5">Issue Date: {p.issueDate} • Due: {p.deliveryDueDate}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW WIDGETS SECTION (Upcoming Deliveries & Recent Notifications) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deliveries Mini-List Widget */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Truck size={16} className="text-blue-600" /> Upcoming Deliveries ({vendor.id})
            </h3>
            <button
              onClick={() => navigate(`/portal/vendor/vendor/${vendorId}/deliveries`)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Track all →
            </button>
          </div>
          <div className="space-y-3 text-xs">
            {deliveries.map((d) => (
              <div key={d.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded text-[10px]">
                      {d.poRef}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{d.item}</span>
                  </div>
                  <p className="text-gray-500 mt-1">
                    Expected: <strong className="text-gray-800">{d.expectedDate}</strong> • Location: {d.destination}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Carrier: {d.courier}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notifications Preview (Latest 3) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bell size={16} className="text-blue-600" /> Recent Notifications (Latest 3)
            </h3>
            <span className="text-xs font-bold text-gray-400">Vendor Activity Log</span>
          </div>
          <div className="space-y-3 text-xs">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
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
            ))}
          </div>
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
  const baseAmt = typeof quote.baseAmount === 'number' ? quote.baseAmount : (quote.quotedPrice || 0)
  const gstPct = typeof quote.gstPercent === 'number' ? quote.gstPercent : 18
  const gstAmt = typeof quote.gstAmount === 'number' ? quote.gstAmount : (baseAmt * gstPct / 100)
  const totalAmt = typeof quote.totalAmount === 'number' ? quote.totalAmount : (baseAmt + gstAmt)
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
  const openRfqs = rfqs.filter((r) => r.status === 'Open' || new Date(r.deadline) >= new Date())
  const [selectedRfqId, setSelectedRfqId] = useState(initialRfqId || openRfqs[0]?.id || '')

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

  useEffect(() => {
    if (initialRfqId) {
      setSelectedRfqId(initialRfqId)
    } else if (openRfqs[0]?.id) {
      setSelectedRfqId(openRfqs[0].id)
    }
  }, [initialRfqId, isOpen])

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

    const targetRfq = openRfqs.find((r) => r.id === selectedRfqId) || openRfqs[0]
    const finalGrnDocName = `Goods_Receipt_${grnDocNumber || defaultGrn}.pdf`

    const newQuotation = {
      id: `QUO-${cleanVndCode}-${Date.now().toString().slice(-4)}`,
      vendorId,
      vendorName,
      rfqRef: targetRfq ? targetRfq.id : (selectedRfqId || 'RFQ-2026-001'),
      grnDocNumber: grnDocNumber || defaultGrn,
      receiptNumber: receiptNumber || defaultRcp,
      issueDate,
      expiryDate,

      // Product Specs
      productName,
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
      quoteValidUntil: expiryDate,
      expectedDeliveryDate,
      notes: notes.trim() || undefined,
      grnDocName: finalGrnDocName,
      status: 'Submitted',
      submittedDate: todayStr,
    }

    apiClient.post('/rfq/quotations/', {
      rfq: targetRfq ? targetRfq.id : (selectedRfqId || 'RFQ-2026-001'),
      vendor: vendorName,
      price: parsedBase,
      delivery_days: parseInt(leadTimeDays) || 7,
      warranty_months: parseInt(warrantyDuration) || 12,
      terms_conditions: notes.trim() || '',
      status: 'Submitted'
    }).then(res => {
      saveStoredVendorQuote(vendorId, newQuotation)
    }).catch(err => {
      console.error('Failed to submit quotation to backend', err)
      saveStoredVendorQuote(vendorId, newQuotation) // Fallback for UI if backend fails
    })
    
    // Save generated GRN document to Documents page as well
    const grnDocRecord = {
      id: `DOC-${newQuotation.grnDocNumber}`,
      name: `Official Goods Receipt (${newQuotation.grnDocNumber}) - ${newQuotation.rfqRef}`,
      category: 'Financial Records',
      uploadedDate: todayStr,
      expiryDate: expiryDate || 'N/A',
      status: 'Verified',
      fileSize: '1.4 MB',
      docName: finalGrnDocName,
    }
    saveStoredVendorDocument(vendorId, grnDocRecord)

    if (onQuoteSubmitted) {
      onQuoteSubmitted(newQuotation)
    }

    setQuoteSuccessMsg(`Goods Receipt (${newQuotation.grnDocNumber}) & Proposal for ${newQuotation.rfqRef} submitted successfully!`)
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
              OFFICIAL GOODS RECEIPT (GRN)
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
                    onChange={(e) => setSelectedRfqId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-semibold text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    {openRfqs.map((r) => (
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
                      onChange={(e) => setLeadTimeDays(e.target.value)}
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
                        ${calculatedGstAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Table Invoice Summary Footer */}
                <div className="bg-slate-100 p-3 border-t-2 border-slate-900 flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">Total Amount (Incl. Taxes)</span>
                  <span className="text-base font-black text-slate-900">
                    ${calculatedTotalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <FileSpreadsheet size={15} /> Submit Goods Receipt
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
export const VendorRFQsPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const [subTab, setSubTab] = useState<'open' | 'expired'>('open')
  const { vendor, rfqs } = getScopedVendorData(vendorId)

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [selectedRfqId, setSelectedRfqId] = useState('')
  const [localRfqsList, setLocalRfqsList] = useState(rfqs)
  const [rfqActions, setRfqActions] = useState<Record<string, VendorRfqAction>>({})
  const [expandedRfqIds, setExpandedRfqIds] = useState<Record<string, boolean>>({})
  const [declineModalRfq, setDeclineModalRfq] = useState<any | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    const vendorData = getScopedVendorData(vendorId)
    const staticRfqs = vendorData.rfqs
    const vendorName = vendorData.vendor.name
    const vendorCategory = vendorData.vendor.category

    apiClient.get('/rfq/').then(res => {
       const backendRfqs = Array.isArray(res.data) ? res.data : res.data?.results || [];
       const mappedRfqs = backendRfqs.filter((r: any) => {
           return r.invited_vendors_detail?.some((iv: any) => {
               if (!iv.name || !vendorName) return false;
               const v1 = iv.name.toLowerCase().trim();
               const v2 = vendorName.toLowerCase().trim();
               return v1 === v2 || v1.includes(v2) || v2.includes(v1);
           });
       }).map((r: any) => ({
           id: r.rfq_id || `RFQ-${r.id}`,
           title: r.title,
           category: r.purchase_request_detail?.category || vendorCategory,
           subcategory: r.purchase_request_detail?.subcategory || 'General',
           description: r.purchase_request_detail?.description || r.terms,
           qty: r.purchase_request_detail?.quantity || 1,
           budgetEst: parseFloat(r.purchase_request_detail?.total_estimated_cost || '0'),
           deadline: r.deadline,
           status: r.status,
           requiredBy: r.purchase_request_detail?.required_by || 'N/A',
           deliveryLocation: r.purchase_request_detail?.delivery_location || 'HQ',
           originator: r.purchase_request_detail?.created_by_detail?.username || 'System'
       }));
       setLocalRfqsList(() => {
           const merged = [...mappedRfqs, ...staticRfqs];
           return merged.filter((v,i,a) => a.findIndex(t => t.id === v.id) === i);
       });
    }).catch(err => {
       console.error('Failed to fetch vendor RFQs', err);
       setLocalRfqsList(staticRfqs);
    });
    setRfqActions(getStoredVendorRfqActions(vendorId))
  }, [vendorId])

  const openRfqs = localRfqsList.filter((r) => {
    const st = (r.status || '').toLowerCase();
    const isOpenStatus = st === 'open' || st === 'sent' || st === 'new';
    const isNotDeclined = rfqActions[r.id]?.status !== 'Declined';
    const deadlineDate = new Date(r.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    return isOpenStatus && isNotDeclined && deadlineDate >= new Date();
  })
  const expiredRfqs = localRfqsList.filter(
    (r) => r.status === 'Expired' || new Date(r.deadline) < new Date()
  )

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
        {displayedRfqs.length === 0 ? (
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
            const isAccepted = action?.status === 'Accepted'

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
                      ) : isAccepted ? (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                          <CheckCircle size={10} /> ✓ Accepted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock size={10} /> Acceptance Required
                        </span>
                      )}
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
                    ) : (
                      <div className="flex items-center gap-2">
                        {!isAccepted && (
                          <span className="text-[11px] text-amber-700 font-semibold hidden sm:inline flex items-center gap-1">
                            <Lock size={12} /> Accept RFQ first to submit proposal
                          </span>
                        )}
                        <button
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
                              <Unlock size={14} /> Submit Goods Receipt →
                            </>
                          ) : (
                            <>
                              <Lock size={14} /> Submit Goods Receipt (Locked)
                            </>
                          )}
                        </button>
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
                        <p className="font-bold text-gray-900 mt-0.5">{rfq.requiredBy || '2026-10-15'}</p>
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">Vendor Decision:</span>
                          {isAccepted ? (
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-300 flex items-center gap-1.5">
                              <CheckCircle size={15} /> RFQ Accepted (Goods Receipt Submission Unlocked)
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
        rfqs={openRfqs}
        initialRfqId={selectedRfqId}
      />
    </div>
  )
}

// ─── 5. DYNAMIC VENDOR QUOTATIONS PAGE ────────────────────────────────────────
export const VendorQuotationsPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as 'draft' | 'submitted' | 'selected' | 'rejected' | null
  const [subTab, setSubTab] = useState<'draft' | 'submitted' | 'selected' | 'rejected'>(tabParam || 'submitted')
  const { vendor, quotations } = getScopedVendorData(vendorId)

  useEffect(() => {
    if (tabParam && ['draft', 'submitted', 'selected', 'rejected'].includes(tabParam)) {
      setSubTab(tabParam)
    }
  }, [tabParam])

  const draftQuotes = quotations.filter((q) => q.status === 'Draft')
  const submittedQuotes = quotations.filter((q) => q.status === 'Submitted')
  const selectedQuotes = quotations.filter((q) => q.status === 'Selected')
  const rejectedQuotes = quotations.filter((q) => q.status === 'Rejected')

  const displayedQuotes =
    subTab === 'draft' ? draftQuotes :
    subTab === 'submitted' ? submittedQuotes :
    subTab === 'selected' ? selectedQuotes :
    rejectedQuotes

  const tabs = [
    { id: 'draft', label: `Draft (${draftQuotes.length})` },
    { id: 'submitted', label: `Submitted (${submittedQuotes.length})` },
    { id: 'selected', label: `Selected (${selectedQuotes.length})` },
    { id: 'rejected', label: `Rejected (${rejectedQuotes.length})` },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="text-blue-600" /> Quotations History ({vendor.id})
        </h1>
        <p className="text-xs text-gray-500">Track status of bids submitted by {vendor.name}.</p>
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
        {displayedQuotes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle className="mx-auto mb-2 opacity-40" size={32} />
            <p className="font-bold text-gray-700">No {subTab} quotations found for {vendor.name}.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
              <tr>
                <th className="p-4">Quotation ID</th>
                <th className="p-4">RFQ Ref</th>
                <th className="p-4">Quoted Price</th>
                <th className="p-4">Lead Time / Exp. Delivery</th>
                <th className="p-4">Valid Until</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {displayedQuotes.map((quo) => (
                <tr key={quo.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <span className="font-bold text-blue-600 block">{quo.id}</span>
                    {quo.grnDocNumber && (
                      <button
                        onClick={() => downloadGoodsReceiptDocument(quo)}
                        className="mt-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded border border-blue-200 text-[10px] inline-flex items-center gap-1 cursor-pointer"
                        title="Download Goods Receipt (GRN) Document"
                      >
                        <Paperclip size={10} className="text-blue-600" />
                        {quo.grnDocName || `Goods_Receipt_${quo.grnDocNumber}`}
                        <Download size={10} className="ml-0.5 opacity-70" />
                      </button>
                    )}
                    {quo.notes && (
                      <p className="text-[10px] text-gray-500 font-normal italic mt-0.5 max-w-xs truncate" title={quo.notes}>
                        📝 {quo.notes}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-gray-600">{quo.rfqRef}</td>
                  <td className="p-4">
                    <div className="font-black text-gray-900">RS {(quo.totalAmount || quo.quotedPrice || 0).toLocaleString()}</div>
                    {quo.baseAmount && (
                      <div className="text-[10px] text-gray-500 font-medium">
                        Base: RS {quo.baseAmount.toLocaleString()} + GST {quo.gstPercent}% (RS {quo.gstAmount?.toLocaleString()})
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-gray-700">
                    <div>{quo.leadTime}</div>
                    {quo.expectedDeliveryDate && (
                      <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                        Exp. Delivery: {quo.expectedDeliveryDate}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-gray-600 font-medium">{quo.quoteValidUntil || 'N/A'}</td>
                  <td className="p-4 text-gray-500">{quo.submittedDate || '2026-09-10'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      quo.status === 'Selected' ? 'bg-green-100 text-green-800 border border-green-200' :
                      quo.status === 'Submitted' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      quo.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {quo.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  const [quantity, setQuantity] = useState('1')
  const [baseAmount, setBaseAmount] = useState('')
  const [gstPct, setGstPct] = useState('18')
  const [receivedBy, setReceivedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [poIssueDate, setPoIssueDate] = useState('')

  // Re-seed editable fields whenever the PO changes (modal opens for a new PO)
  useEffect(() => {
    if (po) {
      const amt = po.amount || 35000
      const base = Math.round(amt / 1.18)
      setDocNumber(`GRN-${po.id}`)
      setItemDescription(po.title || '')
      setQuantity('1')
      setBaseAmount(base.toString())
      setGstPct('18')
      setReceivedBy('')
      setNotes('')
      setPoIssueDate(po.issueDate || '2026-09-09')
      setInvoiceFile('')
      setDeliveryDate(new Date().toISOString().split('T')[0])
      setSuccessMsg('')
    }
  }, [po?.id])

  if (!isOpen || !po) return null

  // Live-calculated totals from editable fields
  const baseNum = parseFloat(baseAmount) || 0
  const gstNum = parseFloat(gstPct) || 0
  const gstAmount = Math.round(baseNum * gstNum / 100)
  const totalAmount = baseNum + gstAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalDocName = invoiceFile || `${docNumber || `Goods_Receipt_${po.id}`}.pdf`

    const record: DeliveryDocRecord = {
      poRef: po.id,
      requestRef: po.requestRef || 'REQ-2026-101',
      deliveryId: `TRK-EXPRESS-${po.id.slice(-4)}`,
      vendorId,
      challanDocName: finalDocName,
      invoiceDocName: finalDocName,
      deliveryDate,
      courierRef: (po as any).courier || 'FedEx Express (Tracking: TRK-99481)',
      status: 'Delivered',
      uploadedAt: new Date().toISOString(),
    }

    saveDeliveryDocs(po.id, record)
    markPODelivered(po.id)
    if (po.requestRef) markPODelivered(po.requestRef)

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
      status: 'Verified',
      fileSize: '1.4 MB',
      docName: finalDocName,
    }
    saveStoredVendorDocument(vendorId, grnDocRecord)

    // Mark payment Paid post-delivery
    markPaymentPaidForPO(po.id)
    if (po.requestRef) markPaymentPaidForPO(po.requestRef)

    setSuccessMsg(`Delivery confirmed, Invoice "${newInvoice.id}" submitted & Payment marked Paid!`)
    setTimeout(() => {
      onConfirm(po.id, finalDocName, deliveryDate)
      setSuccessMsg('')
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50">
      {/* Paper Sheet Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-lg w-full max-h-[90vh] flex flex-col relative text-gray-900 font-sans overflow-hidden mx-auto">

        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-20 px-6 pt-5 pb-4 border-b-2 border-slate-900 flex items-start justify-between shrink-0 shadow-xs">
          <div>
            <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold tracking-widest uppercase rounded-xs mb-1">
              OFFICIAL DELIVERY RECEIPT & INVOICE
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{vendorName}</h2>
            <p className="text-xs font-mono text-slate-500 font-medium mt-0.5">
              PO Ref: {po.id} • Req Ref: {po.requestRef || 'REQ-2026-101'}
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

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
          {successMsg ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-lg text-center text-xs font-bold text-emerald-900 space-y-2">
              <CheckCircle size={36} className="mx-auto text-emerald-600" />
              <p className="font-mono text-sm">{successMsg}</p>
            </div>
          ) : (
            <form id="delivery-receipt-form" onSubmit={handleSubmit} className="space-y-4">

              {/* ── Section 1: Receipt Metadata (editable) ── */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3 font-mono">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Details — Edit as needed</p>

                {/* Document Number */}
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

                {/* Vendor ID (read-only display) */}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold uppercase">Vendor ID:</span>
                  <span className="font-bold text-slate-900">{vendorId}</span>
                </div>

                {/* PO Issue Date (editable) */}
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

              {/* ── Section 2: Itemized Invoice (editable) ── */}
              <div className="border border-slate-300 rounded-lg overflow-hidden font-mono">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-800 text-xs">
                    {/* Editable Item Description */}
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

                    {/* Editable Base Amount */}
                    <tr>
                      <td className="p-2.5 text-slate-600">
                        Base Subtotal (before GST)
                      </td>
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

                    {/* Editable GST % */}
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
                      <td className="p-2 text-right text-slate-600">
                        RS {gstAmount.toLocaleString()}
                      </td>
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

              {/* ── Section 3: Notes / Remarks ── */}
              <div className="space-y-0.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes / Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. All items inspected & accepted. No damage observed."
                />
              </div>

              {/* ── Section 4: Goods Receipt Document Upload ── */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                  🧾 Goods Receipt Document
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.jpg,.png"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0]?.name || '')}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-slate-800 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block font-medium mt-1">
                  Optional — attach GRN or Tax Invoice file
                </span>
              </div>

              {/* ── Section 5: Confirmed Delivery Date ── */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Confirmed Delivery Date *
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>

              {/* ── Submit Button ── */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText size={15} /> Confirm Delivery & Submit Invoice
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
    return { nextStatus: 'Processing', label: 'Mark as Processing (Stg 6)' }
  }
  if (currentStatus === 'Processing') {
    return { nextStatus: 'Shipped', label: 'Mark as Ship / Transit (Stg 7)' }
  }
  if (currentStatus === 'Shipped' || currentStatus === 'In Transit') {
    return { nextStatus: 'Delivered', label: 'Mark as Delivered (Stg 8)' }
  }
  return { nextStatus: null, label: 'Order Delivered' }
}

export const VendorPurchaseOrdersPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const [subTab, setSubTab] = useState<'all' | 'pending' | 'confirmed' | 'fulfilled'>('all')
  const { vendor, pos } = getScopedVendorData(vendorId)
  const { updateVendorPOStatus } = useProcurement()
  const [poStatuses, setPoStatuses] = useState<Record<string, string>>({})
  const [expandedPoIds, setExpandedPoIds] = useState<Record<string, boolean>>({})
  const [activeDeliveryModalPo, setActiveDeliveryModalPo] = useState<any | null>(null)
  const [toastMsg, setToastMsg] = useState<string>('')

  const toggleExpandRow = (poId: string) => {
    setExpandedPoIds((prev) => ({ ...prev, [poId]: !prev[poId] }))
  }

  const handleModalConfirm = (poRef: string, docName: string, deliveryDate: string) => {
    setPoStatuses((prev) => ({ ...prev, [poRef]: 'Delivered' }))
    updateVendorPOStatus(poRef, 'Delivered')
    markPODelivered(poRef)
    markPaymentPaidForPO(poRef)
    setToastMsg(`✅ Delivery confirmed & Invoice "${docName}" submitted for ${poRef}! Payment Status updated to Paid.`)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleAdvanceStage = (po: any) => {
    const currentStatus = poStatuses[po.id] || po.status
    const nextInfo = getNextStageInfo(currentStatus)
    if (!nextInfo.nextStatus) return

    if (nextInfo.nextStatus === 'Delivered') {
      // Open paper-styled invoice delivery modal
      setActiveDeliveryModalPo(po)
    } else {
      const newStatus = nextInfo.nextStatus
      setPoStatuses((prev) => ({ ...prev, [po.id]: newStatus }))
      updateVendorPOStatus(po.id, newStatus)
      setToastMsg(`Order stage advanced to "${newStatus}" for ${po.id}.`)
      setTimeout(() => setToastMsg(''), 3000)
    }
  }

  const filteredPos = pos.filter((po) => {
    const status = poStatuses[po.id] || po.status
    if (subTab === 'pending') return status === 'Pending Confirmation' || status === 'Processing'
    if (subTab === 'confirmed') return status === 'Confirmed' || status === 'Shipped'
    if (subTab === 'fulfilled') return status === 'Delivered' || status === 'Fulfilled'
    return true
  })

  const tabs = [
    { id: 'all', label: `All POs (${pos.length})` },
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
                <th className="p-4 text-right">Update Order Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {filteredPos.map((po) => {
                const currentStatus = poStatuses[po.id] || po.status
                const paymentPaid = isPaymentPaidForPO(po.id) || (po.requestRef && isPaymentPaidForPO(po.requestRef))
                const isExpanded = !!expandedPoIds[po.id]
                const existingDocs = getStoredDeliveryDocs(po.id) || (po.requestRef ? getStoredDeliveryDocs(po.requestRef) : null)
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
                        <td colSpan={8} className="p-4">
                          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-4">
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
                                <span className="font-mono font-bold text-blue-600">{(po as any).trackingRef || `TRK-EXPRESS-${po.id.slice(-5)}`}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] font-bold uppercase">Expected Arrival</span>
                                <span className="font-bold text-gray-800">{po.deliveryDueDate || '2026-09-26'}</span>
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

  const [deliveryRecords, setDeliveryRecords] = useState(deliveries)
  const [activeDeliveryForDocs, setActiveDeliveryForDocs] = useState<any | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  const handleDeliveryConfirmed = (poRef: string, record: DeliveryDocRecord) => {
    markPODelivered(poRef)
    setDeliveryRecords((prev) =>
      prev.map((d) => (d.poRef === poRef ? { ...d, status: 'Delivered' } : d))
    )
    setToastMsg(`Status set to "Delivered" for ${poRef}! Invoice & Delivery Challan linked to requester's portal.`)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleStatusSelectChange = (delivery: any, newStatus: string) => {
    if (newStatus === 'Delivered') {
      setActiveDeliveryForDocs(delivery)
    } else {
      setDeliveryRecords((prev) =>
        prev.map((d) => (d.poRef === delivery.poRef ? { ...d, status: newStatus } : d))
      )
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
              const savedDocs = getStoredDeliveryDocs(d.poRef)
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

// ─── 8. DYNAMIC VENDOR RECEIPTS PAGE ──────────────────────────────────────────
export const VendorReceiptsPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, receipts: seedReceipts, pos } = getScopedVendorData(vendorId)

  // Live list: user-stored receipts first, then seed defaults
  const [localReceipts, setLocalReceipts] = useState<any[]>(() => [
    ...getStoredVendorReceipts(vendorId),
    ...seedReceipts,
  ])
  const [showAddModal, setShowAddModal] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const handleReceiptAdded = (newReceipt: any) => {
    saveStoredVendorReceipt(vendorId, newReceipt)
    setLocalReceipts((prev) => [newReceipt, ...prev])
    setToastMsg(`✅ Receipt "${newReceipt.id}" added successfully!`)
    setTimeout(() => setToastMsg(''), 4000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="text-blue-600" /> Verified Receipts & GRNs ({vendor.id})
          </h1>
          <p className="text-xs text-gray-500">Verified client delivery sign-offs for {vendor.name}.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus size={16} /> Add Receipt Manually
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        {localReceipts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle className="mx-auto mb-2 opacity-40" size={32} />
            <p className="font-bold text-gray-700">No receipts yet. Add one manually.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
              <tr>
                <th className="p-4">GRN Ref</th>
                <th className="p-4">PO Ref</th>
                <th className="p-4">Item Delivered</th>
                <th className="p-4">Qty Received</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Receipt Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {localReceipts.map((grn) => (
                <tr key={grn.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-blue-600">{grn.id}</td>
                  <td className="p-4 font-semibold text-gray-800">{grn.poRef}</td>
                  <td className="p-4 font-semibold text-gray-900">{grn.title}</td>
                  <td className="p-4 text-gray-600">{grn.quantityReceived || '—'}</td>
                  <td className="p-4 font-black text-gray-900">
                    {grn.amount ? `RS ${Number(grn.amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="p-4 text-gray-600">{grn.receivedDate}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      grn.status === 'Verified GRN' || grn.status === 'Verified'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {grn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddReceiptModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        vendorId={vendorId}
        pos={pos}
        onReceiptAdded={handleReceiptAdded}
      />
    </div>
  )
}

// ─── ADD RECEIPT MANUALLY MODAL (Paper-Invoice Style) ────────────────────────
const AddReceiptModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  vendorId: string
  pos: Array<{ id: string; title: string; amount: number }>
  onReceiptAdded: (receipt: any) => void
}> = ({ isOpen, onClose, vendorId, pos, onReceiptAdded }) => {
  const [poRef, setPoRef] = useState(pos[0]?.id || '')
  const [docNumber, setDocNumber] = useState('')
  const [description, setDescription] = useState(pos[0]?.title || '')
  const [quantity, setQuantity] = useState('1')
  const [baseAmount, setBaseAmount] = useState('')
  const [gstPct, setGstPct] = useState('18')
  const [receivedBy, setReceivedBy] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [poIssueDate, setPoIssueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (isOpen && pos[0]) {
      const base = Math.round((pos[0].amount || 35000) / 1.18)
      setPoRef(pos[0].id)
      setDocNumber(`GRN-${vendorId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-5)}`)
      setDescription(pos[0].title)
      setQuantity('1')
      setBaseAmount(base.toString())
      setGstPct('18')
      setReceivedBy('')
      setPoIssueDate('')
      setNotes('')
      setReceiptDate(new Date().toISOString().split('T')[0])
      setSuccessMsg('')
    }
  }, [isOpen, pos])

  if (!isOpen) return null

  // Live totals
  const baseNum = parseFloat(baseAmount) || 0
  const gstNum = parseFloat(gstPct) || 0
  const gstAmount = Math.round(baseNum * gstNum / 100)
  const totalAmount = baseNum + gstAmount

  const selectedPo = pos.find((p) => p.id === poRef)
  const vendorName = selectedPo?.title || vendorId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newReceipt = {
      id: docNumber || `GRN-${vendorId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-5)}`,
      poRef,
      title: description,
      quantityReceived: quantity || 'As per PO',
      amount: totalAmount,
      receivedDate: receiptDate,
      receivedBy: receivedBy || 'Manual Entry',
      status: 'Pending Verification',
    }
    setSuccessMsg(`Receipt "${newReceipt.id}" created!`)
    setTimeout(() => {
      onReceiptAdded(newReceipt)
      setSuccessMsg('')
      onClose()
    }, 900)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-lg w-full max-h-[90vh] flex flex-col relative text-gray-900 font-sans overflow-hidden mx-auto">

        {/* Sticky Paper Receipt Header */}
        <div className="sticky top-0 bg-white z-20 px-6 pt-5 pb-4 border-b-2 border-slate-900 flex items-start justify-between shrink-0 shadow-xs">
          <div>
            <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold tracking-widest uppercase rounded-xs mb-1">
              OFFICIAL GOODS RECEIPT & GRN
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{vendorId}</h2>
            <p className="text-xs font-mono text-slate-500 font-medium mt-0.5">
              PO Ref: {poRef} • Manual Receipt Entry
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
                  {pos.length > 0 ? (
                    <select
                      value={poRef}
                      onChange={(e) => {
                        setPoRef(e.target.value)
                        const sel = pos.find((p) => p.id === e.target.value)
                        if (sel) {
                          setDescription(sel.title)
                          setBaseAmount(Math.round((sel.amount || 35000) / 1.18).toString())
                        }
                      }}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    >
                      {pos.map((p) => (
                        <option key={p.id} value={p.id}>{p.id} — {p.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={poRef}
                      onChange={(e) => setPoRef(e.target.value)}
                      placeholder="e.g. PO-VND-001"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  )}
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
                    placeholder="e.g. GRN-VNDHW001-00001"
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
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
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
                  placeholder="e.g. All items inspected & accepted. No damage observed."
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
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
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
                  <FileCheck size={15} /> Confirm & Add Receipt
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── REUSABLE SUBMIT INVOICE MODAL (Paper-Invoice Style) ─────────────────────
export const SubmitInvoiceModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  pos: Array<{ id: string; title: string; amount: number }>
  onInvoiceSubmitted: (newInv: any) => void
}> = ({ isOpen, onClose, vendorId, vendorName, pos, onInvoiceSubmitted }) => {
  const [poRef, setPoRef] = useState(pos[0]?.id || '')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [description, setDescription] = useState(pos[0]?.title || '')
  const [quantity, setQuantity] = useState('1')
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
      const base = Math.round((pos[0].amount || 30340) / 1.18)
      setPoRef(pos[0].id)
      setInvoiceNumber(`INV-${vendorId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-5)}`)
      setDescription(pos[0].title)
      setQuantity('1')
      setBaseAmount(base.toString())
      setGstPct('18')
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
    const foundPo = pos.find((p) => p.id === selectedPoId)
    if (foundPo) {
      setDescription(foundPo.title)
      setBaseAmount(Math.round((foundPo.amount || 30340) / 1.18).toString())
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isDelivered) {
      alert(`🔒 Commercial Invoice submission is enabled ONLY after vendor sets PO status to "Delivered" and uploads Delivery Challan.`)
      return
    }

    const newInvoice = {
      id: invoiceNumber || `INV-${vendorId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-3)}`,
      poRef: poRef || 'PO-VNDHW001-76',
      title: description || 'IT Hardware Supply & Delivery Batch',
      amount: totalAmount || 30340,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || '2026-10-11',
      status: 'Submitted',
      docName: fileName || `Tax_Invoice_${poRef}.pdf`,
    }

    saveStoredVendorInvoice(vendorId, newInvoice)
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

// ─── 9. DYNAMIC VENDOR INVOICES PAGE ──────────────────────────────────────────
export const VendorInvoicesPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, invoices, pos } = getScopedVendorData(vendorId)
  const [localInvoices, setLocalInvoices] = useState(invoices)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  useEffect(() => {
    setLocalInvoices(invoices)
  }, [vendorId])

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {localInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-blue-600">{inv.id}</td>
                <td className="p-4 font-semibold text-gray-800">{inv.poRef}</td>
                <td className="p-4 font-semibold text-gray-900">{inv.title}</td>
                <td className="p-4 font-black text-gray-900">RS {inv.amount.toLocaleString()}</td>
                <td className="p-4 text-gray-600">{inv.invoiceDate}</td>
                <td className="p-4 text-gray-600">{inv.dueDate}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    inv.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                    inv.status === 'Submitted' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubmitInvoiceModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        vendorId={vendor.id}
        vendorName={vendor.name}
        pos={pos}
        onInvoiceSubmitted={(newInv) => setLocalInvoices([newInv, ...localInvoices])}
      />
    </div>
  )
}

// ─── 10. DYNAMIC VENDOR PAYMENT STATUS PAGE ───────────────────────────────────
export const VendorPaymentStatusPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, payments, pos } = getScopedVendorData(vendorId)

  // Single source of truth for payment status across Purchase Orders page and Payment Status page
  const paymentRows = pos.map((po) => {
    const isPaid = isPaymentPaidForPO(po.id) || (po.requestRef && isPaymentPaidForPO(po.requestRef))
    const matchingPay = payments.find((p) => p.poRef === po.id)
    return {
      id: matchingPay?.id || `PAY-${po.id.slice(-6)}`,
      invoiceRef: matchingPay?.invoiceRef || `INV-${po.id.slice(-4)}`,
      poRef: po.id,
      amount: po.amount,
      disbursedDate: isPaid ? 'Completed' : 'Pending Delivery Confirmation',
      transferRef: matchingPay?.transferRef || `TXN-ELECTRONIC-${po.id.slice(-4)}`,
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

// ─── UPLOAD DOCUMENT MODAL (Paper-Invoice Style) ─────────────────────────────
export const UploadDocumentModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  onDocumentUploaded: (newDoc: any) => void
}> = ({ isOpen, onClose, vendorId, vendorName, onDocumentUploaded }) => {
  const [docNumber, setDocNumber] = useState('')
  const [docName, setDocName] = useState('')
  const [category, setCategory] = useState('Compliance & Tax')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [fileName, setFileName] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      const ts = Date.now().toString().slice(-5)
      setDocNumber(`DOC-${vendorId.replace(/[^A-Z0-9]/g, '')}-${ts}`)
      setDocName('')
      setCategory('Compliance & Tax')
      setIssueDate(new Date().toISOString().split('T')[0])
      setExpiryDate('')
      setDescription('')
      setNotes('')
      setFileName('')
      setSuccessMsg('')
    }
  }, [isOpen, vendorId])

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const name = e.target.files[0].name
      setFileName(name)
      if (!docName) setDocName(name.replace(/\.[^/.]+$/, ''))
      if (!description) setDescription(name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!docName.trim()) return

    const newDoc = {
      id: docNumber || `DOC-${vendorId}-${Date.now().toString().slice(-4)}`,
      name: docName.trim(),
      category,
      uploadedDate: issueDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '2028-12-31',
      status: 'Pending',
      fileSize: '1.4 MB',
      fileName: fileName || `${docName.trim().replace(/\s+/g, '_')}.pdf`,
    }

    saveStoredVendorDocument(vendorId, newDoc)
    onDocumentUploaded(newDoc)
    setSuccessMsg(`Document "${newDoc.name}" uploaded successfully!`)

    setTimeout(() => {
      setSuccessMsg('')
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-lg w-full max-h-[90vh] flex flex-col relative text-gray-900 font-sans overflow-hidden mx-auto">

        {/* Sticky Paper Header */}
        <div className="sticky top-0 bg-white z-20 px-6 pt-5 pb-4 border-b-2 border-slate-900 flex items-start justify-between shrink-0 shadow-xs">
          <div>
            <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold tracking-widest uppercase rounded-xs mb-1">
              OFFICIAL DOCUMENT SUBMISSION
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{vendorName || vendorId}</h2>
            <p className="text-xs font-mono text-slate-500 font-medium mt-0.5">
              Vendor ID: {vendorId} • KSS Procurement OS
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

              {/* ── Section 1: Document Metadata ── */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3 font-mono">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Details — Fill in manually</p>

                {/* Document Number */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Document No. (GRN Format) *</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder={`DOC-${vendorId.replace(/[^A-Z0-9]/g, '')}-00001`}
                  />
                </div>

                {/* Document Name */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Receipt / Document Name *</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g. Tax Compliance & W-9 Form 2026"
                  />
                </div>

                {/* Vendor ID (read-only) */}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold uppercase">Vendor ID:</span>
                  <span className="font-bold text-slate-900">{vendorId}</span>
                </div>

                {/* Issue Date + Validity/Expiry Date side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Issue Date *</label>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Validity / Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="Compliance & Tax">Compliance & Tax</option>
                    <option value="Contracts & NDA">Contracts & NDA</option>
                    <option value="Certifications">Certifications</option>
                    <option value="Financial Records">Financial Records</option>
                    <option value="Security & Audits">Security & Audits</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* ── Section 2: Document Description Table ── */}
              <div className="border border-slate-300 rounded-lg overflow-hidden font-mono">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right w-24">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-800 text-xs">
                    <tr>
                      <td className="p-2.5" colSpan={2}>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Brief description of this document…"
                        />
                      </td>
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="p-2 text-slate-500">Category</td>
                      <td className="p-2 text-right font-bold text-slate-900">{category}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-500">Status on Upload</td>
                      <td className="p-2 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">Pending Review</span>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                    <tr>
                      <td className="p-2.5 uppercase tracking-wider text-[11px]">Digitally Signed Receipt</td>
                      <td className="p-2.5 text-right text-[10px] font-mono opacity-80">KSS Procurement OS • Certified</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── Section 3: Terms & Notes ── */}
              <div className="space-y-0.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Terms & Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. Includes 3-year OEM warranty. Net 30 payment terms."
                />
              </div>

              {/* ── Section 4: Choose Document File ── */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                  🗂 Choose Document File (PDF, DOCX) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-slate-800 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white cursor-pointer"
                />
                {fileName && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">📎 {fileName}</span>
                )}
              </div>

              {/* ── Submit Button ── */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderOpen size={15} /> Submit Goods Receipt
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 11. DYNAMIC VENDOR DOCUMENTS PAGE ────────────────────────────────────────
export const VendorDocumentsPage: React.FC = () => {
  const { vendorId = 'VND-HW-001' } = useParams<{ vendorId: string }>()
  const { vendor, documents } = getScopedVendorData(vendorId)
  const [localDocs, setLocalDocs] = useState(documents)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [downloadToast, setDownloadToast] = useState('')

  // Merge Admin's status overrides into document list
  const applyOverrides = (docs: any[]) => {
    const overrides = getDocStatusOverrides(vendorId)
    return docs.map((d) => overrides[d.id] ? { ...d, status: overrides[d.id] } : d)
  }

  useEffect(() => {
    setLocalDocs(applyOverrides(documents))
  }, [vendorId])

  const handleDownloadDoc = (doc: any) => {
    const content = `================================================\nKSS PROCUREMENT OS - VENDOR COMPLIANCE DOCUMENT\n================================================\nVendor ID: ${vendor.id}\nVendor Name: ${vendor.name}\nDocument Ref: ${doc.id}\nDocument Name: ${doc.name}\nCategory: ${doc.category}\nUploaded Date: ${doc.uploadedDate}\nExpiry Date: ${doc.expiryDate}\nStatus: ${doc.status}\nFile Size: ${doc.fileSize || '1.4 MB'}\n================================================\nCertified Official Compliance Record\n`
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
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Upload size={16} /> Upload New Document
        </button>
      </div>

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
            {localDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-blue-600">{doc.id}</td>
                <td className="p-4 font-bold text-gray-900">{doc.name}</td>
                <td className="p-4 font-semibold text-gray-700">{doc.category}</td>
                <td className="p-4 text-gray-600">{doc.uploadedDate}</td>
                <td className="p-4 text-gray-600">{doc.expiryDate}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    doc.status === 'Verified'      ? 'bg-green-100 text-green-800 border border-green-200' :
                    doc.status === 'Rejected'      ? 'bg-red-100 text-red-800 border border-red-200' :
                    doc.status === 'Expiring Soon' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}>
                    {doc.status === 'Pending' ? '⏳ Pending Review' : doc.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDownloadDoc(doc)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg border border-gray-300 transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                  >
                    <Download size={13} /> Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        vendorId={vendor.id}
        vendorName={vendor.name}
        onDocumentUploaded={(newDoc) => setLocalDocs(applyOverrides([newDoc, ...localDocs]))}
      />
    </div>
  )
}

export const VendorPaymentsPage: React.FC = VendorPaymentStatusPage
