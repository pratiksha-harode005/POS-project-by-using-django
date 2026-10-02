/**
 * Procurement Workflow Utilities
 * Finance and Admin approval stages are DYNAMIC.
 * They are only shown when those portals actually participated.
 */

export type WorkflowType = 'SOFTWARE' | 'HARDWARE'

// Full canonical stage lists (kept for imports by other files)
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
])

export function detectWorkflowType(category?: string, title?: string): WorkflowType {
  const cat = (category || '').trim()
  const tit = (title || '').toLowerCase()
  if (SOFTWARE_CATEGORIES.has(cat)) return 'SOFTWARE'
  if (HARDWARE_CATEGORIES.has(cat)) return 'HARDWARE'
  const catLower = cat.toLowerCase()
  if (SOFTWARE_KEYWORDS.some(k => catLower.includes(k) || tit.includes(k))) return 'SOFTWARE'
  return 'HARDWARE'
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
  const st = (req.status || '').toLowerCase().trim()
  const fst = (req.financeStatus || '').toLowerCase().trim()
  const pst = (req.paymentStatus || '').toLowerCase().trim()

  const isCompleted = st === 'completed' || pst === 'paid' || fst === 'completed' ||
    (isSoftware && st === 'payment_pending' && pst === 'paid')
  const isRejected = st === 'rejected' || st === 'finance_rejected' || fst.includes('reject')
  const isReturned = st === 'clarification_requested' || st === 'returned' || fst.includes('return')

  const { hadFinance, hadAdmin } = detectActualApprovalPath(req.approval_steps || [], req.history || [], req.currentStage)
  const stages = buildDynamicStages(isSoftware, hadFinance, hadAdmin)
  const totalStages = stages.length

  const hasRfq = Boolean(req.rfqId || req.rfq_id || (Array.isArray(req.rfqs) && req.rfqs.length > 0))
  const hasQuotes = Boolean(
    (Array.isArray(req.rfqs) && req.rfqs.some((r: any) =>
      (Array.isArray(r.quotations) && r.quotations.length > 0) ||
      (Array.isArray(r.vendors) && r.vendors.some((v: any) => v.response === 'Received'))
    )) || st === 'quotes_received' || st === 'under_evaluation'
  )
  const hasPo = Boolean(req.poNumber || req.po_id || req.po_number)
  const hasGrn = Boolean(req.grnNumber || req.grn_number || req.receipt_id)

  const checkDocsVerified = (): boolean => {
    if (req.documentsVerified || req.isVerified) return true
    if (req.is_invoice_verified && (req.grn_status === 'Verified' || req.grn_status === 'Confirmed')) return true
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const invs: string[] = JSON.parse(localStorage.getItem('kss_manager_verified_invoices') || '[]')
        const grns: string[] = JSON.parse(localStorage.getItem('kss_manager_verified_grns') || '[]')
        const keys = [req.invoiceNumber, req.invoice_number, req.grnNumber, req.grn_number,
          req.poNumber, req.po_id, req.po_number, req.rfqId, req.rfq_id].filter(Boolean) as string[]
        const hasInvVerified = keys.some((k: string) => invs.some((i: string) =>
          i.toUpperCase().includes(k.toUpperCase()) || k.toUpperCase().includes(i.toUpperCase())))
        const hasGrnVerified = keys.some((k: string) => grns.some((g: string) =>
          g.toUpperCase().includes(k.toUpperCase()) || k.toUpperCase().includes(g.toUpperCase())))
        if (hasInvVerified && (hasGrnVerified || hasGrn)) return true
      } catch (e) {}
    }
    return false
  }
  const areDocsVerified = checkDocsVerified()

  let effectiveBackendStage = req.currentStage
  if (!isSoftware && !isRejected && !isReturned && !isCompleted) {
    if (typeof effectiveBackendStage === 'number') {
      if (hasRfq && effectiveBackendStage < 4) effectiveBackendStage = 4
      if (hasQuotes && effectiveBackendStage < 5) effectiveBackendStage = 5
      if (hasPo && effectiveBackendStage < 6) effectiveBackendStage = 6
      if (hasGrn && effectiveBackendStage < 8) effectiveBackendStage = 8
      if (areDocsVerified && effectiveBackendStage < 9) effectiveBackendStage = 9
    } else {
      if (areDocsVerified) effectiveBackendStage = 9
      else if (hasGrn) effectiveBackendStage = 8
      else if (hasPo) effectiveBackendStage = 6
      else if (hasQuotes) effectiveBackendStage = 5
      else if (hasRfq) effectiveBackendStage = 4
    }
  }

  let stageIndex = 0
  if (typeof effectiveBackendStage === 'number' && !isNaN(effectiveBackendStage)) {
    stageIndex = mapBackendStageToIndex(effectiveBackendStage, stages, isSoftware)
    stageIndex = Math.min(Math.max(stageIndex, 0), totalStages - 1)
  } else {
    let mappedName = 'Create Request'
    if (isSoftware) {
      if (st === 'pending_arrival' || st === 'draft') mappedName = 'Create Request'
      else if (st === 'pending_approval' || st === 'pending') mappedName = 'Manager Approval'
      else if (['finance_review','sent_to_finance','recommended_to_finance','recommended'].includes(st)) mappedName = 'Finance Approval'
      else if (st === 'recommended_to_admin' || fst === 'recommended to admin') mappedName = 'Admin Approval'
      else if (['approved','in_procurement','verified','order_complete'].includes(st)) mappedName = 'Verification and Order Complete'
      else mappedName = 'Payment'
    } else {
      if (st === 'pending_arrival' || st === 'draft') mappedName = 'Create Request'
      else if (st === 'pending_approval' || st === 'pending') mappedName = 'Manager Approval'
      else if (['finance_review','sent_to_finance','recommended_to_finance','recommended'].includes(st)) mappedName = 'Finance Approval'
      else if (st === 'recommended_to_admin' || fst === 'recommended to admin') mappedName = 'Admin Approval'
      else if (['approved','rfq_pending','rfq_sent'].includes(st)) mappedName = 'RFQ Sent'
      else if (st === 'quotes_received' || st === 'under_evaluation') mappedName = 'Vendor Quotes Received'
      else if (['in_procurement','product_order','assigned_to_vendor'].includes(st)) mappedName = 'Product Order'
      else if (['delivered','delivery','goods_received'].includes(st)) mappedName = hasGrn ? 'Verification and Order Complete' : 'Delivery'
      else if (['verified','order_complete','matched'].includes(st)) mappedName = areDocsVerified ? 'Payment' : 'Verification and Order Complete'
      else mappedName = 'Payment'
    }
    const idx = stages.indexOf(mappedName)
    stageIndex = idx >= 0 ? idx : 0
  }

  if (isCompleted) stageIndex = totalStages - 1
  else if (isReturned) stageIndex = 0

  const currentStageName = stages[stageIndex] || stages[0]

  let currentlyWith = 'Requester'
  if (isCompleted) currentlyWith = 'Completed & Archived'
  else if (isReturned) currentlyWith = 'Returned to Team Lead'
  else if (isRejected) currentlyWith = 'Rejected & Closed'
  else {
    switch (currentStageName) {
      case 'Create Request': currentlyWith = 'Team Lead / Requester'; break
      case 'Manager Approval': currentlyWith = 'Manager — Sarah Manager'; break
      case 'Finance Approval': currentlyWith = 'Finance — Mark Finance Officer'; break
      case 'Admin Approval': currentlyWith = 'Admin — Executive Authority'; break
      case 'RFQ Sent': currentlyWith = 'Procurement Sourcing Desk (RFQ Dispatched)'; break
      case 'Vendor Quotes Received': currentlyWith = 'Vendor Sourcing Desk (Quotations Under Evaluation)'; break
      case 'Product Order': currentlyWith = 'Selected Vendor (Purchase Order Issued)'; break
      case 'Delivery': currentlyWith = 'Dock & Receiving (Shipment & Delivery Challan)'; break
      case 'Verification and Order Complete':
        currentlyWith = isSoftware
          ? 'IT Operations & Provisioning (License Verification)'
          : 'Accounts Payable & Procurement Audit (Goods Receipt & Invoice Match)'
        break
      case 'Payment':
        currentlyWith = isSoftware
          ? 'Accounts & Treasury (Payment Processing)'
          : 'Finance Treasury (Payment Processing & Disbursement)'
        break
      default: currentlyWith = 'Procurement System'
    }
  }

  const n = stageIndex + 1
  const t = totalStages
  let statusBadge = ''
  if (isCompleted) statusBadge = '100% Completed / Paid'
  else if (isRejected) statusBadge = 'Rejected (Stage ' + n + '/' + t + ')'
  else if (isReturned) statusBadge = 'Returned (Stage ' + n + '/' + t + ')'
  else statusBadge = currentStageName + ' (Stage ' + n + '/' + t + ')'

  return { workflowType, stages, currentStageIndex: stageIndex, totalStages, currentStageName, statusBadge, isCompleted, isRejected, isReturned, currentlyWith }
}
