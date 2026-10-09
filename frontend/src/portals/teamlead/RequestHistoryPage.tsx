import React, { useState } from 'react'
import { History, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useProcurement } from '../../context/ProcurementContext'
import { formatDate } from '../../utils/formatDate'

export const RequestHistoryPage: React.FC = () => {
  const { requests } = useProcurement()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [dateRangeOption, setDateRangeOption] = useState('All')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Sorting
  const [sortField, setSortField] = useState<'cost' | 'date' | 'id'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const handleSort = (field: 'cost' | 'date') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const computeDaysInStage = (dateStr: string) => {
    const created = new Date(dateStr)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - created.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays} day(s)`
  }

  const historyRequests = requests.filter(
    (item) => item.status !== 'Draft' && String((item as any).raw_status || '').toUpperCase() !== 'DRAFT'
  )

  const filtered = historyRequests.filter((item) => {
    const itemSt = (item.status || '').toLowerCase().trim()
    const filterSt = (filterStatus || '').toLowerCase().trim()
    const matchesStatus =
      filterStatus === 'All' ||
      itemSt === filterSt ||
      (filterSt === 'rejected' && (itemSt === 'rejected' || itemSt.includes('reject')))

    const matchesCategory = filterCategory === 'All' || item.category === filterCategory
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase())

    let matchesDate = true
    const itemDate = new Date(item.date)
    const now = new Date()

    if (dateRangeOption === '30') {
      const past30 = new Date(now.setDate(now.getDate() - 30))
      matchesDate = itemDate >= past30
    } else if (dateRangeOption === '90') {
      const past90 = new Date(now.setDate(now.getDate() - 90))
      matchesDate = itemDate >= past90
    } else if (dateRangeOption === 'custom') {
      if (customStartDate) matchesDate = matchesDate && itemDate >= new Date(customStartDate)
      if (customEndDate) matchesDate = matchesDate && itemDate <= new Date(customEndDate)
    }

    return matchesStatus && matchesCategory && matchesSearch && matchesDate
  })

  // Sorting logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'cost') {
      const valA = a.estimatedCost || 0
      const valB = b.estimatedCost || 0
      return sortOrder === 'asc' ? valA - valB : valB - valA
    } else {
      const valA = new Date(a.date).getTime()
      const valB = new Date(b.date).getTime()
      return sortOrder === 'asc' ? valA - valB : valB - valA
    }
  })

  // Pagination calculations
  const totalPages = Math.ceil(sorted.length / pageSize) || 1
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Request ID', 'Title', 'Category', 'Estimated Cost (INR)', 'Date', 'Status', 'Days in Stage']
    const rows = sorted.map((r) => [
      r.id,
      `"${r.title.replace(/"/g, '""')}"`,
      r.category,
      r.estimatedCost,
      r.date,
      r.status,
      computeDaysInStage(r.date),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `procurement_history_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 36

      // Header Brand Bar
      doc.setFillColor(15, 23, 42) // #0f172a
      doc.rect(0, 0, pageWidth, 56, 'F')
      doc.setFillColor(37, 99, 235) // #2563eb
      doc.rect(0, 56, pageWidth, 4, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('KSS PROCUREMENT OS — REQUEST HISTORY & AUDIT LOG', margin, 26)

      const totalVal = sorted.reduce((sum, r) => sum + (Number(r.estimatedCost) || 0), 0)
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(203, 213, 225)
      doc.text(`TOTAL RECORDS: ${sorted.length}  |  TOTAL VALUE: INR ${totalVal.toLocaleString('en-IN')}`, margin, 42)

      doc.setFont('helvetica', 'bold')
      doc.text(`GENERATED: ${dateStr} ${timeStr}`, pageWidth - margin, 26, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.text('PORTAL: TEAM LEAD', pageWidth - margin, 42, { align: 'right' })

      // Data Rows for AutoTable
      const tableHeaders = [['REQ ID', 'TITLE / SPECIFICATION', 'CATEGORY', 'EST. COST (INR)', 'SUBMITTED DATE', 'DAYS IN STAGE', 'STATUS']]
      const tableData = sorted.map((r) => [
        r.id || '—',
        r.title || '—',
        r.category || 'General',
        `INR ${(Number(r.estimatedCost) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        formatDate(r.date) || r.date || '—',
        computeDaysInStage(r.date),
        (r.status || 'Pending').toUpperCase(),
      ])

      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 75,
        margin: { left: margin, right: margin, bottom: 40 },
        theme: 'striped',
        styles: {
          fontSize: 8.5,
          cellPadding: 6,
          textColor: [30, 41, 59],
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 90, fontStyle: 'bold', textColor: [37, 99, 235] },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 115 },
          3: { cellWidth: 100, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 85, halign: 'center' },
          5: { cellWidth: 75, halign: 'center' },
          6: { cellWidth: 85, halign: 'center', fontStyle: 'bold' },
        },
        didDrawPage: () => {
          const pageCount = (doc.internal as any).getNumberOfPages()
          const currentPageNum = (doc as any).internal.getCurrentPageInfo().pageNumber
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(148, 163, 184)
          doc.text(
            'KSS Procurement OS — Official Request Audit Log  |  Confidential & Proprietary',
            margin,
            doc.internal.pageSize.getHeight() - 18
          )
          doc.text(
            `Page ${currentPageNum} of ${pageCount}`,
            pageWidth - margin,
            doc.internal.pageSize.getHeight() - 18,
            { align: 'right' }
          )
        },
      })

      doc.save(`Request_History_Audit_Log_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Failed to generate Request History PDF:', err)
      handleExportCSV()
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="text-blue-600" /> Request History & Audit Log
          </h1>
          <p className="text-xs text-gray-500">Full audit trail and historical record of all past procurement requests.</p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold border border-rose-200 shadow-xs transition-colors cursor-pointer"
          >
            <FileText size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border rounded-lg bg-gray-50 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400 flex-shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs font-semibold p-2 border rounded-lg bg-gray-50 border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="In Procurement">In Procurement</option>
              <option value="Completed">Completed</option>
              <option value="Returned">Returned</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs font-semibold p-2 border rounded-lg bg-gray-50 border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="IT Hardware">IT Hardware</option>
              <option value="Software & SaaS">Software & SaaS</option>
              <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="IT Services">IT Services</option>
              <option value="Office Accessories">Office Accessories</option>
              <option value="Office Technology">Office Technology</option>
              <option value="Networking & Telecom">Networking & Telecom</option>
              <option value="Training & Certifications">Training & Certifications</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRangeOption}
              onChange={(e) => setDateRangeOption(e.target.value)}
              className="w-full text-xs font-semibold p-2 border rounded-lg bg-gray-50 border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="All">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {dateRangeOption === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t text-xs">
            <span className="font-semibold text-gray-600">Custom Dates:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="p-1.5 border rounded-lg bg-gray-50 border-gray-300 text-xs"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="p-1.5 border rounded-lg bg-gray-50 border-gray-300 text-xs"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4">Request ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Category</th>
              {/* Clickable Sortable Cost Column */}
              <th
                onClick={() => handleSort('cost')}
                className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Cost (USD)</span>
                  <ArrowUpDown size={13} className="text-gray-400" />
                </div>
              </th>
              {/* Clickable Sortable Date Column */}
              <th
                onClick={() => handleSort('date')}
                className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  <ArrowUpDown size={13} className="text-gray-400" />
                </div>
              </th>
              <th className="p-4">Days in Stage</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                  No request history records match your search criteria.
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-bold text-blue-600">{row.id}</td>
                  <td className="p-4 font-semibold text-gray-900">{row.title}</td>
                  <td className="p-4 text-gray-600">{row.category}</td>
                  <td className="p-4 font-bold text-gray-900">
                    ${(row.estimatedCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-gray-500">{formatDate(row.date)}</td>
                  <td className="p-4 text-gray-600 font-semibold">{computeDaysInStage(row.date)}</td>
                  <td className="p-4">
                    {/* Clickable Status Badge to set filter */}
                    <button
                      onClick={() => setFilterStatus(row.status)}
                      title={`Filter by ${row.status}`}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 cursor-pointer ${
                        row.status === 'Completed'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : row.status === 'Rejected'
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : row.status === 'Returned'
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : row.status === 'In Procurement'
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {row.status}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, sorted.length)}</strong> of <strong>{sorted.length}</strong> records
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 border rounded-lg bg-white disabled:opacity-40 hover:bg-gray-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 border rounded-lg bg-white disabled:opacity-40 hover:bg-gray-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
