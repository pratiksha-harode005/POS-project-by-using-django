import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Wallet,
  Tag,
  Package,
  Receipt,
  Laptop,
  Cloud,
  Bell,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

interface FeatureDetailData {
  slug: string
  title: string
  badge: string
  tagline: string
  description: string
  icon: any
  bg: string
  color: string
  howItWorks: { step: string; title: string; desc: string }[]
  capabilities: { title: string; desc: string }[]
  benefits: string[]
  mockupTitle: string
  mockupMetrics: { label: string; value: string; color: string }[]
  mockupTable: { col1: string; col2: string; status: string; statusBg: string }[]
}

const featuresDatabase: Record<string, FeatureDetailData> = {
  'purchase-requests': {
    slug: 'purchase-requests',
    title: 'Purchase Requests & Requisitions',
    badge: 'REQUISITION MODULE',
    tagline: 'Streamline employee requisitions with custom approval fields and automated routing.',
    description:
      'The Purchase Requests module empowers employees and team leads to create structured requisitions for IT hardware, software licenses, services, and office supplies. Designed with custom validation rules, automatic budget checks, and attachment support to ensure 100% compliance before submission.',
    icon: FileText,
    bg: '#DBEAFE',
    color: '#2563EB',
    howItWorks: [
      {
        step: '01',
        title: 'Create Requisition',
        desc: 'Employee selects category, fills item specs, quantity, estimated cost, and attaches quotes or specifications.',
      },
      {
        step: '02',
        title: 'Budget Validation',
        desc: 'System automatically checks the department budget balance and flags any potential overspend before submission.',
      },
      {
        step: '03',
        title: 'Automated Routing',
        desc: 'Request is routed to the designated Team Lead or Department Head for review and approval.',
      },
      {
        step: '04',
        title: 'PO Conversion',
        desc: 'Upon final approval, the request converts directly into an actionable RFQ or Purchase Order with full audit history.',
      },
    ],
    capabilities: [
      {
        title: 'Custom Form Fields',
        desc: 'Tailor form inputs per procurement category (hardware specs, subscription durations, project codes).',
      },
      {
        title: 'Multi-Item Line Requests',
        desc: 'Bundle multiple line items into a single purchase requisition for consolidated processing.',
      },
      {
        title: 'Attachment & Quote Storage',
        desc: 'Attach vendor quotes, technical specs, and approval justification documents directly to the request.',
      },
      {
        title: 'Real-Time Request Tracker',
        desc: 'Track request status in real time across Employee, Manager, Finance, and Admin portals.',
      },
    ],
    benefits: [
      'Reduces requisition-to-approval lead time by up to 70%',
      'Eliminates unauthorized paper and email purchase requests',
      'Provides complete visibility into pending departmental requisitions',
      'Enforces corporate spending policies upfront',
    ],
    mockupTitle: 'Purchase Requisition Portal View',
    mockupMetrics: [
      { label: 'Open Requests', value: '18', color: '#2563EB' },
      { label: 'Avg Approval Time', value: '4.2 hrs', color: '#16A34A' },
      { label: 'Pending Review', value: '5', color: '#D97706' },
    ],
    mockupTable: [
      { col1: 'PR-2026-089', col2: 'Dell Latitude Laptops (10 Units)', status: 'Approved', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'PR-2026-092', col2: 'AWS Cloud Hosting Renewal Q3', status: 'Pending Lead', statusBg: 'bg-amber-100 text-amber-800' },
      { col1: 'PR-2026-094', col2: 'Figma Enterprise 25 Seats', status: 'Under Finance Review', statusBg: 'bg-blue-100 text-blue-800' },
    ],
  },

  'approvals-workflow': {
    slug: 'approvals-workflow',
    title: 'Multi-Level Approvals Workflow',
    badge: 'GOVERNANCE & AUDIT',
    tagline: 'Enforce multi-tier approval rules with complete audit trails and instant alert notifications.',
    description:
      'The Approvals Workflow engine routes purchase requests through multi-tier approval paths based on cost thresholds, department hierarchies, and category policies. Managers and Finance leads can approve or reject with mandatory audit notes from any device.',
    icon: CheckCircle2,
    bg: '#DCFCE7',
    color: '#16A34A',
    howItWorks: [
      {
        step: '01',
        title: 'Trigger Routing',
        desc: 'Submitted request evaluates threshold rules (e.g. >RS 50,000 requires Finance Lead approval).',
      },
      {
        step: '02',
        title: 'Instant Alerts',
        desc: 'Approvers receive in-app and email notification alerts with complete request details and attachments.',
      },
      {
        step: '03',
        title: 'Review & Decision',
        desc: 'Approvers review line items, budget availability, and attached quotes before approving or rejecting.',
      },
      {
        step: '04',
        title: 'Audit Logging',
        desc: 'Every approval, rejection, and comment is timestamped and recorded in an immutable audit log.',
      },
    ],
    capabilities: [
      {
        title: 'Multi-Tier Thresholds',
        desc: 'Configure flexible approval steps (Team Lead → Manager → Finance → Executive Director).',
      },
      {
        title: 'One-Click Decisioning',
        desc: 'Approve or reject requests instantly with optional or mandatory comments.',
      },
      {
        title: 'Escalation & Reminders',
        desc: 'Automated reminders prevent requests from stalling in approver inboxes.',
      },
      {
        title: 'Full Audit Trail',
        desc: 'Track exact timestamp, IP, and user identity for every approval decision.',
      },
    ],
    benefits: [
      'Eliminates approval bottlenecks across distributed teams',
      'Ensures 100% compliance with corporate financial governance',
      'Provides audit-ready logs for internal and external auditors',
      'Accelerates critical IT hardware and software procurement',
    ],
    mockupTitle: 'Approvals Queue & Decision Center',
    mockupMetrics: [
      { label: 'Pending Approvals', value: '7', color: '#16A34A' },
      { label: 'Approved Today', value: '14', color: '#2563EB' },
      { label: 'SLA Compliance', value: '99.4%', color: '#7C3AED' },
    ],
    mockupTable: [
      { col1: 'PR-2026-088', col2: 'Cisco Core Switches (RS 1,80,000)', status: 'Approved by Finance', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'PR-2026-091', col2: 'Adobe Creative Cloud 10 Licenses', status: 'Pending Manager', statusBg: 'bg-amber-100 text-amber-800' },
      { col1: 'PR-2026-093', col2: 'External Security Audit Contract', status: 'Approved by Lead', statusBg: 'bg-blue-100 text-blue-800' },
    ],
  },

  'budget-spend-control': {
    slug: 'budget-spend-control',
    title: 'Budget & Spend Control',
    badge: 'FINANCIAL GOVERNANCE',
    tagline: 'Track department budgets and committed spend in real time to eliminate cost overruns.',
    description:
      'Gain real-time control over departmental budgets, committed purchase orders, and actual expenditure. The Budget Control module gives Finance and Management teams live insights into remaining spend capacity before orders are issued.',
    icon: Wallet,
    bg: '#FFEDD5',
    color: '#D97706',
    howItWorks: [
      {
        step: '01',
        title: 'Set Budget Caps',
        desc: 'Finance allocates annual and quarterly budgets per department and procurement category.',
      },
      {
        step: '02',
        title: 'Real-Time Commitment',
        desc: 'When a PR or PO is created, the amount is automatically reserved under committed spend.',
      },
      {
        step: '03',
        title: 'Limit Enforcement',
        desc: 'System blocks or requires executive override if a requisition exceeds available budget balance.',
      },
      {
        step: '04',
        title: 'Spend Analytics',
        desc: 'Analyze actual vs. committed vs. remaining budget with interactive visual charts.',
      },
    ],
    capabilities: [
      {
        title: 'Category & Team Budgeting',
        desc: 'Assign granular budget caps to departments (Engineering, IT, Ops) and categories.',
      },
      {
        title: 'Committed Spend Tracking',
        desc: 'Track funds locked in approved POs before invoices arrive to prevent double allocation.',
      },
      {
        title: 'Overspend Warning Alerts',
        desc: 'Automated warnings when a department reaches 80% or 90% of its quarterly budget.',
      },
      {
        title: 'Historical Cost Reports',
        desc: 'Compare spend across quarters and identify cost saving opportunities.',
      },
    ],
    benefits: [
      'Prevents unbudgeted and unauthorized corporate spending',
      'Improves financial predictability and cash flow management',
      'Empowers department heads to manage their spend responsibility',
      'Simplifies quarterly budget auditing and reporting',
    ],
    mockupTitle: 'Department Budget & Spend Overview',
    mockupMetrics: [
      { label: 'Total Allocated', value: 'RS 50.0M', color: '#0F172A' },
      { label: 'Committed Spend', value: 'RS 34.2M', color: '#D97706' },
      { label: 'Remaining Balance', value: 'RS 15.8M', color: '#16A34A' },
    ],
    mockupTable: [
      { col1: 'IT Infrastructure', col2: 'Allocated: RS 20M | Used: RS 14.5M', status: '72.5% Used', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'Software Licenses', col2: 'Allocated: RS 15M | Used: RS 12.8M', status: '85.3% Warning', statusBg: 'bg-amber-100 text-amber-800' },
      { col1: 'Cloud Services', col2: 'Allocated: RS 15M | Used: RS 6.9M', status: '46.0% On Track', statusBg: 'bg-blue-100 text-blue-800' },
    ],
  },

  'vendor-management': {
    slug: 'vendor-management',
    title: 'Vendor Management & Quotations',
    badge: 'SUPPLIER PORTAL',
    tagline: 'Centralize vendor directories, dispatch digital RFQs, and compare competitive quotes.',
    description:
      'Manage all vendor relationships, competitive bidding, RFQ dispatches, quotation comparisons, and compliance documents in a dedicated Vendor Portal ecosystem. Drive cost savings through transparent quotation evaluation.',
    icon: Tag,
    bg: '#EDE9FE',
    color: '#7C3AED',
    howItWorks: [
      {
        step: '01',
        title: 'Vendor Directory',
        desc: 'Onboard vendors into categories (Hardware, Software, Telecom) with verified tax IDs and NDAs.',
      },
      {
        step: '02',
        title: 'Digital RFQ Dispatch',
        desc: 'Create RFQs from approved requisitions and dispatch them to registered category vendors.',
      },
      {
        step: '03',
        title: 'Quotation Submission',
        desc: 'Vendors submit itemized quotes with pricing, tax details, lead time, and warranty terms.',
      },
      {
        step: '04',
        title: 'Side-by-Side Evaluation',
        desc: 'Compare vendor quotes side-by-side on price, delivery time, and warranty before awarding the PO.',
      },
    ],
    capabilities: [
      {
        title: 'Vendor Catalog & Ratings',
        desc: 'Track vendor performance ratings, SLA history, and active contracts.',
      },
      {
        title: 'Digital RFQ Center',
        desc: 'Dispatch structured RFQs to multiple vendors simultaneously with deadline enforcement.',
      },
      {
        title: 'Quotation Comparison Matrix',
        desc: 'Side-by-side evaluation matrix highlighting best price, lead time, and GST terms.',
      },
      {
        title: 'Document Vault',
        desc: 'Store vendor GST certificates, W-9 forms, NDAs, and SLAs securely.',
      },
    ],
    benefits: [
      'Drives competitive pricing through multi-vendor RFQs',
      'Shortens vendor selection and quoting cycles by 60%',
      'Maintains complete audit trails of vendor selection rationale',
      'Ensures vendor compliance before placing purchase orders',
    ],
    mockupTitle: 'RFQ & Vendor Quotation Comparison',
    mockupMetrics: [
      { label: 'Active Vendors', value: '42', color: '#7C3AED' },
      { label: 'Open RFQs', value: '8', color: '#2563EB' },
      { label: 'Avg Cost Savings', value: '14.5%', color: '#16A34A' },
    ],
    mockupTable: [
      { col1: 'RFQ-2026-96', col2: 'Dell Technologies — Base: RS 30,000 | GST: 18%', status: 'Lowest Quote', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'RFQ-2026-96', col2: 'HP Enterprise — Base: RS 32,500 | GST: 18%', status: 'Quote Received', statusBg: 'bg-blue-100 text-blue-800' },
      { col1: 'RFQ-2026-96', col2: 'Lenovo India — Base: RS 31,000 | GST: 18%', status: 'Quote Received', statusBg: 'bg-blue-100 text-blue-800' },
    ],
  },

  'purchase-orders': {
    slug: 'purchase-orders',
    title: 'Purchase Orders & Stage Tracking',
    badge: 'ORDER FULFILLMENT',
    tagline: 'Track POs end-to-end through Processing, Ship/Transit, and Post-Delivery invoice matching.',
    description:
      'The Purchase Orders module automates PO creation upon approval and provides real-time stage tracking as vendors process, ship, and deliver goods. Enforces strict post-delivery payment gating to guarantee receipt before invoice payout.',
    icon: Package,
    bg: '#FCE7F3',
    color: '#DB2777',
    howItWorks: [
      {
        step: '01',
        title: 'PO Generation',
        desc: 'System generates an official PDF Purchase Order pre-filled with items, pricing, and terms.',
      },
      {
        step: '02',
        title: 'Stage Advancement',
        desc: 'Vendor advances order stages (Processing → Ship/Transit → Delivered) in real time.',
      },
      {
        step: '03',
        title: 'Delivery Receipt (GRN)',
        desc: 'Upon delivery, vendor submits official Goods Receipt Note (GRN) with received quantity & condition.',
      },
      {
        step: '04',
        title: 'Payment Status Sync',
        desc: 'Payment Status updates from Pending to Paid ONLY after Delivery Confirmation + Invoice Submission.',
      },
    ],
    capabilities: [
      {
        title: 'Ungated Stage Advancement',
        desc: 'Vendors can advance stages freely without payment gates until delivery is complete.',
      },
      {
        title: 'Digital Delivery Receipts',
        desc: 'Generate paper-style official Goods Receipt Notes (GRN) with pre-filled PO data.',
      },
      {
        title: '3-Way Matching Engine',
        desc: 'Verifies PO lines = GRN Received Qty = Vendor Tax Invoice Amount before payment.',
      },
      {
        title: 'Single Source of Truth',
        desc: 'Payment status synced identically on Purchase Orders page and Payment Status page.',
      },
    ],
    benefits: [
      'Eliminates pre-delivery payment risks and over-billing',
      'Provides complete visibility into order delivery timelines',
      'Ensures receipt verification before financial payout',
      'Automates reconciliation between PO, delivery, and invoice',
    ],
    mockupTitle: 'PO Fulfillment & Stage Advancement Tracker',
    mockupMetrics: [
      { label: 'Active POs', value: '24', color: '#DB2777' },
      { label: 'In Transit', value: '6', color: '#D97706' },
      { label: 'Delivered (Pending Inv)', value: '4', color: '#2563EB' },
    ],
    mockupTable: [
      { col1: 'PO-VNDHW001-76', col2: 'Dell Laptops (Qty: 10) — Stage: Processing', status: 'Payment: Pending', statusBg: 'bg-amber-100 text-amber-800' },
      { col1: 'PO-2026-DEMO', col2: 'Server Storage (Qty: 2) — Stage: Delivered', status: 'Payment: Paid', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'PO-2026-088', col2: 'Cisco Switches (Qty: 4) — Stage: Ship/Transit', status: 'Payment: Pending', statusBg: 'bg-amber-100 text-amber-800' },
    ],
  },

  'complete-lifecycle': {
    slug: 'complete-lifecycle',
    title: 'Complete Procurement Lifecycle',
    badge: 'END-TO-END OS',
    tagline: 'Connect request, approval, vendor quotes, PO, receipt, invoice, and payment in one seamless OS.',
    description:
      'Procurement OS unifies every phase of corporate technology procurement into a single connected platform. Eliminates data silos between Employees, Managers, Vendors, and Finance teams with automated real-time status synchronization.',
    icon: RefreshCw,
    bg: '#CCFBF1',
    color: '#0D9488',
    howItWorks: [
      {
        step: '01',
        title: 'Employee Requisition',
        desc: 'Employee submits request with specifications and budget routing.',
      },
      {
        step: '02',
        title: 'Management Approval',
        desc: 'Team Lead and Manager review, validate budget, and approve.',
      },
      {
        step: '03',
        title: 'Vendor Bidding & PO',
        desc: 'Vendor submits quotation, PO is generated and order is tracked to delivery.',
      },
      {
        step: '04',
        title: 'Receipt & Payout',
        desc: 'GRN is confirmed, invoice 3-way matched, and post-delivery payment processed.',
      },
    ],
    capabilities: [
      {
        title: '5 Portal Ecosystem',
        desc: 'Dedicated interfaces for Employee, Manager, Vendor, Finance, and Admin roles.',
      },
      {
        title: 'Automated Status Sync',
        desc: 'Status updates propagate instantly across all portals with zero manual refresh.',
      },
      {
        title: 'Asset & Subscription Lifecycle',
        desc: 'Delivered hardware automatically registers in IT asset inventory.',
      },
      {
        title: 'End-to-End Audit Log',
        desc: 'Complete timeline recording every action from initial request to final payment.',
      },
    ],
    benefits: [
      '100% operational transparency across departments',
      'Zero manual data re-entry between systems',
      'Reduces procurement cycle time by 65%',
      'Eliminates duplicate payments and phantom inventory',
    ],
    mockupTitle: 'End-to-End Procurement Lifecycle View',
    mockupMetrics: [
      { label: 'Portals Connected', value: '5', color: '#0D9488' },
      { label: 'Total Managed Spend', value: 'RS 4.2M', color: '#2563EB' },
      { label: 'System Uptime', value: '99.99%', color: '#16A34A' },
    ],
    mockupTable: [
      { col1: 'Request #PR-089', col2: 'Requisition → Approval → PO → GRN → Invoice → Paid', status: 'Completed', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'Request #PR-092', col2: 'Requisition → Approval → PO → In Transit', status: 'In Progress', statusBg: 'bg-blue-100 text-blue-800' },
      { col1: 'Request #PR-095', col2: 'Requisition → Pending Approval', status: 'Pending Review', statusBg: 'bg-amber-100 text-amber-800' },
    ],
  },

  'it-assets': {
    slug: 'it-assets',
    title: 'IT Asset & Hardware Lifecycle',
    badge: 'ASSET MANAGEMENT',
    tagline: 'Track physical hardware assets, device assignments, and warranty expirations.',
    description:
      'Automatically register delivered hardware into the IT Asset Inventory. Track device allocations to employees, serial numbers, warranty terms, maintenance agreements, and retirement schedules.',
    icon: Laptop,
    bg: '#DBEAFE',
    color: '#2563EB',
    howItWorks: [
      {
        step: '01',
        title: 'GRN Auto-Registration',
        desc: 'Confirmed delivery receipts automatically create pending asset records in inventory.',
      },
      {
        step: '02',
        title: 'Asset Tagging',
        desc: 'Assign barcode asset tags, serial numbers, and specifications to each unit.',
      },
      {
        step: '03',
        title: 'Employee Assignment',
        desc: 'Assign hardware to specific employees with sign-off documentation.',
      },
      {
        step: '04',
        title: 'Warranty & Refresh',
        desc: 'Track OEM warranty status and schedule timely hardware refresh cycles.',
      },
    ],
    capabilities: [
      {
        title: 'Auto Asset Registration',
        desc: 'Delivered PO items instantly flow into the IT asset database.',
      },
      {
        title: 'Device Custody Tracking',
        desc: 'Track employee device assignments, transfers, and offboarding returns.',
      },
      {
        title: 'Warranty & AMC Alerts',
        desc: 'Receive alerts 60 days before OEM hardware warranty or AMC expires.',
      },
      {
        title: 'Asset Depreciation Reports',
        desc: 'Track asset book value, age, and depreciation schedules.',
      },
    ],
    benefits: [
      'Eliminates lost or unaccounted company laptops and devices',
      'Streamlines employee onboarding and offboarding hardware supply',
      'Optimizes hardware refresh budgets and OEM warranty claims',
    ],
    mockupTitle: 'IT Hardware Asset Register',
    mockupMetrics: [
      { label: 'Total Assets', value: '312', color: '#2563EB' },
      { label: 'Assigned to Staff', value: '284', color: '#16A34A' },
      { label: 'In Storage', value: '28', color: '#D97706' },
    ],
    mockupTable: [
      { col1: 'AST-LTP-088', col2: 'Dell Latitude 5440 — Assigned to Rahul Sharma', status: 'Active', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'AST-SRV-012', col2: 'PowerEdge R760 Server — Data Center Rack 4', status: 'Active (Under Warranty)', statusBg: 'bg-blue-100 text-blue-800' },
      { col1: 'AST-LTP-042', col2: 'MacBook Pro 16" — Returned (Pending Re-issue)', status: 'In Stock', statusBg: 'bg-purple-100 text-purple-800' },
    ],
  },

  'saas-cloud': {
    slug: 'saas-cloud',
    title: 'SaaS Licences & Cloud Spend',
    badge: 'SOFTWARE GOVERNANCE',
    tagline: 'Manage software licences, SaaS seat usage, and cloud infrastructure subscriptions.',
    description:
      'Centralize software licence keys, SaaS subscription seat allocations, renewal dates, and public cloud infrastructure spend (AWS, Azure, GCP) to eliminate shadow IT and unused license waste.',
    icon: Cloud,
    bg: '#DCFCE7',
    color: '#16A34A',
    howItWorks: [
      {
        step: '01',
        title: 'Subscription Discovery',
        desc: 'Catalog all software subscriptions, license keys, and public cloud accounts.',
      },
      {
        step: '02',
        title: 'Seat Allocation',
        desc: 'Assign software licenses to employees and track active utilization.',
      },
      {
        step: '03',
        title: 'Renewal Alerts',
        desc: 'Receive alerts 30/60 days prior to contract auto-renewal dates.',
      },
      {
        step: '04',
        title: 'Optimization',
        desc: 'Identify unassigned or inactive license seats to reclaim cost.',
      },
    ],
    capabilities: [
      {
        title: 'SaaS Seat Utilization',
        desc: 'Track assigned vs. unassigned software license seats.',
      },
      {
        title: 'Cloud Infrastructure Spend',
        desc: 'Monitor monthly AWS, Azure, and Google Cloud usage trends.',
      },
      {
        title: 'Auto-Renewal Guardrails',
        desc: 'Prevent surprise recurring auto-charges with early notification alerts.',
      },
      {
        title: 'Contract Vault',
        desc: 'Store software EULAs, enterprise license agreements, and invoices.',
      },
    ],
    benefits: [
      'Reduces SaaS license waste by identifying inactive user accounts',
      'Prevents unbudgeted auto-renewal credit card charges',
      'Provides complete visibility over cloud infrastructure costs',
    ],
    mockupTitle: 'SaaS & Cloud Subscription Manager',
    mockupMetrics: [
      { label: 'Active SaaS Apps', value: '38', color: '#16A34A' },
      { label: 'Total Licences', value: '450', color: '#2563EB' },
      { label: 'Unassigned Seats', value: '14', color: '#EA580C' },
    ],
    mockupTable: [
      { col1: 'Microsoft 365 E5', col2: '150 Seats Allocated | Renewal: Nov 2026', status: 'Active (100% Used)', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'AWS Infrastructure', col2: 'Monthly Spend: RS 4,20,000 | On Track', status: 'Active Cloud', statusBg: 'bg-blue-100 text-blue-800' },
      { col1: 'JetBrains All Products', col2: '25 Seats Allocated | 4 Unused', status: 'Seat Optimization Alert', statusBg: 'bg-amber-100 text-amber-800' },
    ],
  },

  notifications: {
    slug: 'notifications',
    title: 'Real-Time Notifications & Alerts',
    badge: 'SYSTEM ALERTS',
    tagline: 'Instant in-app and email alerts for pending approvals, PO deliveries, and contract renewals.',
    description:
      'Stay informed at every step of the procurement lifecycle with automated notification alerts. Approvers receive instant alerts for pending actions, vendors receive PO notifications, and finance teams get delivery confirmation updates.',
    icon: Bell,
    bg: '#EDE9FE',
    color: '#7C3AED',
    howItWorks: [
      {
        step: '01',
        title: 'Event Trigger',
        desc: 'Action occurs (e.g. PR submitted, PO stage advanced, invoice uploaded).',
      },
      {
        step: '02',
        title: 'Targeted Routing',
        desc: 'System identifies responsible users across Team Lead, Manager, Vendor, or Finance portals.',
      },
      {
        step: '03',
        title: 'Instant Dispatch',
        desc: 'Delivers real-time in-app bell notifications and email summaries.',
      },
      {
        step: '04',
        title: 'One-Click Action',
        desc: 'Notification links directly to the target request, PO, or invoice record.',
      },
    ],
    capabilities: [
      {
        title: 'Multi-Channel Alerts',
        desc: 'Real-time in-app bell notifications and automated email dispatches.',
      },
      {
        title: 'Role-Based Targeting',
        desc: 'Notifications routed specifically to assigned approvers or portal users.',
      },
      {
        title: 'Approval Escalations',
        desc: 'Automated reminders for pending approvals nearing SLA limits.',
      },
      {
        title: 'Notification Center',
        desc: 'Centralized notification inbox with unread status tracking and filters.',
      },
    ],
    benefits: [
      'Eliminates approval delays caused by unread emails',
      'Keeps vendors and internal teams synchronized in real time',
      'Ensures critical contract renewal deadlines are never missed',
    ],
    mockupTitle: 'Real-Time Notification Inbox',
    mockupMetrics: [
      { label: 'Unread Alerts', value: '3', color: '#7C3AED' },
      { label: 'Delivered Today', value: '48', color: '#2563EB' },
      { label: 'Avg Response Time', value: '18 min', color: '#16A34A' },
    ],
    mockupTable: [
      { col1: 'Approval Needed', col2: 'PR-2026-094 (Figma Licenses) requires your review', status: 'Unread', statusBg: 'bg-purple-100 text-purple-800' },
      { col1: 'PO Delivered', col2: 'PO-2026-DEMO (Server Storage) marked as Delivered by Vendor', status: 'Read', statusBg: 'bg-slate-100 text-slate-700' },
      { col1: 'Budget Warning', col2: 'Software Licenses category has reached 85% of Q3 budget', status: 'Unread', statusBg: 'bg-amber-100 text-amber-800' },
    ],
  },

  analytics: {
    slug: 'analytics',
    title: 'Procurement Analytics & Reporting',
    badge: 'BUSINESS INTELLIGENCE',
    tagline: 'Gain actionable insights into corporate spend, vendor SLAs, and cost savings.',
    description:
      'Transform raw procurement data into executive intelligence. The Analytics module provides interactive spend dashboards, category cost breakdowns, vendor SLA performance tracking, and exportable audit reports.',
    icon: BarChart3,
    bg: '#FFEDD5',
    color: '#D97706',
    howItWorks: [
      {
        step: '01',
        title: 'Data Aggregation',
        desc: 'System aggregates spend data from PRs, POs, GRNs, and settled invoices in real time.',
      },
      {
        step: '02',
        title: 'Visual Dashboard',
        desc: 'Renders spend trends, departmental breakdowns, and vendor SLA scorecards.',
      },
      {
        step: '03',
        title: 'Drill-Down Analysis',
        desc: 'Filter spend by department, vendor, procurement category, or date range.',
      },
      {
        step: '04',
        title: 'Audit Report Export',
        desc: 'Export structured PDF and CSV financial reports for executive board meetings.',
      },
    ],
    capabilities: [
      {
        title: 'Interactive Spend Dashboards',
        desc: 'Visual bar charts, category donut splits, and trend graphs.',
      },
      {
        title: 'Vendor SLA Scorecards',
        desc: 'Track vendor delivery timeliness, pricing accuracy, and quality score.',
      },
      {
        title: 'Department Cost Allocations',
        desc: 'Break down procurement expenditure by cost center and department.',
      },
      {
        title: 'Exportable Audit Reports',
        desc: 'One-click export of structured procurement and payment reports.',
      },
    ],
    benefits: [
      'Provides complete executive visibility into corporate IT spend',
      'Identifies top vendors and volume discount opportunities',
      'Empowers data-driven procurement strategy and negotiation',
    ],
    mockupTitle: 'Procurement BI & Spend Executive Report',
    mockupMetrics: [
      { label: 'YTD Managed Spend', value: 'RS 4.2M', color: '#D97706' },
      { label: 'Cost Savings', value: 'RS 680K', color: '#16A34A' },
      { label: 'Vendor Delivery SLA', value: '96.8%', color: '#2563EB' },
    ],
    mockupTable: [
      { col1: 'Hardware Procurement', col2: 'RS 1.8M (42.8% of Total Spend)', status: 'Top Category', statusBg: 'bg-blue-100 text-blue-800' },
      { col1: 'Software & SaaS', col2: 'RS 1.2M (28.5% of Total Spend)', status: 'On Budget', statusBg: 'bg-emerald-100 text-emerald-800' },
      { col1: 'Cloud Infrastructure', col2: 'RS 850K (20.2% of Total Spend)', status: 'On Budget', statusBg: 'bg-emerald-100 text-emerald-800' },
    ],
  },
}

export default function FeatureDetailPage() {
  const { featureId } = useParams<{ featureId: string }>()
  const navigate = useNavigate()

  const feature = featureId ? featuresDatabase[featureId] : undefined

  if (!feature) {
    return (
      <>
        <Navbar />
        <main className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
            <Zap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Feature Not Found</h1>
          <p className="text-slate-600 max-w-md mb-6">
            The requested feature module details could not be found. Please browse our features catalog.
          </p>
          <Link to="/features" className="btn-primary">
            <ArrowLeft size={16} /> Back to Features
          </Link>
        </main>
        <Footer />
      </>
    )
  }

  const Icon = feature.icon

  return (
    <>
      <Navbar />

      <main className="bg-slate-50/50 pb-20">

        {/* ══════════════════════════════════════
            HERO HEADER
        ══════════════════════════════════════ */}
        <section className="bg-gradient-to-b from-blue-50/80 to-white py-14 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
              <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <span>/</span>
              <Link to="/features" className="hover:text-blue-600 transition-colors">Features</Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">{feature.title}</span>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold font-mono">
                  <Sparkles size={13} /> {feature.badge}
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {feature.title}
                </h1>

                <p className="text-lg font-semibold text-blue-600">
                  {feature.tagline}
                </p>

                <p className="text-slate-600 text-base leading-relaxed max-w-2xl">
                  {feature.description}
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Link to="/login" className="btn-primary">
                    Login to Access Portal <ArrowRight size={16} />
                  </Link>
                  <Link to="/features" className="btn-outline flex items-center gap-2">
                    <ArrowLeft size={16} /> All Features
                  </Link>
                </div>
              </div>

              {/* Header Icon Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center max-w-sm w-full relative overflow-hidden">
                  <div
                    className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-md"
                    style={{ backgroundColor: feature.bg }}
                  >
                    <Icon size={40} color={feature.color} strokeWidth={2.2} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-xl mb-1">{feature.title}</h3>
                  <p className="text-xs text-slate-500 font-medium">Enterprise Procurement OS Module</p>

                  <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                    <div className="p-2 rounded-xl bg-slate-50 text-slate-700">
                      <span className="block text-[10px] text-slate-400 font-normal uppercase">Status</span>
                      <span>Active Module</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 text-slate-700">
                      <span className="block text-[10px] text-slate-400 font-normal uppercase">Security</span>
                      <span>100% RBAC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            INTERACTIVE UI SCREENSHOT / MOCKUP
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 -mt-6 relative z-20">
          <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800 text-white">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-400 ml-2">
                  Procurement OS • {feature.mockupTitle}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                LIVE DEMO PREVIEW
              </span>
            </div>

            {/* Dashboard Inner Container */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800/80 font-sans">
              {/* Metrics Strip */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {feature.mockupMetrics.map((m, idx) => (
                  <div key={idx} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">{m.label}</span>
                    <span className="text-xl sm:text-2xl font-black text-white">{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Data Table Mockup */}
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 text-xs">
                <div className="bg-slate-800/60 p-3 font-mono font-bold text-slate-400 uppercase tracking-wider text-[10px] flex justify-between">
                  <span>Reference ID & Item</span>
                  <span>Workflow Status</span>
                </div>
                <div className="divide-y divide-slate-800">
                  {feature.mockupTable.map((row, i) => (
                    <div key={i} className="p-3.5 flex items-center justify-between font-mono">
                      <div>
                        <span className="font-bold text-blue-400 mr-3">{row.col1}</span>
                        <span className="text-slate-200">{row.col2}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${row.statusBg}`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS (Step-by-Step)
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="eyebrow mx-auto w-fit">Workflow Process</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How {feature.title} Works
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              A streamlined 4-step workflow built to eliminate bottlenecks and enforce financial compliance.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {feature.howItWorks.map((step) => (
              <div
                key={step.step}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative hover:border-blue-300 transition-colors"
              >
                <span className="text-3xl font-black text-blue-600/30 font-mono block mb-3">
                  {step.step}
                </span>
                <h3 className="font-bold text-slate-900 text-base mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            KEY CAPABILITIES GRID
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* Left: Capabilities (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="eyebrow w-fit">Feature Deep-Dive</div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                  Key Module Capabilities
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {feature.capabilities.map((cap) => (
                  <div key={cap.title} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Layers size={18} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{cap.title}</h4>
                    <p className="text-slate-600 text-xs leading-relaxed">{cap.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Organizational Benefits (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-mono">
                  VALUE & IMPACT
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  Key Organizational Benefits
                </h3>
              </div>

              <div className="space-y-3">
                {feature.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="text-xs text-slate-700 font-semibold leading-relaxed">
                      {b}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Link to="/login" className="btn-primary w-full justify-center">
                  Access Portal <ArrowRight size={16} />
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════
            EXPLORE OTHER FEATURES FOOTER STRIP
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 pt-12">
          <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-extrabold mb-1">Ready to Streamline Your IT Procurement?</h3>
              <p className="text-slate-400 text-xs">
                Log in to access your role-based portal or explore other platform features.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/features" className="btn-outline border-white text-white hover:bg-slate-800">
                All Features
              </Link>
              <Link to="/login" className="btn-primary">
                Login <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
