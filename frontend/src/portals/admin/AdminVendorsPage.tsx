import React, { useState } from 'react'
import { PlusCircle, Truck, ShieldCheck, Award, FileText } from 'lucide-react'

export const AdminVendorsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'list' | 'approval' | 'risk' | 'performance' | 'docs'>('list')
  const [showAddModal, setShowAddModal] = useState(false)
  const [vendors, setVendors] = useState([
    { id: 'VND-HW-001', name: 'Dell Technologies', category: 'IT Hardware', risk: 'Low', score: '95.5%', status: 'Active' },
    { id: 'VND-SW-001', name: 'Amazon Web Services', category: 'SaaS & Cloud', risk: 'Low', score: '98.0%', status: 'Active' },
  ])

  const [newVendor, setNewVendor] = useState({ name: '', category: 'IT Hardware', contactPerson: '', email: '' })

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault()
    const newId = `VND-${newVendor.category.substring(0, 2).toUpperCase()}-00${vendors.length + 1}`
    setVendors([...vendors, { id: newId, name: newVendor.name, category: newVendor.category, risk: 'Low', score: '90.0%', status: 'Active' }])
    setShowAddModal(false)
    setNewVendor({ name: '', category: 'IT Hardware', contactPerson: '', email: '' })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-blue-600" /> Vendor Management
          </h1>
          <p className="text-xs text-gray-500">Manage vendor master database, risk ratings, performance scores & onboarding.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-2"
        >
          <PlusCircle size={16} /> Add Vendor
        </button>
      </div>

      {/* 5 Sub-Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'list', label: 'Vendor List' },
          { id: 'approval', label: 'Vendor Approval' },
          { id: 'risk', label: 'Vendor Risk' },
          { id: 'performance', label: 'Vendor Performance' },
          { id: 'docs', label: 'Vendor Documents' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Unique Vendor ID</th>
              <th className="p-4">Vendor Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Risk Rating</th>
              <th className="p-4">Performance Score</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {vendors.map((v) => (
              <tr key={v.id}>
                <td className="p-4 font-bold text-blue-600">{v.id}</td>
                <td className="p-4 font-bold text-gray-900">{v.name}</td>
                <td className="p-4 text-gray-600">{v.category}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 font-bold rounded text-[10px]">{v.risk}</span>
                </td>
                <td className="p-4 font-bold text-gray-900">{v.score}</td>
                <td className="p-4 font-bold text-green-600">{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-bold text-gray-900 mb-4">Add New Vendor & Assign Unique ID</h2>
            <form onSubmit={handleAddVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Vendor Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Systems"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category *</label>
                <select
                  value={newVendor.category}
                  onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
                >
                  <option value="IT Hardware">IT Hardware</option>
                  <option value="SaaS & Cloud">SaaS & Cloud</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Office Technology">Office Technology</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={newVendor.contactPerson}
                  onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-semibold text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow">
                  Create Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
