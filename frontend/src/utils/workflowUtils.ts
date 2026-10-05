/**
 * Procurement Workflow Utilities
 * Handles dual workflow models:
 * 1. SOFTWARE / DIGITAL WORKFLOW (6 Stages):
 *    Request Created → Manager Review → Request Approved → Payment Approved → Payment Justification → Request Completed
 * 2. HARDWARE WORKFLOW (10 Stages):
 *    Create Request → Manager Approval → Finance Approval → Admin Approval → RFQ Sent → Vendor Quotes Received → Delivery → Invoice → Verification and Order Complete → Payment
 */

export type WorkflowType = 'SOFTWARE' | 'HARDWARE'

export const WORKFLOW_STATUS = {
  MANAGER_APPROVED: 'MANAGER_APPROVED',
} as const

export function normalizeWorkflowStatus(status?: unknown): string {
  return String(status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
}

export function isManagerApprovedRequest(request?: Record<string, any> | null): boolean {
  if (!request) return false
  const statuses = [request.raw_status, request.status, request.rawRequest?.status]
  if (statuses.some(status => normalizeWorkflowStatus(status) === WORKFLOW_STATUS.MANAGER_APPROVED)) return true

  const finalApprovalBy = request.final_approval_by || request.extra_fields?.final_approval_by || request.extraFields?.final_approval_by
  return normalizeWorkflowStatus(finalApprovalBy) === 'MANAGER' && statuses.some(status => normalizeWorkflowStatus(status) === 'APPROVED')
}

export function getFinanceAdminRecommendationStep(request?: Record<string, any> | null): Record<string, any> | null {
  if (!request) return null
  const steps = request.rawRequest?.approval_steps || request.approval_steps
  if (!Array.isArray(steps)) return null

  return steps
    .filter(step =>
      normalizeWorkflowStatus(step?.role) === 'FINANCE' &&
      ['RECOMMEND', 'RECOMMEND_ADMIN'].includes(normalizeWorkflowStatus(step?.decision))
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at || 0).getTime()
      const dateB = new Date(b.created_at || b.updated_at || 0).getTime()
      return dateB - dateA
    })[0] || null
}

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

export const PATH_B_RENEWAL_STAGES = [
  'Renewal Request',
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

export const PATH_B_RENEWAL_DIRECT_STAGES = [
  'Renewal Request',
  'Manager Review',
  'Manager Approval',
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
  'Software', 'SaaS', 'Cloud', 'Digital', 'Subscription', 'License',
])

const SOFTWARE_KEYWORDS = [
  'software', 'saas', 'cloud', 'license', 'subscription', 'digital',
  'api', 'aws', 'azure', 'gcp', 'jira', 'figma', 'slack', 'github',
  'zoom', 'antivirus', 'database', 'security tool', 'devops',
]

const HARDWARE_CATEGORIES = new Set([
  'IT Hardware', 'IT Services', 'Office Accessories', 'Office Technology',
  'Networking & Telecom', 'Hardware', 'Equipment', 'Furniture', 'Services', 'Maintenance & Repair',
])

const HARDWARE_KEYWORDS = [
  'hardware', 'equipment', 'accessories', 'furniture', 'peripherals',
  'server', 'servers', 'laptop', 'laptops', 'desktop', 'desktops',
  'monitor', 'monitors', 'printer', 'scanner', 'sensor', 'workstation',
  'keyboard', 'mouse', 'cisco', 'switch', 'router', 'cable', 'docking',
  'ram', 'ssd', 'hard drive', 'it services', 'services', 'maintenance', 'repair',
]

/**
 * Detects whether a request belongs to the Software/Digital or Hardware workflow
 */
export function detectWorkflowType(
  category?: string,
  title?: string,
  extra?: { flowType?: string; flow_type?: string; software_name?: string; workflow_type?: string; workflowType?: string }
): WorkflowType {
  if (extra?.workflowType === 'SOFTWARE' || extra?.workflow_type === 'SOFTWARE') return 'SOFTWARE'
  if (extra?.workflowType === 'HARDWARE' || extra?.workflow_type === 'HARDWARE') return 'HARDWARE'

  const cat = (category || '').trim().toLowerCase()
  const tit = (title || '').toLowerCase()
  const flow = extra?.flowType || extra?.flow_type
  const swName = (extra?.software_name || '').trim()

  // 1. Explicit Hardware / IT Services / Physical Goods Check First
  const isHardwareCategory = (
    cat.includes('hardware') ||
    cat.includes('equipment') ||
    cat.includes('accessories') ||
    cat.includes('furniture') ||
    cat.includes('peripherals') ||
    cat.includes('it services') ||
    cat.includes('services') ||
    cat.includes('networking') ||
    cat.includes('telecom') ||
    HARDWARE_CATEGORIES.has(category || '')
  )
  const isHardwareTitle = HARDWARE_KEYWORDS.some(k => tit.includes(k) || cat.includes(k))

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
    cat.includes('subscription') ||
    cat.includes('digital') ||
    SOFTWARE_CATEGORIES.has(category || '')
  ) {
    return 'SOFTWARE'
  }

  if (SOFTWARE_KEYWORDS.some(k => cat.includes(k) || tit.includes(k))) {
    return 'SOFTWARE'
  }

  // Default to Hardware for physical / service assets
  return 'HARDWARE'
}

export function isSoftwareRequest(req: { category?: string; title?: string; flowType?: string; flow_type?: string; software_name?: string; extra_fields?: any; payment_justification_detail?: any; workflow_type?: string; workflowType?: string }): boolean {
  if (!req) return false
  return detectWorkflowType(req.category, req.title, {
    flowType: req.flowType || req.flow_type,
    software_name: req.software_name,
    workflow_type: req.workflow_type,
    workflowType: req.workflowType,
  }) === 'SOFTWARE'
}

export function isHardwareRequest(req: { category?: string; title?: string; flowType?: string; flow_type?: string; software_name?: string; extra_fields?: any; payment_justification_detail?: any; workflow_type?: string; workflowType?: string }): boolean {
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
  requestOperation?: string
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
  0: 'Create Request', 1: 'Manager Approval', 2: 'Finance Approval',
  3: 'Admin Approval', 4: 'RFQ Sent', 5: 'Vendor Quotes Received',
  6: 'Product Order', 7: 'Delivery', 8: 'Verification and Order Complete', 9: 'Payment',
}

const SW_STAGE_NAMES: Record<number, string> = {
  0: 'Create Request', 1: 'Manager Approval', 2: 'Finance Approval',
  3: 'Admin Approval', 4: 'Verification and Order Complete', 5: 'Payment',
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
  const isRenewal = req.requestOperation?.toUpperCase() === 'RENEWAL'

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
  const hasGrn = Boolean(
    st === 'delivered' ||
    st === 'goods_received' ||
    (req as any).raw_status === 'DELIVERED' ||
    (req as any).raw_status === 'GOODS_RECEIVED' ||
    (req as any).deliveryDetails?.deliveryDate ||
    (req as any).delivery_status === 'Delivered' ||
    (req as any).po_status === 'Delivered'
  )
  const areDocsVerified = Boolean(
    req.isVerified === true ||
    req.documentsVerified === true ||
    (req.is_invoice_verified === true) ||
    (st === 'verified') ||
    ((req as any).raw_status === 'VERIFIED')
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
      if (currentStageName === 'Now Pay (Mock)' || currentStageName === 'Finance Approval') {
        currentlyWith = 'Team Lead — Pay Now (Mock) Ready'
      } else if (currentStageName === 'Recommend to Finance') {
        currentlyWith = 'Project Manager — Recommend to Finance'
      } else if (currentStageName === 'Payment Justification') {
        currentlyWith = 'Team Lead — Submit Payment Justification'
      } else if (currentStageName === 'Manager Verifies Justification') {
        currentlyWith = 'Manager — Verifying Justification'
      } else if (currentStageName === 'Team Lead Acknowledgement') {
        currentlyWith = 'Team Lead — Final Acknowledgment Required'
      } else if (currentStageName === 'Manager Approval') {
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

    if (isRenewal) {
      const financePathStatuses = [
        'recommended_to_finance', 'manager_recommended_to_finance', 'finance_recommended',
        'sent_to_finance', 'finance_review', 'finance_research', 'cost_estimation',
        'finance_report', 'pre_estimation_completed', 'finance_approved',
      ]
      dynamicStages = financePathStatuses.includes(st)
        ? [...PATH_B_RENEWAL_STAGES]
        : [...PATH_B_RENEWAL_DIRECT_STAGES]
    } else if (finalApprovalBy === 'MANAGER') {
      dynamicStages = [...PATH_A_MANAGER_STAGES]
    } else if (finalApprovalBy === 'FINANCE') {
      dynamicStages = [...PATH_B_FINANCE_STAGES]
    } else {
      dynamicStages = [...PATH_C_ADMIN_STAGES]
    }
  } else {
    // Hardware dynamicStages calculation
    const hasFinance = (req.history || []).some((h: any) => {
      const act = (h.action || h.stageName || '').toUpperCase()
      const rol = (h.actorRole || '').toUpperCase()
      return act.includes('FINANCE') || rol === 'FINANCE' || (act.includes('RECOMMEND') && !act.includes('ADMIN'))
    }) || st.includes('finance') || fst.includes('finance') || st === 'recommended_to_finance'

    dynamicStages = ['Create Request', 'Manager Approval']
    if (hasFinance) dynamicStages.push('Finance Approval')
    if (wentToAdmin) dynamicStages.push('Admin Approval')
    dynamicStages.push('RFQ Sent', 'Vendor Quotes Received', 'Product Order', 'Delivery', 'Verification and Order Complete', 'Payment')
  }

  let stageIndex = 0
  let currentStageName = dynamicStages[0]
  let currentlyWith = 'Requester'

  if (isCompleted) {
    stageIndex = dynamicStages.length - 1
    currentStageName = dynamicStages[stageIndex]
    currentlyWith = 'Completed & Archived'
  } else if (isSoftware) {
    if (isRenewal && ['created', 'team_lead_review', 'draft'].includes(st)) {
      currentStageName = 'Renewal Request'
      currentlyWith = 'Team Lead / Requester'
    } else if (
      isRenewal &&
      ['manager_review', 'team_lead_submitted', 'pending', 'pending_approval'].includes(st)
    ) {
      currentStageName = 'Manager Review'
      currentlyWith = 'Project Manager — Under Review'
    } else if (isRenewal && st === 'manager_approved') {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Team Lead — Pay Now (Mock) Ready'
    } else if (
      isRenewal &&
      ['recommended_to_finance', 'manager_recommended_to_finance', 'finance_recommended', 'sent_to_finance', 'finance_review', 'finance_research', 'cost_estimation', 'finance_report', 'pre_estimation_completed'].includes(st)
    ) {
      currentStageName = 'Finance Review'
      currentlyWith = 'Finance Directorate — Under Review'
    } else if (isRenewal && st === 'finance_approved') {
      currentStageName = 'Now Pay (Mock)'
      currentlyWith = 'Team Lead — Pay Now (Mock) Ready'
    } else if (isRenewal && ['payment_processed', 'payment_completed'].includes(st)) {
      currentStageName = 'Payment Justification'
      currentlyWith = 'Team Lead — Submit Payment Justification'
    } else if (isRenewal && st === 'payment_justification_submitted') {
      currentStageName = 'Manager Verifies Justification'
      currentlyWith = 'Manager — Verifying Justification'
    } else if (
      isRenewal &&
      ['payment_justified', 'manager_verified', 'manager_verified_pending_team_lead_acknowledgement'].includes(st)
    ) {
      currentStageName = 'Team Lead Acknowledgement'
      currentlyWith = 'Team Lead — Final Acknowledgment Required'
    } else if (st === 'created' || st === 'team_lead_review' || st === 'draft') {
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
    // Hardware & IT Services Stages
    if (st === 'pending_arrival' || st === 'draft' || st === 'created_draft') {
      currentStageName = 'Create Request'
      currentlyWith = 'Team Lead / Requester'
    } else if (
      st === 'pending' ||
      st === 'pending_approval' ||
      st === 'created' ||
      st === 'team_lead_submitted' ||
      st === 'manager_review' ||
      st === 'team_lead_review'
    ) {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Manager — Sarah Manager'
    } else if (
      st === 'finance_review' ||
      st === 'sent_to_finance' ||
      st === 'recommended_to_finance' ||
      st === 'manager_recommended_to_finance' ||
      st === 'finance_recommended' ||
      st === 'finance_on_hold' ||
      st === 'clarification_requested' ||
      (st === 'approved' && req.currentStage === 2 && dynamicStages.includes('Finance Approval'))
    ) {
      currentStageName = 'Finance Approval'
      currentlyWith = 'Finance — Mark Finance Officer'
    } else if (
      st === 'recommended_to_admin' ||
      st === 'finance_recommended_to_admin' ||
      st === 'admin_review' ||
      st === 'admin_research' ||
      fst === 'recommended to admin'
    ) {
      currentStageName = 'Admin Approval'
      currentlyWith = 'Executive Administrator'
    } else if (
      st === 'approved' ||
      st === 'manager_approved' ||
      st === 'rfq_sent' ||
      st === 'in_procurement' ||
      st === 'in procurement' ||
      st === 'sourcing' ||
      (hasRfq && !hasQuotes)
    ) {
      currentStageName = 'RFQ Sent'
      currentlyWith = 'Procurement Sourcing Desk'
    } else if (
      st === 'quotes_received' ||
      st === 'under_evaluation' ||
      st === 'assigned_to_vendor' ||
      st === 'vendor_assigned' ||
      (hasQuotes && !hasPo)
    ) {
      currentStageName = 'Vendor Quotes Received'
      currentlyWith = 'Selected Vendor (Awaiting Acceptance)'
    } else if (
      st === 'product_order' ||
      st === 'po_released' ||
      st === 'po_created' ||
      (hasPo && !hasGrn && st !== 'delivered' && st !== 'delivery')
    ) {
      currentStageName = 'Product Order'
      currentlyWith = 'Procurement Operations'
    } else if (
      st === 'delivered' ||
      st === 'delivery' ||
      st === 'in_transit' ||
      st === 'dispatched' ||
      st === 'vendor_accepted' ||
      (hasGrn && !areDocsVerified && st !== 'verified' && st !== 'invoiced')
    ) {
      currentStageName = 'Delivery'
      currentlyWith = 'Logistics & Receiving Dock'
    } else if (
      st === 'invoiced' ||
      st === 'invoice' ||
      st === 'verified' ||
      st === 'order_complete' ||
      st === 'documents_verified' ||
      areDocsVerified
    ) {
      currentStageName = 'Verification and Order Complete'
      currentlyWith = 'Procurement Audit & 3-Way Match'
    } else if (
      st === 'payment' ||
      st === 'payment_pending' ||
      st === 'payment_processing' ||
      pst === 'processing' ||
      pst === 'paid'
    ) {
      currentStageName = 'Payment'
      currentlyWith = 'Finance Treasury & Disbursement'
    } else {
      currentStageName = 'Manager Approval'
      currentlyWith = 'Manager — Sarah Manager'
    }

    const foundIdx = dynamicStages.indexOf(currentStageName)
    if (foundIdx >= 0) {
      stageIndex = foundIdx
    } else if (typeof req.currentStage === 'number' && !isNaN(req.currentStage)) {
      stageIndex = mapBackendStageToIndex(req.currentStage, dynamicStages, false)
      stageIndex = Math.min(Math.max(stageIndex, 0), dynamicStages.length - 1)
      currentStageName = dynamicStages[stageIndex] || currentStageName
    } else {
      stageIndex = 0
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
    const getCreatedTime = (item: T) => {
      const raw = (item as any).createdAt || (item as any).created_at || (item as any).createdDate || (item as any).created_date || item.date || 0
      const time = new Date(raw).getTime()
      return Number.isFinite(time) ? time : 0
    }
    const timeA = getCreatedTime(a)
    const timeB = getCreatedTime(b)
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
