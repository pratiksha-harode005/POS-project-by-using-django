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
  history?: any[]
  workflowTypeOverride?: WorkflowType
}

/**
 * Computes the exact progression, current stage index, and visual indicators
 * for a request according to its workflow type.
 */
export function getWorkflowProgression(req: RequestWorkflowInput): WorkflowProgression {
  const workflowType = req.workflowTypeOverride || detectWorkflowType(req.category, req.title)
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

  let currentStageName: string = stages[0]
  let currentlyWith = 'Requester'

  const wentToFinance =
    (req.history || []).some(
      (h: any) =>
        (h.actorRole && h.actorRole.toLowerCase().includes('finance')) ||
        (h.stageName && h.stageName.toLowerCase().includes('finance'))
    ) ||
    st.includes('finance') ||
    st.includes('manager_approved') ||
    st === 'approved' ||
    fst.includes('finance') ||
    fst === 'recommended to finance' ||
    (typeof req.currentStage === 'number' && req.currentStage >= 3)

  const wentToAdmin =
    (req.history || []).some(
      (h: any) =>
        (h.actorRole && h.actorRole.toLowerCase().includes('admin')) ||
        (h.stageName && h.stageName.toLowerCase().includes('admin'))
    ) ||
    st.includes('admin') ||
    fst.includes('admin')

  let dynamicStages = [...stages]
  if (!wentToAdmin) {
    dynamicStages = dynamicStages.filter((s) => s !== 'Admin Approval')
  }

  if (isCompleted) {
    currentStageName = 'Payment'
    currentlyWith = 'Completed & Archived'
  } else if (isSoftware) {
    // Software Stages
    if (st === 'pending_arrival' || st === 'draft') {
      currentStageName = 'Create Request'
      currentlyWith = 'Team Lead / Requester'
    } else if (st === 'pending_approval') {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Manager — Sarah Manager'
    } else if (
      st === 'finance_review' ||
      st === 'sent_to_finance' ||
      st === 'recommended_to_finance' ||
      st === 'finance_on_hold' ||
      st === 'clarification_requested' ||
      st === 'manager_approved'
    ) {
      currentStageName = 'Finance Approval'
      currentlyWith = 'Finance — Mark Finance Officer'
    } else if (st === 'recommended_to_admin' || fst === 'recommended to admin') {
      currentStageName = 'Admin Approval'
      currentlyWith = 'Admin — Executive Authority'
    } else if (
      st === 'approved' ||
      st === 'assigned_to_vendor' ||
      st === 'vendor_assigned' ||
      st === 'in_procurement'
    ) {
      currentStageName = 'Verification and Order Complete'
      currentlyWith = 'IT Operations & Provisioning'
    } else if (st === 'vendor_accepted') {
      currentStageName = 'Verification and Order Complete'
      currentlyWith = 'Vendor Partner (Provisioning & Verification)'
    } else if (st === 'vendor_rejected') {
      currentStageName = 'Admin Approval'
      currentlyWith = 'Vendor Declined — Reassignment Required'
    } else if (st === 'verified' || st === 'order_complete' || st === 'finance_approved') {
      currentStageName = 'Verification and Order Complete'
      currentlyWith = 'IT Operations & Provisioning Verification'
    } else if (
      st === 'completed' ||
      st === 'payment' ||
      st === 'payment_pending' ||
      pst === 'pending' ||
      pst === 'processing' ||
      pst === 'paid'
    ) {
      currentStageName = 'Payment'
      currentlyWith = 'Accounts & Treasury (Payment)'
    } else {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Manager — Sarah Manager'
    }
  } else {
    // Hardware Stages
    if (st === 'pending_arrival' || st === 'draft') {
      currentStageName = 'Create Request'
      currentlyWith = 'Team Lead / Requester'
    } else if (st === 'pending_approval') {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Manager — Sarah Manager'
    } else if (
      st === 'finance_review' ||
      st === 'sent_to_finance' ||
      st === 'recommended_to_finance' ||
      st === 'finance_on_hold' ||
      st === 'clarification_requested' ||
      st === 'manager_approved' ||
      (st === 'approved' && req.currentStage === 3)
    ) {
      currentStageName = 'Finance Approval'
      currentlyWith = 'Finance — Mark Finance Officer'
    } else if (st === 'approved' || st === 'rfq_sent') {
      currentStageName = 'RFQ Sent'
      currentlyWith = 'Sourcing Team (RFQ Sent)'
    } else if (st === 'recommended_to_admin' || fst === 'recommended to admin') {
      currentStageName = 'Admin Approval'
      currentlyWith = 'Admin — Executive Authority'
    } else if (st === 'quotes_received' || st === 'assigned_to_vendor' || st === 'vendor_assigned' || st === 'rfq_sent' || st === 'in_procurement') {
      currentStageName = 'Vendor Quotes Received'
      currentlyWith = 'Selected Vendor (Awaiting Acceptance)'
    } else if (st === 'vendor_accepted') {
      currentStageName = 'Delivery'
      currentlyWith = 'Vendor Partner (Delivery in Progress)'
    } else if (st === 'vendor_rejected') {
      currentStageName = 'Vendor Quotes Received'
      currentlyWith = 'Vendor Declined — Reassignment Required'
    } else if (st === 'delivered' || st === 'delivery') {
      currentStageName = 'Invoice'
      currentlyWith = 'Accounts & Dock (Invoice & GRN Verification)'
    } else if (st === 'invoiced' || st === 'invoice') {
      currentStageName = 'Verification and Order Complete'
      currentlyWith = 'Procurement Audit & Raise Ticket Verification'
    } else if (
      st === 'verified' ||
      st === 'order_complete' ||
      st === 'finance_approved' ||
      st === 'product_order'
    ) {
      currentStageName = 'Delivery'
      if (typeof req.currentStage === 'number' && req.currentStage >= 4) {
        // Find best match if stage known
      }
      currentlyWith = 'Logistics & Receiving Dock'
    } else if (
      st === 'completed' ||
      st === 'payment' ||
      st === 'payment_pending' ||
      pst === 'pending' ||
      pst === 'processing' ||
      pst === 'paid'
    ) {
      currentStageName = 'Payment'
      currentlyWith = 'Finance Treasury & Disbursement'
    } else {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Manager — Sarah Manager'
    }
  }

  let stageIndex = dynamicStages.indexOf(currentStageName as any)
  if (stageIndex === -1) {
    // Fallback if somehow not found (e.g. filtered out)
    if (currentStageName === 'Admin Approval') {
      stageIndex = dynamicStages.indexOf('Finance Approval') !== -1 ? dynamicStages.indexOf('Finance Approval') : 1
    } else {
      stageIndex = 1
    }
  }

  currentStageName = dynamicStages[stageIndex] || dynamicStages[0]

  // Status badge label
  let statusBadge = ''
  const actualTotalStages = dynamicStages.length
  if (isCompleted) {
    statusBadge = '100% Completed / Paid'
  } else if (isRejected) {
    statusBadge = `Rejected (Stage ${stageIndex + 1}/${actualTotalStages})`
  } else if (isReturned) {
    statusBadge = `Returned (Stage ${stageIndex + 1}/${actualTotalStages})`
  } else {
    statusBadge = `${currentStageName} (Stage ${stageIndex + 1}/${actualTotalStages})`
  }

  return {
    workflowType,
    stages: dynamicStages,
    currentStageIndex: stageIndex,
    totalStages: dynamicStages.length,
    currentStageName,
    statusBadge,
    isCompleted,
    isRejected,
    isReturned,
    currentlyWith,
  }
}
