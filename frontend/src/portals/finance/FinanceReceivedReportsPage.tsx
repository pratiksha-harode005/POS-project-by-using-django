import React, { useState, useMemo } from 'react'
import {
  FileCheck, Clock, CheckCircle, XCircle, Calendar, Search,
  Download, Eye, ArrowUpRight, User, Building, DollarSign,
  AlertTriangle, Check, FileText, Sparkles, Paperclip,
  ShieldCheck, X, Users, UserCheck, ChevronDown
} from 'lucide-react'
import { numberToIndianWords } from '../../utils/paymentLedgerPdfGenerator'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export type TimePeriodFilter = 'ALL' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type SubmitterFilter = 'ALL' | 'MANAGER' | 'TEAM_LEAD'

export interface FinanceReportItem {
  id: string
  title: string
  submitterName: string
  submitterRole: string
  submitterType: 'Manager' | 'Team Lead'
  department: string
  submittedDate: string
  periodCategory: 'Weekly' | 'Monthly' | 'Yearly'
  totalAmount: number
  status: 'Pending' | 'Approved' | 'Rejected'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  category: string
  costCenter: string
  summary: string
  keyFindings: string[]
  itemBreakdown: { item: string; qty: number; unitCost: number; totalCost: number }[]
  recommendation: string
  attachedDocs: { name: string; size: string }[]
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
  rejectedDate?: string
  financeNotes?: string
}

const INITIAL_FINANCE_REPORTS: FinanceReportItem[] = [
  // ── WEEKLY REPORTS (Past 7 Days: Sep 09 - Sep 16, 2026) ──
  {
    id: 'REP-MGR-2026-004',
    title: 'Weekly Enterprise Asset Handover & Capital Budget Allocation Dossier',
    submitterName: 'Sarah Manager',
    submitterRole: 'Senior Procurement Manager & IT Director',
    submitterType: 'Manager',
    department: 'IT & Infrastructure',
    submittedDate: '2026-09-15',
    periodCategory: 'Weekly',
    totalAmount: 1250000,
    status: 'Pending',
    priority: 'Critical',
    category: 'Capital Expenditure & Infrastructure',
    costCenter: 'CC-IT-CAPEX-2026',
    summary: 'Executive managerial handover for core cloud infrastructure expansion and enterprise workstation deployment.',
    keyFindings: [
      'Validated by IT line management with multi-vendor price benchmarking completed.',
      'Anticipated operational throughput increase of 45% across engineering pods.',
      'Vendor contracts locked under Q3 pricing matrix with guaranteed SLA.'
    ],
    itemBreakdown: [
      { item: 'Dell PowerEdge R760 Rack Server Cluster', qty: 2, unitCost: 450000, totalCost: 900000 },
      { item: 'Enterprise SAN Storage Expansion (50TB)', qty: 1, unitCost: 350000, totalCost: 350000 }
    ],
    recommendation: 'Formal handover to Finance Controller for budget deduction, purchase order generation, and vendor advance payment.',
    attachedDocs: [
      { name: 'Manager_Clearance_Dossier.pdf', size: '2.8 MB' },
      { name: 'Dell_Enterprise_Discount_Schedule.xlsx', size: '940 KB' }
    ]
  },
  {
    id: 'REP-TL-2026-041',
    title: 'Weekly Sprint Hardware & Dev Infrastructure Requisition',
    submitterName: 'Alex Developer',
    submitterRole: 'Lead Fullstack Architect',
    submitterType: 'Team Lead',
    department: 'Engineering',
    submittedDate: '2026-09-14',
    periodCategory: 'Weekly',
    totalAmount: 385000,
    status: 'Pending',
    priority: 'High',
    category: 'IT Hardware & Workstations',
    costCenter: 'CC-ENG-002',
    summary: 'Hardware upgrade requirements for newly onboarded microservices engineers and AI pipeline testing rigs.',
    keyFindings: [
      '5 junior engineers require dual-monitor IPS displays and NVMe workstation SSDs.',
      'Current development build times reduced by 40% in initial benchmark tests.',
      'Vendors identified under pre-negotiated corporate rates with 3-year enterprise warranties.'
    ],
    itemBreakdown: [
      { item: 'Dell UltraSharp 27" 4K Monitors', qty: 5, unitCost: 32000, totalCost: 160000 },
      { item: 'Samsung 990 Pro 2TB NVMe PCIe 4.0', qty: 5, unitCost: 19000, totalCost: 95000 },
      { item: 'Corsair 64GB DDR5 Memory Upgrade Kits', qty: 5, unitCost: 26000, totalCost: 130000 }
    ],
    recommendation: 'Urgent release recommended to prevent sprint velocity bottlenecks before Q4 launch.',
    attachedDocs: [
      { name: 'Hardware_Benchmark_Analysis.pdf', size: '1.8 MB' },
      { name: 'Vendor_Comparative_Quote.xlsx', size: '640 KB' }
    ]
  },
  {
    id: 'REP-TL-2026-042',
    title: 'Weekly Operations Facility Safety & Consumables Audit',
    submitterName: 'Ravi Kumar',
    submitterRole: 'Operations Team Lead',
    submitterType: 'Team Lead',
    department: 'Operations',
    submittedDate: '2026-09-12',
    periodCategory: 'Weekly',
    totalAmount: 145000,
    status: 'Approved',
    priority: 'Medium',
    category: 'Facilities & Safety',
    costCenter: 'CC-OPS-2026',
    summary: 'Weekly inventory evaluation and stock replenishment for warehouse packaging and worker PPE gear.',
    keyFindings: [
      'Floor 2 packaging materials below minimum buffer threshold of 14 days.',
      'Emergency eyewash station cartridges require bi-weekly replacement.',
      'Supplies budgeted under monthly facilities OPEX limit.'
    ],
    itemBreakdown: [
      { item: 'Industrial Packaging Strapping Rolls', qty: 40, unitCost: 1500, totalCost: 60000 },
      { item: 'Safety Helmets & Heavy Duty Gloves', qty: 50, unitCost: 900, totalCost: 45000 },
      { item: 'Emergency Eyewash Solution Barrels', qty: 8, unitCost: 5000, totalCost: 40000 }
    ],
    recommendation: 'Immediate order sign-off to ensure compliance with OSHA warehouse regulations.',
    attachedDocs: [
      { name: 'Weekly_Inventory_Checklist.pdf', size: '920 KB' }
    ],
    approvedBy: 'David Finance (Finance Controller)',
    approvedDate: '2026-09-13',
    financeNotes: 'Approved and booked under warehouse facilities budget.'
  },
  {
    id: 'REP-MGR-2026-003',
    title: 'Weekly Software Discretionary Spend Overrun Review',
    submitterName: 'Sarah Manager',
    submitterRole: 'Senior Procurement Manager',
    submitterType: 'Manager',
    department: 'Marketing',
    submittedDate: '2026-09-10',
    periodCategory: 'Weekly',
    totalAmount: 210000,
    status: 'Rejected',
    priority: 'Low',
    category: 'Marketing Software',
    costCenter: 'CC-MKT-004',
    summary: 'Managerial submission regarding off-cycle social media monitoring software subscription requests.',
    keyFindings: [
      'Existing enterprise Sprout Social contract provides duplicate functionality.',
      'Finance audit flagged budget overrun on marketing software line items.'
    ],
    itemBreakdown: [
      { item: 'Supplementary Social Listening Tool (6 Months)', qty: 1, unitCost: 210000, totalCost: 210000 }
    ],
    recommendation: 'Forwarded for Finance consideration regarding policy exemption.',
    attachedDocs: [
      { name: 'Software_Overlap_Assessment.pdf', size: '1.1 MB' }
    ],
    rejectionReason: 'Finance Disapproval: Redundant expenditure. Existing Sprout Social enterprise license provides identical features.',
    rejectedDate: '2026-09-11'
  },

  // ── MONTHLY REPORTS (Past 30 Days: Aug 17 - Sep 16, 2026) ──
  {
    id: 'REP-MGR-2026-002',
    title: 'Monthly Corporate Insurance & Statutory Risk Clearance Dossier',
    submitterName: 'Sarah Manager',
    submitterRole: 'Senior Procurement Manager',
    submitterType: 'Manager',
    department: 'Admin & Facilities',
    submittedDate: '2026-09-06',
    periodCategory: 'Monthly',
    totalAmount: 320000,
    status: 'Pending',
    priority: 'High',
    category: 'Corporate Insurance & Legal',
    costCenter: 'CC-ADM-001',
    summary: 'Managerial review and clearance report for comprehensive statutory liability and premises asset coverage renewal across 3 facilities.',
    keyFindings: [
      'Comprehensive liability and corporate asset insurance renewal for all corporate facilities.',
      'Price benchmarked across ICICI Lombard and HDFC Ergo tariff schedules.',
      'Statutory compliance prerequisite before quarterly audit inspection.'
    ],
    itemBreakdown: [
      { item: 'Commercial Premises Asset Protection Policy', qty: 1, unitCost: 195000, totalCost: 195000 },
      { item: 'Corporate Directors & Officers Liability Rider', qty: 1, unitCost: 125000, totalCost: 125000 }
    ],
    recommendation: 'Transmitted to Finance Directorate for budget booking, PO issuance, and NEFT premium disbursement.',
    attachedDocs: [
      { name: 'Insurance_Premium_Schedule_2026.pdf', size: '3.1 MB' },
      { name: 'Manager_Clearance_Endorsement.pdf', size: '820 KB' }
    ]
  },
  {
    id: 'REP-TL-2026-032',
    title: 'Monthly Software Licenses & SaaS Subscriptions Audit',
    submitterName: 'Priya Sharma',
    submitterRole: 'IT Operations & Infrastructure Lead',
    submitterType: 'Team Lead',
    department: 'IT',
    submittedDate: '2026-09-02',
    periodCategory: 'Monthly',
    totalAmount: 780000,
    status: 'Approved',
    priority: 'High',
    category: 'SaaS & Enterprise Software',
    costCenter: 'CC-IT-SAAS-2026',
    summary: 'Comprehensive monthly audit of active seat licenses across GitHub Enterprise, Figma, and Jira Service Management.',
    keyFindings: [
      'Identified 24 idle seat licenses that were safely reallocated, saving ₹1,12,000.',
      'Annual renewal required for 150 GitHub Enterprise seats before September 30.',
      'Vendor offered 12% multi-year discount if signed before end of month.'
    ],
    itemBreakdown: [
      { item: 'GitHub Enterprise Annual Seat Renewals', qty: 150, unitCost: 4200, totalCost: 630000 },
      { item: 'Figma Enterprise Design Seats', qty: 25, unitCost: 3600, totalCost: 90000 },
      { item: 'Jira Service Management Pro Tier', qty: 1, unitCost: 60000, totalCost: 60000 }
    ],
    recommendation: 'Authorize annual purchase order to retain discounted pricing and prevent service disruption.',
    attachedDocs: [
      { name: 'SaaS_License_Reconciliation_Aug2026.xlsx', size: '1.5 MB' },
      { name: 'GitHub_Discount_Agreement.pdf', size: '2.1 MB' }
    ],
    approvedBy: 'David Finance (Finance Controller)',
    approvedDate: '2026-09-04',
    financeNotes: 'Full pricing verified. Forwarded for annual PO release.'
  },
  {
    id: 'REP-TL-2026-035',
    title: 'Monthly Core Switch & Redundant UPS Modernization Report',
    submitterName: 'Nitesh IT',
    submitterRole: 'Senior Network Lead',
    submitterType: 'Team Lead',
    department: 'IT',
    submittedDate: '2026-08-20',
    periodCategory: 'Monthly',
    totalAmount: 640000,
    status: 'Pending',
    priority: 'High',
    category: 'Networking & Telecommunications',
    costCenter: 'CC-NET-003',
    summary: 'Monthly infrastructure review indicating server room battery degradation and packet latency on primary floor switches.',
    keyFindings: [
      'Server Room A UPS runtime dropped below safety margin of 20 minutes.',
      'Replacement high-density switches will expand bandwidth to 10Gbps backplane.',
      'Three quotes received with Cisco, Aruba, and Juniper certified vendors.'
    ],
    itemBreakdown: [
      { item: 'APC Symmetra LX 16kVA Modular UPS Battery Pack', qty: 1, unitCost: 360000, totalCost: 360000 },
      { item: 'Cisco Catalyst 9300 48-Port PoE+ Switch', qty: 2, unitCost: 140000, totalCost: 280000 }
    ],
    recommendation: 'Recommend finance budget verification and purchase order release.',
    attachedDocs: [
      { name: 'Battery_Impedance_Health_Report.pdf', size: '1.1 MB' },
      { name: 'Three_Way_Vendor_Comparison.xlsx', size: '890 KB' }
    ]
  },
  {
    id: 'REP-MGR-2026-001',
    title: 'Monthly Data Center Infrastructure Expansion Dossier',
    submitterName: 'Sarah Manager',
    submitterRole: 'Senior Procurement Manager',
    submitterType: 'Manager',
    department: 'IT & Infrastructure',
    submittedDate: '2026-08-18',
    periodCategory: 'Monthly',
    totalAmount: 875000,
    status: 'Approved',
    priority: 'Critical',
    category: 'Datacenter Infrastructure',
    costCenter: 'CC-DC-2026',
    summary: 'Specialized consultant support and hardware staging for Phase 2 zero-downtime datacenter migration.',
    keyFindings: [
      'CTO approved technical risk mitigation protocol.',
      'Third-party audit validation completed with zero non-conformances.',
      'Payment scheduled across 3 milestones against deliverable sign-offs.'
    ],
    itemBreakdown: [
      { item: 'Datacenter Migration Consultant Retainer', qty: 1, unitCost: 500000, totalCost: 500000 },
      { item: 'High-Density Rack Power Distribution Units', qty: 5, unitCost: 75000, totalCost: 375000 }
    ],
    recommendation: 'Cleared by Line Management. Transmitted for Finance disbursement schedule.',
    attachedDocs: [
      { name: 'Milestone_Payment_Structure.pdf', size: '2.5 MB' }
    ],
    approvedBy: 'David Finance (Finance Controller)',
    approvedDate: '2026-08-20',
    financeNotes: 'Milestone 1 PO disbursed. Milestones 2 & 3 scheduled.'
  },

  // ── YEARLY REPORTS (Fiscal Year FY2026) ──
  {
    id: 'REP-MGR-2026-Y01',
    title: 'Annual Enterprise ERP Cloud Migration & Database Modernization Dossier',
    submitterName: 'Sarah Manager',
    submitterRole: 'Senior Procurement Manager & IT Director',
    submitterType: 'Manager',
    department: 'Enterprise Systems',
    submittedDate: '2026-07-10',
    periodCategory: 'Yearly',
    totalAmount: 2400000,
    status: 'Pending',
    priority: 'Critical',
    category: 'Enterprise Software & ERP',
    costCenter: 'CC-ERP-CAPEX-2026',
    summary: 'Core ERP system migration to enterprise cloud edition with unified financial database upgrade and multi-year licensing.',
    keyFindings: [
      'Current on-premise ERP server reaches end-of-support in Q4 FY2026.',
      'Cloud edition consolidates procurement, inventory, and ledger databases into a single cloud cluster.',
      'Negotiated 22% enterprise multi-year subscription rebate.'
    ],
    itemBreakdown: [
      { item: 'Enterprise ERP Cloud Software License (Annual)', qty: 1, unitCost: 1600000, totalCost: 1600000 },
      { item: 'Database Migration Services & Data Cleansing', qty: 1, unitCost: 500000, totalCost: 500000 },
      { item: '24/7 Priority SLA & Dedicated Solutions Architect', qty: 1, unitCost: 300000, totalCost: 300000 }
    ],
    recommendation: 'Requires joint sign-off from Chief Financial Officer and Procurement Directorate.',
    attachedDocs: [
      { name: 'ERP_Cloud_RFP_Evaluation.pdf', size: '7.4 MB' },
      { name: 'Vendor_Commercial_Terms_Contract.pdf', size: '5.2 MB' }
    ]
  },
  {
    id: 'REP-TL-2026-011',
    title: 'Annual Datacenter Disaster Recovery & Cold-Site Standby Report',
    submitterName: 'Priya Sharma',
    submitterRole: 'IT Operations & Infrastructure Lead',
    submitterType: 'Team Lead',
    department: 'IT',
    submittedDate: '2026-06-15',
    periodCategory: 'Yearly',
    totalAmount: 1850000,
    status: 'Approved',
    priority: 'Critical',
    category: 'Enterprise Infrastructure & DR',
    costCenter: 'CC-IT-DR-2026',
    summary: 'Comprehensive annual disaster recovery strategy and dedicated secondary facility replication agreement.',
    keyFindings: [
      'Mandatory RBI and ISO-27001 disaster recovery compliance requirement.',
      'RTO target under 15 minutes, RPO target under 60 seconds successfully verified.',
      'Multi-year SLA negotiated with Tier-IV data center provider.'
    ],
    itemBreakdown: [
      { item: 'Tier-IV Secondary Facility Colocation (Annual Contract)', qty: 1, unitCost: 1200000, totalCost: 1200000 },
      { item: 'Dark Fiber Redundant Line Connectivity', qty: 2, unitCost: 225000, totalCost: 450000 },
      { item: 'Annual Third-Party DR Simulation & Audit', qty: 1, unitCost: 200000, totalCost: 200000 }
    ],
    recommendation: 'Executive sign-off required for statutory banking regulatory compliance.',
    attachedDocs: [
      { name: 'Disaster_Recovery_Audit_FY2026.pdf', size: '5.6 MB' },
      { name: 'Tier_IV_Colocation_Agreement.pdf', size: '4.1 MB' }
    ],
    approvedBy: 'David Finance (Finance Controller)',
    approvedDate: '2026-06-18',
    financeNotes: 'Capital expenditure authorized by Finance Committee.'
  },
  {
    id: 'REP-MGR-2026-Y02',
    title: 'Annual Executive Corporate Fleet Vehicle Capital Expenditure',
    submitterName: 'Sarah Manager',
    submitterRole: 'Senior Procurement Manager',
    submitterType: 'Manager',
    department: 'General Administration',
    submittedDate: '2026-05-12',
    periodCategory: 'Yearly',
    totalAmount: 1680000,
    status: 'Rejected',
    priority: 'Medium',
    category: 'Fleet Operations & Transport',
    costCenter: 'CC-ADM-FLEET',
    summary: 'Executive proposal to replace current managerial transport vehicles with luxury hybrid sedans.',
    keyFindings: [
      'Existing company vehicles have 2 remaining years on operational leases.',
      'Early termination penalty would incur ₹3,40,000 in contractual liquidated damages.'
    ],
    itemBreakdown: [
      { item: 'Executive Hybrid Sedans (Annual Lease Contract)', qty: 2, unitCost: 840000, totalCost: 1680000 }
    ],
    recommendation: 'Submitted for Finance evaluation.',
    attachedDocs: [
      { name: 'Executive_Fleet_Lease_Quote.pdf', size: '3.9 MB' }
    ],
    rejectionReason: 'Finance Disapproval: Early lease termination penalties render this uneconomical. Re-tender at end of FY2027.',
    rejectedDate: '2026-05-15'
  }
]

export const FinanceReceivedReportsPage: React.FC = () => {
  const [reports, setReports] = useState<FinanceReportItem[]>(INITIAL_FINANCE_REPORTS)
  const [timePeriod, setTimePeriod] = useState<TimePeriodFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [submitterFilter, setSubmitterFilter] = useState<SubmitterFilter>('ALL')
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedReport, setSelectedReport] = useState<FinanceReportItem | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [rejectModalReport, setRejectModalReport] = useState<FinanceReportItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Action Handlers
  const handleApproveReport = (reportId: string) => {
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
              ...r,
              status: 'Approved',
              approvedBy: 'David Finance (Finance Controller)',
              approvedDate: new Date().toISOString().split('T')[0],
              financeNotes: 'Audited and cleared for fund disbursement and PO issuance.'
            }
          : r
      )
    )
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport(prev =>
        prev
          ? {
              ...prev,
              status: 'Approved',
              approvedBy: 'David Finance (Finance Controller)',
              approvedDate: new Date().toISOString().split('T')[0],
              financeNotes: 'Audited and cleared for fund disbursement and PO issuance.'
            }
          : null
      )
    }
    showToast(`✓ Report ${reportId} cleared and approved by Finance!`, 'success')
  }

  const handleOpenRejectModal = (rep: FinanceReportItem) => {
    setRejectModalReport(rep)
    setRejectReason('')
  }

  const handleConfirmReject = () => {
    if (!rejectModalReport || !rejectReason.trim()) return
    const id = rejectModalReport.id
    setReports(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: 'Rejected',
              rejectionReason: rejectReason,
              rejectedDate: new Date().toISOString().split('T')[0]
            }
          : r
      )
    )
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(prev =>
        prev
          ? {
              ...prev,
              status: 'Rejected',
              rejectionReason: rejectReason,
              rejectedDate: new Date().toISOString().split('T')[0]
            }
          : null
      )
    }
    setRejectModalReport(null)
    setRejectReason('')
    showToast(`✕ Report ${id} disapproved by Finance Directorate.`, 'error')
  }

  // Export PDF Report Dossier
  const handleExportReportPdf = (rep: FinanceReportItem) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 36
    const contentWidth = pageWidth - margin * 2

    // Header Band
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageWidth, 56, 'F')
    doc.setFillColor(79, 70, 229) // Indigo-600
    doc.rect(0, 56, pageWidth, 4, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('KSS PROCUREMENT OS — FINANCE AUDIT & RECEIVED REPORT', margin, 26)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(203, 213, 225)
    doc.text(`REPORT DOSSIER: ${rep.id}  |  STATUS: ${rep.status.toUpperCase()}  |  SUBMITTER: ${rep.submitterType.toUpperCase()}`, margin, 40)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`DATE: ${rep.submittedDate}`, pageWidth - margin, 26, { align: 'right' })

    // Title Card
    let y = 76
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(79, 70, 229)
    doc.text(`SUBMITTED BY: ${rep.submitterName.toUpperCase()} (${rep.submitterRole}) [${rep.submitterType}]`, margin + 12, y + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    const truncatedTitle = rep.title.length > 55 ? rep.title.substring(0, 52) + '...' : rep.title
    doc.text(truncatedTitle, margin + 12, y + 33)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Department: ${rep.department}  |  Cost Center: ${rep.costCenter}  |  Period: ${rep.periodCategory}`, margin + 12, y + 46)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(`INR ${rep.totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 12, y + 28, { align: 'right' })

    // Table of Items
    y += 68
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('1. ITEMIZED EXPENDITURE & VALUATION BREAKDOWN', margin, y)

    y += 8
    const tableHeaders = [['No.', 'Item Description & Specification', 'Qty', 'Unit Rate (INR)', 'Total Amount (INR)']]
    const tableBody = rep.itemBreakdown.map((it, idx) => [
      String(idx + 1).padStart(2, '0'),
      it.item,
      String(it.qty),
      it.unitCost.toLocaleString('en-IN'),
      it.totalCost.toLocaleString('en-IN')
    ])

    autoTable(doc, {
      startY: y,
      head: tableHeaders,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 5,
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 260 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 95, halign: 'right' },
        4: { cellWidth: 100, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as any).lastAutoTable.finalY + 16

    // Findings
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('2. AUDIT FINDINGS & BUSINESS CASE', margin, y)

    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(51, 65, 85)
    rep.keyFindings.forEach((f) => {
      doc.text(`• ${f}`, margin + 8, y)
      y += 13
    })

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('3. SUBMISSION DIRECTIVE / RECOMMENDATION', margin, y)

    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(79, 70, 229)
    doc.text(`"${rep.recommendation}"`, margin + 8, y)

    y += 24
    // Finance Clearance Block
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, contentWidth, 48, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text('FINANCE AUDIT DECISION RECORD:', margin + 10, y + 16)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    if (rep.status === 'Approved') {
      doc.setTextColor(22, 101, 52)
      doc.text(`Audited and Approved by ${rep.approvedBy || 'David Finance'} on ${rep.approvedDate || rep.submittedDate}.`, margin + 10, y + 30)
    } else if (rep.status === 'Rejected') {
      doc.setTextColor(190, 18, 60)
      doc.text(`Disapproved by Finance: ${rep.rejectionReason || 'Policy non-compliance'} (${rep.rejectedDate || rep.submittedDate}).`, margin + 10, y + 30)
    } else {
      doc.setTextColor(180, 83, 9)
      doc.text('Pending Finance Controller budget verification and PO fund reservation.', margin + 10, y + 30)
    }

    doc.save(`${rep.id}_Finance_Report.pdf`)
    showToast(`✓ Downloaded PDF report for ${rep.id}`, 'success')
  }

  // Dynamic Filtering Logic
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Time Period Filter
      const matchTime =
        timePeriod === 'ALL' || r.periodCategory.toUpperCase() === timePeriod

      // 2. Status Filter
      const matchStatus =
        statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter

      // 3. Submitter Filter (Manager vs Team Lead)
      const matchSubmitter =
        submitterFilter === 'ALL' ||
        (submitterFilter === 'MANAGER' && r.submitterType === 'Manager') ||
        (submitterFilter === 'TEAM_LEAD' && r.submitterType === 'Team Lead')

      // 4. Search query
      const matchSearch =
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.submitterName.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase())

      // 5. Department filter
      const matchDept = selectedDept === 'All' || r.department === selectedDept

      return matchTime && matchStatus && matchSubmitter && matchSearch && matchDept
    })
  }, [reports, timePeriod, statusFilter, submitterFilter, search, selectedDept])

  // Counts calculated across current time-period slice
  const countsForCurrentPeriod = useMemo(() => {
    const periodSlice =
      timePeriod === 'ALL'
        ? reports
        : reports.filter(r => r.periodCategory.toUpperCase() === timePeriod)

    return {
      all: periodSlice.length,
      pending: periodSlice.filter(r => r.status === 'Pending').length,
      approved: periodSlice.filter(r => r.status === 'Approved').length,
      rejected: periodSlice.filter(r => r.status === 'Rejected').length,
      managerReports: periodSlice.filter(r => r.submitterType === 'Manager').length,
      teamLeadReports: periodSlice.filter(r => r.submitterType === 'Team Lead').length,
      totalSpend: periodSlice.reduce((s, r) => s + r.totalAmount, 0)
    }
  }, [reports, timePeriod])

  const departments = useMemo(() => {
    return ['All', ...Array.from(new Set(reports.map(r => r.department)))]
  }, [reports])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-purple-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              FINANCE AUDIT REPOSITORY
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {filteredReports.length} Reports In View
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <FileCheck className="text-purple-600" size={26} /> Received Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and approve operational and capital requisition reports submitted by <b>Team Leads</b> and <b>Managers</b>.
          </p>
        </div>

        {/* TIME-PERIOD FILTER TABS (Weekly, Monthly, Yearly) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setTimePeriod('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            All Periods
          </button>
          <button
            onClick={() => setTimePeriod('WEEKLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'WEEKLY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Weekly
          </button>
          <button
            onClick={() => setTimePeriod('MONTHLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'MONTHLY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Monthly
          </button>
          <button
            onClick={() => setTimePeriod('YEARLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'YEARLY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Yearly
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Reports</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{countsForCurrentPeriod.all}</p>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
            <span>{countsForCurrentPeriod.managerReports} Managers</span>
            <span>•</span>
            <span>{countsForCurrentPeriod.teamLeadReports} Team Leads</span>
          </div>
        </div>

        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Pending Review</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{countsForCurrentPeriod.pending}</p>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Awaiting finance audit</span>
        </div>

        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Approved</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{countsForCurrentPeriod.approved}</p>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Cleared for PO & payment</span>
        </div>

        <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Disapproved</span>
          <p className="text-2xl font-black text-rose-900 mt-1">{countsForCurrentPeriod.rejected}</p>
          <span className="text-[11px] text-rose-700 mt-0.5 block">Finance audit rejected</span>
        </div>
      </div>

      {/* STATUS FILTER PILLS & SUBMITTER FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
        
        {/* Status Filter Pills (Matching user's screenshot format) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            All ({countsForCurrentPeriod.all})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock size={13} />
            <span>Pending</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countsForCurrentPeriod.pending}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle size={13} />
            <span>Approval</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'APPROVED' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countsForCurrentPeriod.approved}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <XCircle size={13} />
            <span>Rejection</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'REJECTED' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countsForCurrentPeriod.rejected}
            </span>
          </button>
        </div>

        {/* Submitter Selector (All, Managers, Team Leads) & Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 lg:max-w-xl">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSubmitterFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                submitterFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setSubmitterFilter('MANAGER')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                submitterFilter === 'MANAGER' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Managers ({countsForCurrentPeriod.managerReports})
            </button>
            <button
              onClick={() => setSubmitterFilter('TEAM_LEAD')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                submitterFilter === 'TEAM_LEAD' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Leads ({countsForCurrentPeriod.teamLeadReports})
            </button>
          </div>

          <div className="relative flex-1 min-w-36">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
            />
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none bg-white text-slate-700"
          >
            {departments.map(d => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Depts' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* REPORTS LIST */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
          <FileCheck size={48} className="mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Reports Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No reports match the selected time period ({timePeriod}), status ({statusFilter}), and submitter filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map(rep => {
            const isManager = rep.submitterType === 'Manager'

            return (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Top Row: Meta Tags & Valuation */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                        {rep.id}
                      </span>

                      {/* Submitter Type Badge */}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${
                          isManager
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {isManager ? <UserCheck size={11} /> : <User size={11} />}
                        {rep.submitterType} Submission
                      </span>

                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {rep.periodCategory}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          rep.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : rep.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rep.priority} Priority
                      </span>

                      {rep.status === 'Approved' ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle size={11} /> Finance Approved
                        </span>
                      ) : rep.status === 'Rejected' ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                          <XCircle size={11} /> Finance Disapproved
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock size={11} /> Pending Finance Audit
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight">{rep.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>
                        Author: <b className="text-slate-800">{rep.submitterName}</b> ({rep.submitterRole})
                      </span>
                      <span>•</span>
                      <span>
                        Department: <b className="text-slate-800">{rep.department}</b>
                      </span>
                      <span>•</span>
                      <span>Cost Center: <span className="font-mono">{rep.costCenter}</span></span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Requisition Valuation
                    </span>
                    <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {fmt(rep.totalAmount)}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {rep.itemBreakdown.length} line item{rep.itemBreakdown.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {rep.summary}
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" /> Submitted: {rep.submittedDate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Paperclip size={13} className="text-slate-400" /> {rep.attachedDocs.length} Documents Attached
                      </span>
                    </div>
                    {rep.status === 'Approved' && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle size={13} /> Cleared by {rep.approvedBy || 'David Finance'} ({rep.approvedDate})
                      </span>
                    )}
                    {rep.status === 'Rejected' && (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <AlertTriangle size={13} /> {rep.rejectionReason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedReport(rep)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <Eye size={14} /> View Audit Dossier & Specifications
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleExportReportPdf(rep)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <Download size={13} /> Export PDF
                    </button>

                    {rep.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApproveReport(rep.id)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all"
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button
                          onClick={() => handleOpenRejectModal(rep)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-all"
                        >
                          <XCircle size={13} /> Disapprove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── FULL REPORT DOSSIER MODAL ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b-4 border-purple-600 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      {selectedReport.submitterType.toUpperCase()} • {selectedReport.periodCategory.toUpperCase()} REPORT
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      REF: {selectedReport.id}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Finance Audit Dossier & Requisition Assessment
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportReportPdf(selectedReport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                >
                  <Download size={13} /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors ml-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Report Content */}
            <div className="p-6 space-y-5 overflow-y-auto bg-slate-50/40 text-slate-800 text-xs">
              
              {/* Header Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">
                      REQUISITION SUBJECT
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedReport.title}</h3>
                    <p className="text-slate-500 mt-0.5">
                      Originating Authority: <b className="text-slate-800">{selectedReport.submitterName}</b> ({selectedReport.submitterRole}) • {selectedReport.department}
                    </p>
                  </div>
                  <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Valuation Total
                    </span>
                    <p className="text-xl font-black text-purple-700 font-mono">{fmt(selectedReport.totalAmount)}</p>
                    <span className="text-[10px] italic text-slate-500 block">
                      {numberToIndianWords(selectedReport.totalAmount)}
                    </span>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  {selectedReport.summary}
                </p>
              </div>

              {/* Itemized Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
                  <span>1. Itemized Procurement Specifications & Costing</span>
                  <span className="text-[10px] text-slate-500 font-normal">{selectedReport.itemBreakdown.length} items</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold text-left border-b border-slate-100">
                      <th className="px-4 py-2">Item Description</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Rate</th>
                      <th className="px-4 py-2 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReport.itemBreakdown.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{it.item}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{it.qty}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{fmt(it.unitCost)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmt(it.totalCost)}</td>
                      </tr>
                    ))}
                    <tr className="bg-purple-50/60 font-bold text-purple-900">
                      <td colSpan={3} className="px-4 py-2.5 text-right">Gross Total:</td>
                      <td className="px-4 py-2.5 text-right font-mono font-black">{fmt(selectedReport.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Audit Findings & Recommendation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <span className="font-bold text-slate-900 block text-xs">
                  2. Operational Justification & Key Findings
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                  {selectedReport.keyFindings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>

                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 mt-2">
                  <span className="font-bold text-purple-950 block text-[11px] uppercase">
                    Submitter Directive / Proposal:
                  </span>
                  <p className="text-purple-900 mt-0.5">
                    "{selectedReport.recommendation}"
                  </p>
                </div>
              </div>

              {/* Appended Docs */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <span className="font-bold text-slate-900 block text-xs mb-2">
                  3. Appended Quotations & Verification Documentation ({selectedReport.attachedDocs.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedReport.attachedDocs.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-purple-600" />
                        <span className="font-medium truncate max-w-[200px]">{doc.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Banner */}
              {selectedReport.status === 'Approved' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-2.5 text-emerald-900">
                  <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Finance Clearance Complete:</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Approved and authorized for PO release by {selectedReport.approvedBy || 'David Finance'} on {selectedReport.approvedDate}.
                    </p>
                  </div>
                </div>
              )}

              {selectedReport.status === 'Rejected' && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-900">
                  <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Finance Disapproval Record:</span>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Reason: {selectedReport.rejectionReason} ({selectedReport.rejectedDate})
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="text-xs text-slate-500">
                Active Auditor: <b>David Finance (Finance Controller)</b>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Close
                </button>
                {selectedReport.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(selectedReport)}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
                    >
                      Disapprove
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveReport(selectedReport.id)}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION REASON MODAL ── */}
      {rejectModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle size={20} />
                <h3 className="text-base font-bold text-slate-900">Finance Disapproval</h3>
              </div>
              <button
                onClick={() => setRejectModalReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide official Finance audit disapproval rationale for <b>{rejectModalReport.id}</b> ({rejectModalReport.title}):
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Specify rationale (e.g., budget allocation exceeded, tax schedule mismatch, duplicate requisition)..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-none resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalReport(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs"
              >
                Confirm Disapproval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
