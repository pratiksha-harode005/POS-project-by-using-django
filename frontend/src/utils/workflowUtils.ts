/**
 * Procurement Workflow Utilities
 * Handles dual workflow models:
 * 1. SOFTWARE / DIGITAL WORKFLOW (6 Stages):
 *    Request Created → Manager Review → Request Approved → Payment Approved → Payment Justification → Request Completed
 * 2. HARDWARE WORKFLOW (10 Stages):
 *    Create Request → Manager Approval → Finance Approval → Admin Approval → RFQ Sent → Vendor Quotes Received → Delivery → Invoice → Verification and Order Complete → Payment
 */

export type WorkflowType = 'SOFTWARE' | 'HARDWARE'

export const PATH_A_MANAGER_STAGES = [
  'Request Created',
  'Manager Review',
  'Manager Approval',
  'Payment Processed',
  'Payment Justification Submitted',
  'Manager Verified',
  'Awaiting Team Lead Acknowledgement',
  'Request Completed',
] as const

export const PATH_B_FINANCE_STAGES = [
  'Request Created',
  'Manager Review',
  'Recommended to Finance',
  'Finance Review',
  'Finance Approved',
  'Payment Processed',
  'Payment Justification Submitted',
  'Manager Verified',
  'Awaiting Team Lead Acknowledgement',
  'Request Completed',
] as const

export const PATH_C_ADMIN_STAGES = [
  'Request Created',
  'Manager Review',
  'Recommended to Finance',
  'Finance Review',
  'Recommended to Admin',
  'Admin Review',
  'Admin Approved / Final Approval',
  'Payment Processed',
  'Payment Justification Submitted',
  'Manager Verified',
  'Awaiting Team Lead Acknowledgement',
  'Request Completed',
] as const

export const SOFTWARE_STAGES = PATH_C_ADMIN_STAGES
export const SOFTWARE_APPROVAL_STAGES = SOFTWARE_STAGES
export const SOFTWARE_RECOMMENDED_STAGES = SOFTWARE_STAGES

export const HARDWARE_STAGES = [
  'Create Request',
  'Manager Approval',
  'Finance Approval',
  'Admin Approval',
  'RFQ Sent',
  'Vendor Quotes Received',
  'Product Order',
  'Delivery',
  'Verification and Order Complete',
  'Payment',
] as const

const SOFTWARE_CATEGORIES = new Set([
  'Software & SaaS', 'Cloud & Infrastructure', 'Cybersecurity',
  'IT Services', 'Training & Certifications', 'Software', 'SaaS',
  'Cloud', 'Digital', 'Subscription', 'License',
])

const SOFTWARE_KEYWORDS = [
  'software', 'saas', 'cloud', 'license', 'subscription', 'digital',
  'api', 'aws', 'azure', 'gcp', 'jira', 'figma', 'slack', 'github',
  'zoom', 'antivirus', 'database', 'security tool', 'devops',
]

const HARDWARE_CATEGORIES = new Set([
  'IT Hardware', 'Office Accessories', 'Office Technology',
  'Networking & Telecom', 'Hardware', 'Equipment', 'Furniture',
].map(category => category.toLowerCase()))

const HARDWARE_KEYWORDS = [
  'server',
  'servers',
  'laptop',
  'laptops',
  'desktop',
  'desktops',
  'monitor',
  'monitors',
  'printer',
  'scanner',
  'sensor',
  'workstation',
  'hardware',
  'keyboard',
  'mouse',
  'cisco',
  'switch',
  'router',
  'cable',
  'docking',
  'peripherals',
  'equipment',
  'furniture',
  'ram',
  'ssd',
  'hard drive',
]

/**
 * Detects whether a request belongs to the Software/Digital or Hardware workflow
 */
export function detectWorkflowType(
  category?: string,
  title?: string,
  extra?: { flowType?: string; flow_type?: string; software_name?: string }
): WorkflowType {
  const cat = (category || '').trim().toLowerCase()
  const tit = (title || '').toLowerCase()
  const flow = extra?.flowType || extra?.flow_type
  const swName = (extra?.software_name || '').trim().toLowerCase()

  // 1. Explicit Hardware Check First (physical hardware should never be misclassified as software)
  const isHardwareCategory = (
    HARDWARE_CATEGORIES.has(cat) ||
    cat.includes('hardware') ||
    cat.includes('equipment') ||
    cat.includes('accessories') ||
    cat.includes('furniture') ||
    cat.includes('peripherals')
  )
  const isHardwareTitle = HARDWARE_KEYWORDS.some(k => tit.includes(k))

  if (isHardwareCategory || isHardwareTitle) {
    return 'HARDWARE'
  }

  // 2. Explicit Software Indicators
  if (flow === 'B') return 'SOFTWARE'
  if (swName && swName !== 'none' && swName !== 'not available' && swName !== tit) {
    return 'SOFTWARE'
  }

  if (
    cat.includes('software') ||
    cat.includes('saas') ||
    cat.includes('cloud') ||
    cat.includes('license') ||
    cat.includes('subscription')
  ) {
    return 'SOFTWARE'
  }

  if (SOFTWARE_KEYWORDS.some(k => cat.includes(k) || tit.includes(k))) {
    return 'SOFTWARE'
  }

  // Default to Hardware for physical assets
  return 'HARDWARE'
}

export function isSoftwareRequest(req: { category?: string; title?: string; flowType?: string; flow_type?: string; software_name?: string; extra_fields?: any; payment_justification_detail?: any }): boolean {
  if (!req) return false
  const cat = (req.category || '').toLowerCase().trim()
  const tit = (req.title || '').toLowerCase().trim()

  if (
    HARDWARE_CATEGORIES.has(cat) ||
    cat.includes('hardware') ||
    cat.includes('equipment') ||
    cat.includes('furniture') ||
    cat.includes('peripherals') ||
    HARDWARE_KEYWORDS.some(k => tit.includes(k))
  ) {
    return false
  }

  if (
    cat.includes('software') ||
    cat.includes('saas') ||
    cat.includes('cloud') ||
    cat.includes('license') ||
    cat.includes('subscription') ||
    req.flowType === 'B' ||
    req.flow_type === 'B' ||
    Boolean(req.payment_justification_detail) ||
    Boolean(req.extra_fields?.software_receipt_id)
  ) {
    return true
  }

  return detectWorkflowType(req.category, req.title, {
    flowType: req.flowType || req.flow_type,
    software_name: req.software_name,
  }) === 'SOFTWARE'
}

export function isHardwareRequest(req: { category?: string; title?: string; flowType?: string; flow_type?: string; software_name?: string; extra_fields?: any; payment_justification_detail?: any }): boolean {
  return !isSoftwareRequest(req)
}

export interface WorkflowProgression {
  workflowType: WorkflowType
  stages: string[]
  currentStageIndex: number
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
  approval_steps?: any[]
  history?: any[]
  workflowTypeOverride?: WorkflowType
  rfqId?: string
  rfq_id?: string
  rfqs?: any[]
  poNumber?: string
  po_id?: string
  po_number?: string
  grnNumber?: string
  grn_number?: string
  receipt_id?: string
  invoiceNumber?: string
  invoice_number?: string
  isVerified?: boolean
  documentsVerified?: boolean
  grn_status?: string
  invoice_status?: string
  is_invoice_verified?: boolean
  timeline?: Array<{
    stage: number
    title: string
    status: 'completed' | 'current' | 'pending' | string
    role?: string
    actor?: string
    timestamp?: string | null
    comments?: string
  }>
  finalApprovalBy?: 'MANAGER' | 'FINANCE' | 'ADMIN' | string
  approvalPath?: 'MANAGER' | 'FINANCE' | 'ADMIN' | string
  extra_fields?: Record<string, any>
}

/**
 * Reads approval_steps + history to detect which portals actually participated.
 * - hadFinance: Finance role acted OR Manager recommended (escalated to Finance)
 * - hadAdmin:   Admin role acted OR Finance recommended (escalated to Admin)
 * Fallback: uses currentStage == 2 or 3 when no steps exist.
 * If currentStage >= 4 and no steps exist, assumes Manager directly approved.
 */
function detectActualApprovalPath(
  approval_steps: any[],
  history: any[],
  currentStage: number | undefined,
): { hadFinance: boolean; hadAdmin: boolean } {
  const steps = [...(approval_steps || []), ...(history || [])]
  let hadFinance = false
  let hadAdmin = false

  for (const step of steps) {
    const role = (step.role || step.actorRole || '').toUpperCase()
    const decision = (step.decision || step.action || '').toUpperCase()
    if (role === 'FINANCE') hadFinance = true
    if (role === 'ADMIN') { hadAdmin = true; hadFinance = true }
    if (role === 'MANAGER' && decision === 'RECOMMEND') hadFinance = true
    if (role === 'FINANCE' && decision === 'RECOMMEND') hadAdmin = true
  }

  // Fallback: only when no steps recorded yet
  if (steps.length === 0 && typeof currentStage === 'number') {
    if (currentStage === 2) hadFinance = true
    if (currentStage === 3) { hadFinance = true; hadAdmin = true }
    // stage 4+ with no steps = Manager directly approved, skip Finance/Admin
  }

  return { hadFinance, hadAdmin }
}

/**
 * Builds the trimmed stage list for this specific request.
 */
function buildDynamicStages(isSoftware: boolean, hadFinance: boolean, hadAdmin: boolean): string[] {
  const base: string[] = ['Create Request', 'Manager Approval']
  if (hadFinance) base.push('Finance Approval')
  if (hadAdmin) base.push('Admin Approval')
  if (isSoftware) return [...base, 'Verification and Order Complete', 'Payment']
  return [...base, 'RFQ Sent', 'Vendor Quotes Received', 'Product Order', 'Delivery', 'Verification and Order Complete', 'Payment']
}

const HW_STAGE_NAMES: Record<number, string> = {
  0: 'Create Request',
  1: 'Manager Approval',
  2: 'Finance Approval',
  3: 'Admin Approval',
  4: 'RFQ Sent',
  5: 'Vendor Quotes Received',
  6: 'Product Order',
  7: 'Delivery',
  8: 'Verification and Order Complete',
  9: 'Payment',
  10: 'Payment',
}

const SW_STAGE_NAMES: Record<number, string> = {
  0: 'Request Created',
  1: 'Manager Review',
  2: 'Recommended to Finance',
  3: 'Finance Review',
  4: 'Recommended to Admin',
  5: 'Admin Review',
  6: 'Admin Approved / Final Approval',
  7: 'Payment Processed',
  8: 'Payment Justification Submitted',
  9: 'Manager Verified',
  10: 'Awaiting Team Lead Acknowledgement',
  11: 'Request Completed',
  12: 'Request Completed',
}

const FULL_ORDER = [
  'Create Request', 'Manager Approval', 'Finance Approval', 'Admin Approval',
  'RFQ Sent', 'Vendor Quotes Received', 'Product Order', 'Delivery',
  'Verification and Order Complete', 'Payment',
]

/**
 * Maps backend absolute stage number to dynamic array index.
 * If stage was skipped (e.g. Finance not in dynamic list), walks backward.
 */
function mapBackendStageToIndex(backendStage: number, dynamicStages: string[], isSoftware: boolean): number {
  const stageName = (isSoftware ? SW_STAGE_NAMES : HW_STAGE_NAMES)[backendStage]
  if (!stageName) return Math.min(backendStage, dynamicStages.length - 1)
  const directIdx = dynamicStages.indexOf(stageName)
  if (directIdx >= 0) return directIdx
  const fullIdx = FULL_ORDER.indexOf(stageName)
  for (let i = fullIdx; i >= 0; i--) {
    const candidate = dynamicStages.indexOf(FULL_ORDER[i])
    if (candidate >= 0) return candidate
  }
  return 0
}

export function getWorkflowProgression(req: RequestWorkflowInput): WorkflowProgression {
  const workflowType = req.workflowTypeOverride || detectWorkflowType(req.category, req.title)
  const isSoftware = workflowType === 'SOFTWARE'

  const st = (req.status || '').toLowerCase()
  const fst = (req.financeStatus || '').toLowerCase()
  const pst = (req.paymentStatus || '').toLowerCase()

  const isRejected =
    st === 'rejected' ||
    fst === 'rejected' ||
    (req.status || '').toLowerCase().includes('reject')
  const isReturned =
    st === 'returned' ||
    fst === 'returned' ||
    (req.status || '').toLowerCase().includes('return')

  const hasRfq = Boolean(req.rfqId || req.rfq_id || (Array.isArray(req.rfqs) && req.rfqs.length > 0))
  const hasQuotes = Boolean(
    (Array.isArray(req.rfqs) && req.rfqs.some((r: any) =>
      (Array.isArray(r.quotations) && r.quotations.length > 0) ||
      (Array.isArray(r.vendors) && r.vendors.some((v: any) => v.response === 'Received'))
    )) || st === 'quotes_received' || st === 'under_evaluation'
  )
  const hasPo = Boolean(req.poNumber || req.po_id || req.po_number)
  const hasGrn = Boolean(req.grnNumber || req.grn_number || req.receipt_id)
  const areDocsVerified = Boolean(
    req.isVerified ||
    req.documentsVerified ||
    (req.is_invoice_verified === true) ||
    (req.status === 'verified')
  )

  const isCompleted =
    st === 'completed' ||
    st === 'request_completed' ||
    st === 'team_lead_acknowledged' ||
    (!isSoftware && (fst === 'completed' || pst === 'paid'))

  // If backend timeline is present and populated, it is the PRIMARY SOURCE OF TRUTH
  if (req.timeline && Array.isArray(req.timeline) && req.timeline.length > 0) {
    const dynamicStages = req.timeline.map((t) => t.title)
    let currentIdx = req.timeline.findIndex((t) => (t.status || '').toLowerCase() === 'current')
    if (currentIdx === -1) {
      if (req.timeline.every((t) => (t.status || '').toLowerCase() === 'completed')) {
        currentIdx = req.timeline.length - 1
      } else {
        currentIdx = 0
      }
    }
    const currentStageName = dynamicStages[currentIdx] || dynamicStages[0]
    const actualTotalStages = dynamicStages.length

    let currentlyWith = 'Requester'
    if (isCompleted) {
      currentlyWith = 'Completed & Archived'
    } else if (isSoftware) {
      if (currentStageName === 'Manager Approval') {
        currentlyWith = 'Team Lead — Pay Now (Mock) Ready'
      } else if (currentStageName === 'Finance Approved') {
        currentlyWith = 'Team Lead — Pay Now (Mock) Ready'
      } else if (currentStageName.includes('Admin Approved')) {
        currentlyWith = 'Team Lead — Pay Now (Mock) Ready'
      } else if (currentStageName === 'Payment Processed') {
        currentlyWith = 'Team Lead — Awaiting Payment Justification'
      } else if (currentStageName === 'Payment Justification Submitted') {
        currentlyWith = 'Manager — Verifying Justification'
      } else if (currentStageName === 'Manager Verified') {
        currentlyWith = 'Team Lead — Final Acknowledgment Required'
      } else if (currentStageName === 'Awaiting Team Lead Acknowledgement') {
        currentlyWith = 'Team Lead — Final Acknowledgment Required'
      } else if (currentStageName === 'Manager Review') {
        currentlyWith = 'Project Manager — Under Review'
      } else if (currentStageName === 'Recommended to Finance' || currentStageName === 'Finance Review') {
        currentlyWith = 'Finance Directorate'
      } else if (currentStageName === 'Recommended to Admin' || currentStageName === 'Admin Review') {
        currentlyWith = 'Executive Administrator'
      }
    } else {
      if (currentStageName === 'Payment') {
        currentlyWith = 'Finance Treasury & Disbursement'
      } else if (currentStageName === 'Verification and Order Complete') {
        currentlyWith = 'Procurement Audit & Operations'
      } else if (currentStageName === 'Delivery') {
        currentlyWith = 'Vendor Partner / Receiving Dock'
      } else if (currentStageName === 'RFQ Sent' || currentStageName === 'Vendor Quotes Received') {
        currentlyWith = 'Procurement Sourcing Desk'
      } else if (currentStageName === 'Admin Approval') {
        currentlyWith = 'Executive Administrator'
      } else if (currentStageName === 'Finance Approval') {
        currentlyWith = 'Finance Directorate'
      } else {
        currentlyWith = 'Manager — Sarah Manager'
      }
    }

    let statusBadge = ''
    if (isCompleted) {
      statusBadge = `${currentStageName} (Stage ${actualTotalStages}/${actualTotalStages})`
    } else if (isRejected) {
      statusBadge = `Rejected (Stage ${currentIdx + 1}/${actualTotalStages})`
    } else if (isReturned) {
      statusBadge = `Returned (Stage ${currentIdx + 1}/${actualTotalStages})`
    } else {
      statusBadge = `${currentStageName} (Stage ${currentIdx + 1}/${actualTotalStages})`
    }

    return {
      workflowType,
      stages: dynamicStages,
      currentStageIndex: currentIdx,
      totalStages: actualTotalStages,
      currentStageName,
      statusBadge,
      isCompleted,
      isRejected,
      isReturned,
      currentlyWith,
    }
  }

  // Fallback when timeline is not provided:
  const wentToAdmin =
    (req.history || []).some(
      (h: any) =>
        (h.actorRole && h.actorRole.toLowerCase().includes('admin')) ||
        (h.stageName && h.stageName.toLowerCase().includes('admin'))
    ) ||
    st.includes('admin') ||
    fst.includes('admin')

  let dynamicStages: string[] = []
  let finalApprovalBy: 'MANAGER' | 'FINANCE' | 'ADMIN' = 'ADMIN'

  if (isSoftware) {
    const explicitPath = (
      req.finalApprovalBy ||
      req.approvalPath ||
      req.extra_fields?.final_approval_by ||
      ''
    ).toUpperCase()

    if (explicitPath === 'MANAGER' || explicitPath === 'FINANCE' || explicitPath === 'ADMIN') {
      finalApprovalBy = explicitPath as any
    } else {
      const histActions = (req.history || []).map((h: any) => (h.action || h.stageName || '').toUpperCase())
      const stUpper = (req.status || '').toUpperCase()
      if (
        histActions.some((a: string) => a.includes('ADMIN')) ||
        stUpper.includes('ADMIN')
      ) {
        finalApprovalBy = 'ADMIN'
      } else if (
        histActions.some((a: string) => a.includes('FINANCE')) ||
        stUpper.includes('FINANCE') ||
        req.financeStatus
      ) {
        finalApprovalBy = 'FINANCE'
      } else if (
        stUpper === 'MANAGER_APPROVED' ||
        histActions.some((a: string) => a.includes('MANAGER_APPROVE'))
      ) {
        finalApprovalBy = 'MANAGER'
      } else {
        finalApprovalBy = 'MANAGER'
      }
    }

    if (finalApprovalBy === 'MANAGER') {
      dynamicStages = [...PATH_A_MANAGER_STAGES]
    } else if (finalApprovalBy === 'FINANCE') {
      dynamicStages = [...PATH_B_FINANCE_STAGES]
    } else {
      dynamicStages = [...PATH_C_ADMIN_STAGES]
    }
  } else {
    dynamicStages = [...HARDWARE_STAGES]
  }

  let stageIndex = 0
  let currentStageName = dynamicStages[0]
  let currentlyWith = 'Requester'

  if (isCompleted) {
    stageIndex = dynamicStages.length - 1
    currentStageName = dynamicStages[stageIndex]
    currentlyWith = 'Completed & Archived'
  } else if (isSoftware) {
    if (st === 'created' || st === 'team_lead_review' || st === 'draft') {
      currentStageName = 'Request Created'
      currentlyWith = 'Team Lead / Requester'
    } else if (
      st === 'manager_review' ||
      st === 'team_lead_submitted' ||
      st === 'pending' ||
      st === 'pending_approval'
    ) {
      currentStageName = 'Manager Review'
      currentlyWith = 'Project Manager — Under Review'
    } else if (
      st === 'recommended_to_finance' ||
      st === 'manager_recommended_to_finance' ||
      st === 'finance_recommended' ||
      st === 'sent_to_finance'
    ) {
      currentStageName = 'Recommended to Finance'
      currentlyWith = 'Finance Directorate — Received Recommendation'
    } else if (
      st === 'finance_review' ||
      st === 'finance_research' ||
      st === 'cost_estimation' ||
      st === 'finance_report' ||
      st === 'pre_estimation_completed'
    ) {
      currentStageName = 'Finance Review'
      currentlyWith = 'Finance Directorate — Under Review & Estimation'
    } else if (
      st === 'recommended_to_admin' ||
      st === 'finance_recommended_to_admin'
    ) {
      currentStageName = 'Recommended to Admin'
      currentlyWith = 'Executive Administrator — Forwarded for Approval'
    } else if (st === 'admin_review' || st === 'admin_research') {
      currentStageName = 'Admin Review'
      currentlyWith = 'Executive Administrator — In Review'
    } else if (
      st === 'admin_approved' ||
      st === 'payment_approved' ||
      st === 'manager_approved' ||
      st === 'finance_approved' ||
      st === 'approved'
    ) {
      if (finalApprovalBy === 'MANAGER') {
        currentStageName = 'Manager Approval'
      } else if (finalApprovalBy === 'FINANCE') {
        currentStageName = 'Finance Approved'
      } else {
        currentStageName = 'Admin Approved / Final Approval'
      }
      currentlyWith = 'Team Lead — Pay Now (Mock) Ready'
    } else if (st === 'payment_processed' || st === 'payment_completed') {
      currentStageName = 'Payment Processed'
      currentlyWith = 'Team Lead — Awaiting Payment Justification'
    } else if (st === 'payment_justification_submitted') {
      currentStageName = 'Payment Justification Submitted'
      currentlyWith = 'Manager — Verifying Justification'
    } else if (
      st === 'payment_justified' ||
      st === 'manager_verified' ||
      st === 'manager_verified_pending_team_lead_acknowledgement'
    ) {
      currentStageName = 'Awaiting Team Lead Acknowledgement'
      currentlyWith = 'Team Lead — Final Acknowledgment Required'
    } else if (st === 'completed' || st === 'request_completed' || st === 'team_lead_acknowledged') {
      currentStageName = 'Request Completed'
      currentlyWith = 'Completed & Archived'
    } else {
      currentStageName = 'Manager Review'
      currentlyWith = 'Project Manager — Under Review'
    }

    const foundIdx = dynamicStages.indexOf(currentStageName)
    stageIndex = foundIdx >= 0 ? foundIdx : 0
  } else {
    // Hardware Stages
    if (st === 'pending_arrival' || st === 'draft') {
      currentStageName = 'Create Request'
      currentlyWith = 'Team Lead / Requester'
    } else if (
      st === 'pending_approval' ||
      st === 'submitted' ||
      st === 'pending' ||
      st === 'manager_review'
    ) {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Manager — Sarah Manager'
    } else if (
      st === 'finance_review' ||
      st === 'sent_to_finance' ||
      st === 'recommended_to_finance' ||
      st === 'manager_recommended_to_finance' ||
      st === 'finance_on_hold' ||
      st === 'clarification_requested' ||
      (st === 'approved' && req.currentStage === 2)
    ) {
      currentStageName = 'Finance Approval'
      currentlyWith = 'Finance — Mark Finance Officer'
    } else if (st === 'approved' || st === 'rfq_sent') {
      currentStageName = 'RFQ Sent'
      currentlyWith = 'Sourcing Team (RFQ Sent)'
    } else if (
      st === 'recommended_to_admin' ||
      st === 'finance_recommended_to_admin' ||
      fst === 'recommended to admin'
    ) {
      currentStageName = 'Admin Approval'
      currentlyWith = 'Admin — Executive Authority'
    } else if (st === 'quotes_received' || st === 'assigned_to_vendor' || st === 'vendor_assigned' || st === 'in_procurement') {
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

    if (typeof req.currentStage === 'number' && !isNaN(req.currentStage)) {
      const effectiveStageNum = (req.currentStage === 0 && st !== 'draft' && st !== 'created' && st !== 'pending_arrival') ? 1 : req.currentStage
      stageIndex = mapBackendStageToIndex(effectiveStageNum, dynamicStages, false)
      stageIndex = Math.min(Math.max(stageIndex, 0), dynamicStages.length - 1)
      currentStageName = dynamicStages[stageIndex] || currentStageName
    } else {
      const foundIdx = dynamicStages.indexOf(currentStageName)
      stageIndex = foundIdx >= 0 ? foundIdx : 0
    }
  }

  if (isCompleted) stageIndex = dynamicStages.length - 1
  else if (isReturned) stageIndex = 0

  const actualTotalStages = dynamicStages.length
  let statusBadge = ''
  if (isCompleted) {
    statusBadge = `${currentStageName} (Stage ${actualTotalStages}/${actualTotalStages})`
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
    totalStages: actualTotalStages,
    currentStageName,
    statusBadge,
    isCompleted,
    isRejected,
    isReturned,
    currentlyWith,
  }
}

/**
 * Deterministically sorts any list of purchase requests newest first:
 * 1. ISO creation timestamp (createdAt / created_at)
 * 2. Date string fallback (date / lastUpdated)
 * 3. Database numerical ID (dbId / pk / id number)
 * 4. Request ID string comparison
 */
export const sortRequestsNewestFirst = <T extends { date?: string; createdAt?: string; id?: string | number; dbId?: number }>(list: T[]): T[] => {
  return [...list].sort((a, b) => {
    const timeA = new Date((a as any).createdAt || (a as any).created_at || a.date || 0).getTime()
    const timeB = new Date((b as any).createdAt || (b as any).created_at || b.date || 0).getTime()
    if (timeB !== timeA) return timeB - timeA

    const idA = Number((a as any).dbId ?? (a as any).pk ?? (typeof a.id === 'number' ? a.id : 0)) || 0
    const idB = Number((b as any).dbId ?? (b as any).pk ?? (typeof b.id === 'number' ? b.id : 0)) || 0
    if (idB !== idA) return idB - idA

    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true })
  })
}

export interface RecommendationInfo {
  isRecommended: boolean
  isRecommendedToFinance: boolean
  isRecommendedToAdmin: boolean
  statusLabel: string
  shortBadgeLabel: string
  portalName: string
  actorName: string
  reason: string
  date: string
}

export const getRecommendationStatus = (req: any): RecommendationInfo => {
  if (!req) {
    return {
      isRecommended: false,
      isRecommendedToFinance: false,
      isRecommendedToAdmin: false,
      statusLabel: '',
      shortBadgeLabel: '',
      portalName: '',
      actorName: '',
      reason: '',
      date: '',
    }
  }

  const rawSt = (req.raw_status || req.status || '').toUpperCase()
  const statusStr = (req.status || '').toLowerCase()
  const financeStatus = (req.financeStatus || (req as any).finance_status || '').toLowerCase()
  const extra = req.extra_fields || req.extraFields || {}

  // Check if request is currently in a terminal or post-recommendation approved/completed stage
  const isPostApproved = (
    rawSt.includes('APPROVED') ||
    rawSt === 'ADMIN_APPROVED' ||
    rawSt === 'FINANCE_APPROVED' ||
    rawSt === 'COMPLETED' ||
    rawSt === 'REQUEST_COMPLETED' ||
    rawSt === 'PAYMENT_PROCESSED' ||
    rawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
    rawSt === 'PAYMENT_JUSTIFIED' ||
    rawSt === 'MANAGER_VERIFIED' ||
    statusStr.includes('approved') ||
    statusStr === 'completed' ||
    statusStr === 'payment_completed' ||
    financeStatus.includes('approved') ||
    Boolean(extra.admin_approved) ||
    extra.finance_status === 'Approved'
  )

  // 1. Recommended to Admin Check
  const isRecAdmin = !isPostApproved && (
    rawSt === 'RECOMMENDED_TO_ADMIN' ||
    rawSt === 'FINANCE_RECOMMENDED_TO_ADMIN' ||
    statusStr === 'recommended_to_admin' ||
    financeStatus === 'recommended to admin' ||
    Boolean(extra.finance_recommended_by) ||
    Boolean(extra.finance_recommendation_reason) ||
    (Array.isArray(req.history) && req.history.some((h: any) =>
      (h.action || '').toUpperCase() === 'FINANCE_RECOMMEND_ADMIN' ||
      (h.action || '').toUpperCase() === 'RECOMMEND_ADMIN'
    ))
  )

  if (isRecAdmin) {
    const actor = extra.finance_recommended_by || req.recommendedBy || 'Finance'
    const reason = extra.finance_recommendation_reason || req.recommendationReason || req.financeComment || extra.finance_comments || 'Forwarded to Higher Authority for executive review & approval.'
    const rawDate = extra.finance_recommended_date || req.recommendedDate || req.date || ''
    const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
    const portal = extra.finance_recommended_portal || extra.recommended_portal || req.recommendedPortal || 'Finance Portal'

    return {
      isRecommended: true,
      isRecommendedToFinance: false,
      isRecommendedToAdmin: true,
      statusLabel: `Recommended to Admin — ${portal}`,
      shortBadgeLabel: 'Recommended to Admin',
      portalName: portal,
      actorName: actor,
      reason,
      date,
    }
  }

  // 2. Recommended to Finance / Higher Authority Check
  const isRecFinance = !isPostApproved && (
    rawSt === 'RECOMMENDED_TO_FINANCE' ||
    rawSt === 'MANAGER_RECOMMENDED_TO_FINANCE' ||
    statusStr === 'recommended_to_finance' ||
    (statusStr === 'finance_review' && (Boolean(req.recommendationReason) || Boolean(extra.recommendation_reason) || rawSt === 'RECOMMENDED_TO_FINANCE')) ||
    Boolean(extra.recommendation_reason) ||
    Boolean(req.recommendationReason) ||
    (Array.isArray(req.history) && req.history.some((h: any) =>
      (h.action || '').toUpperCase() === 'RECOMMEND_FINANCE' ||
      (h.action || '').toUpperCase() === 'MANAGER_RECOMMEND_FINANCE' ||
      ((h.action || '').toUpperCase() === 'RECOMMEND' && ((h.actorRole || '').toUpperCase() === 'MANAGER' || (h.user_role || '').toUpperCase() === 'MANAGER'))
    ))
  )

  if (isRecFinance) {
    const actor = req.recommendedBy || extra.recommended_by || 'Procurement Manager'
    const reason = req.recommendationReason || extra.recommendation_reason || 'Forwarded to Higher Authority for commercial review & financial approval.'
    const rawDate = req.recommendedDate || extra.recommended_date || req.date || ''
    const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
    const portal = extra.recommended_portal || req.recommendedPortal || 'Manager Portal'

    return {
      isRecommended: true,
      isRecommendedToFinance: true,
      isRecommendedToAdmin: false,
      statusLabel: `Recommended to Finance — ${portal}`,
      shortBadgeLabel: 'Recommended to Finance',
      portalName: portal,
      actorName: actor,
      reason,
      date,
    }
  }

  return {
    isRecommended: false,
    isRecommendedToFinance: false,
    isRecommendedToAdmin: false,
    statusLabel: '',
    shortBadgeLabel: '',
    portalName: '',
    actorName: '',
    reason: '',
    date: '',
  }
}
