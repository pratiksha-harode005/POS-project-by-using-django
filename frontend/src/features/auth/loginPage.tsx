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
  IndianRupee,
  Settings,
  Truck,
  ArrowRight,
  KeyRound,
} from 'lucide-react'

/* ─── Role definitions & default credentials ─── */
const roles = [
  { label: 'Team Lead', roleKey: 'TEAM_LEAD' as UserRole, email: 'tl@procurementos.com', pass: 'password123', icon: Users, bg: '#DBEAFE', color: '#2563EB' },
  { label: 'Manager',   roleKey: 'MANAGER' as UserRole,   email: 'mgr@procurementos.com', pass: 'password123', icon: BarChart3, bg: '#DCFCE7', color: '#16A34A' },
  { label: 'Finance',   roleKey: 'FINANCE' as UserRole,   email: 'fin@procurementos.com', pass: 'password123', icon: IndianRupee, bg: '#FFEDD5', color: '#D97706' },
  { label: 'Admin',     roleKey: 'ADMIN' as UserRole,     email: 'admin@procurementos.com', pass: 'password123', icon: Settings, bg: '#EDE9FE', color: '#7C3AED' },
  { label: 'Vendor',    roleKey: 'VENDOR' as UserRole,    email: 'contact@dell.com', pass: 'password123', icon: Truck, bg: '#FCE7F3', color: '#DB2777' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail]         = useState('tl@procurementos.com')
  const [password, setPassword]   = useState('password123')
  const [showPass, setShowPass]   = useState(false)
  const [selectedRole, setRole]   = useState<UserRole>('TEAM_LEAD')
  const [errors, setErrors]       = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)

  // Autofill credentials when clicking role icon
  const handleSelectRole = (r: typeof roles[0]) => {
    setRole(r.roleKey)
    setEmail(r.email)
    setPassword(r.pass)
    setErrors({})
  }

  // Detect role from email address if user types manually
  const detectRoleFromEmail = (userEmail: string): UserRole => {
    const lower = userEmail.toLowerCase().trim()
    if (lower.includes('mgr') || lower.includes('manager')) return 'MANAGER'
    if (lower.includes('fin') || lower.includes('finance')) return 'FINANCE'
    if (lower.includes('admin')) return 'ADMIN'
    if (lower.includes('dell') || lower.includes('vendor')) return 'VENDOR'
    return 'TEAM_LEAD'
  }

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!email.trim()) {
      errs.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address.'
    }
    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const targetRole = selectedRole || detectRoleFromEmail(email)
    await login(email, password, targetRole)

    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/portal/${targetRole.toLowerCase()}/dashboard`)
      }, 700)
    }, 600)
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
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
          style={{ backgroundColor: '#2563EB' }}
        >
          <ShoppingCart size={22} color="#FFFFFF" strokeWidth={2.5} />
        </div>
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: '24px', color: '#0F172A' }}
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
            <p className="font-semibold text-[#0F172A]">
              Signing in as <span style={{ color: '#2563EB' }}>{selectedRole.replace('_', ' ')}</span>…
            </p>
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
              Logged in as <strong>{selectedRole.replace('_', ' ')}</strong>. Redirecting to your portal dashboard…
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
            <p className="text-center text-sm mb-6" style={{ color: '#64748B' }}>
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
                    onChange={(e) => {
                      setEmail(e.target.value)
                      clearError('email')
                      setRole(detectRoleFromEmail(e.target.value))
                    }}
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

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                style={{ borderRadius: '10px' }}
              >
                <span>Login to {selectedRole.replace('_', ' ')} Portal</span>
                <ArrowRight size={18} />
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center my-6">
              <div className="flex-1 border-t border-[#E5E7EB]" />
              <span
                className="mx-3 text-xs font-medium uppercase tracking-wider"
                style={{ color: '#94A3B8' }}
              >
                or autofill portal credentials
              </span>
              <div className="flex-1 border-t border-[#E5E7EB]" />
            </div>

            {/* Role quick selector */}
            <div>
              <p
                className="text-xs font-bold text-[#0F172A] mb-2.5 uppercase tracking-wider text-center"
                id="role-label"
              >
                Select Role Portal to Autofill
              </p>
              <div
                className="flex gap-2"
                role="radiogroup"
                aria-labelledby="role-label"
              >
                {roles.map((r) => {
                  const Icon = r.icon
                  const isSelected = selectedRole === r.roleKey
                  return (
                    <button
                      key={r.label}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectRole(r)}
                      className={`role-btn ${isSelected ? 'selected' : ''}`}
                      aria-label={`Autofill credentials for ${r.label}`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-1"
                        style={{ backgroundColor: r.bg }}
                        aria-hidden="true"
                      >
                        <Icon size={16} color={r.color} strokeWidth={2} />
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: isSelected ? '#2563EB' : '#0F172A' }}
                      >
                        {r.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick credentials hint */}
            <div className="mt-6 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-gray-600">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                <KeyRound size={13} className="text-blue-600" />
                <span>Pre-configured Portal Credentials (Password: password123)</span>
              </div>
              <ul className="space-y-0.5 text-[10.5px]">
                <li>• <strong>Team Lead:</strong> tl@procurementos.com</li>
                <li>• <strong>Manager:</strong> mgr@procurementos.com</li>
                <li>• <strong>Finance:</strong> fin@procurementos.com</li>
                <li>• <strong>Admin:</strong> admin@procurementos.com</li>
                <li>• <strong>Vendor:</strong> contact@dell.com</li>
              </ul>
            </div>

            {/* Admin note */}
            <p className="text-center text-xs mt-4" style={{ color: '#64748B' }}>
              Don't have an account?{' '}
              <Link
                to="/contact"
                className="font-medium text-[#2563EB] hover:underline focus-ring rounded"
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
