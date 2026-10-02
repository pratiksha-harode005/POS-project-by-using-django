import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PlusCircle, Upload, CheckCircle, Save, Info, AlertTriangle } from 'lucide-react'
import { useProcurement } from '../../context/ProcurementContext'

export const CATEGORIES = [
  'IT Hardware',
  'Software & SaaS',
  'Cloud & Infrastructure',
  'Cybersecurity',
  'IT Services',
  'Office Accessories',
  'Office Technology',
  'Networking & Telecom',
  'Training & Certifications',
] as const

// Per-category subcategory lists (undefined = free-text for that category)
export const SUBCATEGORIES_BY_CATEGORY: Record<string, string[]> = {
  'IT Hardware':              ['Laptops', 'Desktops', 'Monitors', 'Servers', 'Storage Arrays'],
  'Office Accessories':       ['Table', 'Chair', 'Fan', 'Cable Management', 'ID Card Holders'],
  'Office Technology':        ['Printers', 'Projectors', 'Video-Conferencing Systems'],
  'Networking & Telecom':     ['Switches', 'Routers', 'Access Points', 'Fiber Circuits'],
  'Cybersecurity':            ['Endpoint Protection', 'Firewall Software', 'Identity/Access Systems'],
  'IT Services':              ['Consulting', 'System Integration'],
  // Software & SaaS and Cloud & Infrastructure keep free-text (handled separately as subscriptionServiceName)
}

export const DEPARTMENTS = [
  'IT & Infrastructure',
  'Finance & Accounts',
  'Operations',
  'HR',
  'Sales & Marketing',
  'Legal & Compliance',
  'Engineering',
  'Customer Support',
  'Administration',
] as const

const PHYSICAL_CATEGORIES = new Set([
  'IT Hardware',
  'Office Accessories',
  'Office Technology',
  'Networking & Telecom',
])

const isPhysicalCategory = (cat: string) => PHYSICAL_CATEGORIES.has(cat)

const VENDORS_BY_CATEGORY: Record<string, string[]> = {
  'IT Hardware': ['Dell Technologies', 'HP Enterprise', 'Lenovo', 'Apple Enterprise'],
  'Software & SaaS': ['Microsoft Corporation', 'Adobe Systems', 'Salesforce', 'Atlassian', 'Figma'],
  'Cloud & Infrastructure': ['Amazon Web Services', 'Microsoft Azure', 'Google Cloud Platform', 'DigitalOcean'],
  'Cybersecurity': ['Palo Alto Networks', 'CrowdStrike', 'Cloudflare', 'Fortinet'],
  'IT Services': ['Accenture', 'Infosys', 'Wipro', 'TCS'],
  'Office Accessories': ['Herman Miller Inc.', 'Steelcase', 'Haworth'],
  'Office Technology': ['Samsung Display Systems', 'Canon Inc.', 'Xerox', 'Logitech'],
  'Networking & Telecom': ['Cisco Systems', 'Juniper Networks', 'Aruba Networks', 'Verizon'],
  'Training & Certifications': ['Coursera for Business', 'Udemy for Business', 'Pluralsight'],
}

interface CategoryConfig {
  quantityLabel?: string
  hideQuantity?: boolean
  extraFieldKey?: string
  extraFieldLabel?: string
  extraFieldOptions?: string[]
  hideDeliveryLocation?: boolean
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  'Software & SaaS': {
    hideQuantity: true,
    extraFieldKey: 'renewalCycle',
    extraFieldLabel: 'Renewal Cycle',
    extraFieldOptions: ['Monthly', 'Yearly'],
    hideDeliveryLocation: true,
  },
  'Cloud & Infrastructure': {
    quantityLabel: 'Instance / Resource count',
    extraFieldKey: 'billingModel',
    extraFieldLabel: 'Billing Model',
    extraFieldOptions: ['On-Demand', 'Reserved 1-Year', 'Reserved 3-Year'],
    hideDeliveryLocation: true,
  },
  'IT Hardware': {
    quantityLabel: 'Quantity',
    extraFieldKey: 'warrantyPeriod',
    extraFieldLabel: 'Warranty Period',
    extraFieldOptions: ['1 Year', '3 Years', '5 Years'],
  },
  'Cybersecurity': {
    quantityLabel: 'Protected Endpoints / User count',
    extraFieldKey: 'licenseType',
    extraFieldLabel: 'License Type',
    extraFieldOptions: ['Standard', 'Enterprise Pro'],
  },
  'IT Services': {
    quantityLabel: 'Estimated Hours / Scope Units',
    extraFieldKey: 'engagementModel',
    extraFieldLabel: 'Engagement Model',
    extraFieldOptions: ['Time & Materials', 'Fixed Price', 'Retainer'],
  },
  'Office Accessories': {
    quantityLabel: 'Quantity',
    extraFieldKey: 'assemblyRequired',
    extraFieldLabel: 'Assembly Required',
    extraFieldOptions: ['Yes', 'No'],
  },
  'Office Technology': {
    quantityLabel: 'Quantity',
    extraFieldKey: 'maintenancePlan',
    extraFieldLabel: 'Maintenance Plan',
    extraFieldOptions: ['Standard', 'Premium'],
  },
  'Networking & Telecom': {
    quantityLabel: 'Port / Circuit count',
    extraFieldKey: 'bandwidthTier',
    extraFieldLabel: 'Bandwidth Tier',
    extraFieldOptions: ['1 Gbps', '10 Gbps', '100 Gbps'],
  },
  'Training & Certifications': {
    quantityLabel: 'Number of trainees',
    extraFieldKey: 'deliveryFormat',
    extraFieldLabel: 'Delivery Format',
    extraFieldOptions: ['Online Self-Paced', 'Instructor-Led Virtual', 'On-Site'],
  },
}

const BENCHMARK_UNIT_COSTS: Record<string, number> = {
  // IT Hardware
  'Laptops': 75000,
  'Desktops': 50000,
  'Monitors': 15000,
  'Servers': 250000,
  'Tablets & Handhelds': 30000,
  'Peripherals & Accessories': 5000,
  'Storage & Backup': 80000,
  // Software & SaaS
  'Productivity & Collaboration': 15000,
  'Developer Tools & IDEs': 25000,
  'Design & Creative Suite': 35000,
  'CRM & Sales Automation': 48500,
  'ERP & Finance Software': 120000,
  'HR & People Management': 30000,
  'Marketing Automation': 40000,
  'Analytics & BI Tools': 55000,
  'Project Management': 20000,
  'Security & Compliance Tools': 60000,
  // Cloud & Infrastructure
  'Compute Instances (VMs)': 45000,
  'Cloud Storage (S3/Blob)': 25000,
  'Managed Databases (RDS)': 65000,
  'Kubernetes & Containers': 85000,
  'Networking & CDN': 35000,
  'AI & ML Platforms': 95000,
  'Serverless & App Engines': 30000,
  'Backup & Disaster Recovery': 50000,
  // Cybersecurity
  'Endpoint Protection (EDR)': 25000,
  'Identity & Access (IAM/SSO)': 40000,
  'SIEM & Log Management': 75000,
  'Cloud Security Posture (CSPM)': 60000,
  'Network Firewalls & VPN': 80000,
  'Vulnerability Scanners': 50000,
  'Email Security': 20000,
  // IT Services
  'Custom Software Development': 150000,
  'IT Consulting & Architecture': 200000,
  'Managed IT Operations': 100000,
  'Cloud Migration Services': 180000,
  'Security Audits & Pen Testing': 120000,
  'System Integration': 140000,
  // Office Accessories
  'Ergonomic Chairs': 15000,
  'Standing Desks': 25000,
  'Monitor Arms & Risers': 4000,
  'Docking Stations': 12000,
  'Keyboards & Mice Bundles': 3500,
  'Laptop Bags & Sleeves': 2500,
  'Desk Power Hubs & Cables': 2000,
  // Office Technology
  'Conference Room Displays': 90000,
  'Video Conferencing Bars': 65000,
  'Printers & Scanners': 35000,
  'Projectors & Screens': 45000,
  'Smart Whiteboards': 85000,
  'VoIP Phones & Headsets': 8000,
  // Networking & Telecom
  'Core & Edge Switches': 65000,
  'Enterprise Wi-Fi APs': 25000,
  'Routers & Gateways': 55000,
  'Fiber & Patch Cabling': 15000,
  'Server Racks & Enclosures': 45000,
  'UPS & Power Distribution': 50000,
  // Training & Certifications
  'Cloud & DevOps Certifications': 30000,
  'Software Engineering Bootcamps': 50000,
  'Cybersecurity Certifications': 45000,
  'Project Management (PMP/Agile)': 35000,
  'Leadership & Soft Skills': 25000,
  'Data Science & AI Training': 55000,
}

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { category?: string; subcategory?: string } | null

  const { addRequest, profile } = useProcurement()
  const [submitted, setSubmitted] = useState(false)
  const [submittedStatus, setSubmittedStatus] = useState<'Pending' | 'Draft'>('Pending')

  const initialCat = routeState?.category || 'IT Hardware'
  const initialSubcatList = SUBCATEGORIES_BY_CATEGORY[routeState?.category || 'IT Hardware']
  let initialSubcat = routeState?.subcategory !== undefined ? routeState.subcategory : (initialSubcatList?.[0] ?? '')

  const [formData, setFormData] = useState(() => {
    return {
      title: '',
      category: initialCat,
      subcategory: initialSubcat,
      subscriptionServiceName: '', // Tool/service name for SaaS & Cloud
      description: '',
      quantity: '' as number | '',
      estimatedCost: '' as number | '',
      requiredBy: '',
      department: profile.department || 'IT & Infrastructure',
      deliveryLocation: profile.workLocation || 'Pune HQ, 4th Floor',
      priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
      preferredVendor: '',
      justification: '',
      attachment: null as File | null,
      extraFields: {} as Record<string, any>,
      // Software & SaaS Full Workflow Fields:
      requestType: 'Renewal' as 'Renewal' | 'Upgrade' | 'New Purchase',
      currentPlan: '',
      requiredPlan: '',
      existingCost: '' as number | '',
      businessRequirement: '',
    }
  })

  const isCostRequired = false
  const isSaaSOrCloud =
    formData.category === 'Software & SaaS' ||
    formData.category === 'Cloud & Infrastructure' ||
    formData.category === 'SaaS & Cloud'

  const availableVendors = VENDORS_BY_CATEGORY[formData.category] || []

  const categoryConfig = CATEGORY_CONFIGS[formData.category] || { quantityLabel: 'Quantity' }
  const showQuantity = !categoryConfig.hideQuantity

  const numRequiredBy = showQuantity ? 6 : 5
  const numDepartment = showQuantity ? 7 : 6
  const numVendor = showQuantity ? 8 : 7
  const numDelivery = showQuantity ? 9 : 8
  const numPriority = categoryConfig.hideDeliveryLocation
    ? (showQuantity ? 9 : 8)
    : (showQuantity ? 10 : 9)
  const numJustification = categoryConfig.hideDeliveryLocation
    ? (showQuantity ? 10 : 9)
    : (showQuantity ? 11 : 10)

  const handleCategoryChange = (newCat: string) => {
    const subcatList = SUBCATEGORIES_BY_CATEGORY[newCat]
    const defaultSubcat = subcatList ? subcatList[0] : ''
    setFormData({
      ...formData,
      category: newCat,
      subcategory: defaultSubcat,
      preferredVendor: '',
      extraFields: {},
    })
  }

  const handleExtraFieldChange = (key: string, val: string) => {
    const updated = { ...formData.extraFields }
    if (val) {
      updated[key] = val
    } else {
      delete updated[key]
    }
    setFormData({
      ...formData,
      extraFields: updated,
    })
  }

  const costNumber = Number(formData.estimatedCost) || 0
  const quantityNumber = typeof formData.quantity === 'number' ? formData.quantity : parseInt(String(formData.quantity), 10) || 1

  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = React.useRef(false)

  const handleFormSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault()

    if (submitting || isSubmittingRef.current) {
      return
    }

    // Rule #5: Subscription/Service Needed is required for SaaS/Cloud
    if (!isDraft && isSaaSOrCloud && !formData.subscriptionServiceName.trim()) {
      alert("Please specify the 'Subscription/Service Needed' tool name (e.g. Figma Enterprise, AWS).")
      return
    }

    isSubmittingRef.current = true
    setSubmitting(true)
    const existingCostNum = Number(formData.existingCost) || 0
    const effectiveCost = costNumber > 0 ? costNumber : (existingCostNum > 0 ? existingCostNum : 0)
    try {
      await addRequest({
        title: formData.title,
        category: formData.category,
        subcategory: isSaaSOrCloud
          ? formData.subscriptionServiceName
          : formData.subcategory,
        description: formData.description,
        quantity: showQuantity ? quantityNumber : 1,
        estimatedCost: effectiveCost,
        requiredBy: formData.requiredBy,
        department: formData.department,
        deliveryLocation: formData.deliveryLocation,
        priority: formData.priority,
        preferredVendor: formData.preferredVendor,
        justification: formData.justification,
        attachmentName: formData.attachment?.name,
        attachmentCount: formData.attachment ? 1 : 0,
        status: isDraft ? 'Draft' : 'Pending',
        currentStage: isDraft ? 0 : 2,
        flowType: isSaaSOrCloud ? 'B' : 'A',
        request_type: formData.requestType,
        software_name: isSaaSOrCloud ? formData.subscriptionServiceName : formData.title,
        current_plan: formData.currentPlan,
        required_plan: formData.requiredPlan,
        existing_cost: Number(formData.existingCost) || 0,
        business_requirement: formData.businessRequirement || formData.justification || formData.description,
        subscription_type: formData.extraFields?.renewalCycle === 'Yearly' ? 'Annual' : 'Monthly',
        extraFields: {
          ...formData.extraFields,
          ...(formData.subscriptionServiceName
            ? { subscriptionServiceName: formData.subscriptionServiceName }
            : {}),
          renewalCycle: formData.extraFields?.renewalCycle || (formData.category === 'Software & SaaS' ? 'Monthly' : undefined),
          subscription_type: formData.extraFields?.renewalCycle === 'Yearly' ? 'Annual' : 'Monthly',
          requestType: formData.requestType,
          purchase_type: formData.requestType,
          currentPlan: formData.currentPlan,
          requiredPlan: formData.requiredPlan,
          existingCost: formData.existingCost,
          businessRequirement: formData.businessRequirement,
        },
      })

      setSubmittedStatus(isDraft ? 'Draft' : 'Pending')
      setSubmitted(true)
      setTimeout(() => {
        navigate('/portal/team_lead/my-requests')
      }, 1000)
    } catch (err: any) {
      alert(`Failed to save request to server: ${err?.response?.data?.detail || err?.message || 'Server error'}`)
    } finally {
      setSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <PlusCircle className="text-blue-600" size={28} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Purchase Request</h1>
          <p className="text-xs text-gray-500">Fill in request details for approval & procurement workflow.</p>
        </div>
      </div>

      {submitted ? (
        <div
          className={`p-8 text-center rounded-xl border text-xs font-semibold ${
            submittedStatus === 'Draft'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          <CheckCircle
            className={`mx-auto mb-3 ${submittedStatus === 'Draft' ? 'text-amber-600' : 'text-green-600'}`}
            size={40}
          />
          <h2 className="text-lg font-bold">
            {submittedStatus === 'Draft'
              ? 'Draft Saved Successfully!'
              : 'Request Submitted to Manager for Approval!'}
          </h2>
          <p className="text-xs mt-1">
            {submittedStatus === 'Draft'
              ? 'Saved to your drafts list.'
              : 'Moved to Manager Pending Approval Queue (Stage 1/10). Redirecting...'}
          </p>
        </div>
      ) : (
        <form onSubmit={(e) => handleFormSubmit(e, false)} className="space-y-4 text-xs">
          {/* 1. Request Title */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">1. Request Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Developer Laptops Upgrade"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 2 & 3. Category & Subcategory / Subscription Needed */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category Dropdown - 12 Categories */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">2. Category *</label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Rule #5: For SaaS/Cloud categories, relabel field to "Subscription/Service Needed *" */}
            {isSaaSOrCloud ? (
              <div>
                <label className="block font-bold text-blue-900 mb-1">
                  3. Subscription/Service Needed *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Figma Enterprise, AWS Cloud, Salesforce"
                  value={formData.subscriptionServiceName}
                  onChange={(e) => setFormData({ ...formData, subscriptionServiceName: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-blue-50/50 border-blue-300 font-semibold text-xs text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            ) : SUBCATEGORIES_BY_CATEGORY[formData.category] ? (
              /* Dropdown subcategory for all categories with a defined list */
              <div>
                <label className="block font-bold text-gray-700 mb-1">3. Subcategory *</label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {SUBCATEGORIES_BY_CATEGORY[formData.category].map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* Free-text fallback for Training & Certifications and any future categories */
              <div>
                <label className="block font-bold text-gray-700 mb-1">3. Subcategory *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laptops, Servers, Monitors"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Dynamic Extra Field based on Category */}
          {categoryConfig.extraFieldKey && categoryConfig.extraFieldOptions && (
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <label className="block font-bold text-blue-900 mb-1">
                Category Detail: {categoryConfig.extraFieldLabel} (Optional)
              </label>
              <select
                value={formData.extraFields[categoryConfig.extraFieldKey] || ''}
                onChange={(e) => handleExtraFieldChange(categoryConfig.extraFieldKey!, e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-white border-blue-200 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Select {categoryConfig.extraFieldLabel} (Optional) --</option>
                {categoryConfig.extraFieldOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Software & SaaS Specifications */}
          {isSaaSOrCloud && (
            <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-xl border border-blue-200/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200/60">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Software & SaaS Requirements Specifications
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Request Type *</label>
                  <select
                    value={formData.requestType}
                    onChange={(e) => setFormData({ ...formData, requestType: e.target.value as any })}
                    className="w-full p-2 border rounded-lg bg-white border-blue-200 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Renewal">Renewal (Existing Subscription)</option>
                    <option value="Upgrade">Upgrade (Higher Tier / More Features)</option>
                    <option value="New Purchase">New Purchase / Fresh Subscription</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Existing Cost (₹) (Optional)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 45000"
                    value={formData.existingCost}
                    onChange={(e) => setFormData({ ...formData, existingCost: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded-lg bg-white border-blue-200 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Current Plan</label>
                  <input
                    type="text"
                    placeholder="e.g. Professional Plan - 50 Seats"
                    value={formData.currentPlan}
                    onChange={(e) => setFormData({ ...formData, currentPlan: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white border-blue-200 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Required Plan</label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Plan - 100 Seats with SAML SSO"
                    value={formData.requiredPlan}
                    onChange={(e) => setFormData({ ...formData, requiredPlan: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white border-blue-200 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Business Requirement & Justification</label>
                <textarea
                  rows={2}
                  placeholder="Detail the operational need, business objective, or team requirement for this software..."
                  value={formData.businessRequirement}
                  onChange={(e) => setFormData({ ...formData, businessRequirement: e.target.value })}
                  className="w-full p-2 border rounded-lg bg-white border-blue-200 font-medium text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 4. Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-gray-700">4. Description *</label>
              <span className="text-[10px] text-gray-400 font-semibold">{formData.description.length}/500</span>
            </div>
            <textarea
              required
              rows={3}
              maxLength={500}
              placeholder="Detailed specifications or requirement details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Cost & Required By (and Quantity if applicable) */}
          <div className={showQuantity ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
            {showQuantity && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  5. {categoryConfig.quantityLabel || 'Quantity'} *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Estimated Cost */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Estimated Cost (₹)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder={
                  formData.subcategory && BENCHMARK_UNIT_COSTS[formData.subcategory]
                    ? `e.g. ₹${((Number(formData.quantity) || 1) * BENCHMARK_UNIT_COSTS[formData.subcategory]).toLocaleString('en-IN')}`
                    : "e.g. 50000.00"
                }
                value={formData.estimatedCost}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedCost: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-semibold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formData.subcategory && BENCHMARK_UNIT_COSTS[formData.subcategory]
                  ? `Standard catalog: ₹${BENCHMARK_UNIT_COSTS[formData.subcategory].toLocaleString('en-IN')} / unit`
                  : 'Estimated purchase budget (INR).'}
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">{numRequiredBy}. Required By (Date) *</label>
              <input
                type="date"
                required
                value={formData.requiredBy}
                onChange={(e) => setFormData({ ...formData, requiredBy: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>



          {/* Rule #3: Expanded Department List & Rule #4: Category Filtered Preferred Vendor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">{numDepartment}. Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {isSaaSOrCloud ? `${numVendor}. Preferred Provider (Optional)` : `${numVendor}. Preferred Vendor (Optional)`}
              </label>
              <select
                value={formData.preferredVendor}
                onChange={(e) => setFormData({ ...formData, preferredVendor: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">{isSaaSOrCloud ? '-- Select Preferred Provider --' : '-- Select Preferred Vendor --'}</option>
                {availableVendors.length > 0 ? (
                  availableVendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    {isSaaSOrCloud ? `No preferred providers yet for ${formData.category}` : `No preferred vendors yet for ${formData.category}`}
                  </option>
                )}
              </select>
              {availableVendors.length === 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {isSaaSOrCloud ? 'No preferred providers yet for this category.' : 'No preferred vendors yet for this category.'}
                </p>
              )}
            </div>
          </div>

          {/* Delivery Location & Priority (driven by categoryConfig.hideDeliveryLocation) */}
          <div className={categoryConfig.hideDeliveryLocation ? 'block' : 'grid grid-cols-2 gap-4'}>


            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {numPriority}. Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent' })
                }
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Business Justification */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-gray-700">{numJustification}. Reason / Business Justification *</label>
              <span className="text-[10px] text-gray-400 font-semibold">{formData.justification.length}/500</span>
            </div>
            <textarea
              required
              rows={3}
              maxLength={500}
              placeholder="Why is this purchase required?"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleFormSubmit(e as any, true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs px-5 py-2.5 rounded-lg border border-gray-300 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={15} /> Save as Draft
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle size={15} /> {submitting ? 'Submitting...' : 'Submit Request for Approval'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
