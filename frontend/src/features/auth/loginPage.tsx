import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, UserRole } from '../../context/AuthContext'
import {
  ShoppingCart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Users,
  BarChart3,
  DollarSign,
  Settings,
  Truck,
  ArrowRight,
} from 'lucide-react'

/* ─── Role definitions ─── */
const roles = [
  { label: 'Team Lead', roleKey: 'TEAM_LEAD' as UserRole, icon: Users,      bg: '#DBEAFE', color: '#2563EB' },
  { label: 'Manager',   roleKey: 'MANAGER' as UserRole,   icon: BarChart3,  bg: '#DCFCE7', color: '#16A34A' },
  { label: 'Finance',   roleKey: 'FINANCE' as UserRole,   icon: DollarSign, bg: '#FFEDD5', color: '#D97706' },
  { label: 'Admin',     roleKey: 'ADMIN' as UserRole,     icon: Settings,   bg: '#EDE9FE', color: '#7C3AED' },
  { label: 'Vendor',    roleKey: 'VENDOR' as UserRole,    icon: Truck,      bg: '#FCE7F3', color: '#DB2777' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [selectedRole, setRole]   = useState<UserRole | null>(null)
  const [selectedRoleLabel, setSelectedRoleLabel] = useState<string | null>(null)
  const [errors, setErrors]       = useState<{ email?: string; password?: string; role?: string }>({})
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)

  const handleRolePortalClick = async (roleKey: UserRole, label: string) => {
    setRole(roleKey)
    setSelectedRoleLabel(label)
    setErrors({})
    setLoading(true)
    await login(email || 'user@procurementos.com', password || 'password123', roleKey)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/portal/${roleKey.toLowerCase()}/dashboard`)
      }, 700)
    }, 600)
  }

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!email.trim()) {
      errs.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address.'
    }
    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }
    if (!selectedRole) {
      errs.role = 'Please select your role.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await login(email, password, selectedRole || 'TEAM_LEAD')
    setLoading(false)
    setSuccess(true)
    setTimeout(() => {
      navigate(`/portal/${(selectedRole || 'TEAM_LEAD').toLowerCase()}/dashboard`)
    }, 700)
  }

  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFF 60%, #EDE9FE 100%)' }}
    >
      {/* Brand mark above card */}
      <Link
        to="/"
        className="flex items-center gap-2 mb-8 focus-ring rounded-md"
        aria-label="Back to Procurement OS home"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#2563EB' }}
        >
          <ShoppingCart size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span
          className="font-bold text-[#0F172A] text-lg"
          style={{ letterSpacing: '-0.01em' }}
        >
          Procurement OS
        </span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-md"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 24px 60px -12px rgba(15,23,42,0.18)',
          padding: '36px 32px',
        }}
      >
        {loading ? (
          /* ── Loading / signing-in state ── */
          <div className="flex flex-col items-center text-center py-12 gap-4" role="status" aria-live="polite">
            <svg className="animate-spin" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#DBEAFE" strokeWidth="3" />
              <path d="M12 2 A10 10 0 0 1 22 12" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p className="font-semibold text-[#0F172A]">Signing in as <span style={{ color: '#2563EB' }}>{selectedRole}</span>…</p>
          </div>
        ) : success ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center text-center py-6 gap-4" role="status" aria-live="polite">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#DCFCE7' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="12" fill="#16A34A" />
                <path d="M7 12.5L10.5 16L17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-bold text-[#0F172A] text-xl">Welcome back!</h2>
            <p style={{ color: '#64748B', fontSize: '14px' }}>
              Logged in as <strong>{selectedRole}</strong>. Redirecting to your dashboard…
            </p>
          </div>
        ) : (
          <>
            {/* Heading */}
            <h1
              className="font-bold text-[#0F172A] text-center mb-1"
              style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
            >
              Login to Your Account
            </h1>
            <p className="text-center text-sm mb-8" style={{ color: '#64748B' }}>
              Enter your credentials to continue
            </p>

            <form onSubmit={handleSubmit} noValidate aria-label="Login form">
              {/* Email field */}
              <div className="mb-4">
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-[#0F172A] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  >
                    <Mail size={16} color="#94A3B8" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    aria-invalid={!!errors.email}
                    aria-required="true"
                  />
                </div>
                {errors.email && (
                  <p
                    id="login-email-error"
                    className="flex items-center gap-1.5 mt-1.5 text-red-600"
                    style={{ fontSize: '13px' }}
                    role="alert"
                  >
                    <AlertCircle size={13} /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div className="mb-6">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-[#0F172A] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  >
                    <Lock size={16} color="#94A3B8" />
                  </span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                    className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    aria-invalid={!!errors.password}
                    aria-required="true"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] focus-ring rounded"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="login-password-error"
                    className="flex items-center gap-1.5 mt-1.5 text-red-600"
                    style={{ fontSize: '13px' }}
                    role="alert"
                  >
                    <AlertCircle size={13} /> {errors.password}
                  </p>
                )}
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="btn-primary w-full justify-center mb-5"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2 A10 10 0 0 1 22 12" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>Login <ArrowRight size={16} /></>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center mb-5">
                <div className="flex-1 border-t border-[#E5E7EB]" />
                <span
                  className="mx-3 text-xs font-medium"
                  style={{ color: '#94A3B8' }}
                >
                  or
                </span>
                <div className="flex-1 border-t border-[#E5E7EB]" />
              </div>

              {/* Role selector */}
              <div>
                <p
                  className="text-sm font-medium text-[#0F172A] mb-3"
                  id="role-label"
                >
                  Select Your Role
                </p>
                <div
                  className="flex gap-2"
                  role="radiogroup"
                  aria-labelledby="role-label"
                  aria-describedby={errors.role ? 'role-error' : undefined}
                >
                  {roles.map(({ label, roleKey, icon: Icon, bg, color }) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={selectedRole === roleKey}
                      onClick={() => handleRolePortalClick(roleKey, label)}
                      className={`role-btn ${selectedRole === roleKey ? 'selected' : ''}`}
                      aria-label={`Login as ${label}`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: bg }}
                        aria-hidden="true"
                      >
                        <Icon size={16} color={color} strokeWidth={2} />
                      </div>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                {errors.role && (
                  <p
                    id="role-error"
                    className="flex items-center gap-1.5 mt-2 text-red-600"
                    style={{ fontSize: '13px' }}
                    role="alert"
                  >
                    <AlertCircle size={13} /> {errors.role}
                  </p>
                )}
              </div>
            </form>

            {/* Footer note */}
            <p
              className="text-center text-xs mt-6"
              style={{ color: '#94A3B8' }}
            >
              Don't have an account?{' '}
              <Link
                to="/contact"
                className="text-[#2563EB] font-medium hover:underline focus-ring rounded"
              >
                Contact your administrator
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
