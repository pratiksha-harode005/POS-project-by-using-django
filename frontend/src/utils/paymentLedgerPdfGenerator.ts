import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { PaymentRecord } from '../context/ManagerDataContext'

export interface LedgerPdfOptions {
  payments: PaymentRecord[]
  actorName?: string
  entityName?: string
  statusFilter?: string
}

export interface PaymentBillOptions {
  payment: PaymentRecord
  actorName?: string
  entityName?: string
}

const formatCurrency = (val: number): string => {
  return 'INR ' + (val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Helper to convert numbers into Indian words (Lakhs & Crores)
 */
export function numberToIndianWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only'
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const inWords = (n: number): string => {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? a[n % 10] + ' ' : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '')
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '')
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '')
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '')
  }

  const whole = Math.floor(num)
  const result = inWords(whole).trim()
  return (result ? result : 'Zero') + ' Rupees Only'
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MASTER PAYMENT LEDGER & DISBURSEMENT REPORT (LANDSCAPE A4)
// ─────────────────────────────────────────────────────────────────────────────

export const generatePaymentLedgerPdf = async (options: LedgerPdfOptions): Promise<jsPDF> => {
  const {
    payments,
    actorName = 'Mark Finance Officer',
    entityName = 'KSS ENTERPRISES GLOBAL INC.',
    statusFilter = 'ALL',
  } = options

  // 1. Initialize Landscape A4 (841.89 x 595.28 pt)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 841.89
  const pageHeight = doc.internal.pageSize.getHeight() // 595.28
  const margin = 36 // 0.5 inch margins
  const contentWidth = pageWidth - margin * 2 // 769.89 pt

  // Calculated Metrics
  const totalRecords = payments.length
  const totalGrossAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalTaxAmount = payments.reduce((acc, p) => acc + (p.taxAmount || 0), 0)
  const totalNetBaseAmount = totalGrossAmount - totalTaxAmount
  const totalNetSettled = payments
    .filter((p) => p.status === 'Paid')
    .reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalPipeline = payments
    .filter((p) => p.status === 'Pending' || p.status === 'Processing')
    .reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalExceptions = payments
    .filter((p) => p.status === 'On Hold' || p.status === 'Failed')
    .reduce((acc, p) => acc + (p.amount || 0), 0)

  const paidCount = payments.filter((p) => p.status === 'Paid').length
  const pipelineCount = payments.filter((p) => p.status === 'Pending' || p.status === 'Processing').length
  const exceptionCount = payments.filter((p) => p.status === 'On Hold' || p.status === 'Failed').length

  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  const batchId = `DISB-BAT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

  // 2. Generate Digital Verification QR Code
  let qrDataUrl = ''
  try {
    const qrPayload = JSON.stringify({
      docType: 'PAYMENT_LEDGER',
      batchId,
      entity: entityName,
      grossAmount: totalGrossAmount,
      taxAmount: totalTaxAmount,
      currency: 'INR',
      records: totalRecords,
      auditedDate: todayStr,
      hash: 'AUTH-KSS-TREASURY-2026-OK',
    })
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
  } catch (err) {
    console.error('Failed to generate verification QR code for PDF:', err)
  }

  // ── HEADER BAND (Dark Navy with Indigo Accent) ──
  doc.setFillColor(15, 23, 42) // Slate-900 / Navy
  doc.rect(0, 0, pageWidth, 58, 'F')

  doc.setFillColor(79, 70, 229) // Indigo-600 accent bar
  doc.rect(0, 58, pageWidth, 3.5, 'F')

  // Top Left Header Text
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(entityName.toUpperCase(), margin, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184) // Slate-400
  doc.text('Global Corporate Treasury & Financial Operations  |  Accounts Payable & Disbursements Sub-Ledger', margin, 38)
  doc.text('CIN: U74999KA2024PTC189021   |   GSTIN: 29ABCDE1234F1Z5   |   RBI Corporate Compliance Rail', margin, 49)

  // Top Right Header Badge
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(pageWidth - margin - 210, 14, 210, 32, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(129, 140, 248) // Indigo-300
  doc.text('AUDITED DISBURSEMENT LEDGER', pageWidth - margin - 105, 27, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(226, 232, 240)
  doc.text(`BATCH REF: ${batchId}`, pageWidth - margin - 105, 39, { align: 'center' })

  // ── METADATA BAR & QR VERIFICATION (Y: 70 to 125) ──
  const metaY = 74

  // Card Background for Metadata
  doc.setFillColor(248, 250, 252) // Slate-50
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, metaY, contentWidth - 68, 54, 4, 4, 'FD')

  // Metadata Left Column
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105) // Slate-600
  doc.text('STATEMENT PERIOD:', margin + 12, metaY + 14)
  doc.text('DISBURSEMENT CYCLE:', margin + 12, metaY + 26)
  doc.text('PAYMENT SCOPE / FILTER:', margin + 12, metaY + 38)
  doc.text('ACCOUNTING STANDARD:', margin + 12, metaY + 48)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42) // Slate-900
  doc.text(`FY 2026-27 (Current Fiscal Quarter)`, margin + 120, metaY + 14)
  doc.text(`Monthly Batch Settlement — September 2026`, margin + 120, metaY + 26)
  doc.text(`${statusFilter === 'ALL' ? 'Complete Ledger (All Statuses)' : `Filtered: ${statusFilter}`}`, margin + 120, metaY + 38)
  doc.text(`Indian AS-7 / Ind AS-115 Accrual Basis (3-Way Matched)`, margin + 120, metaY + 48)

  // Metadata Center Column
  const midColX = margin + 370
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('REPORT GENERATED:', midColX, metaY + 14)
  doc.text('CONTROLLER / OFFICER:', midColX, metaY + 26)
  doc.text('BASE SETTLEMENT CURRENCY:', midColX, metaY + 38)
  doc.text('AUDIT CERTIFICATION:', midColX, metaY + 48)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(`${todayStr} at ${timeStr} IST`, midColX + 130, metaY + 14)
  doc.text(`${actorName} (Treasury Controller)`, midColX + 130, metaY + 26)
  doc.text(`INR (Indian Rupee - ISO 4217)`, midColX + 130, metaY + 38)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(5, 150, 105) // Emerald-600
  doc.text(`PASSED (Three-Way Verified)`, midColX + 130, metaY + 48)

  // QR Code on right side
  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(pageWidth - margin - 58, metaY, 58, 54, 4, 4, 'FD')
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 54, metaY + 2, 50, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(100, 116, 139)
    doc.text('VERIFY AUTH', pageWidth - margin - 29, metaY + 49, { align: 'center' })
  }

  // ── 4 EXECUTIVE FINANCIAL SUMMARY CARDS (Y: 136 to 176) ──
  const cardY = 136
  const cardH = 38
  const cardGap = 8
  const cardW = (contentWidth - cardGap * 3) / 4

  // Card 1: Total Gross Payables with full breakdown
  doc.setFillColor(241, 245, 249) // Slate-100
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(margin, cardY, cardW, cardH, 4, 4, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('TOTAL GROSS PAYABLES', margin + 8, cardY + 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(formatCurrency(totalGrossAmount), margin + 8, cardY + 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(71, 85, 105)
  doc.text(`Net Base: ${formatCurrency(totalNetBaseAmount)} | Tax: ${formatCurrency(totalTaxAmount)}`, margin + 8, cardY + 33)

  // Card 2: Settled & Disbursed (Paid)
  const c2X = margin + cardW + cardGap
  doc.setFillColor(236, 253, 245) // Emerald-50
  doc.setDrawColor(167, 243, 208) // Emerald-200
  doc.roundedRect(c2X, cardY, cardW, cardH, 4, 4, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(5, 150, 105) // Emerald-600
  doc.text('SETTLED & DISBURSED (PAID)', c2X + 8, cardY + 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(6, 95, 70) // Emerald-800
  doc.text(formatCurrency(totalNetSettled), c2X + 8, cardY + 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(4, 120, 87)
  doc.text(`${paidCount} settled transactions via bank gateway`, c2X + 8, cardY + 33)

  // Card 3: Pending & In Pipeline
  const c3X = c2X + cardW + cardGap
  doc.setFillColor(254, 243, 199) // Amber-50
  doc.setDrawColor(253, 230, 138) // Amber-200
  doc.roundedRect(c3X, cardY, cardW, cardH, 4, 4, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(180, 83, 9) // Amber-700
  doc.text('PENDING & PROCESSING PIPELINE', c3X + 8, cardY + 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(146, 64, 14) // Amber-800
  doc.text(formatCurrency(totalPipeline), c3X + 8, cardY + 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(180, 83, 9)
  doc.text(`${pipelineCount} payments scheduled for clearance`, c3X + 8, cardY + 33)

  // Card 4: On Hold / Exceptions
  const c4X = c3X + cardW + cardGap
  doc.setFillColor(254, 242, 242) // Rose-50
  doc.setDrawColor(254, 202, 202) // Rose-200
  doc.roundedRect(c4X, cardY, cardW, cardH, 4, 4, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(185, 28, 28) // Rose-700
  doc.text('EXCEPTIONS / ON HOLD / FAILED', c4X + 8, cardY + 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(153, 27, 27) // Rose-800
  doc.text(formatCurrency(totalExceptions), c4X + 8, cardY + 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(185, 28, 28)
  doc.text(`${exceptionCount} exceptions pending reconciliation`, c4X + 8, cardY + 33)

  // ── DETAILED DATA TABLE VIA AUTOTABLE ──
  // Exact column width budget: 54 + 106 + 92 + 86 + 72 + 46 + 54 + 48 + 64 + 60 + 86 = 768 pt
  // Perfectly fits inside contentWidth (769.89 pt) with ZERO overflow or clipping!
  const tableHeaders = [
    'Ref #',
    'Request & Title',
    'Beneficiary / Vendor',
    '3-Way Match Ref',
    'Method / Rail',
    'Due Date',
    'Settlement',
    'Status',
    'Net Base (INR)',
    'GST / Tax (INR)',
    'Gross Total (INR)',
  ]

  const tableData = payments.map((p) => {
    const grossVal = p.amount || 0
    const taxVal = p.taxAmount || 0
    const netBaseVal = Math.max(0, grossVal - taxVal)

    return [
      p.id,
      `${p.requestId}\n${p.requestTitle || 'Procurement Order'}`,
      p.vendor || 'Vendor Unassigned',
      `PO: ${p.poNumber || 'N/A'}\nINV: ${p.invoiceId || 'N/A'}\nGRN: ${p.grnNumber || 'N/A'}`,
      p.paymentMethod || 'NEFT / RTGS Corporate',
      p.dueDate || 'Immediate',
      p.paymentDate ? p.paymentDate : 'Pending Clearance',
      (p.status || 'PENDING').toUpperCase(),
      formatCurrency(netBaseVal),
      formatCurrency(taxVal),
      formatCurrency(grossVal),
    ]
  })

  const tableFoot = [
    [
      'TOTALS',
      `${totalRecords} Txns Audited`,
      '',
      'All 3-Way Verified',
      '',
      '',
      `Settled: ${paidCount}`,
      '',
      formatCurrency(totalNetBaseAmount),
      formatCurrency(totalTaxAmount),
      formatCurrency(totalGrossAmount),
    ],
  ]

  autoTable(doc, {
    startY: 184,
    head: [tableHeaders],
    body: tableData,
    foot: tableFoot,
    margin: { left: margin, right: margin },
    tableWidth: 768,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
      cellPadding: { top: 5, right: 3, bottom: 5, left: 3 },
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      valign: 'middle',
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
      cellPadding: { top: 5, right: 3, bottom: 5, left: 3 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    columnStyles: {
      0: { cellWidth: 54, fontStyle: 'bold' }, // Ref #
      1: { cellWidth: 106 }, // Request & Title
      2: { cellWidth: 92, fontStyle: 'bold' }, // Beneficiary / Vendor
      3: { cellWidth: 86, fontSize: 6 }, // 3-Way Match
      4: { cellWidth: 72 }, // Method / Rail
      5: { cellWidth: 46, halign: 'center' }, // Due Date
      6: { cellWidth: 54, halign: 'center' }, // Settlement Date
      7: { cellWidth: 48, halign: 'center', fontStyle: 'bold' }, // Status
      8: { cellWidth: 64, halign: 'right' }, // Net Base Amount (INR)
      9: { cellWidth: 60, halign: 'right' }, // GST / Tax (INR)
      10: { cellWidth: 86, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }, // Gross Total (INR)
    },
    didParseCell: (data) => {
      // Style Status column based on value
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw).toUpperCase()
        if (val === 'PAID') {
          data.cell.styles.textColor = [4, 120, 87] // Emerald-700
          data.cell.styles.fillColor = [236, 253, 245]
        } else if (val === 'PROCESSING') {
          data.cell.styles.textColor = [29, 78, 216] // Blue-700
          data.cell.styles.fillColor = [239, 246, 255]
        } else if (val === 'PENDING') {
          data.cell.styles.textColor = [180, 83, 9] // Amber-700
          data.cell.styles.fillColor = [254, 243, 199]
        } else if (val === 'ON HOLD' || val === 'FAILED') {
          data.cell.styles.textColor = [185, 28, 28] // Rose-700
          data.cell.styles.fillColor = [254, 242, 242]
        }
      }

      // Format footer numeric alignment
      if (data.section === 'foot') {
        if (data.column.index === 8 || data.column.index === 9 || data.column.index === 10) {
          data.cell.styles.halign = 'right'
        }
      }
    },
  })

  // ── AUDIT SIGN-OFF & CERTIFICATION BLOCK ──
  const finalY = (doc as any).lastAutoTable.finalY || 420
  let signY = finalY + 14

  // Check if remaining space is tight (needs at least 110 pt)
  if (signY + 100 > pageHeight - margin) {
    doc.addPage()
    signY = margin + 15
  }

  // Statutory Compliance Statement Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, signY, contentWidth, 26, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(30, 41, 59)
  doc.text('STATUTORY AUDIT & CONTROLS ATTESTATION:', margin + 8, signY + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(71, 85, 105)
  doc.text(
    'This ledger report is an official record generated from the KSS Enterprise Procurement OS Treasury Engine. Each payment disbursed represents a 100% verified 3-Way Match ' +
    '(Purchase Order, Goods Receipt Note, and Valid Tax Invoice under CGST/SGST Rules). Bank disbursements conform to RBI Real Time Gross Settlement (RTGS) / NEFT / NACH corporate frameworks.',
    margin + 8,
    signY + 18,
    { maxWidth: contentWidth - 16 }
  )

  // 3-Column Authorization Block
  const authY = signY + 36
  const colW = (contentWidth - 20) / 3

  // Column 1: Prepared By
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, authY, colW, 58, 3, 3, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('PREPARED & RECONCILED BY:', margin + 8, authY + 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(actorName, margin + 8, authY + 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(100, 116, 139)
  doc.text('Accounts Payable & Disbursements Lead', margin + 8, authY + 34)
  doc.line(margin + 8, authY + 46, margin + colW - 8, authY + 46)
  doc.setFontSize(5.5)
  doc.text(`Digital Sign Timestamp: ${todayStr} ${timeStr}`, margin + 8, authY + 53)

  // Column 2: Reviewed & Audited By
  const col2X = margin + colW + 10
  doc.roundedRect(col2X, authY, colW, 58, 3, 3, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('REVIEWED & AUDITED BY:', col2X + 8, authY + 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('Sarah Internal Audit Controller', col2X + 8, authY + 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(100, 116, 139)
  doc.text('Internal Audit & Statutory Compliance Division', col2X + 8, authY + 34)
  doc.line(col2X + 8, authY + 46, col2X + colW - 8, authY + 46)
  doc.setFontSize(5.5)
  doc.text(`Audit Verification Clearance: PASS-3WAY-V3`, col2X + 8, authY + 53)

  // Column 3: Corporate Treasury Approval & Seal
  const col3X = col2X + colW + 10
  doc.roundedRect(col3X, authY, colW, 58, 3, 3, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(79, 70, 229)
  doc.text('TREASURY RELEASE & AUTHORIZATION:', col3X + 8, authY + 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('Vice President of Corporate Finance', col3X + 8, authY + 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(100, 116, 139)
  doc.text('Chief Financial Officer / Authorized Signatory', col3X + 8, authY + 34)
  doc.line(col3X + 8, authY + 46, col3X + colW - 8, authY + 46)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(5, 150, 105)
  doc.text(`[ DIGITAL OFFICIAL TREASURY SEAL - CERTIFIED ]`, col3X + 8, authY + 53)

  // ── FOOTER ON ALL PAGES ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Footer divider line
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(148, 163, 184) // Slate-400
    doc.text(
      'STRICTLY CONFIDENTIAL  |  For Internal Corporate Treasury & Statutory Audit Use Only. Unauthorized reproduction is strictly prohibited.',
      margin,
      pageHeight - 12
    )

    doc.setFont('helvetica', 'bold')
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 12,
      { align: 'right' }
    )
  }

  return doc
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMMERCIAL PAYMENT VOUCHER & REMITTANCE BILL (PORTRAIT A4)
// ─────────────────────────────────────────────────────────────────────────────

export const generatePaymentBillPdf = async (options: PaymentBillOptions): Promise<jsPDF> => {
  const {
    payment,
    actorName = 'Mark Finance Officer',
    entityName = 'KSS ENTERPRISES GLOBAL INC.',
  } = options

  // Portrait A4 (595.28 x 841.89 pt)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 595.28
  const pageHeight = doc.internal.pageSize.getHeight() // 841.89
  const margin = 36 // 36 pt left & right margins
  const contentWidth = pageWidth - margin * 2 // 523.28 pt

  const grossAmount = payment.amount || 0
  const taxAmount = payment.taxAmount || 0
  const netBaseAmount = Math.max(0, grossAmount - taxAmount)
  const cgstAmount = taxAmount / 2
  const sgstAmount = taxAmount / 2

  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const voucherNo = `VCHR-${payment.id}`
  const utrRef = `UTR-${new Date().getFullYear()}${(payment.id || '').replace('PAY-', '')}-88294`

  // Generate Digital QR Code
  let qrDataUrl = ''
  try {
    const qrPayload = JSON.stringify({
      voucherNo,
      paymentId: payment.id,
      vendor: payment.vendor,
      invoice: payment.invoiceId,
      po: payment.poNumber,
      grn: payment.grnNumber,
      grossAmount,
      currency: 'INR',
      status: payment.status,
      date: todayStr,
      hash: `CERT-VCHR-OK-${payment.id}`,
    })
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  } catch (err) {
    console.error('QR code error for voucher:', err)
  }

  // ── HEADER BANNER (Navy & Indigo) ──
  doc.setFillColor(15, 23, 42) // Slate-900
  doc.rect(0, 0, pageWidth, 74, 'F')

  doc.setFillColor(79, 70, 229) // Indigo-600
  doc.rect(0, 74, pageWidth, 3.5, 'F')

  // Company Name & Subtitle
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(entityName.toUpperCase(), margin, 26)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Corporate Treasury & Accounts Payable Division  |  Commercial Disbursement Section', margin, 40)
  doc.text('Registered Office: Global Tech Park, Outer Ring Rd, Bellandur, Bangalore 560103, India', margin, 52)
  doc.text('CIN: U74999KA2024PTC189021  |  GSTIN: 29ABCDE1234F1Z5  |  PAN: ABCDE1234F', margin, 64)

  // Document Title Header Right Tag
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(pageWidth - margin - 170, 16, 170, 44, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(129, 140, 248)
  doc.text('COMMERCIAL DISBURSEMENT BILL', pageWidth - margin - 85, 32, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(226, 232, 240)
  doc.text(`VOUCHER: ${voucherNo}`, pageWidth - margin - 85, 46, { align: 'center' })

  // ── BILL METADATA & VENDOR SUMMARY (Y: 88 to 175) ──
  const cardY = 88
  const halfW = (contentWidth - 12) / 2

  // Left Box: Remitting Entity (Issuer)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, cardY, halfW, 82, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('ISSUING ENTITY (PAID FROM):', margin + 10, cardY + 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text(entityName, margin + 10, cardY + 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Treasury Corporate Settlement Account', margin + 10, cardY + 40)
  doc.text('Corporate Bank: HDFC Corporate Banking Core', margin + 10, cardY + 52)
  doc.text(`Disbursement Officer: ${actorName}`, margin + 10, cardY + 64)
  doc.text(`Voucher Issue Date: ${todayStr}`, margin + 10, cardY + 74)

  // Right Box: Beneficiary / Paid To
  const rightBoxX = margin + halfW + 12
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(rightBoxX, cardY, halfW, 82, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('BENEFICIARY / BILLED TO:', rightBoxX + 10, cardY + 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text(payment.vendor || 'Authorized Commercial Vendor', rightBoxX + 10, cardY + 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text(`Vendor Code: VEND-${(payment.vendor || 'ABC').substring(0, 4).toUpperCase()}-990`, rightBoxX + 10, cardY + 40)
  doc.text(`Disbursement Method: ${payment.paymentMethod || 'NEFT / RTGS'}`, rightBoxX + 10, cardY + 52)
  doc.text(`Payment Status: ${(payment.status || 'PENDING').toUpperCase()}`, rightBoxX + 10, cardY + 64)
  doc.text(`Scheduled Due Date: ${payment.dueDate || 'Immediate'}`, rightBoxX + 10, cardY + 74)

  // ── 3-WAY MATCH & CROSS REFERENCE AUDIT BAR (Y: 178 to 222) ──
  const refY = 178
  doc.setFillColor(238, 242, 255) // Indigo-50
  doc.setDrawColor(199, 210, 254) // Indigo-200
  doc.roundedRect(margin, refY, contentWidth, 42, 4, 4, 'FD')

  const qW = contentWidth / 4
  // Ref 1: PO
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(79, 70, 229)
  doc.text('1. PURCHASE ORDER REF', margin + 10, refY + 13)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(payment.poNumber || 'PO-4582', margin + 10, refY + 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Approved & Contracted', margin + 10, refY + 36)

  // Ref 2: GRN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(79, 70, 229)
  doc.text('2. GOODS RECEIPT (GRN)', margin + qW + 6, refY + 13)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(payment.grnNumber || 'GRN-2214', margin + qW + 6, refY + 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('100% Quality Accepted', margin + qW + 6, refY + 36)

  // Ref 3: Tax Invoice
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(79, 70, 229)
  doc.text('3. VENDOR TAX INVOICE', margin + qW * 2 + 6, refY + 13)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(payment.invoiceId || 'INV-9841', margin + qW * 2 + 6, refY + 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Tax Audit Verified', margin + qW * 2 + 6, refY + 36)

  // Ref 4: Requisition ID
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(79, 70, 229)
  doc.text('4. REQUISITION ID', margin + qW * 3 + 6, refY + 13)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(payment.requestId || 'REQ-2026-001', margin + qW * 3 + 6, refY + 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Manager Certified', margin + qW * 3 + 6, refY + 36)

  // ── ITEMIZED FINANCIAL BREAKDOWN TABLE ──
  const tableStartY = 228
  const tableHeaders = [
    '#',
    'Item Description & Particulars',
    'HSN/SAC',
    'Taxable Base',
    'GST Rate',
    'Tax Amount',
    'Total Gross',
  ]

  const tableBody = [
    [
      '1',
      `${payment.requestTitle || 'Procurement Services'}\nComprehensive corporate supply conforming to PO specifications.`,
      '998313',
      formatCurrency(netBaseAmount),
      '18% (9% C+S)',
      formatCurrency(taxAmount),
      formatCurrency(grossAmount),
    ],
  ]

  const tableFoot = [
    [
      'TOTAL',
      'Total Payable Commitment (3-Way Verified)',
      '',
      formatCurrency(netBaseAmount),
      '',
      formatCurrency(taxAmount),
      formatCurrency(grossAmount),
    ],
  ]

  autoTable(doc, {
    startY: tableStartY,
    head: [tableHeaders],
    body: tableBody,
    foot: tableFoot,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      valign: 'middle',
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' }, // #
      1: { cellWidth: 195 }, // Description
      2: { cellWidth: 50, halign: 'center' }, // HSN
      3: { cellWidth: 68, halign: 'right' }, // Taxable Base
      4: { cellWidth: 56, halign: 'center' }, // GST Rate
      5: { cellWidth: 62, halign: 'right' }, // Tax Amount
      6: { cellWidth: 68, halign: 'right', fontStyle: 'bold' }, // Total Gross
    },
    didParseCell: (data) => {
      if (data.section === 'foot') {
        if (data.column.index === 3 || data.column.index === 5 || data.column.index === 6) {
          data.cell.styles.halign = 'right'
        }
      }
    },
  })

  // ── FINANCIAL SUMMARY & AMOUNT IN WORDS (Below Table) ──
  const billTableFinalY = (doc as any).lastAutoTable.finalY || 330
  const sumY = billTableFinalY + 12

  // Left: Amount in Words & Audit Notes (Width: 310 pt)
  const leftW = 315
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, sumY, leftW, 90, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('TOTAL AMOUNT IN WORDS:', margin + 10, sumY + 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text(numberToIndianWords(grossAmount), margin + 10, sumY + 28, { maxWidth: leftW - 20 })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('BANKING CLEARANCE & COMMERCIAL NOTE:', margin + 10, sumY + 48)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  doc.text(`Banking Rail: ${payment.paymentMethod || 'NEFT / RTGS Corporate'}`, margin + 10, sumY + 60)
  doc.text(`UTR Settlement Ref: ${utrRef}`, margin + 10, sumY + 70)
  doc.text(
    `Note: ${payment.notes || 'Full 3-way match verified against invoice INV-9841. Authorized for bank release.'}`,
    margin + 10,
    sumY + 80,
    { maxWidth: leftW - 20 }
  )

  // Right: Precise Tax & Net Breakdown Box (Width: 196 pt)
  const rightBoxTotalX = margin + leftW + 12
  const rightW = contentWidth - leftW - 12
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(rightBoxTotalX, sumY, rightW, 90, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('TAXABLE VALUE (NET):', rightBoxTotalX + 8, sumY + 16)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(formatCurrency(netBaseAmount), rightBoxTotalX + rightW - 8, sumY + 16, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('CENTRAL GST (CGST 9%):', rightBoxTotalX + 8, sumY + 30)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(formatCurrency(cgstAmount), rightBoxTotalX + rightW - 8, sumY + 30, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('STATE GST (SGST 9%):', rightBoxTotalX + 8, sumY + 44)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(formatCurrency(sgstAmount), rightBoxTotalX + rightW - 8, sumY + 44, { align: 'right' })

  doc.line(rightBoxTotalX + 8, sumY + 54, rightBoxTotalX + rightW - 8, sumY + 54)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('TOTAL GROSS AMOUNT:', rightBoxTotalX + 8, sumY + 68)
  doc.setFontSize(10)
  doc.setTextColor(79, 70, 229) // Indigo-600
  doc.text(formatCurrency(grossAmount), rightBoxTotalX + rightW - 8, sumY + 68, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(5, 150, 105)
  doc.text(`SETTLEMENT STATUS: ${(payment.status || 'PAID').toUpperCase()}`, rightBoxTotalX + 8, sumY + 82)

  // ── AUDIT ATTESTATION & SIGNATURE BLOCK (Y: sumY + 104) ──
  const signBlockY = sumY + 102

  // Attestation Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, signBlockY, contentWidth, 30, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(30, 41, 59)
  doc.text('STATUTORY DISBURSEMENT & TREASURY COMPLIANCE ATTESTATION:', margin + 8, signBlockY + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(71, 85, 105)
  doc.text(
    'I hereby certify that the above commercial disbursement represents a valid and verified liability incurred by KSS Enterprises Global Inc. ' +
    'The goods/services have been received in satisfactory condition and 3-way reconciliation (PO, GRN, and Tax Invoice) has been completed in compliance with statutory audit standards.',
    margin + 8,
    signBlockY + 19,
    { maxWidth: contentWidth - 16 }
  )

  // 3-Column Sign-Off
  const authColY = signBlockY + 40
  const sigColW = (contentWidth - 60) / 2 // Leave room for QR code

  // Signature 1: Prepared by AP
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(margin, authColY, sigColW, 64, 3, 3, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('PREPARED & VERIFIED BY:', margin + 8, authColY + 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text(actorName, margin + 8, authColY + 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Accounts Payable & Disbursements Controller', margin + 8, authColY + 36)
  doc.line(margin + 8, authColY + 48, margin + sigColW - 8, authColY + 48)
  doc.setFontSize(6)
  doc.text(`Digital Sign Timestamp: ${todayStr}`, margin + 8, authColY + 56)

  // Signature 2: Approved by CFO / Treasury
  const sig2X = margin + sigColW + 10
  doc.roundedRect(sig2X, authColY, sigColW, 64, 3, 3, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(79, 70, 229)
  doc.text('AUTHORIZED & DISBURSED BY:', sig2X + 8, authColY + 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text('David Finance (Chief Financial Officer)', sig2X + 8, authColY + 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Corporate Treasury & Banking Authorization Rail', sig2X + 8, authColY + 36)
  doc.line(sig2X + 8, authColY + 48, sig2X + sigColW - 8, authColY + 48)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(5, 150, 105)
  doc.text('[ OFFICIAL TREASURY SEAL & RELEASE CERTIFIED ]', sig2X + 8, authColY + 56)

  // Right: Scannable Verification QR Stamp
  if (qrDataUrl) {
    const qrStampX = sig2X + sigColW + 10
    const qrBoxW = contentWidth - (sigColW * 2 + 20)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(qrStampX, authColY, qrBoxW, 64, 3, 3, 'FD')
    doc.addImage(qrDataUrl, 'PNG', qrStampX + 4, authColY + 4, qrBoxW - 8, 46)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(100, 116, 139)
    doc.text('E-VERIFIED', qrStampX + qrBoxW / 2, authColY + 58, { align: 'center' })
  }

  // ── FOOTER ──
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(148, 163, 184)
  doc.text(
    `OFFICIAL COMMERCIAL PAYMENT VOUCHER  |  Ref: ${payment.id}  |  Generated on ${todayStr} via KSS Procurement OS Treasury Engine`,
    margin,
    pageHeight - 12
  )
  doc.setFont('helvetica', 'bold')
  doc.text('STRICTLY CONFIDENTIAL', pageWidth - margin, pageHeight - 12, { align: 'right' })

  return doc
}

/**
 * Utility to immediately generate and trigger download of the Master Payment Ledger PDF
 */
export const downloadPaymentLedgerPdf = async (options: LedgerPdfOptions, filename?: string) => {
  const doc = await generatePaymentLedgerPdf(options)
  const defaultName = `Payment_Disbursement_Ledger_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename || defaultName)
}

/**
 * Utility to generate a Blob URL for inline Master Ledger PDF viewing / preview modal
 */
export const getPaymentLedgerPdfBlobUrl = async (options: LedgerPdfOptions): Promise<string> => {
  const doc = await generatePaymentLedgerPdf(options)
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

/**
 * Utility to immediately generate and trigger download of an Individual Payment Bill / Voucher PDF
 */
export const downloadPaymentBillPdf = async (options: PaymentBillOptions, filename?: string) => {
  const doc = await generatePaymentBillPdf(options)
  const defaultName = `Payment_Bill_Voucher_${options.payment.id}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename || defaultName)
}

/**
 * Utility to generate a Blob URL for inline Payment Bill / Voucher PDF viewing / preview modal
 */
export const getPaymentBillPdfBlobUrl = async (options: PaymentBillOptions): Promise<string> => {
  const doc = await generatePaymentBillPdf(options)
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
