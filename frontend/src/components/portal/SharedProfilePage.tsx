import React, { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useProcurement } from '../../context/ProcurementContext'
import { getScopedVendorData } from '../../portals/vendor/VendorPortalPages'
import {
  User,
  Briefcase,
  PhoneCall,
  ShieldCheck,
  Key,
  CreditCard,
  Save,
  CheckCircle,
  Lock,
  Camera,
  AlertCircle,
  Smartphone,
  MapPin,
  Clock,
  X,
  Pencil,
} from 'lucide-react'

export const SharedProfilePage: React.FC = () => {
  const { user, role } = useAuth()
  const { profile, updateProfile, payments } = useProcurement()
  const { vendorId } = useParams<{ vendorId?: string }>()
  const location = useLocation()

  const isVendorRoute = role === 'VENDOR' || Boolean(vendorId) || location.pathname.includes('/vendor/')
  const activeVendorId = vendorId || 'VND-HW-001'
  const scopedVendorData = isVendorRoute ? getScopedVendorData(activeVendorId) : null

  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'personal' | 'work' | 'contact' | 'security' | 'account' | 'payments'
  >('personal')

  const getInitialProfileData = () => {
    if (isVendorRoute && scopedVendorData) {
      const v = scopedVendorData.vendor
      const storedProfilesJson = localStorage.getItem('kss_vendor_profiles')
      let storedVendor = null
      if (storedProfilesJson) {
        try {
          const map = JSON.parse(storedProfilesJson)
          storedVendor = map[activeVendorId]
        } catch (e) {}
      }

      if (storedVendor) {
        return storedVendor
      }

      const nameParts = (v.contactPerson || 'Vendor Contact').split(' ')
      const firstName = nameParts[0] || 'Vendor'
      const lastName = nameParts.slice(1).join(' ') || 'Representative'

      return {
        firstName,
        lastName,
        email: v.email,
        phone: v.phone,
        workLocation: `${v.name} Corporate HQ`,
        jobTitle: `Vendor Representative (${v.name})`,
        employeeId: v.id,
        dateOfJoining: '2023-01-15',
        avatarUrl: null as string | null,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: true,
        department: v.category,
        organizationName: v.name,
      }
    }

    if (role === 'MANAGER') {
      return {
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'manager@procurementos.com',
        phone: '+91 98765 22222',
        workLocation: 'Pune HQ, Executive Floor',
        jobTitle: 'Senior Procurement Manager',
        employeeId: 'EMP-MG-1020',
        dateOfJoining: '2022-06-01',
        avatarUrl: profile.avatarUrl || null as string | null,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: profile.twoFactorEnabled ?? true,
        department: 'Management & Approvals',
        organizationName: 'Procurement OS Org',
      }
    }

    if (role === 'FINANCE') {
      return {
        firstName: 'Robert',
        lastName: 'Vance',
        email: 'finance@procurementos.com',
        phone: '+91 98765 33333',
        workLocation: 'Pune HQ, Finance Wing',
        jobTitle: 'Finance Controller',
        employeeId: 'EMP-FN-3040',
        dateOfJoining: '2021-11-15',
        avatarUrl: profile.avatarUrl || null as string | null,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: profile.twoFactorEnabled ?? true,
        department: 'Finance & Accounts',
        organizationName: 'Procurement OS Org',
      }
    }

    if (role === 'ADMIN') {
      return {
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@procurementos.com',
        phone: '+91 98765 44444',
        workLocation: 'Pune HQ, IT Ops Center',
        jobTitle: 'Lead System Admin',
        employeeId: 'EMP-AD-9000',
        dateOfJoining: '2020-01-01',
        avatarUrl: profile.avatarUrl || null as string | null,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: profile.twoFactorEnabled ?? true,
        department: 'System Administration',
        organizationName: 'Procurement OS Org',
      }
    }

    return {
      firstName: profile.firstName || 'dev',
      lastName: profile.lastName || 'Lead',
      email: profile.email || 'tl@procurementos.com',
      phone: profile.phone || '+91 98765 11111',
      workLocation: profile.workLocation || 'Pune HQ, 4th Floor',
      jobTitle: profile.jobTitle || 'Engineering Lead',
      employeeId: profile.employeeId || 'EMP-TL-8042',
      dateOfJoining: profile.dateOfJoining || '2024-03-15',
      avatarUrl: profile.avatarUrl || null as string | null,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      twoFactorEnabled: profile.twoFactorEnabled ?? true,
      department: profile.department || 'IT & Infrastructure',
      organizationName: 'Procurement OS Org',
    }
  }

  const [formData, setFormData] = useState(getInitialProfileData)

  useEffect(() => {
    setFormData(getInitialProfileData())
    setIsDirty(false)
    setIsEditing(false)
  }, [role, activeVendorId])

  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null)

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleTabChange = (targetTabId: string) => {
    if (isDirty) {
      setPendingTabSwitch(targetTabId)
    } else {
      setActiveTab(targetTabId as any)
    }
  }

  const confirmDiscardChanges = () => {
    setIsDirty(false)
    if (pendingTabSwitch) {
      setActiveTab(pendingTabSwitch as any)
      setPendingTabSwitch(null)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      handleFieldChange('avatarUrl', imageUrl)
    }
  }

  const handleCancel = () => {
    setFormData(getInitialProfileData())
    setIsDirty(false)
    setIsEditing(false)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('New password and confirm password do not match.')
      return
    }

    if (isVendorRoute) {
      const storedProfilesJson = localStorage.getItem('kss_vendor_profiles')
      let map: Record<string, any> = {}
      if (storedProfilesJson) {
        try {
          map = JSON.parse(storedProfilesJson)
        } catch (e) {}
      }
      map[activeVendorId] = { ...formData }
      localStorage.setItem('kss_vendor_profiles', JSON.stringify(map))
    } else {
      updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        workLocation: formData.workLocation,
        jobTitle: formData.jobTitle,
        employeeId: formData.employeeId,
        dateOfJoining: formData.dateOfJoining,
        avatarUrl: formData.avatarUrl,
        twoFactorEnabled: formData.twoFactorEnabled,
      })
    }

    setIsDirty(false)
    setIsEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const paymentsTabLabel = isVendorRoute ? 'Disbursements Received' : role === 'TEAM_LEAD' ? 'Payment Received' : 'Payments Processed'

  const effectivePayments = isVendorRoute && scopedVendorData
    ? scopedVendorData.payments.map((p) => ({
        id: p.id,
        requestId: p.poRef,
        title: `Payout for Invoice ${p.invoiceRef}`,
        amount: p.amount,
        dueDate: p.disbursedDate,
        status: p.status,
      }))
    : payments

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'work', label: 'Work Information', icon: Briefcase },
    { id: 'contact', label: 'Contact Info', icon: PhoneCall },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'account', label: 'Account Details', icon: Key },
    { id: 'payments', label: paymentsTabLabel, icon: CreditCard },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
        <p className="text-xs text-gray-500">
          Manage your personal settings, security credentials, and role account details.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-green-50 text-green-800 rounded-xl text-xs flex items-center gap-2 border border-green-200 shadow-xs">
          <CheckCircle size={18} className="text-green-600" />
          <span className="font-bold">Profile changes saved successfully!</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-6">
        {/* Avatar Circle with Upload Trigger */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-md overflow-hidden border-2 border-blue-100">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
            ) : (
              formData.firstName[0]
            )}
          </div>
          {isEditing && (
            <>
              <label
                htmlFor="avatar-input"
                className="absolute bottom-0 right-0 p-1.5 bg-gray-900 text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors shadow"
                title="Upload Profile Photo"
              >
                <Camera size={14} />
              </label>
              <input
                type="file"
                id="avatar-input"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">
            {formData.firstName} {formData.lastName}
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            {formData.jobTitle} • {isVendorRoute ? 'Vendor ID' : 'ID'}: <strong className="text-gray-800">{formData.employeeId}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-1">{formData.email}</p>
        </div>

        <div className="text-right">
          <span className="px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            {isVendorRoute ? `${formData.department || 'Vendor'}` : role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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

      {/* Tab Form Contents */}
      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSave}>
          {/* TAB 1: Personal Information */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isVendorRoute ? 'Vendor Account ID *' : 'Employee ID *'}
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.employeeId}
                  onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold text-gray-800 disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isVendorRoute ? 'Date of Registration *' : 'Date of Joining *'}
                </label>
                <input
                  type="date"
                  required
                  disabled={!isEditing}
                  value={formData.dateOfJoining}
                  onChange={(e) => handleFieldChange('dateOfJoining', e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Work Information (Locked Department & Role) */}
          {activeTab === 'work' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isVendorRoute ? 'Contact Role / Title *' : 'Job Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.jobTitle}
                    onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isVendorRoute ? 'Business HQ Location *' : 'Work Location *'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.workLocation}
                    onChange={(e) => handleFieldChange('workLocation', e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Locked Fields */}
              <div className="p-4 bg-gray-100/70 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center gap-1.5 text-gray-600 font-bold text-xs">
                  <Lock size={14} className="text-gray-500" />
                  <span>Administrative Role & Category Lock</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-500 mb-1">
                      {isVendorRoute ? 'Vendor Category (Read-Only)' : 'Department (Read-Only)'}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.department || 'IT & Infrastructure'}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-200 border-gray-300 font-bold text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Portal Role (Read-Only)</label>
                    <input
                      type="text"
                      disabled
                      value={isVendorRoute ? 'VENDOR' : (role || 'TEAM_LEAD')}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-200 border-gray-300 font-bold text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 italic">
                  Note: Category & Role assignments can only be modified by System Administrators via Admin Portal.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Contact Info */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium disabled:bg-gray-100/80 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Security (Password, 2FA, Login History) */}
          {activeTab === 'security' && (
            <div className="space-y-6 text-xs">
              {/* Change Password */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 max-w-md">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Change Account Password</h4>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    disabled={!isEditing}
                    placeholder="••••••••"
                    value={formData.currentPassword}
                    onChange={(e) => handleFieldChange('currentPassword', e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white border-gray-300 disabled:bg-gray-100/80 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    disabled={!isEditing}
                    placeholder="Minimum 8 characters"
                    value={formData.newPassword}
                    onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white border-gray-300 disabled:bg-gray-100/80 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    disabled={!isEditing}
                    placeholder="Repeat new password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white border-gray-300 disabled:bg-gray-100/80 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 2FA Toggle Switch */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900">Two-Factor Authentication (2FA)</h4>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Require an authenticator app code on login for added account security.
                  </p>
                </div>
                <label className={`relative inline-flex items-center ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}>
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.twoFactorEnabled}
                    onChange={(e) => handleFieldChange('twoFactorEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Login History */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Recent Login History</h4>
                <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden bg-white">
                  {profile.loginHistory?.map((log, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                      <div className="flex items-center gap-2.5">
                        <Smartphone size={16} className="text-gray-400" />
                        <div>
                          <p className="font-bold text-gray-900">{log.device}</p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <MapPin size={10} /> {log.location}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                        <Clock size={11} /> {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Account Details (Read-Only) */}
          {activeTab === 'account' && (
            <div className="space-y-4 text-xs max-w-lg">
              <div className="flex justify-between border-b pb-2.5">
                <span className="font-semibold text-gray-600">Portal Role</span>
                <span className="font-bold text-blue-600">{isVendorRoute ? 'VENDOR' : (role || 'TEAM_LEAD')}</span>
              </div>
              <div className="flex justify-between border-b pb-2.5">
                <span className="font-semibold text-gray-600">Account Created Date</span>
                <span className="font-bold text-gray-900">{formData.dateOfJoining || '2024-03-15'}</span>
              </div>
              <div className="flex justify-between border-b pb-2.5">
                <span className="font-semibold text-gray-600">Last Login Timestamp</span>
                <span className="font-bold text-gray-900">{profile.lastLogin || 'Today, 11:30 AM'}</span>
              </div>
              <div className="flex justify-between border-b pb-2.5">
                <span className="font-semibold text-gray-600">Account Status</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ● {formData.status || 'Active'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 6: Payment Received Table */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  {isVendorRoute ? 'Vendor Payout & Disbursement History' : 'Payment & Disbursement Records Table'}
                </h4>
                <span className="text-xs font-semibold text-gray-500">
                  Sourced from Payment Status
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b font-bold text-gray-700">
                    <tr>
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">PO / Request Ref</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {effectivePayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-500">{p.id}</td>
                        <td className="p-3 font-bold text-blue-600">{p.requestId}</td>
                        <td className="p-3 font-semibold text-gray-900">{p.title}</td>
                        <td className="p-3 font-extrabold text-gray-900">
                          ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-gray-500">{p.dueDate}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'Paid' || p.status === 'Disbursed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Button Bar */}
          {activeTab !== 'account' && activeTab !== 'payments' && (
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Pencil size={15} /> Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Save size={15} /> Save Profile Changes
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {pendingTabSwitch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center">
            <AlertCircle size={36} className="mx-auto text-amber-500 mb-2" />
            <h3 className="text-base font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-xs text-gray-500 mt-1">
              You have edited profile fields without saving. If you switch tabs now, your changes will be discarded.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setPendingTabSwitch(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200"
              >
                Keep Editing
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow hover:bg-red-700"
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
