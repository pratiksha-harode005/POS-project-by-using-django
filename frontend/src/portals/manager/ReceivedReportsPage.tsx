import React, { useState, useMemo } from 'react'
import {
  FileCheck, Clock, CheckCircle, XCircle, Calendar, Search,
  Filter, Download, Eye, ArrowUpRight, ChevronRight, User,
  Building, DollarSign, AlertTriangle, Check, FileText, Sparkles,
  Paperclip, ShieldCheck, X
} from 'lucide-react'
import { numberToIndianWords } from '../../utils/paymentLedgerPdfGenerator'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export type TimePeriodFilter = 'ALL' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface TeamLeadReport {
  id: string
  title: string
  teamLead: string
  role: string
  department: string
  submittedDate: string
  periodCategory: 'Weekly' | 'Monthly' | 'Yearly'
  totalAmount: number
  status: 'Pending' | 'Approved' | 'Rejected'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  category: string
  summary: string
  keyFindings: string[]
  itemBreakdown: { item: string; qty: number; unitCost: number; totalCost: number }[]
  teamLeadRecommendation: string
  attachedDocs: { name: string; size: string }[]
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
  rejectedDate?: string
  managerNotes?: string
}

const INITIAL_REPORTS: TeamLeadReport[] = [
  // ── WEEKLY REPORTS (Past 7 Days: Sep 09 - Sep 16, 2026) ──
  {
    id: 'REP-TL-2026-041',
    title: 'Weekly Sprint Hardware & Dev Infrastructure Requisition',
    teamLead: 'Alex Developer',
    role: 'Lead Fullstack Architect',
    department: 'Engineering',
    submittedDate: '2026-09-14',
    periodCategory: 'Weekly',
    totalAmount: 385000,
    status: 'Pending',
    priority: 'High',
    category: 'IT Hardware & Workstations',
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
    teamLeadRecommendation: 'Urgent release recommended to prevent sprint velocity bottlenecks before Q4 launch.',
    attachedDocs: [
      { name: 'Hardware_Benchmark_Analysis.pdf', size: '1.8 MB' },
      { name: 'Vendor_Comparative_Quote.xlsx', size: '640 KB' }
    ]
  },
  {
    id: 'REP-TL-2026-042',
    title: 'Weekly Operations Facility Safety & Consumables Audit',
    teamLead: 'Ravi Kumar',
    role: 'Operations Team Lead',
    department: 'Operations',
    submittedDate: '2026-09-12',
    periodCategory: 'Weekly',
    totalAmount: 145000,
    status: 'Approved',
    priority: 'Medium',
    category: 'Facilities & Safety',
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
    teamLeadRecommendation: 'Immediate order sign-off to ensure compliance with OSHA warehouse regulations.',
    attachedDocs: [
      { name: 'Weekly_Inventory_Checklist.pdf', size: '920 KB' }
    ],
    approvedBy: 'Sarah Manager',
    approvedDate: '2026-09-13',
    managerNotes: 'Approved against monthly warehouse replenishment budget.'
  },
  {
    id: 'REP-TL-2026-043',
    title: 'Weekly AI Model Hosting & Cloud Compute Usage Spike',
    teamLead: 'Maria Lead',
    role: 'AI & Data Engineering Lead',
    department: 'IT',
    submittedDate: '2026-09-11',
    periodCategory: 'Weekly',
    totalAmount: 520000,
    status: 'Pending',
    priority: 'Critical',
    category: 'Cloud & Compute Infrastructure',
    summary: 'Spike analysis in GPU compute hours during LLM fine-tuning benchmarks with cost-saving node reservation proposals.',
    keyFindings: [
      'On-demand A100 GPU costs exceeded baseline by 28% due to ad-hoc testing.',
      'Switching to 1-year reserved compute instances will yield 42% cost savings.',
      'Recommended immediate purchase of 2 reserved GPU clusters.'
    ],
    itemBreakdown: [
      { item: 'NVIDIA A100 80GB Reserved Cluster (Monthly)', qty: 2, unitCost: 210000, totalCost: 420000 },
      { item: 'High-Throughput NVMe Cache Bucket (10TB)', qty: 1, unitCost: 100000, totalCost: 100000 }
    ],
    teamLeadRecommendation: 'Recommend immediate contract execution with AWS/GCP to lock in volume discount.',
    attachedDocs: [
      { name: 'GPU_Compute_Spike_Log.csv', size: '2.4 MB' },
      { name: 'Cloud_Reserved_Instance_ROI.pdf', size: '1.2 MB' }
    ]
  },
  {
    id: 'REP-TL-2026-044',
    title: 'Weekly Team Event & Catering Expenditure Proposal',
    teamLead: 'Deepa Nair',
    role: 'HR & People Operations Lead',
    department: 'HR',
    submittedDate: '2026-09-10',
    periodCategory: 'Weekly',
    totalAmount: 65000,
    status: 'Rejected',
    priority: 'Low',
    category: 'Team Engagement',
    summary: 'Off-site venue booking and gourmet catering requisition for annual team hackathon celebration.',
    keyFindings: [
      'Internal auditor flagged that quarterly team event budget was already expended in August.',
      'In-house cafeteria alternative can deliver equivalent setup with zero external venue fees.'
    ],
    itemBreakdown: [
      { item: 'External Banquet Hall Booking', qty: 1, unitCost: 40000, totalCost: 40000 },
      { item: 'Catering Package (50 pax)', qty: 50, unitCost: 500, totalCost: 25000 }
    ],
    teamLeadRecommendation: 'Requesting discretionary exception approval from Department Manager.',
    attachedDocs: [
      { name: 'Event_Quotation_Proposal.pdf', size: '750 KB' }
    ],
    rejectionReason: 'Disapproved: Department team event budget exhausted for Q3. Please utilize in-house auditorium.',
    rejectedDate: '2026-09-11'
  },

  // ── MONTHLY REPORTS (Past 30 Days: Aug 17 - Sep 16, 2026) ──
  {
    id: 'REP-TL-2026-032',
    title: 'Monthly Software Licenses & SaaS Subscriptions Audit',
    teamLead: 'Priya Sharma',
    role: 'IT Operations & Infrastructure Lead',
    department: 'IT',
    submittedDate: '2026-09-02',
    periodCategory: 'Monthly',
    totalAmount: 780000,
    status: 'Approved',
    priority: 'High',
    category: 'SaaS & Enterprise Software',
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
    teamLeadRecommendation: 'Authorize annual purchase order to retain discounted pricing and prevent service disruption.',
    attachedDocs: [
      { name: 'SaaS_License_Reconciliation_Aug2026.xlsx', size: '1.5 MB' },
      { name: 'GitHub_Discount_Agreement.pdf', size: '2.1 MB' }
    ],
    approvedBy: 'Sarah Manager',
    approvedDate: '2026-09-04',
    managerNotes: 'Full pricing verified. Forwarded to Finance for annual PO release.'
  },
  {
    id: 'REP-TL-2026-033',
    title: 'Monthly Field Sales Collateral & Exhibition Booth Procurement',
    teamLead: 'Vikram Sales',
    role: 'Regional Sales Lead',
    department: 'Sales',
    submittedDate: '2026-08-28',
    periodCategory: 'Monthly',
    totalAmount: 295000,
    status: 'Approved',
    priority: 'Medium',
    category: 'Marketing & Sales Collateral',
    summary: 'Requisition for fabrication and promotional merchandise for the upcoming National Manufacturing Expo.',
    keyFindings: [
      'Anticipated lead generation: 400+ qualified corporate buyers.',
      'Booth layout complies with exhibition organizers modular shell standards.',
      'Includes high-quality printed customer brochures and branded digital presentation kiosks.'
    ],
    itemBreakdown: [
      { item: 'Custom Modular Exhibition Stall (6x3m)', qty: 1, unitCost: 180000, totalCost: 180000 },
      { item: 'Corporate Brochure & Product Folders (2000 pcs)', qty: 2000, unitCost: 35, totalCost: 70000 },
      { item: 'Interactive Touchscreen Rental & Tech Support', qty: 2, unitCost: 22500, totalCost: 45000 }
    ],
    teamLeadRecommendation: 'Recommend rapid dispatch to stall fabricator to ensure on-time setup.',
    attachedDocs: [
      { name: 'Expo_Floor_Plan_Contract.pdf', size: '3.4 MB' }
    ],
    approvedBy: 'Sarah Manager',
    approvedDate: '2026-08-30',
    managerNotes: 'Approved from Sales Q3 Promotion Allocation.'
  },
  {
    id: 'REP-TL-2026-034',
    title: 'Monthly Luxury Office Furniture Replacement Proposal',
    teamLead: 'Anil Mehta',
    role: 'General Admin Lead',
    department: 'Admin',
    submittedDate: '2026-08-24',
    periodCategory: 'Monthly',
    totalAmount: 460000,
    status: 'Rejected',
    priority: 'Low',
    category: 'Office Furniture',
    summary: 'Proposal to replace executive suite leather seating and mahogany conference tables.',
    keyFindings: [
      'Existing furniture was procured in FY2024 and remains in pristine condition.',
      'Auditor noted asset depreciation period is 5 years; replacement prematurely expends capex.'
    ],
    itemBreakdown: [
      { item: 'Executive Leather Ergonomic Chairs', qty: 8, unitCost: 35000, totalCost: 280000 },
      { item: '12-Person Boardroom Table Replacement', qty: 1, unitCost: 180000, totalCost: 180000 }
    ],
    teamLeadRecommendation: 'Submitted for managerial review.',
    attachedDocs: [
      { name: 'Furniture_Catalog_Quotation.pdf', size: '4.2 MB' }
    ],
    rejectionReason: 'Disapproved: Assets have not reached 5-year depreciation threshold. Existing furniture is in excellent operational state.',
    rejectedDate: '2026-08-26'
  },
  {
    id: 'REP-TL-2026-035',
    title: 'Monthly Core Switch & Redundant UPS Modernization Report',
    teamLead: 'Nitesh IT',
    role: 'Senior Network Lead',
    department: 'IT',
    submittedDate: '2026-08-20',
    periodCategory: 'Monthly',
    totalAmount: 640000,
    status: 'Pending',
    priority: 'High',
    category: 'Networking & Telecommunications',
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
    teamLeadRecommendation: 'Recommend manager sign-off and routing to Finance for capital expenditure clearance.',
    attachedDocs: [
      { name: 'Battery_Impedance_Health_Report.pdf', size: '1.1 MB' },
      { name: 'Three_Way_Vendor_Comparison.xlsx', size: '890 KB' }
    ]
  },

  // ── YEARLY REPORTS (Fiscal Year FY2026: Jan 01 - Dec 31, 2026) ──
  {
    id: 'REP-TL-2026-011',
    title: 'Annual Datacenter Disaster Recovery & Cold-Site Standby Report',
    teamLead: 'Priya Sharma',
    role: 'IT Operations & Infrastructure Lead',
    department: 'IT',
    submittedDate: '2026-06-15',
    periodCategory: 'Yearly',
    totalAmount: 1850000,
    status: 'Approved',
    priority: 'Critical',
    category: 'Enterprise Infrastructure & DR',
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
    teamLeadRecommendation: 'Executive sign-off required for statutory banking regulatory compliance.',
    attachedDocs: [
      { name: 'Disaster_Recovery_Audit_FY2026.pdf', size: '5.6 MB' },
      { name: 'Tier_IV_Colocation_Agreement.pdf', size: '4.1 MB' }
    ],
    approvedBy: 'Sarah Manager',
    approvedDate: '2026-06-18',
    managerNotes: 'Approved after executive committee review. Master agreement executed.'
  },
  {
    id: 'REP-TL-2026-012',
    title: 'Annual Enterprise Vehicle Fleet Lease & Electric Mobility Transition',
    teamLead: 'Anil Mehta',
    role: 'General Admin Lead',
    department: 'Admin',
    submittedDate: '2026-05-10',
    periodCategory: 'Yearly',
    totalAmount: 1250000,
    status: 'Rejected',
    priority: 'Medium',
    category: 'Fleet Operations',
    summary: 'Annual proposal to terminate existing diesel van fleet leases and switch completely to electric commercial delivery vans.',
    keyFindings: [
      'Charging infrastructure in industrial zone currently inadequate for full day routes.',
      'Capex penalty for premature lease termination exceeds FY2026 budget limits.'
    ],
    itemBreakdown: [
      { item: 'Commercial EV Delivery Van Fleet (Annual Lease)', qty: 4, unitCost: 250000, totalCost: 1000000 },
      { item: 'Fast DC Charging Stations (22kW)', qty: 2, unitCost: 125000, totalCost: 250000 }
    ],
    teamLeadRecommendation: 'Re-evaluate in FY2027 once local charging infrastructure matures.',
    attachedDocs: [
      { name: 'Fleet_EV_Feasibility_Report.pdf', size: '3.8 MB' }
    ],
    rejectionReason: 'Deferred to FY2027: Charging infrastructure along transit corridors is insufficient and lease penalties apply.',
    rejectedDate: '2026-05-14'
  },
  {
    id: 'REP-TL-2026-013',
    title: 'Annual Cyber Security Threat Intelligence & SOC Retainer Agreement',
    teamLead: 'Maria Lead',
    role: 'AI & Data Engineering Lead',
    department: 'IT',
    submittedDate: '2026-04-12',
    periodCategory: 'Yearly',
    totalAmount: 1400000,
    status: 'Approved',
    priority: 'Critical',
    category: 'Cybersecurity & Compliance',
    summary: 'Annual 24/7 Security Operations Center (SOC) managed service retainer and threat intelligence feed.',
    keyFindings: [
      '24/7 active surveillance across 1,200 company endpoints and cloud workloads.',
      'Guaranteed incident response within 15 minutes of breach detection.',
      'Zero critical security incidents reported during prior contract term.'
    ],
    itemBreakdown: [
      { item: 'Managed SOC 24x7x365 Retainer (Annual)', qty: 1, unitCost: 950000, totalCost: 950000 },
      { item: 'Threat Intelligence Feeds & EDR Licenses', qty: 1, unitCost: 300000, totalCost: 300000 },
      { item: 'Bi-Annual External Penetration Testing', qty: 2, unitCost: 75000, totalCost: 150000 }
    ],
    teamLeadRecommendation: 'Statutory compliance requirement under corporate governance rules.',
    attachedDocs: [
      { name: 'SOC_Annual_Audit_Report_2026.pdf', size: '4.8 MB' }
    ],
    approvedBy: 'Sarah Manager',
    approvedDate: '2026-04-15',
    managerNotes: 'Essential security contract. Authorized and countersigned.'
  },
  {
    id: 'REP-TL-2026-014',
    title: 'Annual Pan-India Logistics Warehouse Automation & Conveyor Feasibility',
    teamLead: 'Ravi Kumar',
    role: 'Operations Team Lead',
    department: 'Operations',
    submittedDate: '2026-03-22',
    periodCategory: 'Yearly',
    totalAmount: 980000,
    status: 'Pending',
    priority: 'High',
    category: 'Automation & Capital Assets',
    summary: 'Engineering feasibility report and procurement roadmap for automated sorting conveyors across Hub 1 and Hub 2.',
    keyFindings: [
      'Projected to increase hourly parcel throughput from 400 items/hr to 1,800 items/hr.',
      'Payback period modeled at 18 months based on labor redeployment.',
      'Phase 1 equipment requisition submitted for manager intake.'
    ],
    itemBreakdown: [
      { item: 'Automated Roller Conveyor Line (40m Modular)', qty: 2, unitCost: 380000, totalCost: 760000 },
      { item: 'High-Speed Optical Barcode Sorters', qty: 4, unitCost: 55000, totalCost: 220000 }
    ],
    teamLeadRecommendation: 'Requires joint sign-off with Finance and Logistics Director.',
    attachedDocs: [
      { name: 'Warehouse_Automation_DPR.pdf', size: '6.2 MB' },
      { name: 'Throughput_Simulation_Model.xlsx', size: '2.8 MB' }
    ]
  }
]

export const ReceivedReportsPage: React.FC = () => {
  const [reports, setReports] = useState<TeamLeadReport[]>(INITIAL_REPORTS)
  const [timePeriod, setTimePeriod] = useState<TimePeriodFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedReport, setSelectedReport] = useState<TeamLeadReport | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [rejectModalReport, setRejectModalReport] = useState<TeamLeadReport | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Quick Action Handlers
  const handleApproveReport = (reportId: string) => {
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
              ...r,
              status: 'Approved',
              approvedBy: 'Sarah Manager',
              approvedDate: new Date().toISOString().split('T')[0],
              managerNotes: 'Approved by Manager upon review.'
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
              approvedBy: 'Sarah Manager',
              approvedDate: new Date().toISOString().split('T')[0],
              managerNotes: 'Approved by Manager upon review.'
            }
          : null
      )
    }
    showToast(`✓ Report ${reportId} approved successfully!`, 'success')
  }

  const handleOpenRejectModal = (rep: TeamLeadReport) => {
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
    showToast(`✕ Report ${id} disapproved. Audit recorded.`, 'error')
  }

  // PDF Export for Individual Team Lead Report
  const handleExportReportPdf = (rep: TeamLeadReport) => {
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
    doc.setFillColor(147, 51, 234)
    doc.rect(0, 56, pageWidth, 4, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('KSS PROCUREMENT OS — TEAM LEAD SUBMITTED REPORT', margin, 26)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(203, 213, 225)
    doc.text(`REPORT DOSSIER: ${rep.id}  |  STATUS: ${rep.status.toUpperCase()}`, margin, 40)

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
    doc.setTextColor(147, 51, 234)
    doc.text(`AUTHOR: ${rep.teamLead.toUpperCase()} (${rep.role})`, margin + 12, y + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    const truncatedTitle = rep.title.length > 55 ? rep.title.substring(0, 52) + '...' : rep.title
    doc.text(truncatedTitle, margin + 12, y + 33)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Department: ${rep.department}  |  Period: ${rep.periodCategory}  |  Priority: ${rep.priority}`, margin + 12, y + 46)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(`INR ${rep.totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 12, y + 28, { align: 'right' })

    // Table of Items
    y += 68
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('1. ITEMIZED REQUISITION & EXPENDITURE BREAKDOWN', margin, y)

    y += 8
    const tableHeaders = [['No.', 'Item Description & Specification', 'Qty', 'Unit Cost (INR)', 'Total Cost (INR)']]
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

    // Executive Findings
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('2. KEY FINDINGS & OPERATIONAL RATIONALE', margin, y)

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
    doc.text('3. TEAM LEAD RECOMMENDATION', margin, y)

    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(147, 51, 234)
    doc.text(`"${rep.teamLeadRecommendation}"`, margin + 8, y)

    y += 24
    // Manager sign-off block
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, contentWidth, 48, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text('MANAGER REVIEW RECORD:', margin + 10, y + 16)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    if (rep.status === 'Approved') {
      doc.setTextColor(22, 101, 52)
      doc.text(`Approved by ${rep.approvedBy || 'Sarah Manager'} on ${rep.approvedDate || rep.submittedDate}.`, margin + 10, y + 30)
    } else if (rep.status === 'Rejected') {
      doc.setTextColor(190, 18, 60)
      doc.text(`Disapproved: ${rep.rejectionReason || 'Policy non-compliance'} (${rep.rejectedDate || rep.submittedDate}).`, margin + 10, y + 30)
    } else {
      doc.setTextColor(180, 83, 9)
      doc.text('Pending managerial sign-off and cost center evaluation.', margin + 10, y + 30)
    }

    doc.save(`${rep.id}_Report_${rep.teamLead.replace(/\s+/g, '_')}.pdf`)
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

      // 3. Search query
      const matchSearch =
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.teamLead.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase())

      // 4. Department filter
      const matchDept = selectedDept === 'All' || r.department === selectedDept

      return matchTime && matchStatus && matchSearch && matchDept
    })
  }, [reports, timePeriod, statusFilter, search, selectedDept])

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
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              TEAM LEAD REPORTS REPOSITORY
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {filteredReports.length} Reports Displayed
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <FileCheck className="text-indigo-600" size={26} /> Received Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and approve operational and procurement reports submitted by Team Leads across all departments.
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
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Weekly
          </button>
          <button
            onClick={() => setTimePeriod('MONTHLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'MONTHLY'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Monthly
          </button>
          <button
            onClick={() => setTimePeriod('YEARLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'YEARLY'
                ? 'bg-indigo-600 text-white shadow-sm'
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
          <span className="text-[11px] text-slate-500 mt-0.5 block">{timePeriod === 'ALL' ? 'All cycles' : `${timePeriod} cycle`}</span>
        </div>

        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Pending Review</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{countsForCurrentPeriod.pending}</p>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Requires manager action</span>
        </div>

        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Approved</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{countsForCurrentPeriod.approved}</p>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Signed & released</span>
        </div>

        <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Disapproved</span>
          <p className="text-2xl font-black text-rose-900 mt-1">{countsForCurrentPeriod.rejected}</p>
          <span className="text-[11px] text-rose-700 mt-0.5 block">Rejection audit recorded</span>
        </div>
      </div>

      {/* STATUS FILTER PILLS & SEARCH / DEPARTMENT TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        
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

        {/* Search & Dept Selector */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports by ID, title, lead..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            />
          </div>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white text-slate-700"
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
            No Team Lead reports match the selected time period ({timePeriod}) and status ({statusFilter}). Try adjusting your filter parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map(rep => (
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
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {rep.periodCategory} Report
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
                        <CheckCircle size={11} /> Approved
                      </span>
                    ) : rep.status === 'Rejected' ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                        <XCircle size={11} /> Rejected
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock size={11} /> Awaiting Manager Review
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">{rep.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Submitted by: <b className="text-slate-800">{rep.teamLead}</b> ({rep.role})
                    </span>
                    <span>•</span>
                    <span>
                      Department: <b className="text-slate-800">{rep.department}</b>
                    </span>
                    <span>•</span>
                    <span>Category: {rep.category}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Reported Expenditure
                  </span>
                  <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {fmt(rep.totalAmount)}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {rep.itemBreakdown.length} line items
                  </span>
                </div>
              </div>

              {/* Summary and Key Findings Box */}
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
                      <CheckCircle size={13} /> Endorsed by {rep.approvedBy || 'Sarah Manager'} ({rep.approvedDate})
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Eye size={14} /> View Full Report Dossier & Item Specs
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
                        <XCircle size={13} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FULL REPORT DOSSIER MODAL ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b-4 border-indigo-600 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      {selectedReport.periodCategory} REPORT
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      REF: {selectedReport.id}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Team Lead Operational & Requisition Report
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
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                      REPORT TITLE
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedReport.title}</h3>
                    <p className="text-slate-500 mt-0.5">
                      Submitting Lead: <b className="text-slate-800">{selectedReport.teamLead}</b> ({selectedReport.role}) • {selectedReport.department}
                    </p>
                  </div>
                  <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Requisition Value
                    </span>
                    <p className="text-xl font-black text-indigo-700 font-mono">{fmt(selectedReport.totalAmount)}</p>
                    <span className="text-[10px] italic text-slate-500 block">
                      {numberToIndianWords(selectedReport.totalAmount)}
                    </span>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  {selectedReport.summary}
                </p>
              </div>

              {/* Itemized Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
                  <span>1. Itemized Procurement Specifications</span>
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
                    <tr className="bg-indigo-50/60 font-bold text-indigo-900">
                      <td colSpan={3} className="px-4 py-2.5 text-right">Gross Total:</td>
                      <td className="px-4 py-2.5 text-right font-mono font-black">{fmt(selectedReport.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Key Findings & Recommendations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <span className="font-bold text-slate-900 block text-xs">
                  2. Operational Justification & Key Findings
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                  {selectedReport.keyFindings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>

                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 mt-2">
                  <span className="font-bold text-indigo-950 block text-[11px] uppercase">
                    Team Lead Formal Proposal:
                  </span>
                  <p className="text-indigo-900 mt-0.5">
                    "{selectedReport.teamLeadRecommendation}"
                  </p>
                </div>
              </div>

              {/* Attached Documents */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <span className="font-bold text-slate-900 block text-xs mb-2">
                  3. Appended Documentation ({selectedReport.attachedDocs.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedReport.attachedDocs.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-indigo-600" />
                        <span className="font-medium truncate max-w-[200px]">{doc.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision & Status Banner */}
              {selectedReport.status === 'Approved' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-2.5 text-emerald-900">
                  <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Manager Endorsement Complete:</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Approved by {selectedReport.approvedBy || 'Sarah Manager'} on {selectedReport.approvedDate}.
                    </p>
                  </div>
                </div>
              )}

              {selectedReport.status === 'Rejected' && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-900">
                  <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Disapproval Record:</span>
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
                Logged in as <b>Sarah Manager</b>
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
                      Reject Report
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveReport(selectedReport.id)}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                    >
                      Approve Report
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
                <h3 className="text-base font-bold text-slate-900">Disapprove Team Lead Report</h3>
              </div>
              <button
                onClick={() => setRejectModalReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide formal disapproval rationale for <b>{rejectModalReport.id}</b> ({rejectModalReport.title}):
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Specify rationale (e.g., budget limitation, alternate supplier required, insufficient ROI)..."
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
