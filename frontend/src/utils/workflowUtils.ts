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
  const swName = (extra?.software_name || '').trim()

  // 1. Explicit Hardware Check First (physical hardware should never be misclassified as software)
  const isHardwareCategory = (
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
  if (swName && swName !== 'None' && swName !== 'Not available' && swName !== tit) {
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
 * Computes the exact progression, current stage index, and visual indicators
 * for a request according to its workflow type.
 */
export function getWorkflowProgression(req: RequestWorkflowInput): WorkflowProgression {
  const workflowType = req.workflowTypeOverride || detectWorkflowType(req.category, req.title)
  const isSoftware = workflowType === 'SOFTWARE'

  const st = (req.status || '').toLowerCase()
  const fst = (req.financeStatus || '').toLowerCase()
  const pst = (req.paymentStatus || '').toLowerCase()

  const isCompleted =
    st === 'completed' ||
    st === 'request_completed' ||
    st === 'team_lead_acknowledged' ||
    (!isSoftware && (fst === 'completed' || pst === 'paid'))

  const isRejected =
    st === 'rejected' ||
    st === 'finance_rejected' ||
    fst.includes('reject')

  const isReturned =
    st === 'clarification_requested' ||
    st === 'returned' ||
    fst.includes('return')

  let currentlyWith = 'Requester'

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
    if (!wentToAdmin) {
      dynamicStages = dynamicStages.filter((s) => s !== 'Admin Approval')
    }
  }

  let currentStageName: string = dynamicStages[0]

  if (isCompleted) {
    currentStageName = isSoftware ? 'Request Completed' : 'Payment'
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
    totalStages: dynamicStages.length,
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
