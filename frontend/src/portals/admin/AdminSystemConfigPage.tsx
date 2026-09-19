import React, { useState } from 'react'
import { Users, ShieldAlert, Building, Sliders, Save, CheckCircle } from 'lucide-react'

export const AdminSystemConfigPage: React.FC = () => {
  const [tab, setTab] = useState<'users' | 'roles' | 'departments' | 'workflows'>('roles')
  const [saved, setSaved] = useState(false)

  const [limits, setLimits] = useState({
    managerLimit: 50000,
    financeLimit: 250000,
    adminLimit: 1000000,
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Configuration & Governance</h1>
        <p className="text-xs text-gray-500">Only Admin can edit budget limits, escalation thresholds, and approval workflows.</p>
      </div>

      {saved && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-xs flex items-center gap-2 border border-green-200">
          <CheckCircle size={16} />
          <span>Governance limits and workflow configuration updated successfully!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'users', label: 'Users Directory', icon: Users },
          { id: 'roles', label: 'Roles & Budget Limits', icon: ShieldAlert },
          { id: 'departments', label: 'Departments', icon: Building },
          { id: 'workflows', label: 'Approval Workflows', icon: Sliders },
        ].map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                tab === t.id
                  ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm text-xs">
        {tab === 'roles' && (
          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Configure Approval Budget Thresholds</h2>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Manager Max Approval Limit ($) *</label>
              <input
                type="number"
                value={limits.managerLimit}
                onChange={(e) => setLimits({ ...limits, managerLimit: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold"
              />
              <p className="text-[11px] text-gray-400 mt-1">Requests above this amount require "Recommend to Finance".</p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Finance Max Approval Limit ($) *</label>
              <input
                type="number"
                value={limits.financeLimit}
                onChange={(e) => setLimits({ ...limits, financeLimit: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold"
              />
              <p className="text-[11px] text-gray-400 mt-1">Requests above this amount require "Recommend to Admin".</p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Admin Approval Threshold ($) *</label>
              <input
                type="number"
                value={limits.adminLimit}
                onChange={(e) => setLimits({ ...limits, adminLimit: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold"
              />
            </div>

            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-lg shadow flex items-center gap-2"
            >
              <Save size={16} /> Save Governance Limits
            </button>
          </form>
        )}

        {tab === 'users' && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-2">System Users</h2>
            <p className="text-gray-500">5 active accounts configured across Team Lead, Manager, Finance, Admin, and Vendor roles.</p>
          </div>
        )}

        {tab === 'departments' && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-2">Configured Departments</h2>
            <p className="text-gray-500">IT & Infrastructure (IT), Finance & Accounts (FIN), Operations (OPS).</p>
          </div>
        )}

        {tab === 'workflows' && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-2">Multi-Level Stepper Workflow Rules</h2>
            <p className="text-gray-500">Active Stepper: Create Request → Manager Approval → Finance Approval → Admin Approval → RFQ Sent → Vendor Quotes Received → Delivery → Invoice → Verification and Order Complete → Payment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
