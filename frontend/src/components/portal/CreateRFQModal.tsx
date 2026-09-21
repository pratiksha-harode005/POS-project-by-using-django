import React, { useState, useEffect, useMemo } from 'react'
import {
  X, FileSpreadsheet, Plus, Trash2, Calendar, AlertCircle,
  Building2, User, CheckCircle, Tag, Layers, CheckSquare
} from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'
import type { RFQ, RFQItem, RFQVendor } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export interface CreateRFQModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (rfq: RFQ) => void
  initialPrId?: string
}

export const CreateRFQModal: React.FC<CreateRFQModalProps> = ({ isOpen, onClose, onSuccess, initialPrId }) => {
  const { allRequests, myApprovals, vendors, addRFQ, rfqs } = useManagerData()

  // Generate next sequential RFQ ID
  const defaultRfqId = useMemo(() => {
    const count = (rfqs?.length || 0) + 31
    return `RFQ-2026-${String(count).padStart(3, '0')}`
  }, [rfqs])

  // Form State - Section A
  const [rfqNumber] = useState(defaultRfqId)
  const [title, setTitle] = useState('')
  const [rfqType, setRfqType] = useState<'Product' | 'Service' | 'Software' | 'Contract Renewal'>('Product')
  const [selectedPrId, setSelectedPrId] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [category, setCategory] = useState('Hardware')
  const [subCategory, setSubCategory] = useState('Laptops & Compute')
  const [requester, setRequester] = useState('Sarah Manager')
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High')
  const [issueDate] = useState(new Date().toISOString().split('T')[0])
  const [quotationDueDate, setQuotationDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })

  // Form State - Section B: Items
  const [items, setItems] = useState<Array<{
    id: string
    product: string
    category: string
    quantity: number
    uom: string
    expectedPrice: number
    requiredBy: string
    specification: string
  }>>([
    {
      id: 'item-1',
      product: 'MacBook Pro 16" M3 Max',
      category: 'Hardware',
      quantity: 10,
      uom: 'Units',
      expectedPrice: 245000,
      requiredBy: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      specification: 'Apple M3 Max 16-core CPU, 40-core GPU, 64GB Unified Memory, 1TB SSD, Space Black'
    }
  ])

  // Form State - Section C: Vendor Category
  const availableCategories = useMemo(() => {
    const cats = new Set(vendors.map(v => v.category).filter(Boolean))
    return Array.from(cats)
  }, [vendors])

  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')

  // Candidate PRs to link
  const availablePrs = useMemo(() => {
    const set = new Map<string, typeof allRequests[0]>()
    myApprovals.forEach(r => set.set(r.id, r))
    allRequests.forEach(r => {
      if (!set.has(r.id)) set.set(r.id, r)
    })
    return Array.from(set.values())
  }, [myApprovals, allRequests])

  // When PR is selected, auto-populate details & line item
  const handlePrChange = (prId: string) => {
    setSelectedPrId(prId)
    const found = availablePrs.find(p => p.id === prId)
    if (found) {
      setTitle(`RFQ for ${found.title}`)
      setDepartment(found.department)
      setCategory(found.category || 'Hardware')

      if (found.category && availableCategories.includes(found.category)) {
        setSelectedCategory(found.category)
      } else {
        setSelectedCategory('')
      }
      setSubCategory(found.subcategory || found.category || 'General')
      setRequester(found.requester)
      setPriority(found.priority as 'Critical' | 'High' | 'Medium' | 'Low' || 'High')

      const qty = found.quantity || 1
      const totalAmount = found.amount || 50000
      const unitPrice = qty > 0 ? Number((totalAmount / qty).toFixed(2)) : totalAmount

      // Auto populate item with exact PR quantity & unit price
      setItems([
        {
          id: `item-${Date.now()}`,
          product: found.title,
          category: found.category || 'Hardware',
          quantity: qty,
          uom: 'Units',
          expectedPrice: unitPrice,
          requiredBy: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
          specification: found.description || `Required for ${found.department} operations`
        }
      ])
    }
  }

  // Prepopulate PR on modal open
  useEffect(() => {
    if (isOpen && availablePrs.length > 0) {
      const targetPrId = initialPrId || availablePrs[0].id
      if (targetPrId) {
        handlePrChange(targetPrId)
      }
    }
  }, [isOpen, initialPrId, availablePrs.length])

  // Calculate total estimated amount
  const totalEstimatedAmount = useMemo(() => {
    return Math.round(items.reduce((sum, it) => {
      const q = typeof it.quantity === 'number' ? it.quantity : (parseFloat(String(it.quantity)) || 0)
      const p = typeof it.expectedPrice === 'number' ? it.expectedPrice : (parseFloat(String(it.expectedPrice)) || 0)
      return sum + (q * p)
    }, 0))
  }, [items])

  if (!isOpen) return null

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        product: '',
        category,
        quantity: 1,
        uom: 'Units',
        expectedPrice: 0,
        requiredBy: quotationDueDate,
        specification: ''
      }
    ])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!title.trim()) {
      setErrorMsg('RFQ Title is required.')
      return
    }

    if (!quotationDueDate || quotationDueDate <= issueDate) {
      setErrorMsg('Quotation Due Date must be set to a future date after today.')
      return
    }

    const hasInvalidItem = items.some(i => !i.product.trim() || i.quantity <= 0 || i.expectedPrice <= 0)
    if (hasInvalidItem) {
      setErrorMsg('Please ensure all line items have a valid Product Name, Quantity (>0), and Expected Price (>0).')
      return
    }

    if (!selectedCategory) {
      setErrorMsg('Please select a vendor category to invite.')
      return
    }

    const matchedVendors = vendors.filter(v => v.category === selectedCategory && v.status === 'Active')
    if (matchedVendors.length === 0) {
      setErrorMsg('No active vendors found in this category.')
      return
    }

    const rfqVendors: RFQVendor[] = matchedVendors.map(v => ({
      name: v.name,
      invitedOn: issueDate,
      response: 'Pending'
    }))

    const rfqItems: RFQItem[] = items.map(i => ({
      product: i.product,
      specification: i.specification || 'Standard enterprise technical specifications',
      quantity: i.quantity,
      expectedPrice: i.expectedPrice,
      requiredBy: i.requiredBy || quotationDueDate
    }))

    const newRfq: RFQ = {
      id: rfqNumber,
      title: title.trim(),
      department,
      status: 'sent',
      estimatedAmount: totalEstimatedAmount,
      deadline: quotationDueDate,
      createdBy: requester,
      createdDate: issueDate,
      vendors: rfqVendors,
      items: rfqItems,
      remarks: selectedPrId ? `Mapped from Approved PR: ${selectedPrId}` : 'Standalone Manager Created RFQ'
    }

    addRFQ(newRfq)
    if (onSuccess) onSuccess(newRfq)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <FileSpreadsheet size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Create Request for Quotation (RFQ)</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[11px] font-mono font-bold">
                  {rfqNumber}
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Multi-vendor sourcing workflow mapped directly to approved Purchase Requisitions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">


          {/* Section A: Basic RFQ Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-600" /> Section A: Basic RFQ Details
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Fields marked * are mandatory</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* RFQ Number (Read-only) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  RFQ Number (Auto-Generated)
                </label>
                <input
                  type="text"
                  value={rfqNumber}
                  disabled
                  className="w-full text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Related PR Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Related Purchase Request (PR)
                </label>
                <select
                  value={selectedPrId}
                  onChange={e => handlePrChange(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Standalone RFQ (No PR) --</option>
                  {availablePrs.map(pr => (
                    <option key={pr.id} value={pr.id}>
                      [{pr.id}] {pr.title} ({pr.department}) - ₹{pr.amount.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* RFQ Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  RFQ Type *
                </label>
                <select
                  value={rfqType}
                  onChange={e => setRfqType(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Product">Product (Hardware / Physical)</option>
                  <option value="Software">Software & SaaS Subscriptions</option>
                  <option value="Service">Professional & Managed Services</option>
                  <option value="Contract Renewal">Contract Renewal</option>
                </select>
              </div>

              {/* RFQ Title */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  RFQ Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Procurement of High-Performance Developer Workstations & Docking Stations"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-900"
                  required
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Sub Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sub Category
                </label>
                <input
                  type="text"
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                  placeholder="e.g., Laptops & Workstations"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Requester */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Requester / Buyer
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={requester}
                    disabled
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                >
                  <option value="Critical">🔴 Critical (Immediate)</option>
                  <option value="High">🟠 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>

              {/* Issue Date & Due Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    disabled
                    className="w-full text-xs bg-slate-100 border border-slate-300 rounded-xl px-2 py-2 text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 text-blue-700">
                    Quote Due Date *
                  </label>
                  <input
                    type="date"
                    value={quotationDueDate}
                    min={issueDate}
                    onChange={e => setQuotationDueDate(e.target.value)}
                    className="w-full text-xs border border-blue-400 rounded-xl px-2 py-2 bg-blue-50/40 text-blue-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Items & Specifications */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" /> Section B: Items & Technical Requirements
                </h3>
                <p className="text-[11px] text-slate-500">
                  Products and line specifications to be quoted by vendors.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
              >
                <Plus size={13} /> Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 bg-white border border-indigo-100 hover:border-indigo-300 rounded-xl space-y-3 relative shadow-xs transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                      <Tag size={12} className="text-indigo-600" /> Item #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Product / Service Description *
                      </label>
                      <input
                        type="text"
                        value={item.product}
                        onChange={e => handleUpdateItem(item.id, 'product', e.target.value)}
                        placeholder="e.g., MacBook Pro 16-inch M3 Max"
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Quantity & UOM *
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const val = e.target.value === '' ? '' : (parseInt(e.target.value) || '')
                            handleUpdateItem(item.id, 'quantity', val)
                          }}
                          className="w-20 text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white font-black text-right text-indigo-950 shadow-2xs"
                        />
                        <select
                          value={item.uom}
                          onChange={e => handleUpdateItem(item.id, 'uom', e.target.value)}
                          className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white font-bold text-slate-800"
                        >
                          <option value="Units">Units</option>
                          <option value="Licenses">Licenses</option>
                          <option value="Hours">Hours</option>
                          <option value="Packs">Packs</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Target Unit Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.expectedPrice}
                        onChange={e => {
                          const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || '')
                          handleUpdateItem(item.id, 'expectedPrice', val)
                        }}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-black text-right text-emerald-800 shadow-2xs"
                        required
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Technical Specifications & Compliance Requirements
                      </label>
                      <input
                        type="text"
                        value={item.specification}
                        onChange={e => handleUpdateItem(item.id, 'specification', e.target.value)}
                        placeholder="e.g., 64GB RAM, 1TB SSD, Space Black, 3 Years AppleCare+ included"
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50/50 focus:bg-white text-slate-800 font-medium"
                      />
                    </div>

                    <div className="text-right flex flex-col justify-end">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Est. Line Total</span>
                      <div className="inline-flex items-center justify-end px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-black text-sm shadow-2xs mt-0.5">
                        {fmt(Math.round((Number(item.quantity) || 0) * (Number(item.expectedPrice) || 0)))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          {/* Section C: Vendor Category Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-blue-600" /> Section C: Target Vendor Category
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select a category. This RFQ will be sent to all active vendors in that category.
                </p>
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Category *</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50/50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium transition-all"
                required
              >
                <option value="">Select a Category...</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat} ({vendors.filter(v => v.category === cat && v.status === 'Active').length} Active Vendors)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Metrics summary bar */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Items</span>
                <span className="text-base font-bold">{items.length} Products</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Vendors Invited</span>
                <span className="text-base font-bold text-blue-300">
                  {selectedCategory ? vendors.filter(v => v.category === selectedCategory && v.status === 'Active').length : 0} Qualified
                </span>
              </div>              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Submission Deadline</span>
                <span className="text-base font-bold text-amber-300">{quotationDueDate}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Estimated Budget</span>
              <span className="text-xl font-black text-emerald-400">{fmt(totalEstimatedAmount)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-2">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <CheckCircle size={15} /> Create & Send to Vendor
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
