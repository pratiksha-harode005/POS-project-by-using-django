export interface ReceiptPaymentLike {
  requestId?: string
  purchaseRequestDetail?: {
    request_id?: string
    id?: string | number
  }
  amount?: number | string
  status?: string
}

const normalizeRequestId = (value: unknown): string =>
  String(value || '').replace(/^REQ-/i, '').trim().toUpperCase()

/** Return an amount only when the linked payment is recorded as settled. */
export function findDisbursedAmount(
  requestId: string | undefined,
  payments: readonly ReceiptPaymentLike[]
): number | null {
  const normalizedRequestId = normalizeRequestId(requestId)
  if (!normalizedRequestId) return null

  const payment = payments.find(item =>
    normalizeRequestId(item.requestId || item.purchaseRequestDetail?.request_id || item.purchaseRequestDetail?.id) === normalizedRequestId &&
    String(item.status || '').toUpperCase() === 'PAID'
  )
  const amount = Number(payment?.amount)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}
