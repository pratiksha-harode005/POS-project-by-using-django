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
  quantityLabel: string
  extraFieldKey?: string
  extraFieldLabel?: string
  extraFieldOptions?: string[]
  hideDeliveryLocation?: boolean
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  'Software & SaaS': {
    quantityLabel: 'Number of seats / licenses',
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
    const config = CATEGORY_CONFIGS[initialCat]
    const initialExtra: Record<string, string> = {}
    if (config?.extraFieldKey && config?.extraFieldOptions) {
      initialExtra[config.extraFieldKey] = config.extraFieldOptions[0]
    }

    return {
      title: '',
      category: initialCat,
      subcategory: initialSubcat,
      subscriptionServiceName: '', // Tool/service name for SaaS & Cloud
      description: '',
      quantity: 1 as number | '',
      estimatedCost: '' as number | '',
      requiredBy: '',
      department: profile.department || 'IT & Infrastructure',
      deliveryLocation: profile.workLocation || 'Pune HQ, 4th Floor',
      priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
      preferredVendor: '',
      justification: '',
      attachment: null as File | null,
      extraFields: initialExtra,
    }
  })

  const isCostRequired = false
  const isSaaSOrCloud =
    formData.category === 'Software & SaaS' ||
    formData.category === 'Cloud & Infrastructure' ||
    formData.category === 'SaaS & Cloud'

  const availableVendors = VENDORS_BY_CATEGORY[formData.category] || []

  const categoryConfig = CATEGORY_CONFIGS[formData.category] || { quantityLabel: 'Quantity' }

  const handleCategoryChange = (newCat: string) => {
    const newConfig = CATEGORY_CONFIGS[newCat]
    const defaultExtra: Record<string, string> = {}
    if (newConfig?.extraFieldKey && newConfig?.extraFieldOptions) {
      defaultExtra[newConfig.extraFieldKey] = newConfig.extraFieldOptions[0]
    }
    const subcatList = SUBCATEGORIES_BY_CATEGORY[newCat]
    const defaultSubcat = subcatList ? subcatList[0] : ''
    setFormData({
      ...formData,
      category: newCat,
      subcategory: defaultSubcat,
      preferredVendor: '',
      extraFields: defaultExtra,
    })
  }

  const handleExtraFieldChange = (key: string, val: string) => {
    setFormData({
      ...formData,
      extraFields: { ...formData.extraFields, [key]: val },
    })
  }

  const costNumber = Number(formData.estimatedCost) || 0
  const quantityNumber = typeof formData.quantity === 'number' ? formData.quantity : parseInt(String(formData.quantity), 10) || 1

  const handleFormSubmit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault()

    // Rule #5: Subscription/Service Needed is required for SaaS/Cloud
    if (!isDraft && isSaaSOrCloud && !formData.subscriptionServiceName.trim()) {
      alert("Please specify the 'Subscription/Service Needed' tool name (e.g. Figma Enterprise, AWS).")
      return
    }

    // Rule #7: On submit, request moves to Manager's pending queue in real time (status=Pending, stage=1)
    addRequest({
      title: formData.title,
      category: formData.category,
      subcategory: isSaaSOrCloud
        ? formData.subscriptionServiceName
        : formData.subcategory,
      description: formData.description,
      quantity: quantityNumber,
      estimatedCost: costNumber,
      requiredBy: formData.requiredBy,
      department: formData.department,
      deliveryLocation: formData.deliveryLocation,
      priority: formData.priority,
      preferredVendor: formData.preferredVendor,
      justification: formData.justification,
      attachmentName: formData.attachment?.name,
      attachmentCount: formData.attachment ? 1 : 0,
      status: isDraft ? 'Draft' : 'Pending',
      currentStage: isDraft ? 0 : 1,
      flowType: isSaaSOrCloud ? 'B' : 'A',
      extraFields: {
        ...formData.extraFields,
        ...(formData.subscriptionServiceName
          ? { subscriptionServiceName: formData.subscriptionServiceName }
          : {}),
      },
    })

    setSubmittedStatus(isDraft ? 'Draft' : 'Pending')
    setSubmitted(true)
    setTimeout(() => {
      navigate('/portal/team_lead/my-requests')
    }, 1200)
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
                Category Detail: {categoryConfig.extraFieldLabel} *
              </label>
              <select
                value={formData.extraFields[categoryConfig.extraFieldKey] || categoryConfig.extraFieldOptions[0]}
                onChange={(e) => handleExtraFieldChange(categoryConfig.extraFieldKey!, e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-white border-blue-200 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {categoryConfig.extraFieldOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
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

          {/* 5, Cost & Required By */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                5. {categoryConfig.quantityLabel} *
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

            {/* Estimated Cost - Optional */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Estimated Cost (USD) (Optional)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Optional estimate e.g. 5000.00"
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
                Optional estimated budget/cost.
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">6. Required By (Date) *</label>
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
              <label className="block font-bold text-gray-700 mb-1">7. Department *</label>
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
                {isSaaSOrCloud ? '8. Preferred Provider (Optional)' : '8. Preferred Vendor (Optional)'}
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

          {/* 9 & 10. Delivery Location & Priority (driven by categoryConfig.hideDeliveryLocation) */}
          <div className={categoryConfig.hideDeliveryLocation ? 'block' : 'grid grid-cols-2 gap-4'}>
            {!categoryConfig.hideDeliveryLocation && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">9. Delivery Location *</label>
                <input
                  type="text"
                  required={!categoryConfig.hideDeliveryLocation}
                  value={formData.deliveryLocation}
                  onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {categoryConfig.hideDeliveryLocation ? '9. Priority *' : '10. Priority *'}
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

          {/* 11. Business Justification */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-gray-700">11. Reason / Business Justification *</label>
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
              onClick={(e) => handleFormSubmit(e as any, true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs px-5 py-2.5 rounded-lg border border-gray-300 flex items-center gap-1.5 transition-colors"
            >
              <Save size={15} /> Save as Draft
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-md flex items-center gap-1.5 transition-all"
            >
              <PlusCircle size={15} /> Submit Request for Approval
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
