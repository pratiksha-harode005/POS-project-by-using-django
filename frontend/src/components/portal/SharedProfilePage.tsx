import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  User, Briefcase, PhoneCall, ShieldCheck, Key, CreditCard, Save,
  CheckCircle, Building, MapPin, Mail, Phone, Calendar, Clock,
  FileCheck, Shield, AlertCircle, Layers, BellRing, Laptop, LogOut, Pencil
} from 'lucide-react'
import { apiClient } from '../../api/client'

export const SharedProfilePage: React.FC = () => {
  const { user, role, logout, updateUserProfile } = useAuth()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'personal' | 'work' | 'limits' | 'security'
  >('personal')

  const isAdmin = role === 'ADMIN'
  const isTeamLead = role === 'TEAM_LEAD'

  const initialLimits = React.useMemo(() => {
    if (role === 'TEAM_LEAD') {
      return { approvalLimit: '', monthlyCapexLimit: '' }
    }
    try {
      const saved = localStorage.getItem(`profile_limits_${role || 'default'}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.approvalLimit && parsed.monthlyCapexLimit) {
          if (role === 'FINANCE') {
            const migrated = {
              approvalLimit: parsed.approvalLimit === '₹20,00,000' ? '₹1,00,000' : parsed.approvalLimit,
              monthlyCapexLimit: parsed.monthlyCapexLimit === '₹75,00,000' ? '₹1,00,000' : parsed.monthlyCapexLimit,
            }
            if (
              migrated.approvalLimit !== parsed.approvalLimit ||
              migrated.monthlyCapexLimit !== parsed.monthlyCapexLimit
            ) {
              localStorage.setItem(`profile_limits_${role}`, JSON.stringify(migrated))
            }
            return migrated
          }
          if (role === 'MANAGER') {
            return {
              approvalLimit: parsed.approvalLimit === '₹15,00,000' ? '₹5,00,000' : parsed.approvalLimit,
              monthlyCapexLimit: parsed.monthlyCapexLimit === '₹50,00,000' ? '₹5,00,000' : parsed.monthlyCapexLimit,
            }
          }
          return parsed
        }
      }
    } catch (e) {}

    switch (role as string) {
      case 'ADMIN':
        return {
          approvalLimit: '₹50,00,000',
          monthlyCapexLimit: '₹2,50,00,000',
        }
      case 'FINANCE':
        return {
          approvalLimit: '₹1,00,000',
          monthlyCapexLimit: '₹1,00,000',
        }
      case 'MANAGER':
        return {
          approvalLimit: '₹5,00,000',
          monthlyCapexLimit: '₹5,00,000',
        }
      case 'TEAM_LEAD':
        return {
          approvalLimit: '₹2,00,000',
          monthlyCapexLimit: '₹10,00,000',
        }
      case 'VENDOR':
        return {
          approvalLimit: '₹15,00,000',
          monthlyCapexLimit: '₹40,00,000',
        }
      default:
        return {
          approvalLimit: '₹25,00,000',
          monthlyCapexLimit: '₹1,00,00,000',
        }
    }
  }, [role])

  const [formData, setFormData] = useState({
    firstName: user?.first_name || (isAdmin ? 'Priyanka' : isTeamLead ? '' : 'Sarah'),
    lastName: user?.last_name || (isAdmin ? 'Sharma' : isTeamLead ? '' : 'Manager'),
    email: user?.email || (isAdmin ? 'admin@procurementos.com' : isTeamLead ? '' : 'sarah.manager@procurementos.com'),
    phone: user?.phone || (isTeamLead ? '' : '+91 98765 44444'),
    preferredName: user?.preferred_name || (isAdmin ? 'Priyanka S.' : isTeamLead ? '' : 'Sarah M.'),
    dateOfBirth: '1988-04-15',
    emergencyContact: user?.emergency_contact || (isAdmin ? 'Corporate Legal Desk (+91 98765 00000)' : isTeamLead ? '' : 'Michael Manager (+91 98765 43219)'),
    jobTitle: user?.job_title || (isAdmin ? 'System Administrator' : isTeamLead ? '' : 'Senior Procurement Manager'),
    department: isAdmin ? 'Executive Sourcing & System Administration' : user?.department_detail?.name || (isTeamLead ? '' : 'IT & Infrastructure Operations'),
    costCenter: user?.cost_center || (isAdmin ? 'CC-ADM-001 (Executive Administration)' : isTeamLead ? '' : 'CC-IT-101 (Core Engineering & Cloud)'),
    businessUnit: isAdmin ? 'Corporate Procurement OS Governance' : 'Global Technology Operations',
    reportingManager: user?.reporting_manager || (isAdmin ? 'Board of Directors / Managing Committee' : isTeamLead ? '' : 'David Director, VP of Engineering & Operations'),
    workLocation: user?.work_location || (isTeamLead ? '' : 'Pune HQ, Level 4 (Tech Hub)'),
    employmentType: 'Full-time Permanent',
    joinDate: '2022-03-15',
    approvalLimit: initialLimits.approvalLimit,
    monthlyCapexLimit: initialLimits.monthlyCapexLimit,
    delegateActive: false,
    delegateName: isAdmin ? 'Corporate Admin Proxy' : 'Alex Lead (Acting Proxy)',
    notifyHighValue: true,
    notifyDailyDigest: true,
    notifySms: false,
  })

  const [saved, setSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const startEditing = () => {
    setSaveError('')
    setIsEditing(true)
  }

  React.useEffect(() => {
    if (isEditing || !user) return
    setFormData((current) => ({
      ...current,
      firstName: user.first_name || (isAdmin ? 'Priyanka' : isTeamLead ? '' : 'Sarah'),
      lastName: user.last_name || (isAdmin ? 'Sharma' : isTeamLead ? '' : 'Manager'),
      email: user.email || (isAdmin ? 'admin@procurementos.com' : isTeamLead ? '' : 'sarah.manager@procurementos.com'),
      phone: user.phone || current.phone,
      preferredName: user.preferred_name || current.preferredName,
      emergencyContact: user.emergency_contact || current.emergencyContact,
      jobTitle: user.job_title || current.jobTitle,
      workLocation: user.work_location || current.workLocation,
      costCenter: user.cost_center || current.costCenter,
      reportingManager: user.reporting_manager || current.reportingManager,
      department: user.department_detail?.name || current.department,
    }))
  }, [user, isEditing, isAdmin, isTeamLead])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditing || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const response = await apiClient.patch('/users/profile/', {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        preferred_name: formData.preferredName.trim(),
        emergency_contact: formData.emergencyContact.trim(),
        job_title: formData.jobTitle.trim(),
        work_location: formData.workLocation.trim(),
        cost_center: formData.costCenter.trim(),
        reporting_manager: formData.reportingManager.trim(),
      })
      updateUserProfile(response.data)
      setFormData((current) => ({
        ...current,
        firstName: response.data.first_name || '',
        lastName: response.data.last_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        preferredName: response.data.preferred_name || '',
        emergencyContact: response.data.emergency_contact || '',
        jobTitle: response.data.job_title || current.jobTitle,
        workLocation: response.data.work_location || current.workLocation,
        costCenter: response.data.cost_center || current.costCenter,
        reportingManager: response.data.reporting_manager || current.reportingManager,
        department: response.data.department_detail?.name || current.department,
      }))
      try {
        localStorage.setItem(`profile_limits_${role || 'default'}`, JSON.stringify({
          approvalLimit: formData.approvalLimit,
          monthlyCapexLimit: formData.monthlyCapexLimit,
        }))
      } catch (err) {}
      setIsEditing(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      const data = error?.response?.data
      const message = data && typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : ''
      setSaveError(message || 'Unable to save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'work', label: 'Work & Organization', icon: Briefcase },
    ...(!isTeamLead ? [{ id: 'limits', label: 'Procurement Limits & Authority', icon: CreditCard }] : []),
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Profile & Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {isTeamLead ? 'Manage your personal and work profile information.' : 'Manage your enterprise credentials, role hierarchy, and procurement authority limits.'}
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 shadow-2xs animate-fadeIn">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">Profile updated successfully.</span>
        </div>
      )}
      {saveError && (
        <div role="alert" className="p-3.5 bg-rose-50 text-rose-800 rounded-xl text-xs border border-rose-200">
          {saveError}
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md border-2 border-white">
              {formData.firstName?.[0] || 'U'}{formData.lastName?.[0] || ''}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {formData.firstName} {formData.lastName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {role?.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Active
                </span>
              </div>
              {(formData.jobTitle || formData.department) && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {[formData.jobTitle, formData.department].filter(Boolean).join(' ')}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail size={13} /> {formData.email}
                </span>
                {formData.workLocation && <span className="flex items-center gap-1">
                  <MapPin size={13} /> {formData.workLocation}
                </span>}
                <span className="flex items-center gap-1 font-mono">
                  ID: EMP-2024-8891
                </span>
              </div>
            </div>
          </div>

          {/* Log Out Button */}
          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 transition-all shadow-2xs group"
            >
              <LogOut size={15} className="group-hover:translate-x-0.5 transition-transform" />
              <span>Log Out</span>
            </button>
            <span className="text-[10px] text-slate-400 font-medium">
              Active: {role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Quick Enterprise Stats Grid */}
        {!isTeamLead && <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approval Limit</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">{formData.approvalLimit}</p>
            <span className="text-[10px] text-slate-500">Per purchase order</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Capex Cap</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">{formData.monthlyCapexLimit}</p>
            <span className="text-[10px] text-slate-500">Allocated budget</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approvals Signed</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">148</p>
            <span className="text-[10px] text-slate-500">FY 2025–26</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Rating</span>
            <p className="text-lg font-bold text-emerald-600 mt-0.5 font-mono">99.4%</p>
            <span className="text-[10px] text-slate-500">Internal audit grade</span>
          </div>
        </div>}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-3 overflow-x-auto shadow-2xs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Form Body Container */}
      <div className="bg-white p-6 rounded-b-2xl border border-slate-200/90 shadow-2xs -mt-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: Personal Information */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Mobile Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Display Name</label>
                  <input
                    type="text"
                    value={formData.preferredName}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Information</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Work & Organization */}
          {activeTab === 'work' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Organizational Hierarchy & Job Function</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Designation</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Cost Center</label>
                  <input
                    type="text"
                    value={formData.costCenter}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Line Manager</label>
                  <input
                    type="text"
                    value={formData.reportingManager}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Office Location</label>
                  <input
                    type="text"
                    value={formData.workLocation}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      !isEditing ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type & Joining Date</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formData.employmentType} (Since ${formData.joinDate})`}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Procurement Limits & Authority */}
          {activeTab === 'limits' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Procurement & Financial Sign-Off Thresholds</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">Single Purchase Order Limit</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Level 2</span>
                  </div>
                  <input
                    type="text"
                    value={formData.approvalLimit}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, approvalLimit: e.target.value })}
                    className="w-full text-lg font-bold text-slate-900 font-mono p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. ₹50,00,000"
                  />
                  {isEditing && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">Quick presets:</span>
                      {['₹1,00,000', '₹10,00,000', '₹25,00,000', '₹50,00,000', '₹1,00,00,000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData({ ...formData, approvalLimit: preset })}
                          className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-100 font-mono text-slate-700 transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2">
                    Orders exceeding this limit require escalation to Finance Controller / VP Operations.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">Monthly Capex Authority</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Q3 Active</span>
                  </div>
                  <input
                    type="text"
                    value={formData.monthlyCapexLimit}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, monthlyCapexLimit: e.target.value })}
                    className="w-full text-lg font-bold text-slate-900 font-mono p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. ₹2,50,00,000"
                  />
                  {isEditing && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">Quick presets:</span>
                      {['₹1,00,000', '₹50,00,000', '₹1,00,00,000', '₹2,50,00,000', '₹5,00,00,000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData({ ...formData, monthlyCapexLimit: preset })}
                          className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-100 font-mono text-slate-700 transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2">
                    Cumulative monthly spend authorized across all managed cost centers.
                  </p>
                </div>
              </div>

              {/* Delegation of Authority Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Delegation of Approval Authority</h4>
                    <p className="text-[11px] text-slate-500">Temporarily assign an acting proxy to sign off during absence.</p>
                  </div>
                  <label className={`relative inline-flex items-center ${isEditing ? 'cursor-pointer' : 'cursor-default opacity-80'}`}>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={formData.delegateActive}
                      onChange={(e) => setFormData({ ...formData, delegateActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {formData.delegateActive && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Authorized Proxy User</label>
                    <input
                      type="text"
                      readOnly={!isEditing}
                      value={formData.delegateName}
                      onChange={(e) => setFormData({ ...formData, delegateName: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Security & Access */}
          {activeTab === 'security' && (
            <div className="space-y-4 max-w-lg">
              <h3 className="text-sm font-bold text-slate-900">Security Credentials & Active Sessions</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Enterprise Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters with numbers and symbols"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Two-Factor Authentication (2FA) Active</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Your session is verified with enterprise hardware-backed TOTP security.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-800 mb-2">Active Sessions</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Laptop size={16} className="text-slate-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Windows 11 • Chrome 128</p>
                      <p className="text-[10px] text-slate-400">Pune, India • Current Active Session</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Online
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200/80 mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Terminate Session</p>
                    <p className="text-[10px] text-slate-400">Safely log out and clear security tokens</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    <LogOut size={13} /> Log Out Device
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Submit Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
            >
              <LogOut size={14} /> Log Out
            </button>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setSaveError('')
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                  >
                    <Save size={15} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startEditing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Pencil size={15} /> Edit
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0">
                <LogOut size={22} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Sign Out of Account</h3>
                <p className="text-xs text-slate-400">End your active session</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to log out of your <b>{role?.replace('_', ' ')}</b> portal session? You will be returned to the login screen and will need your credentials to sign back in.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <LogOut size={13} /> Confirm Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
