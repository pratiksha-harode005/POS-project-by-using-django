import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { ProcurementRequest } from '../context/ManagerDataContext'
import { numberToIndianWords } from './paymentLedgerPdfGenerator'

// --- Types --------------------------------------------------------------------

export interface SoftwareReceiptOptions {
  request: ProcurementRequest
  receiptNo?: string
  paymentId?: string
  paymentDate?: string
  paymentMethod?: string
  transactionRef?: string
  approvedAmount?: number
  actualPaidAmount?: number
  taxAmount?: number
  discountAmount?: number
  actorName?: string
  entityName?: string
}

// --- Helpers -----------------------------------------------------------------

const fmtINR = (val: number): string =>
  'INR ' +
  (val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

function roundRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: string
) {
  doc.roundedRect(x, y, w, h, r, r, style as any)
}

// -----------------------------------------------------------------------------
//  MAIN: Software / SaaS Payment Receipt — Portrait A4
// -----------------------------------------------------------------------------

export const generateSoftwareReceiptPdf = async (
  options: SoftwareReceiptOptions
): Promise<jsPDF> => {
  const {
    request: req,
    receiptNo,
    paymentId,
    paymentDate,
    paymentMethod,
    transactionRef,
    approvedAmount,
    actualPaidAmount,
    taxAmount,
    discountAmount,
    actorName = 'Finance Officer',
    entityName = 'KSS ENTERPRISES GLOBAL INC.',
  } = options

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const cw = pageWidth - margin * 2

  // Meta
  const ef               = req.extraFields ?? (req as any).extra_fields ?? {}
  const pj               = (req as any).payment_justification_detail ?? (req as any).payment_justification ?? ef.payment_justification ?? {}

  // Amounts
  const requestedAmt = (req as any).requested_amount ?? pj.requested_amount ?? ef.requested_amount ?? (req as any).total_estimated_cost ?? req.amount ?? 0
  const approvedAmt  = approvedAmount ?? (req.finance_approved_amount ?? req.approved_amount ?? pj.finance_approved_amount ?? pj.manager_approved_amount ?? requestedAmt)
  const taxAmt       = taxAmount ?? (pj.gst_tax ?? req.invoiceDetails?.taxAmount ?? Math.round(approvedAmt * 0.18))
  const discountAmt  = discountAmount ?? (pj.discount ?? 0)
  const finalPaid    = actualPaidAmount ?? (pj.final_payable_amount ?? pj.actual_purchase_amount ?? approvedAmt)

  // Meta
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr  = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const receiptNum   = receiptNo  ?? `RCP-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
  const paymentIdStr = paymentId  ?? `PAY-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
  const txnRef       = transactionRef ?? req.payment_reference ?? `TXN-${Math.floor(100000000 + Math.random() * 899999999)}`
  const paidDate     = paymentDate ?? req.payment_date ?? req.paidDate ?? todayStr
  const method       = paymentMethod ?? req.payment_method ?? 'Corporate Card'
  const softwareName     = pj.software_name ?? req.software_name ?? ef.software_name ?? req.title
  const vendor           = pj.vendor_name ?? req.vendor ?? ef.vendor_name ?? ef.vendor ?? 'N/A'

  const rawPt = pj.purchase_type ?? ef.purchase_type ?? ef.purchaseType ?? ef.request_type ?? req.request_type ?? (req as any).request_operation ?? ''
  const normalizePt = (v: string): string => {
    const s = (v || '').trim().toUpperCase()
    if (s === 'RENEWAL' || s.includes('RENEW')) return 'Renewal'
    if (s === 'UPGRADE' || s.includes('UPGRADE')) return 'Upgrade'
    if (s === 'NEW' || s.includes('NEW')) return 'New Purchase'
    return v || 'N/A'
  }
  const purchaseType     = normalizePt(rawPt)

  const startDate        = pj.start_date ?? ef.start_date ?? ef.subscription_start ?? 'N/A'
  const endDate          = pj.end_date   ?? ef.end_date   ?? ef.subscription_end   ?? 'N/A'

  const resolveSubscriptionType = (): string => {
    const rawSub = pj.subscription_type ?? ef.subscription_type ?? ef.subscription ?? (req as any).subscription_type
    if (rawSub) {
      const s = String(rawSub).trim().toLowerCase()
      if (s.includes('one')) return 'One-Time'
      if (s.includes('annual') || s.includes('year')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
      return rawSub
    }
    const rc = ef.renewalCycle || (req as any).renewalCycle
    if (rc) {
      const s = String(rc).trim().toLowerCase()
      if (s.includes('one')) return 'One-Time'
      if (s.includes('annual') || s.includes('year')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
    }
    if (startDate !== 'N/A' && endDate !== 'N/A') {
      try {
        const d1 = new Date(startDate)
        const d2 = new Date(endDate)
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0 && diffDays <= 45) return 'Monthly'
        if (diffDays >= 300) return 'Annual'
      } catch {}
    }
    return 'Annual'
  }
  const subscriptionType = resolveSubscriptionType()
  const planEdition      = pj.plan_edition ?? req.required_plan ?? ef.plan_edition ?? ef.plan ?? ef.requiredPlan ?? 'NA'
  const userLicenses     = pj.users_licenses ?? ef.no_of_users ?? ef.num_users ?? ef.licenses ?? req.quantity ?? '1'
  const invoiceNumber    = pj.po_number ?? req.invoiceDetails?.invoiceNumber ?? ef.invoice_number ?? 'N/A'
  const quoteNumber      = pj.quote_number ?? ef.quote_number ?? ef.rfq_number ?? 'N/A'

  // QR Code
  let qrDataUrl = ''
  try {
    const qrPayload = JSON.stringify({
      receipt: receiptNum, paymentId: paymentIdStr, requestId: req.id,
      software: softwareName, vendor, finalPaid, currency: 'INR',
      date: paidDate, txn: txnRef, hash: `CERT-RCP-${receiptNum}`,
    })
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 140, margin: 1, color: { dark: '#0f172a', light: '#ffffff' },
    })
  } catch (e) { console.error('QR error', e) }

  // Palette
  const NAVY   : [number,number,number] = [15, 23, 42]
  const INDIGO : [number,number,number] = [79, 70, 229]
  const SLATE6 : [number,number,number] = [71, 85, 105]
  const SLATE4 : [number,number,number] = [148, 163, 184]
  const SLATE2 : [number,number,number] = [226, 232, 240]
  const SLATE1 : [number,number,number] = [241, 245, 249]
  const SLATE0 : [number,number,number] = [248, 250, 252]
  const WHITE  : [number,number,number] = [255, 255, 255]
  const EM700  : [number,number,number] = [4, 120, 87]
  const EM50   : [number,number,number] = [236, 253, 245]
  const EM200  : [number,number,number] = [167, 243, 208]
  const TEAL6  : [number,number,number] = [13, 148, 136]
  const BLUE6  : [number,number,number] = [37, 99, 235]
  const BLUE1  : [number,number,number] = [219, 234, 254]
  const AMB7   : [number,number,number] = [180, 83, 9]
  const AMB1   : [number,number,number] = [254, 243, 199]

  let curY = 0

  // -- HEADER ------------------------------------------------------------------
  const HEADER_H = 82
  doc.setFillColor(...NAVY); doc.rect(0, 0, pageWidth, HEADER_H, 'F')
  doc.setFillColor(...INDIGO); doc.rect(0, HEADER_H, pageWidth, 3.5, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE4)
  doc.text(entityName, margin, 20)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...WHITE)
  doc.text('PAYMENT RECEIPT', margin, 44)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.setTextColor(165, 180, 252)
  doc.text('SOFTWARE / SaaS', margin, 60)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...SLATE4)
  doc.text(`Generated: ${todayStr}  ${timeStr}`, pageWidth - margin, 20, { align: 'right' })
  doc.text(`Officer: ${actorName}`, pageWidth - margin, 32, { align: 'right' })

  // PAID badge
  const badgeW = 72, badgeH = 24, badgeX = pageWidth - margin - badgeW, badgeY = 44
  doc.setFillColor(...EM700)
  roundRect(doc, badgeX, badgeY, badgeW, badgeH, 4, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...WHITE)
  doc.text('CHECK PAID', badgeX + badgeW / 2, badgeY + 16, { align: 'center' })

  curY = HEADER_H + 3.5 + 14

  // -- META PILLS --------------------------------------------------------------
  const metaPills = [
    { label: 'Receipt No.', value: receiptNum },
    { label: 'Request ID',  value: req.id },
    { label: 'Payment ID',  value: paymentIdStr },
    { label: 'Date',        value: paidDate },
  ]
  doc.setFillColor(...SLATE0); doc.setDrawColor(...SLATE2); doc.setLineWidth(0.5)
  roundRect(doc, margin, curY, cw, 36, 5, 'FD')

  const pillW = (cw - 20) / metaPills.length
  metaPills.forEach((pill, i) => {
    const px = margin + 10 + i * pillW
    if (i > 0) {
      doc.setDrawColor(...SLATE2); doc.setLineWidth(0.5)
      doc.line(px - 4, curY + 8, px - 4, curY + 28)
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...SLATE4)
    doc.text(pill.label, px, curY + 14)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY)
    doc.text(pill.value, px, curY + 26)
  })
  curY += 36 + 12

  // -- SECTION HEADER -----------------------------------------------------------
  const drawSectionHeader = (title: string, y: number): number => {
    doc.setFillColor(...TEAL6)
    roundRect(doc, margin, y, cw, 20, 3, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...WHITE)
    doc.text(title, margin + 10, y + 13.5)
    return y + 20
  }

  // -- SOFTWARE / SaaS DETAILS -------------------------------------------------
  const swRows = [
    ['Software Name',    softwareName],
    ['Vendor',           vendor],
    ['Purchase Type',    purchaseType],
    ['Subscription',     subscriptionType],
    ['Plan / Edition',   planEdition],
    ['Users / Licenses', String(userLicenses)],
    ['Start Date',       startDate !== 'N/A' ? startDate : '—'],
    ['End Date',         endDate !== 'N/A' ? endDate : '—'],
  ]
  const itemsPerRow = 4
  const cellH = 34
  const numRows = Math.ceil(swRows.length / itemsPerRow)
  const swCardH = 20 + numRows * cellH + 8
  const swCardY = curY

  doc.setFillColor(...WHITE); doc.setDrawColor(...SLATE2); doc.setLineWidth(0.75)
  roundRect(doc, margin, curY, cw, swCardH, 5, 'FD')
  curY = drawSectionHeader('  SOFTWARE / SaaS DETAILS', curY)

  const swColW = cw / itemsPerRow
  for (let ri = 0; ri < numRows; ri++) {
    const rowY = curY + ri * cellH + 4
    if (ri > 0) {
      doc.setDrawColor(...SLATE1); doc.setLineWidth(0.3)
      doc.line(margin, rowY, margin + cw, rowY)
    }
    for (let ci = 0; ci < itemsPerRow; ci++) {
      const idx = ri * itemsPerRow + ci
      if (idx >= swRows.length) break
      const cx = margin + ci * swColW
      if (ci > 0) {
        doc.setDrawColor(...SLATE2); doc.setLineWidth(0.3)
        doc.line(cx, rowY + 2, cx, rowY + cellH - 4)
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...SLATE6)
      doc.text(swRows[idx][0], cx + 8, rowY + 11)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NAVY)
      doc.text(swRows[idx][1], cx + 8, rowY + 22)
    }
  }
  curY = swCardY + swCardH + 10

  // -- FINANCIAL DETAILS --------------------------------------------------------
  const finItems = [
    { label: 'Requested Amount', value: fmtINR(requestedAmt), color: SLATE6, bg: SLATE0, border: SLATE2 },
    { label: 'Approved Amount',  value: fmtINR(approvedAmt),  color: BLUE6,  bg: BLUE1,  border: BLUE6  },
    { label: 'Actual Paid',      value: fmtINR(finalPaid),    color: EM700,  bg: EM50,   border: EM200  },
    { label: 'GST / Tax',        value: fmtINR(taxAmt),       color: AMB7,   bg: AMB1,   border: AMB7   },
    { label: 'Discount',         value: discountAmt > 0 ? `(${fmtINR(discountAmt)})` : '—', color: SLATE6, bg: SLATE0, border: SLATE2 },
    { label: 'Final Paid Amount',value: fmtINR(finalPaid),    color: EM700,  bg: EM50,   border: EM200, large: true },
  ]
  const finCardH = 20 + 52 + 6 + 46 + 10
  const finCardY = curY
  doc.setFillColor(...WHITE); doc.setDrawColor(...SLATE2); doc.setLineWidth(0.75)
  roundRect(doc, margin, curY, cw, finCardH, 5, 'FD')
  curY = drawSectionHeader('  FINANCIAL DETAILS', curY)

  const finCellW = cw / 3
  ;[0, 1, 2].forEach((i) => {
    const it = finItems[i]
    const fx = margin + i * finCellW
    const fy = curY + 6
    doc.setFillColor(...it.bg); doc.setDrawColor(...it.border); doc.setLineWidth(0.4)
    roundRect(doc, fx + 6, fy, finCellW - 12, 42, 4, 'FD')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...SLATE6)
    doc.text(it.label, fx + 14, fy + 12)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...it.color)
    doc.text(it.value, fx + 14, fy + 30)
  })
  curY += 52 + 6

  ;[3, 4, 5].forEach((i) => {
    const it = finItems[i]
    const fx = margin + (i - 3) * finCellW
    const fy = curY + 4
    const h2 = it.large ? 40 : 36
    doc.setFillColor(...it.bg); doc.setDrawColor(...it.border); doc.setLineWidth(it.large ? 1 : 0.4)
    roundRect(doc, fx + 6, fy, finCellW - 12, h2, 4, 'FD')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...SLATE6)
    doc.text(it.label, fx + 14, fy + 11)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(it.large ? 13 : 10); doc.setTextColor(...it.color)
    doc.text(it.value, fx + 14, fy + (it.large ? 30 : 26))
  })
  curY = finCardY + finCardH + 8

  // Amount in words
  doc.setFillColor(238, 242, 255); doc.setDrawColor(199, 210, 254); doc.setLineWidth(0.5)
  roundRect(doc, margin, curY, cw, 22, 3, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...INDIGO)
  doc.text('AMOUNT IN WORDS:', margin + 10, curY + 14)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59)
  doc.text(numberToIndianWords(finalPaid), margin + 110, curY + 14)
  curY += 22 + 10

  // -- PAYMENT DETAILS ----------------------------------------------------------
  const payCardH = 20 + 50 + 10
  const payCardY = curY
  doc.setFillColor(...WHITE); doc.setDrawColor(...SLATE2); doc.setLineWidth(0.75)
  roundRect(doc, margin, curY, cw, payCardH, 5, 'FD')
  curY = drawSectionHeader('  PAYMENT DETAILS', curY)

  const payItems = [
    { label: 'Payment Method',   value: method,         isStatus: false },
    { label: 'Payment Date',     value: paidDate,       isStatus: false },
    { label: 'Transaction Ref.', value: txnRef,         isStatus: false },
    { label: 'Payment Status',   value: 'Successful',   isStatus: true  },
  ]
  const payColW = cw / 4
  payItems.forEach((item, i) => {
    const px = margin + i * payColW, py = curY + 6
    if (i > 0) {
      doc.setDrawColor(...SLATE2); doc.setLineWidth(0.3)
      doc.line(px, py + 2, px, py + 36)
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...SLATE6)
    doc.text(item.label, px + 8, py + 10)
    if (item.isStatus) {
      doc.setFillColor(...EM50); doc.setDrawColor(...EM200); doc.setLineWidth(0.4)
      roundRect(doc, px + 8, py + 16, 64, 16, 3, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...EM700)
      doc.text(item.value, px + 40, py + 27, { align: 'center' })
    } else {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NAVY)
      doc.text(item.value, px + 8, py + 28)
    }
  })
  curY = payCardY + payCardH + 10

  // -- VENDOR / INVOICE DETAILS -------------------------------------------------
  const vendCardH = 20 + 64 + 10
  const vendCardY = curY
  doc.setFillColor(...WHITE); doc.setDrawColor(...SLATE2); doc.setLineWidth(0.75)
  roundRect(doc, margin, curY, cw, vendCardH, 5, 'FD')
  curY = drawSectionHeader('  VENDOR / INVOICE DETAILS', curY)

  const vendCols = [
    { label: 'Vendor',         value: vendor },
    { label: 'Invoice Number', value: invoiceNumber },
    { label: 'Quote Number',   value: quoteNumber },
  ]
  const vendColW = cw / 3
  vendCols.forEach((item, i) => {
    const vx = margin + i * vendColW, vy = curY + 6
    if (i > 0) {
      doc.setDrawColor(...SLATE2); doc.setLineWidth(0.3)
      doc.line(vx, vy + 2, vx, vy + 26)
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...SLATE6)
    doc.text(item.label, vx + 10, vy + 10)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NAVY)
    doc.text(item.value, vx + 10, vy + 24)
  })

  // Document buttons
  const btnY = curY + 36
  const docBtns = ['View Invoice', 'View Quote', 'View Supporting Documents']
  const btnW = 130, btnH = 18, btnGap = 10
  docBtns.forEach((label, i) => {
    const bx = margin + 6 + i * (btnW + btnGap)
    doc.setFillColor(...BLUE1); doc.setDrawColor(...BLUE6); doc.setLineWidth(0.5)
    roundRect(doc, bx, btnY, btnW, btnH, 3, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...BLUE6)
    doc.text(label, bx + btnW / 2, btnY + 12, { align: 'center' })
  })
  curY = vendCardY + vendCardH + 10

  // -- SUCCESS BANNER + QR ------------------------------------------------------
  const bannerH = 56, qrSize = 70
  if (curY + bannerH + 20 > pageHeight - 36) { doc.addPage(); curY = 36 }

  if (qrDataUrl) {
    const qrBoxW = qrSize + 10
    doc.setFillColor(...WHITE); doc.setDrawColor(...SLATE2); doc.setLineWidth(0.5)
    roundRect(doc, margin, curY, qrBoxW, bannerH, 4, 'FD')
    doc.addImage(qrDataUrl, 'PNG', margin + 4, curY + 4, qrSize, qrSize - 6)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...SLATE4)
    doc.text('VERIFY', margin + qrBoxW / 2, curY + bannerH - 3, { align: 'center' })

    const bx = margin + qrBoxW + 6, bw = cw - qrBoxW - 6
    doc.setFillColor(5, 150, 105)
    roundRect(doc, bx, curY, bw, bannerH, 5, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...WHITE)
    doc.text('PAYMENT COMPLETED SUCCESSFULLY', bx + bw / 2, curY + 22, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(167, 243, 208)
    doc.text(
      `This receipt is generated from the approved payment transaction associated with Request ${req.id}.`,
      bx + bw / 2, curY + 36, { align: 'center', maxWidth: bw - 24 }
    )
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(209, 250, 229)
    doc.text(
      `Receipt: ${receiptNum}  ·  Txn: ${txnRef}  ·  ${paidDate}`,
      bx + bw / 2, curY + 49, { align: 'center' }
    )
  } else {
    doc.setFillColor(5, 150, 105)
    roundRect(doc, margin, curY, cw, bannerH, 5, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...WHITE)
    doc.text('PAYMENT COMPLETED SUCCESSFULLY', margin + cw / 2, curY + 24, { align: 'center' })
  }
  curY += bannerH + 14

  // -- AUTHORIZATION BLOCK ------------------------------------------------------
  const authH = 56, authColW = (cw - 16) / 3
  if (curY + authH > pageHeight - 36) { doc.addPage(); curY = 40 }

  const authCols = [
    { title: 'PROCESSED BY',           name: actorName,                   role: 'Finance Officer',                  note: `Digital Sign: ${todayStr}`, color: SLATE6 },
    { title: 'REVIEWED & CERTIFIED',   name: 'Internal Audit Controller', role: 'Compliance & Audit Division',      note: 'Audit Verification: PASS',  color: INDIGO },
    { title: 'TREASURY AUTHORIZED',    name: 'VP — Corporate Finance',    role: 'Chief Financial Officer',          note: '[ DIGITAL TREASURY SEAL ]', color: EM700  },
  ]
  authCols.forEach((col, i) => {
    const ax = margin + i * (authColW + 8)
    doc.setFillColor(...SLATE0); doc.setDrawColor(...SLATE2); doc.setLineWidth(0.5)
    roundRect(doc, ax, curY, authColW, authH, 3, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...col.color)
    doc.text(col.title, ax + 8, curY + 10)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY)
    doc.text(col.name, ax + 8, curY + 22)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...SLATE6)
    doc.text(col.role, ax + 8, curY + 32)
    doc.setDrawColor(...SLATE2); doc.setLineWidth(0.5)
    doc.line(ax + 8, curY + 41, ax + authColW - 8, curY + 41)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...col.color)
    doc.text(col.note, ax + 8, curY + 51)
  })

  // -- FOOTER ------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...NAVY)
    doc.rect(0, pageHeight - 26, pageWidth, 26, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...SLATE4)
    doc.text(
      `STRICTLY CONFIDENTIAL  |  ${entityName}  |  Software / SaaS Payment Receipt  |  ${receiptNum}`,
      margin, pageHeight - 10
    )
    doc.setFont('helvetica', 'bold'); doc.setTextColor(165, 180, 252)
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
  }

  return doc
}

// --- Download helpers ---------------------------------------------------------

export const downloadSoftwareReceiptPdf = async (options: SoftwareReceiptOptions): Promise<void> => {
  const doc = await generateSoftwareReceiptPdf(options)
  const receiptNum = options.receiptNo ?? `RCP-${options.request.id}`
  doc.save(`Software_Receipt_${receiptNum}.pdf`)
}

export const getSoftwareReceiptBlobUrl = async (options: SoftwareReceiptOptions): Promise<string> => {
  const doc = await generateSoftwareReceiptPdf(options)
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
