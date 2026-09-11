import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { User, Briefcase, PhoneCall, ShieldCheck, Key, CreditCard, Save, CheckCircle } from 'lucide-react'

export const SharedProfilePage: React.FC = () => {
  const { user, role } = useAuth()
  const [activeTab, setActiveTab] = useState<
    'personal' | 'work' | 'contact' | 'security' | 'account' | 'payments'
  >('personal')

  const [formData, setFormData] = useState({
    firstName: user?.first_name || 'Alex',
    lastName: user?.last_name || 'User',
    email: user?.email || 'user@procurementos.com',
    phone: user?.phone || '+91 98765 43210',
    workLocation: user?.work_location || 'Pune HQ',
    jobTitle: user?.job_title || 'Procurement Specialist',
  })

  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const isTeamLead = role === 'TEAM_LEAD'
  const paymentsTabLabel = isTeamLead ? 'Payment Received' : 'Payments Processed'

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'work', label: 'Work Information', icon: Briefcase },
    { id: 'contact', label: 'Contact Info', icon: PhoneCall },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'account', label: 'Account Details', icon: Key },
    { id: 'payments', label: paymentsTabLabel, icon: CreditCard },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
        <p className="text-xs text-gray-500">
          Manage your personal settings, security credentials, and role account details.
        </p>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-xs flex items-center gap-2 border border-green-200">
          <CheckCircle size={16} />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
          {formData.firstName[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">
            {formData.firstName} {formData.lastName}
          </h2>
          <p className="text-xs text-gray-500">{formData.jobTitle} • {role?.replace('_', ' ')}</p>
          <p className="text-xs text-gray-400 mt-1">{formData.email}</p>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            {role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto bg-white rounded-t-xl px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSave}>
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
            </div>
          )}

          {activeTab === 'work' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Work Location</label>
                <input
                  type="text"
                  value={formData.workLocation}
                  onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <p className="text-[11px] text-gray-400">Two-factor authentication (2FA) is enabled for your account.</p>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-600">Role Identifier</span>
                <span className="font-bold text-gray-900">{role}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-600">Account ID</span>
                <span className="font-bold text-gray-900">ACC-2026-0891</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-600">Access Scope</span>
                <span className="font-bold text-blue-600">Active Role Scope</span>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{paymentsTabLabel} Overview</h4>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-500">Total Recorded Amount:</span>
                  <span className="font-bold text-gray-900">$35,000.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Last Transaction Status:</span>
                  <span className="font-bold text-green-600">Completed & Verified</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-md flex items-center gap-2"
            >
              <Save size={15} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
