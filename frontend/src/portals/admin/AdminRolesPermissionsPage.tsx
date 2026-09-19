import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Save,
  RotateCcw,
  Lock,
  Users,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Key,
  History,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ExternalLink,
  Filter,
  CheckCheck,
  Ban
} from 'lucide-react';
import { useAdminData } from '../../context/ManagerDataContext';
import {
  RoleKey,
  ModuleId,
  ActionKey,
  AccessScope,
  PROCUREMENT_MODULES,
  DEFAULT_PERMISSION_MATRIX,
  PermissionMatrix,
  AuditLogEntry
} from '../../api/permissionsApi';

const ROLE_INFO: Record<RoleKey, { title: string; badge: string; desc: string; iconColor: string }> = {
  ADMIN: {
    title: 'Super Administrator',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600',
    desc: 'Unrestricted enterprise control over all procurement lifecycle stages, threshold policies, vendor approvals, user provisioning, and governance.'
  },
  MANAGER: {
    title: 'Operational Manager',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    desc: 'Department-level authority to approve requisitions within threshold limits (₹1,00,000 max), review team lead drafts, and inspect delivery receipts.'
  },
  FINANCE: {
    title: 'Finance & Accounts Officer',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconColor: 'text-emerald-600',
    desc: 'Verifies budget availability, performs 3-way matching, approves commercial payouts up to ₹5,00,000, and logs statutory tax compliance.'
  },
  TEAM_LEAD: {
    title: 'Team Lead / Requisitioner',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    iconColor: 'text-indigo-600',
    desc: 'Initiates project item requisitions, uploads technical specifications, receives and tests goods on delivery, and manages own draft requests.'
  },
  VENDOR: {
    title: 'Registered Vendor Partner',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
    desc: 'Receives and responds to RFQs, inspects issued purchase orders, submits delivery dispatch notes, and uploads invoices for payment.'
  }
};

const ACTION_COLUMNS: { key: ActionKey; label: string; headerClass?: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'approve', label: 'Approve' },
  { key: 'reject', label: 'Reject' },
  { key: 'return', label: 'Return' },
  { key: 'export', label: 'Export' },
  { key: 'delete', label: 'Delete' }
];

export const AdminRolesPermissionsPage: React.FC = () => {
  const {
    permissionMatrix: globalMatrix,
    updatePermissions,
    resetRolePermissions,
    auditLogs
  } = useAdminData();

  const [selectedRole, setSelectedRole] = useState<RoleKey>('ADMIN');
  // Local working copy of the matrix so edits can be previewed/modified before saving
  const [localMatrix, setLocalMatrix] = useState<PermissionMatrix>(() => {
    return JSON.parse(JSON.stringify(globalMatrix || DEFAULT_PERMISSION_MATRIX));
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);

  // Modal dialog state for Quick All and Clear
  const [activeModal, setActiveModal] = useState<'quick_all' | 'clear' | null>(null);

  // Synchronize localMatrix when globalMatrix changes externally (e.g. storage event or reset)
  React.useEffect(() => {
    if (globalMatrix && !hasUnsavedChanges) {
      setLocalMatrix(JSON.parse(JSON.stringify(globalMatrix)));
    }
  }, [globalMatrix, hasUnsavedChanges]);

  // Current permissions for the selected role
  const currentRolePerms = useMemo(() => {
    return localMatrix[selectedRole] || DEFAULT_PERMISSION_MATRIX[selectedRole];
  }, [localMatrix, selectedRole]);

  // Total possible actions across all 9 modules
  const totalPossibleActionsCount = useMemo(() => {
    return PROCUREMENT_MODULES.reduce((acc, m) => acc + m.supportedActions.length, 0);
  }, []);

  // Compute dynamic summary metrics in real-time
  const dynamicSummary = useMemo(() => {
    let modulesWithAnyAction = 0;
    let enabledActionsCount = 0;
    const scopesUsed = new Set<AccessScope>();

    PROCUREMENT_MODULES.forEach(module => {
      const setting = currentRolePerms[module.id];
      if (setting && setting.actions && setting.actions.length > 0) {
        modulesWithAnyAction++;
        enabledActionsCount += setting.actions.length;
        scopesUsed.add(setting.scope);
      }
    });

    const modulesCount = PROCUREMENT_MODULES.length;
    const actionsPercentage = Math.round((enabledActionsCount / totalPossibleActionsCount) * 100);

    let scopeLabel = 'None';
    let scopeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (scopesUsed.has('ALL') && scopesUsed.size === 1) {
      scopeLabel = 'All Records (Enterprise)';
      scopeBadgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (scopesUsed.has('ALL') && scopesUsed.size > 1) {
      scopeLabel = 'Hybrid (All & Dept Level)';
      scopeBadgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
    } else if (scopesUsed.has('DEPARTMENT')) {
      scopeLabel = 'Department Level';
      scopeBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (scopesUsed.has('OWN')) {
      scopeLabel = 'Own Records Only';
      scopeBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
    }

    return {
      modulesEnabled: `${modulesWithAnyAction} / ${modulesCount}`,
      modulesPercentage: Math.round((modulesWithAnyAction / modulesCount) * 100),
      permissionsEnabled: `${enabledActionsCount} / ${totalPossibleActionsCount}`,
      actionsPercentage,
      scopeLabel,
      scopeBadgeClass
    };
  }, [currentRolePerms, totalPossibleActionsCount]);

  // Toggle single action on a module
  const handleToggleAction = (moduleId: ModuleId, action: ActionKey) => {
    setLocalMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as PermissionMatrix;
      if (!copy[selectedRole]) {
        copy[selectedRole] = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX[selectedRole]));
      }
      const setting = copy[selectedRole][moduleId];
      if (!setting) return prev;

      const exists = setting.actions.includes(action);
      if (exists) {
        setting.actions = setting.actions.filter(a => a !== action);
      } else {
        setting.actions.push(action);
      }
      return copy;
    });
    setHasUnsavedChanges(true);
  };

  // Change scope for a module
  const handleChangeScope = (moduleId: ModuleId, newScope: AccessScope) => {
    setLocalMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as PermissionMatrix;
      if (!copy[selectedRole]) {
        copy[selectedRole] = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX[selectedRole]));
      }
      if (copy[selectedRole][moduleId]) {
        copy[selectedRole][moduleId].scope = newScope;
      }
      return copy;
    });
    setHasUnsavedChanges(true);
  };

  // Quick All: enable all valid actions for current role
  const handleQuickAll = () => {
    setLocalMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as PermissionMatrix;
      if (!copy[selectedRole]) {
        copy[selectedRole] = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX[selectedRole]));
      }
      PROCUREMENT_MODULES.forEach(module => {
        copy[selectedRole][module.id] = {
          actions: [...module.supportedActions],
          scope: copy[selectedRole][module.id]?.scope || module.defaultScope
        };
      });
      return copy;
    });
    setHasUnsavedChanges(true);
    setActiveModal(null);
    setNotification({
      type: 'info',
      message: `All applicable permissions enabled for "${selectedRole}". Click "Save Permissions" to persist.`
    });
  };

  // Clear: disable all actions for current role
  const handleClear = () => {
    setLocalMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as PermissionMatrix;
      if (!copy[selectedRole]) {
        copy[selectedRole] = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX[selectedRole]));
      }
      PROCUREMENT_MODULES.forEach(module => {
        copy[selectedRole][module.id] = {
          actions: [],
          scope: copy[selectedRole][module.id]?.scope || module.defaultScope
        };
      });
      return copy;
    });
    setHasUnsavedChanges(true);
    setActiveModal(null);
    setNotification({
      type: 'info',
      message: `Cleared all permissions for "${selectedRole}". Click "Save Permissions" to commit changes.`
    });
  };

  // Reset role to defaults
  const handleResetDefaults = async () => {
    if (window.confirm(`Reset permissions for role "${selectedRole}" to default enterprise baseline?`)) {
      try {
        const updatedMatrix = await resetRolePermissions(selectedRole, 'Admin User');
        setLocalMatrix(JSON.parse(JSON.stringify(updatedMatrix)));
        setHasUnsavedChanges(false);
        setNotification({
          type: 'success',
          message: `Permissions for role "${selectedRole}" have been reset to factory enterprise baseline.`
        });
      } catch (err: any) {
        setNotification({
          type: 'error',
          message: `Failed to reset role defaults: ${err.message || err}`
        });
      }
    }
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updatePermissions(localMatrix, 'Admin User', selectedRole);
      setHasUnsavedChanges(false);
      setNotification({
        type: 'success',
        message: res.message || `Permissions for "${selectedRole}" saved and synchronized enterprise-wide!`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Error saving permissions: ${err.message || err}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Roles & Permissions Matrix
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Enterprise RBAC
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Configure module-level actions, approval authorities, and data access scopes across all 5 procurement actors.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAuditDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition shadow-2xs"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Audit Trail</span>
            {auditLogs && auditLogs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[11px] font-mono">
                {auditLogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Reset Role Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shadow-sm ${
              hasUnsavedChanges
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes *' : 'Save Permissions'}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm animate-in fade-in transition ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 1. Role Selector Tabs ────────────────────────────────────────────── */}
      <div className="bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {(['ADMIN', 'MANAGER', 'FINANCE', 'TEAM_LEAD', 'VENDOR'] as RoleKey[]).map(role => {
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`py-3 px-3 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 border ${
                  isSelected
                    ? 'bg-white text-indigo-700 shadow-sm border-slate-200/90 ring-1 ring-black/5'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-indigo-600' : 'bg-slate-400'
                  }`}
                />
                <span>{role.replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected Role Context & Authority Card ──────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2.5 rounded-lg border bg-slate-50 border-slate-200 ${ROLE_INFO[selectedRole].iconColor}`}>
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">{ROLE_INFO[selectedRole].title}</h2>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${ROLE_INFO[selectedRole].badge}`}>
                {selectedRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              {ROLE_INFO[selectedRole].desc}
            </p>
          </div>
        </div>

        {/* Quick Bulk Action Buttons for Active Role */}
        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <button
            type="button"
            onClick={() => setActiveModal('quick_all')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Quick All</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('clear')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* ── 4. Dynamic Permission Summary ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Modules Enabled */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modules Enabled</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {dynamicSummary.modulesEnabled}
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${dynamicSummary.modulesPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Permissions Enabled */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions Enabled</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {dynamicSummary.permissionsEnabled}
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${dynamicSummary.actionsPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Access Scope */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Access Scope</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${dynamicSummary.scopeBadgeClass}`}>
              {dynamicSummary.scopeLabel}
            </span>
            <p className="text-[11px] text-slate-400 mt-2">
              Scope defines record visibility across departments & organization.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Permission Matrix Table (11 Columns) ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                <th className="py-3 px-4 min-w-[200px] w-64">Procurement Module</th>
                <th className="py-3 px-4 min-w-[220px] max-w-xs">Description</th>
                {ACTION_COLUMNS.map(col => (
                  <th key={col.key} className="py-3 px-2 text-center w-16">
                    {col.label}
                  </th>
                ))}
                <th className="py-3 px-4 text-center min-w-[150px] w-40">Access Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PROCUREMENT_MODULES.map((module, idx) => {
                const setting = currentRolePerms[module.id] || {
                  actions: [],
                  scope: module.defaultScope
                };
                const assignedActions = setting.actions || [];
                const currentScope = setting.scope || module.defaultScope;

                return (
                  <tr
                    key={module.id}
                    className={`hover:bg-slate-50/60 transition ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                    }`}
                  >
                    {/* Col 1: Procurement Module */}
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-900">{module.name}</span>
                      </div>
                    </td>

                    {/* Col 2: Description */}
                    <td className="py-3 px-4 align-middle text-slate-500 text-xs leading-relaxed max-w-xs">
                      {module.description}
                    </td>

                    {/* Cols 3-10: View, Create, Edit, Approve, Reject, Return, Export, Delete */}
                    {ACTION_COLUMNS.map(col => {
                      const isSupported = module.supportedActions.includes(col.key);
                      const isChecked = assignedActions.includes(col.key);

                      if (!isSupported) {
                        return (
                          <td key={col.key} className="py-3 px-2 text-center align-middle">
                            <span className="text-slate-300 text-xs font-semibold select-none">—</span>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="py-3 px-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleToggleAction(module.id, col.key)}
                            aria-label={`Toggle ${col.label} for ${module.name}`}
                            className={`w-6 h-6 rounded-md border inline-flex items-center justify-center transition ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs hover:bg-indigo-700'
                                : 'bg-white border-slate-300 hover:border-slate-400 text-transparent'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isChecked ? 'block' : 'opacity-0'}`} />
                          </button>
                        </td>
                      );
                    })}

                    {/* Col 11: Access Scope */}
                    <td className="py-3 px-4 text-center align-middle">
                      <div className="relative inline-block w-full max-w-[140px]">
                        <select
                          value={currentScope}
                          onChange={e => handleChangeScope(module.id, e.target.value as AccessScope)}
                          className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-7 transition"
                        >
                          {module.supportedScopes.map(scope => (
                            <option key={scope} value={scope}>
                              {scope === 'OWN' ? 'Own Records' : scope === 'DEPARTMENT' ? 'Department Records' : 'All Records'}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. Enterprise Security & Immutability Rules Card ─────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Security Controls & Immutability Safeguards
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              API Layer Authorization
            </div>
            <p className="text-slate-500 mt-1 leading-relaxed">
              All unauthorized API requests are intercepted and rejected with a strict 403 Forbidden status code.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Approved Records Locking
            </div>
            <p className="text-slate-500 mt-1 leading-relaxed">
              Procurement requests once marked Approved or Recommended cannot be modified by any requisitioner.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              Paid Invoice Immutability
            </div>
            <p className="text-slate-500 mt-1 leading-relaxed">
              Invoices with Disbursed or Paid status are permanently immutable to safeguard audit compliance.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Delete Restricted to Admin
            </div>
            <p className="text-slate-500 mt-1 leading-relaxed">
              Hard and soft deletions across masters, POs, and users are strictly restricted to Super Administrator.
            </p>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal: Quick All ────────────────────────────────────── */}
      {activeModal === 'quick_all' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <CheckCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Grant All Permissions?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will enable all valid operational actions across all 9 procurement modules for the{' '}
              <strong className="text-slate-900 font-semibold">{ROLE_INFO[selectedRole].title}</strong> ({selectedRole}).
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAll}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
              >
                Enable All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal: Clear ────────────────────────────────────────── */}
      {activeModal === 'clear' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                <Ban className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Clear All Permissions?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will revoke all active actions for the{' '}
              <strong className="text-slate-900 font-semibold">{ROLE_INFO[selectedRole].title}</strong> ({selectedRole}).
              Users with this role will not be able to perform operations until permissions are restored.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Trail Drawer / Modal ───────────────────────────────────────── */}
      {showAuditDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">RBAC Governance Audit Trail</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              Complete chronological audit history of permission modifications and administrative actions.
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {log.actor} ({log.role})
                      </span>
                      <span className="text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800">
                      {log.action} &bull; <span className="text-indigo-600">{log.targetModule}</span>
                    </div>
                    <p className="text-xs text-slate-600">{log.details}</p>
                    <div className="pt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          log.severity === 'SECURITY'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : log.severity === 'WARN'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No permission audit log records found.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuditDrawer(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
