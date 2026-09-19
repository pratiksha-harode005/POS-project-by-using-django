/**
 * Procurement Workflow Utilities
 * Handles dual workflow models:
 * 1. SOFTWARE / DIGITAL WORKFLOW (6 Stages):
 *    Create Request → Manager Approval → Finance Approval → Admin Approval → Verification and Order Complete → Payment
 * 2. HARDWARE WORKFLOW (10 Stages):
 *    Create Request → Manager Approval → Finance Approval → Admin Approval → RFQ Sent → Vendor Quotes Received → Delivery → Invoice → Verification and Order Complete → Payment
 */

export type WorkflowType = 'SOFTWARE' | 'HARDWARE'

export const SOFTWARE_STAGES = [
  'Create Request',
  'Manager Approval',
  'Finance Approval',
  'Admin Approval',
  'Verification and Order Complete',
  'Payment',
] as const

export const HARDWARE_STAGES = [
  'Create Request',
  'Manager Approval',
  'Finance Approval',
  'Admin Approval',
  'RFQ Sent',
  'Vendor Quotes Received',
  'Delivery',
  'Invoice',
  'Verification and Order Complete',
  'Payment',
] as const

const SOFTWARE_CATEGORIES = new Set([
  'Software & SaaS',
  'Cloud & Infrastructure',
  'Cybersecurity',
  'IT Services',
  'Training & Certifications',
  'Software',
  'SaaS',
  'Cloud',
  'Digital',
  'Subscription',
  'License',
])

const SOFTWARE_KEYWORDS = [
  'software',
  'saas',
  'cloud',
  'license',
  'subscription',
  'digital',
  'api',
  'aws',
  'azure',
  'gcp',
  'jira',
  'figma',
  'slack',
  'github',
  'zoom',
  'antivirus',
  'database',
  'security tool',
  'devops',
]

const HARDWARE_CATEGORIES = new Set([
  'IT Hardware',
  'Office Accessories',
  'Office Technology',
  'Networking & Telecom',
  'Hardware',
  'Equipment',
  'Furniture',
])

/**
 * Detects whether a request belongs to the Software/Digital or Hardware workflow
 */
export function detectWorkflowType(category?: string, title?: string): WorkflowType {
  const cat = (category || '').trim()
  const tit = (title || '').toLowerCase()

  if (SOFTWARE_CATEGORIES.has(cat)) return 'SOFTWARE'
  if (HARDWARE_CATEGORIES.has(cat)) return 'HARDWARE'

  const catLower = cat.toLowerCase()
  if (SOFTWARE_KEYWORDS.some(k => catLower.includes(k) || tit.includes(k))) {
    return 'SOFTWARE'
  }

  // Default to Hardware for physical assets
  return 'HARDWARE'
}

export interface WorkflowProgression {
  workflowType: WorkflowType
  stages: readonly string[]
  currentStageIndex: number // 0-based
  totalStages: number
  currentStageName: string
  statusBadge: string
  isCompleted: boolean
  isRejected: boolean
  isReturned: boolean
  currentlyWith: string
}

export interface RequestWorkflowInput {
  status?: string
  financeStatus?: string
  category?: string
  title?: string
  paymentStatus?: string
  currentStage?: number
}

/**
 * Computes the exact progression, current stage index, and visual indicators
 * for a request according to its workflow type.
 */
export function getWorkflowProgression(req: RequestWorkflowInput): WorkflowProgression {
  const workflowType = detectWorkflowType(req.category, req.title)
  const isSoftware = workflowType === 'SOFTWARE'
  const stages = isSoftware ? SOFTWARE_STAGES : HARDWARE_STAGES
  const totalStages = stages.length

  const st = (req.status || '').toLowerCase()
  const fst = (req.financeStatus || '').toLowerCase()
  const pst = (req.paymentStatus || '').toLowerCase()

  const isCompleted =
    st === 'completed' ||
    pst === 'paid' ||
    fst === 'completed' ||
    (isSoftware && st === 'payment_pending' && pst === 'paid')

  const isRejected =
    st === 'rejected' ||
    st === 'finance_rejected' ||
    fst.includes('reject')

  const isReturned =
    st === 'clarification_requested' ||
    st === 'returned' ||
    fst.includes('return')

  let stageIndex = 0
  let currentlyWith = 'Requester'

  if (isCompleted) {
    stageIndex = totalStages - 1
    currentlyWith = 'Completed & Archived'
  } else if (isSoftware) {
    // Software Stages:
    // 0: Create Request
    // 1: Manager Approval
    // 2: Finance Approval
    // 3: Admin Approval
    // 4: Verification and Order Complete
    // 5: Payment
    if (st === 'pending_arrival' || st === 'draft') {
      stageIndex = 0
      currentlyWith = 'Team Lead / Requester'
    } else if (st === 'pending_approval') {
      stageIndex = 1
      currentlyWith = 'Manager — Sarah Manager'
    } else if (
      st === 'approved' ||
      st === 'finance_review' ||
      st === 'sent_to_finance' ||
      st === 'recommended_to_finance' ||
      st === 'finance_on_hold' ||
      st === 'clarification_requested'
    ) {
      stageIndex = 2
      currentlyWith = 'Finance — Mark Finance Officer'
    } else if (
      st === 'recommended_to_admin' ||
      fst === 'recommended to admin'
    ) {
      stageIndex = 3
      currentlyWith = 'Admin — Executive Authority'
    } else if (st === 'assigned_to_vendor' || st === 'vendor_assigned') {
      stageIndex = 4
      currentlyWith = 'IT Operations & Provisioning'
    } else if (st === 'vendor_accepted') {
      stageIndex = 4
      currentlyWith = 'Vendor Partner (Provisioning & Verification)'
    } else if (st === 'vendor_rejected') {
      stageIndex = 3
      currentlyWith = 'Vendor Declined — Reassignment Required'
    } else if (st === 'verified' || st === 'order_complete' || st === 'in_procurement' || st === 'finance_approved') {
      stageIndex = 4
      currentlyWith = 'IT Operations & Provisioning Verification'
    } else if (st === 'completed' || st === 'payment' || st === 'payment_pending' || pst === 'pending' || pst === 'processing' || pst === 'paid') {
      stageIndex = 5
      currentlyWith = 'Accounts & Treasury (Payment)'
    } else {
      stageIndex = typeof req.currentStage === 'number' ? Math.min(req.currentStage, totalStages - 1) : 1
      currentlyWith = 'Manager — Sarah Manager'
    }
  } else {
    // Hardware Stages:
    // 0: Create Request
    // 1: Manager Approval
    // 2: Finance Approval
    // 3: Admin Approval
    // 4: RFQ Sent
    // 5: Vendor Quotes Received
    // 6: Delivery
    // 7: Invoice
    // 8: Verification and Order Complete
    // 9: Payment
    if (st === 'pending_arrival' || st === 'draft') {
      stageIndex = 0
      currentlyWith = 'Team Lead / Requester'
    } else if (st === 'pending_approval') {
      stageIndex = 1
      currentlyWith = 'Manager — Sarah Manager'
    } else if (
      st === 'approved' ||
      st === 'finance_review' ||
      st === 'sent_to_finance' ||
      st === 'recommended_to_finance' ||
      st === 'finance_on_hold' ||
      st === 'clarification_requested'
    ) {
      stageIndex = 2
      currentlyWith = 'Finance — Mark Finance Officer'
    } else if (
      st === 'recommended_to_admin' ||
      fst === 'recommended to admin'
    ) {
      stageIndex = 3
      currentlyWith = 'Admin — Executive Authority'
    } else if (st === 'rfq_sent') {
      stageIndex = 4
      currentlyWith = 'Sourcing Team (RFQ Sent)'
    } else if (st === 'quotes_received' || st === 'assigned_to_vendor' || st === 'vendor_assigned') {
      stageIndex = 5
      currentlyWith = 'Selected Vendor (Awaiting Acceptance)'
    } else if (st === 'vendor_accepted') {
      stageIndex = 6 // Delivery stage
      currentlyWith = 'Vendor Partner (Delivery in Progress)'
    } else if (st === 'vendor_rejected') {
      stageIndex = 5
      currentlyWith = 'Vendor Declined — Reassignment Required'
    } else if (st === 'delivered' || st === 'delivery') {
      stageIndex = 7 // Invoice & Verification stage
      currentlyWith = 'Accounts & Dock (Invoice & GRN Verification)'
    } else if (st === 'invoiced' || st === 'invoice') {
      stageIndex = 8 // Verification and Order Complete
      currentlyWith = 'Procurement Audit & Raise Ticket Verification'
    } else if (st === 'verified' || st === 'order_complete' || st === 'in_procurement' || st === 'finance_approved' || st === 'product_order') {
      if (typeof req.currentStage === 'number' && req.currentStage >= 4) {
        stageIndex = Math.min(req.currentStage, totalStages - 1)
      } else {
        stageIndex = 6 // Delivery
      }
      currentlyWith = 'Logistics & Receiving Dock'
    } else if (st === 'completed' || st === 'payment' || st === 'payment_pending' || pst === 'pending' || pst === 'processing' || pst === 'paid') {
      stageIndex = 9 // Payment
      currentlyWith = 'Finance Treasury & Disbursement'
    } else {
      stageIndex = typeof req.currentStage === 'number' ? Math.min(req.currentStage, totalStages - 1) : 1
      currentlyWith = 'Manager — Sarah Manager'
    }
  }

  // If currentStage was explicitly passed and status is generic, align when suitable
  if (typeof req.currentStage === 'number' && req.currentStage >= 0 && req.currentStage < totalStages) {
    if (st === 'approved' || st === 'in_procurement' || st === 'pending') {
      stageIndex = req.currentStage
    }
  }

  const currentStageName = stages[stageIndex] || stages[0]

  // Status badge label
  let statusBadge = ''
  if (isCompleted) {
    statusBadge = '100% Completed / Paid'
  } else if (isRejected) {
    statusBadge = `Rejected (Stage ${stageIndex + 1}/${totalStages})`
  } else if (isReturned) {
    statusBadge = `Returned (Stage ${stageIndex + 1}/${totalStages})`
  } else {
    statusBadge = `${currentStageName} (Stage ${stageIndex + 1}/${totalStages})`
  }

  return {
    workflowType,
    stages,
    currentStageIndex: stageIndex,
    totalStages,
    currentStageName,
    statusBadge,
    isCompleted,
    isRejected,
    isReturned,
    currentlyWith,
  }
}
