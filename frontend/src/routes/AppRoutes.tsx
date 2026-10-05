import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import AboutPage from '../pages/AboutPage'
import FeaturesPage from '../pages/FeaturesPage'
import FeatureDetailPage from '../pages/FeatureDetailPage'
import CategoryDetailPage from '../pages/CategoryDetailPage'
import ContactPage from '../pages/ContactPage'
import LoginPage from '../features/auth/loginPage'
import ScrollToTop from '../components/common/ScrollToTop'

// Shared Portal Components
import { PortalLayout } from '../components/portal/PortalLayout'
import { SharedProfilePage } from '../components/portal/SharedProfilePage'
import { SharedNotificationsPage } from '../components/portal/SharedNotificationsPage'
import { ProcurementProvider } from '../context/ProcurementContext'
import { RoleGuard } from '../components/common/RoleGuard'

// Team Lead Portal Pages
import { TeamLeadDashboard } from '../portals/teamlead/TeamLeadDashboard'
import { MyRequestsPage } from '../portals/teamlead/MyRequestsPage'
import { CreateRequestPage } from '../portals/teamlead/CreateRequestPage'
import { RequestHistoryPage } from '../portals/teamlead/RequestHistoryPage'
import { PaymentStatusPage } from '../portals/teamlead/PaymentStatusPage'
import { RenewalsPage } from '../portals/teamlead/RenewalsPage'

// Manager Portal Pages
import { ManagerDashboard } from '../portals/manager/ManagerDashboard'
import { ManagerRequestDetailsPage } from '../portals/manager/ManagerRequestDetailsPage'
import { MyApprovalsPage } from '../portals/manager/MyApprovalsPage'
import { ApprovedRejectedPage } from '../portals/manager/ApprovedRejectedPage'
import { ManagerThreeWayMatchingPage } from '../portals/manager/ManagerThreeWayMatchingPage'
import { RecommendedToFinancePage } from '../portals/manager/RecommendedToFinancePage'
import { ManagerBudgetsPage } from '../portals/manager/ManagerBudgetsPage'
import { ManagerRFQsPage } from '../portals/manager/ManagerRFQsPage'
import { PendingApprovalsPage } from '../portals/manager/PendingApprovalsPage'
import { RequestArrivalPage } from '../portals/manager/RequestArrivalPage'
import { RejectedRequestsPage } from '../portals/manager/RejectedRequestsPage'
import { FinanceReviewPage } from '../portals/manager/FinanceReviewPage'
import { TotalRequestsPage } from '../portals/manager/TotalRequestsPage'
import { RaiseTicketPage } from '../portals/manager/RaiseTicketPage'
import { MyOrdersPage } from '../portals/manager/MyOrdersPage'
import { ReceivedReportsPage } from '../portals/manager/ReceivedReportsPage'
import { ManagerPurchaseRequestsPage } from '../portals/manager/ManagerPurchaseRequestsPage'

// Finance Portal Pages
import { FinanceDashboard } from '../portals/finance/FinanceDashboard'
import { FinanceBudgetPage } from '../portals/finance/FinanceBudgetPage'
import { PendingFinancialApprovalPage } from '../portals/finance/PendingFinancialApprovalPage'
import { FinancePaymentsPage } from '../portals/finance/FinancePaymentsPage'
import { FinancialReportsPage } from '../portals/finance/FinancialReportsPage'
import { FinancePurchaseRequestsPage } from '../portals/finance/FinancePurchaseRequestsPage'
import { FinanceApprovedRejectedPage } from '../portals/finance/FinanceApprovedRejectedPage'
import { FinanceRaiseTicketPage } from '../portals/finance/FinanceRaiseTicketPage'
import { FinanceRequestDetailsPage } from '../portals/finance/FinanceRequestDetailsPage'
import { FinanceMyRequestsPage } from '../portals/finance/FinanceMyRequestsPage'
import { FinanceReceivedReportsPage } from '../portals/finance/FinanceReceivedReportsPage'
import { RecommendedToAdminPage } from '../portals/finance/RecommendedToAdminPage'

// Admin Portal Pages
import { AdminDashboard } from '../portals/admin/AdminDashboard'
import { AdminRequestsPage } from '../portals/admin/AdminRequestsPage'
import { AdminVendorsPage } from '../portals/admin/AdminVendorsPage'
import { AdminQuotationsPage } from '../portals/admin/AdminQuotationsPage'
import { AdminVendorComparisonPage } from '../portals/admin/AdminVendorComparisonPage'
import { AdminPurchaseOrdersPage } from '../portals/admin/AdminPurchaseOrdersPage'
import { AdminReceiptsPage } from '../portals/admin/AdminReceiptsPage'
import { AdminContractsPage } from '../portals/admin/AdminContractsPage'
import { AdminUsersPage } from '../portals/admin/AdminUsersPage'
import { AdminRolesPermissionsPage } from '../portals/admin/AdminRolesPermissionsPage'
import { AdminDepartmentsPage } from '../portals/admin/AdminDepartmentsPage'
import { AdminWorkflowsPage } from '../portals/admin/AdminWorkflowsPage'

// Vendor Portal Pages
import {
  VendorCategoriesPage,
  VendorsInCategoryPage,
  VendorDashboard,
  VendorRFQsPage,
  VendorQuotationsPage,
  VendorPurchaseOrdersPage,
  VendorDeliveriesPage,
  VendorInvoicesPage,
  VendorPaymentStatusPage,
  VendorDocumentsPage,
  VendorPaymentsPage,
} from '../portals/vendor/VendorPortalPages'

// Common Multi-Portal Pages
import { VendorQuotationsPage as CommonVendorQuotationsPage } from '../portals/common/VendorQuotationsPage'

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Marketing Pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/features/:featureId" element={<FeatureDetailPage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />

      {/* ── 1. TEAM LEAD PORTAL ── */}
      <Route path="/portal/team_lead/*" element={<RoleGuard allowedRoles={['TEAM_LEAD', 'ADMIN']}><PortalLayout><TeamLeadRoutes /></PortalLayout></RoleGuard>} />

      {/* ── 2. MANAGER PORTAL ── */}
      <Route path="/portal/manager/*" element={<RoleGuard allowedRoles={['MANAGER', 'ADMIN']}><PortalLayout><ManagerRoutes /></PortalLayout></RoleGuard>} />

      {/* ── 3. FINANCE PORTAL ── */}
      <Route path="/portal/finance/*" element={<RoleGuard allowedRoles={['FINANCE', 'ADMIN']}><PortalLayout><FinanceRoutes /></PortalLayout></RoleGuard>} />

      {/* ── 4. ADMIN PORTAL ── */}
      <Route path="/portal/admin/*" element={<RoleGuard allowedRoles={['ADMIN']}><PortalLayout><AdminRoutes /></PortalLayout></RoleGuard>} />

      {/* ── 5. VENDOR PORTAL ── */}
      <Route path="/portal/vendor/*" element={<RoleGuard allowedRoles={['VENDOR', 'ADMIN']}><PortalLayout><VendorRoutes /></PortalLayout></RoleGuard>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

function TeamLeadRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/portal/team_lead/dashboard" replace />} />
      <Route path="dashboard" element={<TeamLeadDashboard />} />
      <Route path="my-requests" element={<MyRequestsPage />} />
      <Route path="create-request" element={<CreateRequestPage />} />
      <Route path="request-history" element={<RequestHistoryPage />} />
      <Route path="payment-status" element={<PaymentStatusPage />} />
      <Route path="renewals" element={<RenewalsPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="/portal/team_lead/dashboard" replace />} />
    </Routes>
  )
}

function ManagerRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/portal/manager/dashboard" replace />} />
      <Route path="dashboard" element={<ManagerDashboard />} />
      <Route path="request-arrival" element={<RequestArrivalPage />} />
      <Route path="my-requests" element={<MyOrdersPage />} />
      <Route path="my-orders" element={<MyOrdersPage />} />
      <Route path="pending-approvals" element={<PendingApprovalsPage />} />
      <Route path="my-approvals" element={<PendingApprovalsPage initialTab="APPROVED" />} />
      <Route path="rejected-requests" element={<PendingApprovalsPage initialTab="REJECTED" />} />
      <Route path="finance-review" element={<FinanceReviewPage />} />
      <Route path="purchase-requests" element={<ManagerPurchaseRequestsPage />} />
      <Route path="purchase-orders" element={<Navigate to="/portal/manager/purchase-requests" replace />} />
      <Route path="total-requests" element={<TotalRequestsPage />} />
      <Route path="raise-ticket" element={<RaiseTicketPage />} />
      {/* Backward compat redirect */}
      <Route path="three-way-matching" element={<Navigate to="/portal/manager/raise-ticket" replace />} />
      <Route path="request-details" element={<ManagerRequestDetailsPage />} />
      <Route path="history" element={<ApprovedRejectedPage />} />
      <Route path="recommended-finance" element={<RecommendedToFinancePage />} />
      <Route path="payments" element={<FinancePaymentsPage />} />
      <Route path="payment" element={<FinancePaymentsPage />} />
      <Route path="budgets" element={<Navigate to="/portal/manager/payments" replace />} />
      <Route path="rfqs" element={<ManagerRFQsPage />} />
      <Route path="vendor-quotations" element={<CommonVendorQuotationsPage role="MANAGER" />} />
      <Route path="received-reports" element={<ReceivedReportsPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="/portal/manager/dashboard" replace />} />
    </Routes>
  )
}

function FinanceRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/portal/finance/dashboard" replace />} />
      <Route path="dashboard" element={<FinanceDashboard />} />
      <Route path="my-requests" element={<FinanceMyRequestsPage />} />
      <Route path="my-orders" element={<FinanceMyRequestsPage />} />
      <Route path="budget" element={<FinanceBudgetPage />} />
      <Route path="purchase-requests" element={<FinancePurchaseRequestsPage />} />
      <Route path="rfqs" element={<ManagerRFQsPage role="FINANCE" />} />
      <Route path="vendor-quotations" element={<CommonVendorQuotationsPage role="FINANCE" />} />
      <Route path="pending-approvals" element={<PendingFinancialApprovalPage />} />
      <Route path="recommended-admin" element={<RecommendedToAdminPage />} />
      <Route path="recommend-to-admin" element={<RecommendedToAdminPage />} />
      <Route path="history" element={<FinanceApprovedRejectedPage />} />
      <Route path="approved-rejected" element={<FinanceApprovedRejectedPage />} />
      <Route path="raise-ticket" element={<FinanceRaiseTicketPage />} />
      <Route path="three-way-matching" element={<FinanceRaiseTicketPage />} />
      <Route path="payments" element={<FinancePaymentsPage />} />
      <Route path="request-details" element={<FinanceRequestDetailsPage />} />
      <Route path="financial-reports" element={<FinancialReportsPage />} />
      <Route path="received-reports" element={<FinanceReceivedReportsPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="/portal/finance/dashboard" replace />} />
    </Routes>
  )
}

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/portal/admin/dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="requests" element={<AdminRequestsPage />} />
      <Route path="vendors" element={<AdminVendorsPage />} />
      <Route path="rfqs" element={<ManagerRFQsPage />} />
      <Route path="quotations" element={<CommonVendorQuotationsPage role="ADMIN" />} />
      <Route path="vendor-quotations" element={<CommonVendorQuotationsPage role="ADMIN" />} />
      <Route path="vendor-comparison" element={<Navigate to="/portal/admin/vendor-quotations" replace />} />
      <Route path="purchase-orders" element={<AdminPurchaseOrdersPage />} />
      <Route path="receipts" element={<AdminReceiptsPage />} />
      <Route path="contracts" element={<AdminContractsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="roles-permissions" element={<AdminRolesPermissionsPage />} />
      <Route path="departments" element={<AdminDepartmentsPage />} />
      <Route path="workflows" element={<AdminWorkflowsPage />} />
      <Route path="raise-ticket" element={<RaiseTicketPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="/portal/admin/dashboard" replace />} />
    </Routes>
  )
}

function VendorRoutes() {
  return (
    <Routes>
      {/* Category & Vendor Selection landing pages */}
      <Route path="categories" element={<VendorCategoriesPage />} />
      <Route path="categories/:categoryId" element={<VendorsInCategoryPage />} />

      {/* Scoped Vendor Portal routes */}
      <Route path="vendor/:vendorId/dashboard" element={<VendorDashboard />} />
      <Route path="vendor/:vendorId/documents" element={<VendorDocumentsPage />} />
      <Route path="vendor/:vendorId/rfqs" element={<VendorRFQsPage />} />
      <Route path="vendor/:vendorId/quotations" element={<VendorQuotationsPage />} />
      <Route path="vendor/:vendorId/purchase-orders" element={<VendorPurchaseOrdersPage />} />
      <Route path="vendor/:vendorId/deliveries" element={<VendorDeliveriesPage />} />
      <Route path="vendor/:vendorId/receipts" element={<Navigate to="../documents" replace />} />
      <Route path="vendor/:vendorId/invoices" element={<VendorInvoicesPage />} />
      <Route path="vendor/:vendorId/payment-status" element={<VendorPaymentStatusPage />} />
      <Route path="vendor/:vendorId/notifications" element={<SharedNotificationsPage />} />
      <Route path="vendor/:vendorId/profile" element={<SharedProfilePage />} />

      {/* Unscoped shortcuts */}
      <Route path="dashboard" element={<VendorDashboard />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="documents" element={<VendorDocumentsPage />} />
      <Route path="rfqs" element={<VendorRFQsPage />} />
      <Route path="quotations" element={<VendorQuotationsPage />} />
      <Route path="purchase-orders" element={<VendorPurchaseOrdersPage />} />
      <Route path="deliveries" element={<VendorDeliveriesPage />} />
      <Route path="receipts" element={<Navigate to="/portal/vendor/documents" replace />} />
      <Route path="invoices" element={<VendorInvoicesPage />} />
      <Route path="payment-status" element={<VendorPaymentStatusPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />

      <Route path="*" element={<Navigate to="/portal/vendor/categories" replace />} />
    </Routes>
  )
}
