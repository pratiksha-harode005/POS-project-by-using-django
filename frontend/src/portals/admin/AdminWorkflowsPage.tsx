import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  Shield,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Save,
  RotateCcw,
  Sliders,
  History,
  FileCheck,
  Building,
  UserCheck
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  stageName: string;
  actor: string;
  badgeColor: string;
  rule: string;
  slaHours: number;
  autoEscalate: boolean;
}

const INITIAL_STEPS: WorkflowStep[] = [
  {
    id: 'step-1',
    stageName: 'Draft Requisition & Specs',
    actor: 'Team Lead',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    rule: 'Draft items with quantity, estimated price, and vendor suggestion.',
    slaHours: 24,
    autoEscalate: false
  },
  {
    id: 'step-2',
    stageName: 'Operational Need Validation',
    actor: 'Manager',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    rule: 'Direct approval if amount ≤ ₹1,00,000; otherwise escalates to Finance.',
    slaHours: 48,
    autoEscalate: true
  },
  {
    id: 'step-3',
    stageName: 'Financial Budget & Commercial Check',
    actor: 'Finance Officer',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rule: 'Final approval if amount ≤ ₹5,00,000; otherwise requires Super Admin sanction.',
    slaHours: 48,
    autoEscalate: true
  },
  {
    id: 'step-4',
    stageName: 'Executive Capex Sanction',
    actor: 'Super Admin',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    rule: 'Mandatory high-value signoff for all requisitions exceeding ₹5,00,000.',
    slaHours: 72,
    autoEscalate: false
  },
  {
    id: 'step-5',
    stageName: 'RFQ Multi-Vendor Bidding',
    actor: 'Procurement / Vendors',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    rule: 'Min 3 quotes mandatory for line items exceeding ₹50,000.',
    slaHours: 120,
    autoEscalate: false
  },
  {
    id: 'step-6',
    stageName: 'Purchase Order Issuance',
    actor: 'Admin / Finance',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    rule: 'Binding PO generated and dispatched with tax terms to winning vendor.',
    slaHours: 24,
    autoEscalate: false
  },
  {
    id: 'step-7',
    stageName: 'Goods Receipt & 3-Way GRN Match',
    actor: 'Store / Team Lead',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    rule: 'Physical QA inspection, serial verification against PO quantities.',
    slaHours: 48,
    autoEscalate: false
  },
  {
    id: 'step-8',
    stageName: 'Disbursement & Voucher Release',
    actor: 'Finance & Accounts',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rule: 'Invoice cleared for bank payment post GRN receipt match confirmation.',
    slaHours: 72,
    autoEscalate: false
  }
];

interface AuditEntry {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  impact: string;
}

const INITIAL_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'AUD-901',
    timestamp: '2026-09-15 14:20',
    adminName: 'Priyanka Sharma (Admin)',
    action: 'Updated Finance Threshold Ceiling',
    impact: 'Increased Finance threshold from ₹3,00,000 to ₹5,00,000'
  },
  {
    id: 'AUD-902',
    timestamp: '2026-08-20 10:15',
    adminName: 'Priyanka Sharma (Admin)',
    action: 'Enforced 3-Quote Mandate',
    impact: 'Enabled multi-quotation RFQ rule for items over ₹50,000'
  },
  {
    id: 'AUD-903',
    timestamp: '2026-07-01 09:30',
    adminName: 'System Setup',
    action: 'Initial Approval Workflow Baseline',
    impact: 'Provisioned 8-stage enterprise procurement governance hierarchy'
  }
];

export const AdminWorkflowsPage: React.FC = () => {
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [managerThreshold, setManagerThreshold] = useState<number>(100000);
  const [financeThreshold, setFinanceThreshold] = useState<number>(500000);
  const [minQuotesRequired, setMinQuotesRequired] = useState<number>(3);
  const [minQuoteThreshold, setMinQuoteThreshold] = useState<number>(50000);
  const [autoEscalateEnabled, setAutoEscalateEnabled] = useState<boolean>(true);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>(INITIAL_AUDIT_LOG);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();

    const newAudit: AuditEntry = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      adminName: 'Priyanka Sharma (Admin)',
      action: 'Updated Governance Thresholds',
      impact: `Manager: ₹${managerThreshold.toLocaleString('en-IN')} | Finance: ₹${financeThreshold.toLocaleString(
        'en-IN'
      )} | Min Quotes: ${minQuotesRequired} for > ₹${minQuoteThreshold.toLocaleString('en-IN')}`
    };

    setAuditLog([newAudit, ...auditLog]);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all threshold limits and workflow rules to enterprise factory defaults?')) {
      setManagerThreshold(100000);
      setFinanceThreshold(500000);
      setMinQuotesRequired(3);
      setMinQuoteThreshold(50000);
      setAutoEscalateEnabled(true);
      setSteps(INITIAL_STEPS);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitFork className="w-7 h-7 text-indigo-600" />
            Approval Workflows & Governance Policy Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure financial delegation of authority (DOA), routing stages, threshold ceilings, and audit safeguards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Restore Defaults
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Procurement routing thresholds and governance policies successfully saved to system!</span>
        </div>
      )}

      {/* Threshold Governance Form Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
          <IndianRupee className="w-5 h-5 text-indigo-600" />
          Financial Delegation of Authority (DOA) Thresholds
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Set approval ceilings in INR (₹). Requests automatically route to the corresponding approver tier based on order value.
        </p>

        <form onSubmit={handleSavePolicy} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Manager Limit */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 uppercase">Tier 1: Manager Approval</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-200 text-blue-800 font-semibold">Tier 1</span>
              </div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Ceiling Limit (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={managerThreshold}
                  onChange={e => setManagerThreshold(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Requisitions ≤ ₹{managerThreshold.toLocaleString('en-IN')} approved directly by departmental Manager.
              </p>
            </div>

            {/* Finance Limit */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-900 uppercase">Tier 2: Finance Approval</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 font-semibold">Tier 2</span>
              </div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Ceiling Limit (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">₹</span>
                <input
                  type="number"
                  min={managerThreshold}
                  step="50000"
                  value={financeThreshold}
                  onChange={e => setFinanceThreshold(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Requisitions between ₹{(managerThreshold + 1).toLocaleString('en-IN')} and ₹
                {financeThreshold.toLocaleString('en-IN')} authorized by Corporate Finance.
              </p>
            </div>

            {/* Admin Limit */}
            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-900 uppercase">Tier 3: Super Admin Capex</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-200 text-purple-800 font-semibold">Tier 3</span>
              </div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Escalation Floor (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">₹</span>
                <input
                  type="text"
                  disabled
                  value={`> ₹${financeThreshold.toLocaleString('en-IN')}`}
                  className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-purple-950 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                All capital expenditure above ₹{financeThreshold.toLocaleString('en-IN')} strictly mandates Super Admin sign-off.
              </p>
            </div>
          </div>

          {/* Sourcing & SLA Policies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">RFQ Sourcing Mandate</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Require minimum vendor quotation bids for high-value purchases.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={minQuotesRequired}
                  onChange={e => setMinQuotesRequired(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center text-sm font-bold text-slate-800"
                />
                <span className="text-xs text-slate-500 font-medium">bids required</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">Auto-Escalation on SLA Breach</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Route to next tier if an approver is unresponsive for &gt; 48 hours.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoEscalateEnabled}
                  onChange={e => setAutoEscalateEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Governance Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Visual Workflow Pipeline Stepper */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
          <GitFork className="w-5 h-5 text-indigo-600" />
          End-to-End Enterprise Procurement Routing Pipeline
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Sequential stages traversed by all procurement requests from requisition initiation through final voucher release.
        </p>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white"
            >
              <div className="flex items-start md:items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{step.stageName}</h3>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${step.badgeColor}`}>
                      {step.actor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{step.rule}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs shrink-0 self-end md:self-auto">
                <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>SLA: {step.slaHours}h</span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-semibold uppercase ${
                    step.autoEscalate
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.autoEscalate ? 'Auto-Escalates' : 'Standard'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Governance Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Policy Modification Audit History</h3>
          </div>
          <span className="text-xs text-slate-400">Immutable governance log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="py-2.5 px-4">Log ID</th>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Authorized Admin</th>
                <th className="py-2.5 px-4">Action Taken</th>
                <th className="py-2.5 px-4">Governance Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLog.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-mono text-slate-500">{log.id}</td>
                  <td className="py-2.5 px-4 text-slate-600">{log.timestamp}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">{log.adminName}</td>
                  <td className="py-2.5 px-4 font-semibold text-indigo-700">{log.action}</td>
                  <td className="py-2.5 px-4 text-slate-600">{log.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
