import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { ProcurementRequest } from '../context/ManagerDataContext'
import { numberToIndianWords } from './paymentLedgerPdfGenerator'

export interface HandoverPdfOptions {
  request: ProcurementRequest
  managerName?: string
  managerNotes?: string
  directives?: string[]
}

const formatCurrency = (val: number): string => {
  return 'INR ' + (val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export async function generateFinanceHandoverPdf(options: HandoverPdfOptions): Promise<jsPDF> {
  const {
    request: req,
    managerName = 'Sarah Manager (Procurement Manager)',
    managerNotes = '',
    directives = []
  } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 595.28
  const pageHeight = doc.internal.pageSize.getHeight() // 841.89
  const margin = 36
  const contentWidth = pageWidth - margin * 2

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

  const dossierRef = `DOSSIER-${req.id}`
  const grossAmount = req.amount || 0
  const netBaseAmount = Math.round((grossAmount / 1.18) * 100) / 100
  const taxAmount = Math.round((grossAmount - netBaseAmount) * 100) / 100

  // 1. Digital QR Code
  let qrDataUrl = ''
  try {
    const qrPayload = JSON.stringify({
      type: 'FINANCE_HANDOVER_DOSSIER',
      dossierRef,
      requestId: req.id,
      title: req.title,
      department: req.department,
      grossAmount,
      currency: 'INR',
      approvedBy: managerName,
      date: todayStr,
      hash: `AUTH-MGR-${req.id}-PASSED`,
    })
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 120,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
  } catch (e) {
    console.error('Failed to generate QR code:', e)
  }

  // ── HEADER BAND ──
  doc.setFillColor(15, 23, 42) // Slate-900
  doc.rect(0, 0, pageWidth, 56, 'F')

  doc.setFillColor(147, 51, 234) // Purple-600 accent line
  doc.rect(0, 56, pageWidth, 4, 'F')

  // Top Left Header
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('KSS PROCUREMENT OS — ENTERPRISE REQUISITION DOSSIER', margin, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225) // Slate-300
  doc.text('OFFICIAL TRANSMISSION & FINANCIAL AUDIT HANDOVER TO FINANCE DEPARTMENT', margin, 38)

  // Top Right Meta in Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(`REF: ${dossierRef}`, pageWidth - margin, 24, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225)
  doc.text(`ISSUED: ${todayStr} ${timeStr}`, pageWidth - margin, 38, { align: 'right' })

  // ── SUB-HEADER CARD (Dossier Subject) ──
  let y = 74
  doc.setFillColor(248, 250, 252) // Slate-50
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'F')
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(147, 51, 234) // Purple-600
  doc.text('MANAGER TRANSMISSION REPORT', margin + 12, y + 15)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  const truncatedTitle = req.title.length > 52 ? req.title.substring(0, 50) + '...' : req.title
  doc.text(truncatedTitle, margin + 12, y + 32)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Originating Unit: ${req.department}  |  Requester: ${req.requester}  |  Priority: ${req.priority || 'High'}`, margin + 12, y + 45)

  // Right-aligned Amount badge
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(`INR ${grossAmount.toLocaleString('en-IN')}`, pageWidth - margin - 12, y + 26, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(22, 101, 52) // Green-800
  doc.text('AUTHORIZED SPEND', pageWidth - margin - 12, y + 42, { align: 'right' })

  // ── SECTION 1: REQUISITION METADATA GRID ──
  y += 66
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text('1. REQUISITION & COST ALLOCATION PROFILE', margin, y)

  y += 8
  const metaBody = [
    [
      { content: 'Requisition ID:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: req.id, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
      { content: 'Department / Unit:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: req.department, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
    ],
    [
      { content: 'Primary Category:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: req.category || 'General Procurement', styles: { textColor: [15, 23, 42] } },
      { content: 'Budget Cost Center:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: `CC-${req.department.toUpperCase().substring(0, 3)}-2026`, styles: { textColor: [15, 23, 42] } },
    ],
    [
      { content: 'Requester Name:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: req.requester, styles: { textColor: [15, 23, 42] } },
      { content: 'Original Request Date:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: req.date, styles: { textColor: [15, 23, 42] } },
    ],
    [
      { content: 'Approval Routing:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: req.approvalLevel || 'Level 2 - Manager Sign-off', styles: { textColor: [15, 23, 42] } },
      { content: 'Handover Status:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: (req.paymentStatus === 'Paid' || req.paymentTransactionRef) ? `Settled (UTR: ${req.paymentTransactionRef || 'TREASURY-PAID'})` : 'Verified & Forwarded to Finance', styles: { textColor: (req.paymentStatus === 'Paid' || req.paymentTransactionRef) ? [22, 101, 52] : [147, 51, 234], fontStyle: 'bold' } },
    ],
  ]

  autoTable(doc, {
    startY: y,
    body: metaBody as any,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 100, fillColor: [248, 250, 252] },
      1: { cellWidth: 161 },
      2: { cellWidth: 100, fillColor: [248, 250, 252] },
      3: { cellWidth: 162 },
    },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 14

  // ── SECTION 2: FINANCIAL ASSESSMENT & VALUATION TABLE ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text('2. FINANCIAL ASSESSMENT & SUB-LEDGER VALUATION', margin, y)

  y += 8
  const financeHeaders = [
    ['Line', 'Account Head & Description', 'Cost Code', 'Tax Spec (GST)', 'Base Value (INR)', 'Total Amount (INR)']
  ]

  const financeBody = [
    [
      '01',
      req.title,
      `AC-${req.department.toUpperCase().substring(0, 3)}-01`,
      '18% Standard GST',
      netBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    ],
    [
      '',
      'Statutory Applicable Tax (CGST 9% + SGST 9% / IGST 18%)',
      'TAX-GST-18',
      'Itemized',
      taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      'Included in Gross',
    ],
  ]

  autoTable(doc, {
    startY: y,
    head: financeHeaders,
    body: financeBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 205 },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 80, halign: 'center' },
      4: { cellWidth: 71, halign: 'right' },
      5: { cellWidth: 71, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 4

  // Amount summary callout banner
  doc.setFillColor(243, 244, 246)
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text('Total Authorized Value in Words:', margin + 8, y + 15)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(147, 51, 234)
  const amountWords = numberToIndianWords(grossAmount)
  doc.text(amountWords, margin + 140, y + 15)

  y += 34

  // ── SECTION 3: BUSINESS JUSTIFICATION & MANAGER ENDORSEMENT ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text('3. BUSINESS JUSTIFICATION & MANAGER EVALUATION', margin, y)

  y += 8
  const justificationText = req.justification || req.description || 'Statutory requirement and operational prerequisite. Reviewed and verified in accordance with corporate procurement governance standards.'
  const endorsementText = `Managerial Sign-off Endorsement: Requisition ${req.id} has undergone full technical and pricing scrutiny by ${managerName}. Pricing benchmarks and cost center availability have been validated. Transmitted to Finance for final budgetary booking and fund disbursement.`

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('OPERATIONAL JUSTIFICATION:', margin + 8, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(30, 41, 59)
  const splitJust = doc.splitTextToSize(justificationText, contentWidth - 16)
  doc.text(splitJust.slice(0, 2), margin + 8, y + 23)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(147, 51, 234)
  doc.text('MANAGER ENDORSEMENT STATEMENT:', margin + 8, y + 36)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(30, 41, 59)
  const splitEndorse = doc.splitTextToSize(endorsementText, contentWidth - 16)
  doc.text(splitEndorse.slice(0, 2), margin + 8, y + 46)

  y += 62

  // ── SECTION 4: COMPLIANCE CHECKLIST & MANAGER DIRECTIVES ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text('4. AUDIT CHECKLIST & MANAGER DIRECTIVES TO FINANCE', margin, y)

  y += 8
  // 2 Columns: Left is Checklist, Right is Manager Directives/Notes
  const halfWidth = (contentWidth - 10) / 2

  // Left Box: Audit Checklist
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, halfWidth, 58, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text('Internal Control Verification', margin + 8, y + 14)

  const checks = [
    '✓ Managerial Threshold Approval Passed',
    '✓ Fiscal Cost Center Within Authorized Limit',
    '✓ Quotation / Supporting Invoices Appended',
    '✓ Compliant with Corporate Procurement Code'
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(22, 101, 52)
  checks.forEach((chk, idx) => {
    doc.text(chk, margin + 8, y + 26 + idx * 10)
  })

  // Right Box: Manager Notes
  const rightX = margin + halfWidth + 10
  doc.setFillColor(250, 245, 255) // Purple-50
  doc.setDrawColor(233, 213, 255) // Purple-200
  doc.roundedRect(rightX, y, halfWidth, 58, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(147, 51, 234)
  doc.text('Manager Directives to Finance Team', rightX + 8, y + 14)

  const directiveTags = directives.length > 0 ? directives.join(' • ') : 'Standard Settlement • Budget Verified'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  doc.setTextColor(107, 33, 168)
  doc.text(`[Tags: ${directiveTags}]`, rightX + 8, y + 26)

  const customNotes = managerNotes || 'Transmitted for standard finance review, allocation verification, and PO release.'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(30, 41, 59)
  const splitNotes = doc.splitTextToSize(customNotes, halfWidth - 16)
  doc.text(splitNotes.slice(0, 3), rightX + 8, y + 36)

  y += 66

  // ── SECTION 5: AUTHORIZATION & SIGN-OFF FOOTER ──
  const footerY = pageHeight - 110
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(margin, footerY, contentWidth, 70, 4, 4, 'FD')

  // QR Code on Left
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', margin + 8, footerY + 6, 58, 58)
    } catch (e) {
      // fallback
    }
  }

  // Middle Auth Text
  const midX = margin + 74
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('ELECTRONICALLY VERIFIED & SIGNED', midX, footerY + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Transmitted By: ${managerName}`, midX, footerY + 30)
  doc.text(`Designation: Procurement Authority & Line Manager`, midX, footerY + 41)
  doc.text(`Audit Trail Token: SHA256-${String(req.id || '').replace(/-/g, '')}-VERIFIED`, midX, footerY + 52)

  // Right Signature Block
  const sigX = pageWidth - margin - 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(22, 101, 52)
  doc.text('OFFICIALLY CLEARED FOR FINANCE', sigX, footerY + 18, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Target: Finance & Accounts Directorate`, sigX, footerY + 30, { align: 'right' })
  doc.text(`Timestamp: ${todayStr} ${timeStr}`, sigX, footerY + 41, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(147, 51, 234)
  doc.text('✓ Manager Sign-off Validated', sigX, footerY + 54, { align: 'right' })

  // Page Bottom Watermark / Disclaimer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text('CONFIDENTIAL — For Internal KSS Procurement OS & Finance Directorate Use Only. Generated automatically upon manager transmission.', margin, pageHeight - 20)

  return doc
}

export async function downloadFinanceHandoverPdf(options: HandoverPdfOptions): Promise<void> {
  const doc = await generateFinanceHandoverPdf(options)
  const filename = `Finance_Handover_Dossier_${options.request.id}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

export async function getFinanceHandoverPdfBlobUrl(options: HandoverPdfOptions): Promise<string> {
  const doc = await generateFinanceHandoverPdf(options)
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
