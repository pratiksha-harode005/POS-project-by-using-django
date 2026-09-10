import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Upload, CheckCircle } from 'lucide-react'

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    category: 'IT Hardware',
    subcategory: 'Laptops',
    description: '',
    quantity: 1,
    requiredBy: '',
    department: 'IT & Infrastructure',
    deliveryLocation: 'Pune HQ, 4th Floor',
    priority: 'Medium',
    preferredVendor: '',
    justification: '',
    attachment: null as File | null,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      navigate('/portal/team_lead/my-requests')
    }, 1500)
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
        <div className="p-8 text-center bg-green-50 rounded-xl border border-green-200 text-green-800">
          <CheckCircle className="mx-auto text-green-600 mb-3" size={40} />
          <h2 className="text-lg font-bold">Request Created Successfully!</h2>
          <p className="text-xs mt-1 text-green-700">Redirecting to My Requests...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Request Title */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">1. Request Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Developer Laptops Upgrade"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
            />
          </div>

          {/* 2 & 3. Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">2. Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              >
                <option value="IT Hardware">IT Hardware</option>
                <option value="SaaS & Cloud">SaaS & Cloud</option>
                <option value="Furniture">Furniture</option>
                <option value="Office Technology">Office Technology</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">3. Subcategory *</label>
              <input
                type="text"
                required
                placeholder="e.g. Laptops, Servers, Monitors"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              />
            </div>
          </div>

          {/* 4. Description */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">4. Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Detailed specifications or requirement details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium resize-none"
            />
          </div>

          {/* 5 & 6. Quantity & Required By */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">5. Quantity *</label>
              <input
                type="number"
                min={1}
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">6. Required By (Date) *</label>
              <input
                type="date"
                required
                value={formData.requiredBy}
                onChange={(e) => setFormData({ ...formData, requiredBy: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              />
            </div>
          </div>

          {/* 7 & 8. Department & Delivery Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">7. Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              >
                <option value="IT & Infrastructure">IT & Infrastructure</option>
                <option value="Finance & Accounts">Finance & Accounts</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">8. Delivery Location *</label>
              <input
                type="text"
                required
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              />
            </div>
          </div>

          {/* 9 & 10. Priority & Preferred Vendor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">9. Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">10. Preferred Vendor (Optional Dropdown)</label>
              <select
                value={formData.preferredVendor}
                onChange={(e) => setFormData({ ...formData, preferredVendor: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
              >
                <option value="">-- Select Preferred Vendor --</option>
                <option value="Dell Technologies">Dell Technologies</option>
                <option value="Amazon Web Services">Amazon Web Services</option>
                <option value="HP Enterprise">HP Enterprise</option>
              </select>
            </div>
          </div>

          {/* 11. Business Justification */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">11. Reason / Business Justification *</label>
            <textarea
              required
              rows={3}
              placeholder="Why is this purchase required?"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium resize-none"
            />
          </div>

          {/* 12. Attachments */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">12. Attachments (File Upload)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50">
              <Upload className="mx-auto text-gray-400 mb-1" size={24} />
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => setFormData({ ...formData, attachment: e.target.files?.[0] || null })}
              />
              <label htmlFor="file-upload" className="text-xs text-blue-600 font-bold cursor-pointer hover:underline">
                Upload File or Drag & Drop
              </label>
              {formData.attachment && (
                <p className="text-[11px] text-gray-600 font-semibold mt-1">
                  Selected: {formData.attachment.name}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-md"
            >
              Submit Request for Approval
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
